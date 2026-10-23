# C9 原full红例的布局就绪只读复核

2026-10-24。仅离线读取原full C9的trace.zip、实际geometry、App与既有CSS；未改prod/test、未启动浏览器或推进游戏钟。原source1/2定向叶子绿与当前full红均保留，当前完整293尚未终态。本记录不将原红抹成通过，也不凭稍后截图认定早期hit断言错误。

## 同一流程内的先后证据

trace：`artifacts/goal-4/check-art-02/ui-final-results/check-art-02-CHECK2-A9-a-f-9ff1a-n-a-fresh-unarranged-choice-chromium/trace.zip`，以下为`0-trace.trace`单调时间，单位ms：

| 点 | 时间 | 实际证据 |
| --- | ---: | --- |
| 释放持有的checkpoint完成交付 | call3299 164598.420—164634.604 | 随后的after snapshot在164646.218，error-banner已存在，原确认已离开；app inline仍`--notice-height:0px` |
| 状态/错误断言完成 | call3301结束164658.827、call3303结束164670.781 | 同步待核对/连接关闭文字已进DOM；这不保证ResizeObserver测量已交付 |
| 原geometry | call3309 164712.577—164728.085 | guide-open y125.5—169.5；error-banner y114—189，中心147.5确被banner截获，hit=false有真实矩形依据 |
| 原截图调用 | call3311 164735.863—165962.133 | 此后snapshot在165967.287，inline变为`--notice-height:89px`；原PNG与后续画面按钮约y215—259，已移到banner之后 |

截图与geometry不是同一时刻，不能拿后PNG替早矩形。trace首个后续可用screencast仍展示旧确认画面，后续才展示错误横幅和下移后的舞台，亦说明DOM断言、布局采样和绘制帧不是一个握手。离线提取的两个原trace JPEG保存在`artifacts/goal-4/check-art-02/c9-layout-offline/`，没有缩放或改图；只是辅助核对先后，不扩充整体像素验收。

没有原生ResizeObserver回调自身的埋点，故不能把snapshot时间当精确回调时间，也不能把截图调用约1.2秒耗时全部归于ResizeObserver。可以确认的是本次geometry发生在占位尚未跟随横幅更新的状态，而后同次流程已经自行达到正确布局；目前没有这一个按钮永久被挡的证据。

## 源码与矩形一致

App的noticeRegion watcher为flush:post，创建ResizeObserver，回调测整个`.stage-alerts`的getBoundingClientRect().height，然后设置noticeHeight为`height ? height+8 : 0`。error子树更新后依赖浏览器交付新的测量，不是store.error文字一出现就同步完成。

stage-r1.css将主舞台/普通功能主容器定位到`--stage-top:calc(120px + var(--notice-height,0px))`，横幅绝对放在y114且z-index19，header按钮层级较低。故inline0时guide y125.5与原矩形一致；89px生效后guide应整体加89到约214.5，和后PNG所见约215吻合。必须测整个stage-alerts而非只测error-banner：该grid还包含原反馈层/间距，本次占位89不等于仅banner75加8。

这支持“原几何采样尚未完成当前布局测量交付”的解释；它不是放宽几何/真实点击门槛的理由，也不证明所有时序都无产品问题。

## C9局部最小验证握手

等当前full实际终态后，由QA仅在C9现有`同步待核对`及连接关闭错误已经可见的断言之后、原frame采样之前，加一次原8秒窗口内的只读poll：

```ts
await expect.poll(async()=>page.evaluate(()=>{
  const app=document.querySelector<HTMLElement>('.app-shell');
  const region=app?.querySelector<HTMLElement>('.stage-alerts');
  if(!app?.classList.contains('immersive-stage')||!region)return false;
  const actual=region.getBoundingClientRect().height;
  const measured=parseFloat(app.style.getPropertyValue('--notice-height'));
  return Number.isFinite(measured)&&Math.abs(measured-(actual?actual+8:0))<=.5;
}),{timeout:8000}).toBe(true);
```

此poll只等原生产测量与当前真实区域一致，不poll hit、不写style/Store，不补假信号。前置错误已可见须保留，避免在尚未插入错误时0=0提前满足。没有sleep、force click、截图先行当隐式等待、额外游戏时间或扩大动作/用例时限。

握手后仍执行原完整geometry/hit、祖先/正文18px/辅助14px/控件44px/无裁切与截图；再实际点guide-open、返回，核原Game/Activity/全DB不变。不能只留下占位相等断言而删除原失败条件。

若8秒内占位不一致，或一致后仍hit=false/矩形相交，继续视为未修红，保新trace并据实定位真实产品测量/定位问题；不得重复加等待、吞断言或自动更改生产布局。本次没有足够依据在原293仍跑时预防性修改App/ResizeObserver/CSS，更不能把C5原已绿的写/同步交付时序改来掩盖这个界面握手。
