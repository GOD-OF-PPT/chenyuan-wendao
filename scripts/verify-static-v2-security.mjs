import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.resolve(process.argv[2] ?? 'artifacts/static-v2-security');
const original = process.argv[3] ? fs.readFileSync(process.argv[3]) : null;
fs.mkdirSync(output, {recursive: false});
const require = createRequire(path.join(root, 'web/package.json'));
const {chromium} = require('@playwright/test');
const current = fs.readFileSync(path.join(root, 'web/public/playable-v2.html'));
const vendorRoot = path.join(root, 'web/public/vendor/dompurify-3.4.18');
const key = 'chenyuan_wendao_v4_save';
const payload = '<img src="x" onerror="window.__storedXss=1">';
const report = {viewport: {width: 1440, height: 900}, checks: [], baselineReproduced: false, externalRequests: [], pageErrors: []};
const server = http.createServer((req, res) => {
  if (req.url === '/baseline/index.html' && original) { res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'}); res.end(original); return; }
  if (['/fixed/subdir/index.html', '/missing/index.html'].includes(req.url)) { res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'}); res.end(current); return; }
  const vendor = req.url?.match(/^\/fixed\/subdir\/vendor\/dompurify-3\.4\.18\/(purify\.min\.js(?:\.map)?)$/);
  if (vendor) { res.writeHead(200, {'Content-Type': 'text/javascript'}); res.end(fs.readFileSync(path.join(vendorRoot, vendor[1]))); return; }
  if (req.url === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  res.writeHead(404); res.end('not found');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
let browser;
try {
  browser = await chromium.launch({headless: true});
  const freshPage = async () => {
    const context = await browser.newContext({viewport: report.viewport});
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (['data:', 'file:', 'blob:'].includes(url.protocol) || url.origin === origin) return route.continue();
      report.externalRequests.push(url.href);
      return route.abort();
    });
    return {context, page: await context.newPage()};
  };
  const start = async page => {
    await page.locator('#btn-start-new').click();
    await page.locator('[data-opening="leave"]').click();
  };
  let bundle;
  {
    const {context, page} = await freshPage();
    await page.goto(origin + (original ? '/baseline/index.html' : '/fixed/subdir/index.html'), {waitUntil: 'load'});
    await start(page);
    bundle = await page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey)), key);
    bundle.game.name = payload;
    bundle.game.journal = [payload];
    if (original) {
      await page.evaluate(({key, bundle}) => localStorage.setItem(key, JSON.stringify(bundle)), {key, bundle});
      await page.reload({waitUntil: 'load'});
      await page.locator('#btn-continue-save').click();
      await page.locator('#btn-open-profile').click();
      await page.waitForFunction(() => window.__storedXss === 1, null, {timeout: 5000});
      report.baselineReproduced = true;
    }
    await context.close();
  }
  {
    const {context, page} = await freshPage();
    page.on('pageerror', error => report.pageErrors.push(error.message));
    await context.addInitScript(({key, bundle}) => localStorage.setItem(key, JSON.stringify(bundle)), {key, bundle});
    await page.goto(origin + '/fixed/subdir/index.html', {waitUntil: 'load'});
    await page.locator('#btn-continue-save').click();
    await page.locator('#btn-open-profile').click();
    assert.ok((await page.locator('#modal-content').innerText()).includes(payload));
    assert.equal(await page.evaluate(() => window.__storedXss ?? null), null);
    assert.equal(await page.locator('#modal-content [onerror]').count(), 0);
    await page.locator('[data-modal-close]').click();
    await page.locator('#nav-btn-bag').click();
    assert.ok((await page.locator('#panel-scroll-body').innerText()).includes(payload));
    assert.equal(await page.evaluate(() => window.__storedXss ?? null), null);
    report.checks.push('stored player-name/journal payload stays literal text and never executes');
    const attackChecks = await page.evaluate(() => {
      const attacks = [
        '<img src=x onerror="window.__storedXss=2">',
        '<svg onload="window.__storedXss=2"><circle r="2" /></svg>',
        '<iframe srcdoc="<script>window.__storedXss=2<\/script>"></iframe>',
        '<object data="data:text/html,x"></object>',
        '<a href="java&#x73;cript:window.__storedXss=2">x</a>',
        '<form action="data:text/html,x"><input autofocus formaction="javascript:alert(1)"></form>',
        '<meta http-equiv="refresh" content="0;url=https://example.invalid">',
        '<img src="https://example.invalid/x" srcset="https://example.invalid/y 1x">',
        '<div style="background:url(https://example.invalid/x)">x</div>',
        '<img src="data:image/svg+xml,<svg onload=alert(1)>">'
      ];
      return attacks.map(input => {
        const target = document.createElement('div');
        target.innerHTML = window.DOMPurify.sanitize(input);
        const badTags = target.querySelectorAll('script,iframe,frame,object,embed,style,form,meta,link,base,a,foreignObject').length;
        const badAttributes = [...target.querySelectorAll('*')].flatMap(node => [...node.attributes].filter(attr => /^on/i.test(attr.name) || ['srcset', 'formaction', 'autofocus'].includes(attr.name) || (['src', 'href', 'xlink:href', 'action', 'poster', 'background'].includes(attr.name) && !attr.value.startsWith('#')) || (attr.name === 'style' && /url|https:|data:/i.test(attr.value))).map(attr => attr.name));
        return {input, badTags, badAttributes};
      });
    });
    for (const check of attackChecks) { assert.equal(check.badTags, 0, check.input); assert.deepEqual(check.badAttributes, [], check.input); }
    report.attackCases = attackChecks.length;
    assert.equal(await page.evaluate(() => window.DOMPurify.version), '3.4.18');
    report.checks.push('10 active-document/event/protocol/network/CSS payloads removed by the real pinned sanitizer');
    await context.close();
  }
  {
    const {context, page} = await freshPage();
    page.on('pageerror', error => report.pageErrors.push(error.message));
    await page.goto(origin + '/fixed/subdir/index.html', {waitUntil: 'load'});
    await start(page);
    for (const tab of ['story', 'explore', 'alchemy', 'bag', 'cultivate']) {
      await page.locator('#nav-btn-' + tab).click();
      assert.ok((await page.locator('#panel-scroll-body').innerText()).trim());
    }
    assert.ok(await page.locator('svg path').count() > 10);
    await page.waitForFunction(() => !document.getElementById('hud-xp-txt').textContent.startsWith('0/'));
    await page.waitForFunction(() => document.getElementById('toast-container').children.length === 0);
    assert.deepEqual(await page.locator('img[src]').evaluateAll(images => images.filter(image => !image.complete || !image.naturalWidth).map(image => image.alt)), []);
    await page.screenshot({path: path.join(output, 'normal-cave.png')});
    await page.reload({waitUntil: 'load'});
    await page.locator('#btn-continue-save').click();
    assert.ok((await page.locator('#stage-title').innerText()).includes('听雨洞府'));
    report.checks.push('nested HTTP path: new life, all five tabs, SVG icons, all visible images, native cultivation and refresh continuation');
    await page.waitForFunction(() => { const button = document.querySelector('[data-action="breakthrough"]'); return button && !button.disabled; }, null, {timeout: 45000});
    await page.locator('[data-action="breakthrough"]').click();
    assert.ok(await page.locator('#meridian-needle').count());
    await page.locator('[data-action="confirm-meridian-strike"]').click();
    await page.locator('[data-pick-law]').first().click();
    await page.locator('[data-school="sword"]').click();
    await page.locator('[data-pet="fox"]').click();
    await page.locator('#nav-btn-explore').click();
    await page.locator('[data-travel="wilderness"]').click();
    await page.locator('[data-action="start-expedition"]').click();
    assert.ok(await page.locator('[data-constellation-node]').count() > 0);
    await page.locator('[data-action="quit-expedition"]').click();
    await page.locator('[data-hunt="wolf"]').click();
    assert.ok((await page.locator('#panel-scroll-body').innerText()).includes('见招拆招'));
    await page.screenshot({path: path.join(output, 'normal-battle.png')});
    const combatState = () => page.evaluate(storageKey => {
      const game = JSON.parse(localStorage.getItem(storageKey)).game;
      return {battle: game.battle, wins: game.wins};
    }, key);
    const beforeMove = await combatState();
    await page.locator('[data-move="builder"]').click();
    const afterMove = await combatState();
    report.combatOutcome = {beforeWins: beforeMove.wins, afterWins: afterMove.wins, battleStillActive: !!afterMove.battle};
    if (afterMove.battle) assert.ok(afterMove.battle.enemyHp < beforeMove.battle.enemyHp);
    else assert.equal(afterMove.wins, beforeMove.wins + 1, 'A finished battle must have actually saved its victory');
    report.checks.push('normal native-time breakthrough, law selection, sword school, fox adoption, SVG expedition and battle controls still work');
    await context.close();
  }
  {
    const {context, page} = await freshPage();
    await page.goto(origin + '/missing/index.html', {waitUntil: 'load'});
    assert.ok((await page.locator('[role="alert"]').innerText()).includes('安全组件加载失败'));
    assert.ok(await page.locator('#btn-start-new').isDisabled());
    report.checks.push('missing sanitizer fails closed with a readable message and disabled start');
    await context.close();
  }
  {
    const {context, page} = await freshPage();
    page.on('pageerror', error => report.pageErrors.push(error.message));
    await page.goto(pathToFileURL(path.join(root, 'web/public/playable-v2.html')).href, {waitUntil: 'load'});
    assert.ok(await page.locator('#btn-start-new').isEnabled());
    await start(page);
    assert.ok((await page.locator('#stage-title').innerText()).includes('听雨洞府'));
    report.checks.push('direct offline file opening resolves the bundled relative sanitizer and starts normally');
    await context.close();
  }
  assert.deepEqual(report.pageErrors, []);
  assert.deepEqual(report.externalRequests, []);
  report.passed = true;
  console.log(JSON.stringify(report, null, 2));
} catch (error) { report.passed = false; report.error = error.stack; process.exitCode = 1; console.error(error.stack); }
finally {
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
