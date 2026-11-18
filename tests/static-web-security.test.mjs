import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {scanText, scanDirectory, excludedDirectories} from '../scripts/scan-static-web.mjs';

const html = code => '<script>\n' + code + '\n</script>';
const scan = text => scanText(text, 'index.html');

test('HTML assignments are parsed across nested quotes, template interpolation and semicolons', () => {
  const source = html('node.innerHTML = rows.map(row => `<p style="color:red;">${row.label + `;${other}`}</p>`).join(";\\n");\nnode.outerHTML = content;');
  const findings = scan(source).filter(row => row.rule.includes('动态赋值'));
  assert.equal(findings.length, 2);
  assert.equal(findings[0].line, 2);
  assert.equal(findings[1].line, 3);
  assert.ok(findings.every(row => row.level === 'High'));
  assert.ok(scan(html('node["innerHTML"] = input;')).some(row => row.level === 'High'));
});

test('only complete sanitizer calls bypass the HTML sink rule; conditionals stay unsafe', () => {
  for (const sanitizer of ['DOMPurify.sanitize', 'sanitizeHtml', 'filterXSS']) {
    assert.deepEqual(scan(html(`node.innerHTML = ${sanitizer}(input);`)), []);
  }
  assert.ok(scan(html('node.innerHTML = ready ? DOMPurify.sanitize(input) : input;')).some(row => row.level === 'High'));
});

test('empty/static text and pure constant concatenation are safe, dangerous static markup is not', () => {
  assert.deepEqual(scan(html('node.innerHTML = ""; node.innerHTML = "<p>" + "safe</p>";')), []);
  for (const value of ['<img onerror="alert(1)" src="x">', '<iframe src="./x.html"></iframe>', '<a href="javascript:alert(1)">x</a>']) {
    assert.ok(scan(html('node.innerHTML = ' + JSON.stringify(value) + ';')).some(row => row.level === 'High'));
  }
});

test('fixed paths are flagged in attributes, styles and actual resource-loading JS, not public HTTPS URLs', () => {
  for (const source of ['<img src="/assets/a.png">', '<a href="file:///C:/x.html">x</a>', '<style>x{background:url(C:/site/a.png)}</style>', html('fetch("/api/data");'), html('image.setAttribute("src", "/a.png");'), html('new URL("/a.png", location.href);')]) {
    assert.ok(scan(source).some(row => row.rule.includes('固定资源路径')));
  }
  for (const source of ['<img src="./assets/a.png">', '<script src="./safe.js"></script>', '<script src="https://cdn.example.org/a.js"></script>']) assert.deepEqual(scan(source), []);
});

test('embedded active tags, meta refresh and encoded JS protocols are detected', () => {
  for (const source of ['<IFRAME></IFRAME>', '<object></object>', '<embed src="./x">', '<frame>', '<meta HTTP-EQUIV="refresh" content="0;url=x">', '<a href="java&#x73;cript:alert(1)">x</a>']) {
    assert.ok(scan(source).some(row => row.level === 'High'), source);
  }
});

test('raster data source is medium, active HTML/SVG/form data source is high', () => {
  assert.ok(scan('<img src="data:image/png;base64,abc">').some(row => row.level === 'Medium'));
  for (const source of ['<img src="data:image/svg+xml,x">', '<form action="data:text/plain,x"></form>', '<iframe src="data:text/html,x"></iframe>']) assert.ok(scan(source).some(row => row.level === 'High'));
});

test('external script checks inspect local/private/IP protocols without DNS lookups', () => {
  for (const source of ['http://cdn.example.org/a.js', '//cdn.example.org/a.js', 'https://localhost/a.js', 'https://localhost./a.js', 'https://a.local/a.js', 'https://127.0.0.1/a.js', 'https://10.2.3.4/a.js', 'https://172.31.2.3/a.js', 'https://192.168.1.1/a.js', 'https://[::1]/a.js', 'https://[fc00::1]/a.js', 'https://name:pass@example.org/a.js', 'https://']) {
    assert.ok(scan(`<script src="${source}"></script>`).some(row => row.rule === '不安全外部脚本来源'), source);
  }
  assert.deepEqual(scan('<script src="https://example.invalid/a.js"></script>'), []);
  assert.deepEqual(scan('<script src="https://[::ffff:8.8.8.8]/a.js"></script>'), []);
  assert.ok(scan('<script src="https://[::ffff:127.0.0.1]/a.js"></script>').some(row => row.level === 'High'));
});

test('high-risk browser APIs and unknown script syntax require attention', () => {
  assert.equal(scan(html('eval(code); document.write(value); document.writeln(value); document.cookie;')).filter(row => row.rule === '高风险 JavaScript API').length, 4);
  assert.ok(scan(html('node.innerHTML = `broken')).some(row => row.level === '需人工复核'));
  assert.ok(scan(html('eval(location.hash);')).some(row => row.level === 'High'));
});

test('Vite fixed roots are rejected, relative/empty bases pass, dynamic bases require review', () => {
  for (const base of ['/', '/game/']) assert.equal(scanText(`export default {base:${JSON.stringify(base)}}`, 'vite.config.ts')[0].level, 'High');
  for (const base of ['./', '']) assert.deepEqual(scanText(`export default {base:${JSON.stringify(base)}}`, 'vite.config.ts'), []);
  assert.equal(scanText('export default {base: process.env.BASE}', 'vite.config.ts')[0].level, '需人工复核');
  assert.equal(scanText('const ROOT = "/fixed/"; export default {base: ROOT}', 'vite.config.ts')[0].level, 'High');
});

test('directory scan checks all names, default exclusions, backend files, UTF-8 warnings and exact counts', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'static-web-scan-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.writeFileSync(path.join(root, 'index.html'), '<p>safe</p>');
  fs.mkdirSync(path.join(root, '中文'));
  fs.writeFileSync(path.join(root, '中文', 'note.txt'), 'x');
  for (const excluded of excludedDirectories) {
    fs.mkdirSync(path.join(root, excluded));
    fs.writeFileSync(path.join(root, excluded, '中文.html'), '<iframe>');
  }
  fs.writeFileSync(path.join(root, 'broken.htm'), Buffer.from([0xff]));
  fs.writeFileSync(path.join(root, 'server.js'), 'server');
  const report = scanDirectory(root);
  assert.equal(report.htmlFiles, 2);
  assert.equal(report.counts.High, 1);
  assert.equal(report.counts.Medium, 2);
  assert.equal(report.counts['需人工复核'], 1);
  assert.equal(report.scannedPaths, 5);
  assert.equal(scanDirectory(path.join(root, 'dist')).htmlFiles, 1);
});

test('vendored sanitizer bytes match their pinned upstream record', () => {
  const root = new URL('../', import.meta.url);
  const record = JSON.parse(fs.readFileSync(new URL('docs/third-party/dompurify.json', root)));
  assert.equal(record.version, '3.4.18');
  assert.equal(createHash('sha256').update(fs.readFileSync(new URL(record.path, root))).digest('hex'), record.sha256);
  assert.equal(createHash('sha256').update(fs.readFileSync(new URL(record.sourceMap.path, root))).digest('hex'), record.sourceMap.sha256);
});

test('standalone HTML and actual Vite source entry have no findings after remediation', () => {
  for (const name of ['web/public/playable-v2.html', 'web/index.html', 'web/vite.config.ts']) assert.deepEqual(scanText(fs.readFileSync(new URL('../' + name, import.meta.url), 'utf8'), name), [], name);
});

test('offline package includes exact game/vendor bytes, uses only portable paths and refuses overwrite', t => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'static-game-package-'));
  t.after(() => fs.rmSync(temporary, {recursive: true, force: true}));
  const output = path.join(temporary, 'game');
  const python = process.platform === 'win32' ? 'python' : 'python3';
  execFileSync(python, ['scripts/package-static-v2.py', output]);
  const archive = fs.readFileSync(output + '.zip');
  assert.deepEqual(fs.readFileSync(path.join(output, 'index.html')), fs.readFileSync(new URL('../web/public/playable-v2.html', import.meta.url)));
  assert.ok(fs.existsSync(path.join(output, 'vendor/dompurify-3.4.18/purify.min.js')));
  assert.equal(scanDirectory(output).passed, true);
  const manifest = JSON.parse(fs.readFileSync(path.join(output, 'manifest.json')));
  for (const row of manifest.files) assert.equal(createHash('sha256').update(fs.readFileSync(path.join(output, row.path))).digest('hex'), row.sha256);
  assert.throws(() => execFileSync(python, ['scripts/package-static-v2.py', output], {stdio: 'pipe'}), /failed/);
  assert.deepEqual(fs.readFileSync(output + '.zip'), archive);
});
