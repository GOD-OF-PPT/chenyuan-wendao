import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {captureFixedPng} from '../e2e/png-capture';

test.use({viewport:{width:1440,height:900},deviceScaleFactor:1});
test('fixed PNG evidence preserves every decoded pixel without advancing the clock or creating Game storage',async({page},info)=>{
 await page.clock.install();await page.clock.pauseAt(new Date('2040-01-01T00:00:00Z'));
 await page.route('**/png-capture-probe',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:1440px;height:900px;overflow:hidden;background:linear-gradient(115deg,#08262d,#34615d,#111e29);color:#e9e4c5;font:18px serif}article{margin:80px;padding:40px;border:2px solid #bca577;background:#12353bdc}h1{font-size:32px}small{font-size:14px}.jade{color:#9cd5ba}button{height:48px;padding:0 24px;border:1px solid #c3a774;background:#1d5650;color:inherit;font:inherit}.shape{height:260px;background:radial-gradient(ellipse at 25% 35%,#d5e5ce80,transparent 65%),linear-gradient(27deg,#08414a80,#b8954930);border-radius:40%}</style><article><h1 id="proof-title">尘缘问道 · 原始 PNG 像素核对</h1><p class="jade">气血 74 / 170　灵力 92 / 100　尚余 23.0 秒</p><p>完整正文、细线、渐变与透明混色均须保留。</p><small>辅助文字 14px · 单一固定桌面</small><div class="shape"></div><button>返回当前对象</button></article>'}));
 await page.goto('/png-capture-probe');await expect(page.locator('#proof-title')).toBeVisible();
 const before=await page.evaluate(async()=>({clock:Date.now(),databases:await indexedDB.databases()}));expect(before.databases).toEqual([]);
 const original=info.outputPath('original-playwright.png'),optimized=info.outputPath('native-lossless.png');
 await page.screenshot({path:original});const result=await captureFixedPng(page,optimized);expect(result).toMatchObject({width:1440,height:900});
 const pixels=JSON.parse(execFileSync('python3',['-c',[
  'from PIL import Image',
  'import hashlib,json,sys',
  'a0,b0=Image.open(sys.argv[1]),Image.open(sys.argv[2])',
  'assert a0.format==b0.format=="PNG"',
  'a,b=a0.convert("RGBA"),b0.convert("RGBA")',
  'assert a.size==b.size==(1440,900)',
  'assert a.tobytes()==b.tobytes(),"Decoded PNG pixels differ"',
  'print(json.dumps({"equalRGBA":True,"width":a.width,"height":a.height,"rgbaSHA256":hashlib.sha256(a.tobytes()).hexdigest()}))'
 ].join('\n'),original,optimized],{encoding:'utf8'}));expect(pixels.equalRGBA).toBe(true);
 expect(await page.evaluate(async()=>({clock:Date.now(),databases:await indexedDB.databases()}))).toEqual(before);
 await info.attach('exact-decoded-pixel-proof',{body:JSON.stringify(pixels),contentType:'application/json'});
});
