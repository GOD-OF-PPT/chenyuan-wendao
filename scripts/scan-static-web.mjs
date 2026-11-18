import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

export const excludedDirectories = new Set(['node_modules', '.git', '.svn', '.hg', 'dist', 'build', '.cache', '.turbo', '.next', 'coverage', 'Library', 'Temp', 'Logs']);
const configs = new Set(['vite.config.ts', 'vite.config.js', 'vite.config.mts', 'vite.config.mjs']);
const lineAt = (text, offset) => text.slice(0, offset).split('\n').length;
const absolute = value => /^(?:\/(?!\/)|\\|[a-z]:[\\/]|file:\/\/\/)/i.test(value.trim());
const snippet = value => value.replace(/\s+/g, ' ').slice(0, 240);
const privateV4 = parts => parts[0] === 0 || parts[0] === 10 || parts[0] === 127 || parts[0] >= 224 || (parts[0] === 169 && parts[1] === 254) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168) || (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127);
function privateAddress(host) {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return privateV4(host.split('.').map(Number));
  if (!host.includes(':')) return false;
  const [left, right] = host.split('::');
  const before = left ? left.split(':') : [], after = right ? right.split(':') : [];
  const words = (host.includes('::') ? [...before, ...Array(8 - before.length - after.length).fill('0'), ...after] : before).map(word => parseInt(word, 16));
  if (words.length !== 8) return true;
  if (words.slice(0, 5).every(word => word === 0) && words[5] === 0xffff) return privateV4([words[6] >> 8, words[6] & 255, words[7] >> 8, words[7] & 255]);
  return words.every(word => word === 0) || (words.slice(0, 7).every(word => word === 0) && words[7] === 1) || (words[0] & 0xfe00) === 0xfc00 || (words[0] & 0xffc0) === 0xfe80 || (words[0] & 0xff00) === 0xff00;
}
const decode = value => value.replace(/&#(?:x([\da-f]+)|(\d+));?/gi, (_, hex, decimal) => {
  const number = parseInt(hex ?? decimal, hex ? 16 : 10);
  return number <= 0x10ffff ? String.fromCodePoint(number) : '\ufffd';
}).replace(/&colon;/gi, ':').replace(/&tab;/gi, '\t').replace(/&newline;/gi, '\n').replace(/&amp;/gi, '&');

function attributes(text) {
  return [...text.matchAll(/\b([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(match => ({name: match[1].toLowerCase(), value: decode(match[2] ?? match[3] ?? match[4]), offset: match.index, raw: match[0]}));
}

export function scanText(text, file) {
  const found = [];
  const add = (offset, rule, level, evidence, reason, fix) => found.push({file, line: lineAt(text, offset), rule, level, evidence: snippet(evidence), reason, fix});
  const fixedPath = (offset, evidence) => add(offset, '绝对路径或固定资源路径', 'High', evidence, '资源依赖站点根目录或固定本机位置，不能随静态包移动。', '改为包内相对路径，并核对实际资源位置。');
  const dataUri = (offset, value, evidence, attribute) => {
    const high = attribute === 'action' || /^data:(?:text\/(?:html|javascript)|application\/javascript|image\/svg\+xml)/i.test(value);
    add(offset, '活跃源属性中的 Data URI', high ? 'High' : 'Medium', evidence, high ? '活跃上下文或可执行文档可造成脚本执行或跳转。' : '内嵌数据源需要核对MIME、内容与交付策略。', '使用经核对的包内相对资源；不要以内嵌HTML/SVG作为活跃文档。');
  };
  const externalScript = (offset, value, evidence) => {
    if (!/^(?:https?:\/\/|\/\/)/i.test(value)) return;
    let bad = false;
    try {
      const url = new URL(value.startsWith('//') ? 'http:' + value : value);
      const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
      bad = url.protocol !== 'https:' || !host || !!url.username || !!url.password || /(?:^localhost$|\.localhost$|\.local$)/.test(host) || privateAddress(host);
    } catch { bad = true; }
    if (bad) add(offset, '不安全外部脚本来源', 'High', evidence, '脚本来源不是普通公网HTTPS地址，或指向本地/私网。未进行DNS或联网验证。', '优先随包分发固定版本脚本；否则使用经过核对的公网HTTPS来源。');
  };

  if (configs.has(path.basename(file))) {
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    const constants = new Map();
    const valueOf = (node, seen = new Set()) => {
      if (ts.isStringLiteralLike(node)) return node.text;
      if (ts.isParenthesizedExpression(node)) return valueOf(node.expression, seen);
      if (ts.isIdentifier(node) && constants.has(node.text) && !seen.has(node.text)) return valueOf(constants.get(node.text), new Set([...seen, node.text]));
      return null;
    };
    const declarations = node => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) constants.set(node.name.text, node.initializer);
      ts.forEachChild(node, declarations);
    };
    declarations(source);
    const visit = node => {
      if (ts.isPropertyAssignment(node) && node.name.getText(source).replace(/['"]/g, '') === 'base') {
        const value = valueOf(node.initializer);
        if (value?.startsWith('/')) add(node.getStart(source), '构建配置固定基路径（Vite base）', 'High', node.getText(source), '固定根路径/子路径不适合任意静态目录交付。', '将base设为"./"或空字符串，重新构建并核对产物。');
        else if (value === null) add(node.getStart(source), '动态 Vite base', '需人工复核', node.getText(source), '静态检查无法确定实际部署基路径。', '核对实际构建配置和产物资源引用。');
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    return found;
  }
  if (!/\.html?$/i.test(file)) return found;

  for (const match of text.matchAll(/<(?:iframe|frame|object|embed)\b/gi)) add(match.index, '危险嵌入内容标签', 'High', match[0], '嵌入的活跃文档或插件内容不符合静态交付规则。', '移除嵌入内容，改用安全DOM或普通静态资源。');
  for (const match of text.matchAll(/<meta\b[^>]*>/gi)) {
    if (attributes(match[0]).some(a => a.name === 'http-equiv' && a.value.trim().toLowerCase() === 'refresh')) add(match.index, 'Meta Refresh 跳转', 'High', match[0], '页面可自动强制跳转。', '删除自动跳转，保留清晰的用户操作入口。');
  }
  for (const attr of attributes(text)) {
    if (!['src', 'href', 'action', 'data', 'poster'].includes(attr.name)) continue;
    const value = attr.value.trim();
    const protocol = value.replace(/[\u0000-\u0020]/g, '');
    if (absolute(value)) fixedPath(attr.offset, attr.raw);
    if (['src', 'href', 'action', 'data'].includes(attr.name) && /^javascript:/i.test(protocol)) add(attr.offset, 'JavaScript 协议引用', 'High', attr.raw, '属性可直接触发脚本执行。', '删除javascript协议，使用事件监听器和安全相对URL。');
    if (['src', 'action'].includes(attr.name) && /^data:/i.test(protocol)) dataUri(attr.offset, protocol, attr.raw, attr.name);
  }
  for (const match of text.matchAll(/url\(\s*(['"]?)([^)'"\r\n]+)\1\s*\)/gi)) if (absolute(match[2])) fixedPath(match.index, match[0]);
  for (const match of text.matchAll(/<script\b([^>]*)>/gi)) {
    for (const attr of attributes(match[1])) if (attr.name === 'src') externalScript(match.index, attr.value.trim(), match[0]);
  }
  for (const match of text.matchAll(/\beval\s*\(|\bdocument\s*\.\s*(?:write|writeln)\s*\(|\bdocument\s*\.\s*cookie\b/gi)) add(match.index, '高风险 JavaScript API', 'Medium', match[0], '动态执行、文档写入或Cookie访问需要核对数据来源。', '使用安全DOM操作；不要执行不可信字符串或通过文档写入拼装页面。');

  const literal = node => {
    if (ts.isStringLiteralLike(node)) return node.text;
    if (ts.isParenthesizedExpression(node)) return literal(node.expression);
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const left = literal(node.left), right = literal(node.right);
      return left === null || right === null ? null : left + right;
    }
    return null;
  };
  for (const script of text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)) {
    const offset = script.index + script[0].indexOf('>') + 1;
    const source = ts.createSourceFile(file + '.js', script[1], ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    for (const error of source.parseDiagnostics) add(offset + (error.start ?? 0), '脚本无法可靠解析', '需人工复核', ts.flattenDiagnosticMessageText(error.messageText, ' '), '脚本语法阻止可靠提取赋值表达式。', '先修正脚本语法，再执行静态扫描。');
    const visit = node => {
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && (ts.isPropertyAccessExpression(node.left) || (ts.isElementAccessExpression(node.left) && ts.isStringLiteralLike(node.left.argumentExpression)))) {
        const property = ts.isPropertyAccessExpression(node.left) ? node.left.name.text : node.left.argumentExpression.text;
        if (['src', 'href', 'action', 'poster', 'data'].includes(property)) {
          const value = literal(node.right);
          if (value !== null && absolute(value)) fixedPath(offset + node.getStart(source), node.getText(source));
        }
        if (['innerHTML', 'outerHTML'].includes(property)) {
          const right = node.right;
          const sanitized = ts.isCallExpression(right) && ['DOMPurify.sanitize', 'sanitizeHtml', 'filterXSS'].includes(right.expression.getText(source));
          if (!sanitized) {
            const value = literal(right);
            const evidence = node.getText(source);
            if (value === null) add(offset + node.getStart(source), '不安全的 innerHTML / outerHTML 动态赋值', 'High', evidence, '未清洗的动态内容进入HTML解析器；存档、用户输入或外部内容可改变DOM。', '使用真实HTML清洗库；纯文本用textContent，并对不可信文本进行编码。');
            else if (/<(?:script|iframe|frame|object|embed)\b|\bon\w+\s*=|javascript:|http-equiv\s*=\s*["']?refresh/i.test(value)) add(offset + node.getStart(source), '危险静态 HTML 赋值', 'High', evidence, '静态HTML仍含活跃脚本、事件或跳转内容。', '移除危险标记/协议或经过真实HTML清洗。');
            else if (/\b(?:src|action)\s*=\s*["']data:/i.test(value)) dataUri(offset + node.getStart(source), value.match(/data:[^"']*/i)?.[0] ?? '', evidence, /\baction\s*=/i.test(value) ? 'action' : 'src');
          }
        }
      }
      if (ts.isCallExpression(node) && /^(?:fetch|importScripts|import)$/.test(node.expression.getText(source))) {
        const first = node.arguments[0];
        if (first && ts.isStringLiteralLike(first) && absolute(first.text)) fixedPath(offset + node.getStart(source), node.getText(source));
      }
      if (ts.isCallExpression(node) && ['eval', 'document.write', 'document.writeln'].includes(node.expression.getText(source))) {
        const argument = node.arguments[0];
        const input = argument?.getText(source) ?? '';
        const value = argument ? literal(argument) : null;
        if (/\blocation\.(?:href|hash|search)\b|\b(?:localStorage|sessionStorage)\.getItem\b|\.value\b/.test(input) || (value !== null && /<script\b|javascript:|<(?:iframe|object|embed)\b/i.test(value))) add(offset + node.getStart(source), '高风险 JavaScript API', 'High', node.getText(source), '高风险API直接消费明显的用户/外部数据或活跃HTML。', '使用安全DOM和明确的数据类型，不执行这些输入。');
      }
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'setAttribute' && node.arguments.length >= 2) {
        const name = literal(node.arguments[0]), value = literal(node.arguments[1]);
        if (['src', 'href', 'action', 'poster', 'data'].includes(name) && value !== null && absolute(value)) fixedPath(offset + node.getStart(source), node.getText(source));
      }
      if (ts.isNewExpression(node) && node.expression.getText(source) === 'URL' && node.arguments?.length) {
        const value = literal(node.arguments[0]);
        if (value !== null && absolute(value)) fixedPath(offset + node.getStart(source), node.getText(source));
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return found;
}

export function scanDirectory(directory) {
  const root = path.resolve(directory), findings = [];
  let htmlFiles = 0, configFiles = 0, paths = 0;
  const read = (file, relative) => {
    try { return new TextDecoder('utf-8', {fatal: true}).decode(fs.readFileSync(file)); }
    catch (error) { findings.push({file: relative, line: null, rule: '文件不可读', level: '需人工复核', evidence: snippet(error.message), reason: '无法按UTF-8可靠读取。', fix: '修正权限或文本编码后重新扫描。'}); return null; }
  };
  const walk = folder => {
    let entries;
    try { entries = fs.readdirSync(folder, {withFileTypes: true}); }
    catch (error) { findings.push({file: path.relative(root, folder) || '.', line: null, rule: '目录不可读', level: '需人工复核', evidence: snippet(error.message), reason: '无法枚举该目录，未静默跳过。', fix: '修正权限后重新扫描。'}); return; }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
      const full = path.join(folder, entry.name), relative = path.relative(root, full).split(path.sep).join('/');
      paths++;
      if (/[\u4e00-\u9fff]/.test(relative)) findings.push({file: relative, line: null, rule: '路径包含中文', level: 'Medium', evidence: relative, reason: '命名可能影响静态包URL或下游交付工具。', fix: '改为ASCII名称并同步所有内部引用。'});
      if (entry.isSymbolicLink()) { findings.push({file: relative, line: null, rule: '目录包含符号链接', level: '需人工复核', evidence: relative, reason: '不递归访问可能指向包外的链接。', fix: '交付实际文件，或明确核对链接归属。'}); continue; }
      if (entry.isDirectory()) { walk(full); continue; }
      if (/^(?:server\.js|app\.py|main\.go)$/i.test(entry.name) || /\.(?:php|jsp|aspx|ejs|pug|jinja2?)$/i.test(entry.name)) findings.push({file: relative, line: null, rule: '非静态 Web 交付', level: 'High', evidence: relative, reason: '包内存在后端入口或服务端模板。', fix: '只交付浏览器可执行的静态产物，不要求包内后端。'});
      if (/\.html?$/i.test(entry.name) || configs.has(entry.name)) {
        if (/\.html?$/i.test(entry.name)) htmlFiles++; else configFiles++;
        const text = read(full, relative);
        if (text !== null) findings.push(...scanText(text, relative));
      } else if (/^readme(?:\.(?:md|txt))?$/i.test(entry.name)) {
        const text = read(full, relative);
        if (text !== null) for (const match of text.matchAll(/(?:node\s+server\.js|python(?:3)?\s+app\.py|go\s+run\s+main\.go)/gi)) findings.push({file: relative, line: lineAt(text, match.index), rule: '依赖包内后端启动', level: 'High', evidence: match[0], reason: '交付说明要求启动包内后端。', fix: '交付纯静态内容，去除后端启动前提。'});
      }
    }
  };
  walk(root);
  const deduplicated = new Map(), risk = {'需人工复核': 0, Medium: 1, High: 2};
  for (const row of findings) {
    const key = [row.file, row.line, row.rule].join('\0'), old = deduplicated.get(key);
    if (!old || risk[row.level] > risk[old.level]) deduplicated.set(key, row);
  }
  const unique = [...deduplicated.values()];
  const counts = Object.fromEntries(['High', 'Medium', '需人工复核'].map(level => [level, unique.filter(row => row.level === level).length]));
  return {format: 'chenyuan-web-zip-scan', version: 1, root, htmlFiles, configFiles, scannedPaths: paths, excludedDirectories: [...excludedDirectories], findings: unique, counts, passed: !unique.length};
}

export function markdown(report) {
  if (report.passed) return ['# Web Zip 安全扫描报告', '', `扫描路径: ${report.root}`, `扫描的 HTML 文件数: ${report.htmlFiles}`, '问题统计: 0', '', '## 总体结论', '', '通过。本次扫描未命中本技能定义的安全规则。', '', '## 备注', '', '默认排除目录：' + report.excludedDirectories.join('、') + '。', '本次仅对路径、HTML/HTM和支持的Vite配置进行了静态扫描，不能证明交付包不存在所有安全漏洞。', '独立JS文件只参加路径检查；清洗库来源及行为测试另行记录。', ''].join('\n');
  const lines = ['# Web Zip 安全扫描报告', '', `扫描路径: ${report.root}`, `扫描的 HTML 文件数: ${report.htmlFiles}`, `问题统计: 共 ${report.findings.length} 项，其中高风险 ${report.counts.High} 项，中风险 ${report.counts.Medium} 项，需人工复核 ${report.counts['需人工复核']} 项`, '', '## 总体结论', '', report.passed ? '通过。本次扫描未命中本技能定义的安全规则。' : report.counts.High || report.counts.Medium ? '需修复' : '需人工复核'];
  for (const [level, title, prefix] of [['High', '高风险', 'H'], ['Medium', '中风险', 'M'], ['需人工复核', '需人工复核', 'R']]) {
    lines.push('', '## ' + title);
    report.findings.filter(row => row.level === level).forEach((row, i) => lines.push('', `### ${prefix}-${i + 1} ${row.rule}`, `- 文件: ${row.file}`, `- 行号: ${row.line ?? 'N/A'}`, `- 证据: \`${row.evidence.replaceAll('`', "'")}\``, `- 原因: ${row.reason}`, `- 修复: ${row.fix}`));
  }
  if (report.findings.length) lines.push('', '## 建议修复顺序', '', '1. 先修复所有高风险问题。', '2. 再修复或说明所有中风险问题。', '3. 最后复核无法可靠解析的动态内容。');
  lines.push('', '## 备注', '', '默认排除目录：' + report.excludedDirectories.join('、') + '。', '仅检查路径、HTML/HTM及支持的Vite配置；不执行页面、不联网校验外部脚本、不替代完整渗透测试。', '独立JS文件只参加路径检查；清洗库来源及行为测试另行记录。', '');
  return lines.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [directory, output] = process.argv.slice(2);
  if (!directory) throw new Error('Usage: node scripts/scan-static-web.mjs <directory> [new-report-prefix]');
  const report = scanDirectory(directory);
  if (output) {
    fs.mkdirSync(path.dirname(output), {recursive: true});
    fs.writeFileSync(output + '.json', JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
    fs.writeFileSync(output + '.md', markdown(report), {flag: 'wx'});
  }
  console.log(JSON.stringify({root: report.root, htmlFiles: report.htmlFiles, counts: report.counts, passed: report.passed}));
  process.exitCode = report.passed ? 0 : 1;
}
