# CHECK-ART-02 配置短反馈的最小修缮方案

2026-10-24，已完整读取0028；仅方案，不修改生产源或测试，不运行新UI/build。原67ed71b9风险红仍由QA先行。候选补丁保存在`artifacts/goal-4/check-art-02/configuration-plan/`，状态明确为proposal-only；只有原红终态及root解冻授权后才能应用。

## 局部echo：按配置语义与真实eligible清理

将useConfigurationEcho现有两个clear watch合为一个同步watch，来源为：key、eligible、`canonicalFingerprint([game.school,game.loadout])`、活动id/generation/owner。原Game同步watch继续只保存before，完整resolve/原result/Game/slots/公共脱敏及replay/seen证明完全不动。

eligible原本已完整包含visible/hidden/active/available/error/activityPausing。effect只在eligible为真才可能设置，转为假时原watch已经清空；保持假时，visible/hidden/active/pausing的额外clear只是清空同一个null。恢复为真时effect同样已经为null，因此合并watch在false→true多做一次空clear不吞成果。key或活动归属变化仍独立清理；没有改为观察整个Game/revision/completedCycles。

配置语义变化的watch为flush:sync。Store.write先赋新Game，再设置正式result/saved并发owned observation；清旧echo发生在新observe之前。同配置的后续元数据snapshot即使对象引用改变，规范指纹相同，不会把本页刚确认的新合法反馈清掉。普通学习、服丹、采购、月数/修为更新若school/loadout未变，也不会触发这项清理。外页A→B时清掉旧effect，B→A不能复活它；本页下一次真正新确认仍由原tracker产生新sequence。

## 全局FX：复用当前Game同步watch，不拼viewKey

在ActionFeedbackStage的现有Game同步watch内，把当前可见上下文的失效条件扩为run变化或`buildKey(after)!==buildKey(old)`；不追加异步viewKey变化。buildKey只序列化school及按键排序后的loadout entries：

```ts
const buildKey=(g:Game|null)=>JSON.stringify([g?.school,Object.entries(g?.loadout??{}).sort()]);
```

Game已经经过正式schema校验，loadout为四个固定槽的标量字符串/null。排序entries使原合法字段顺序重排仍语义相等；这里是当前画面归属键，不是另写Game/receipt proof或授权身份，不修改正式canonicalFingerprint。run仍沿原显式比较。配置改变同步调用原clear，使原notice、短印、数字和actor/scene marks失效，generation取消已经排队的旧nextTick/rAF；随后本页新owned observation沿原完整反馈校验和绘制握手产生真正新演出。

该分支沿原“上下文失效”路径重置lastFailure展示去重键；不清Store.error、pending、原command或retry。故失败/同步门槛仍保持；不会以撤短效假装保存成功。

## 可证明的预算去重

全局只去两处真实重复：mark到期原本重复执行removeClass/removeAttribute/map.delete，改调用原unmark(element)；mark开始时原先额外marks.get/if判断再调用unmark，而unmark自身已有同一get及不存在即返回，改为直接调用它。两者都保留当前class/map、timer取消和最多32项限制，不动任何proof/旧敌人/终态/可见性/异步generation守卫。

不删除clear中的`timer=undefined`来凑字节：保留原定时器句柄清理语义。没有搬代码到新预算、删除功能/正文、加新模块或改cap。

候选是从当前原文件精确替换生成，未应用：

| 组 | 原字节 | 候选字节 | 上限 | 改变 |
| --- | ---: | ---: | ---: | ---: |
| ART03 | 44990 | 44943 | 45000 | -47 |
| 全局Action | 33993 | 33992 | 34000 | -1 |

equipment-effects.ts为4919→4872B；ActionFeedbackStage.vue为10866→10865B。全局新增语义键/同步失效由两个重复路径复用腾出空间；旧34000上限仍仅余8B，后续不能据本候选推定还有宽裕。精确原/候选hash和补丁文件名见`configuration-plan/budget.json`；应用前须再核原hash，不能覆盖根或其他代理的在途变动。

## 红绿与等价边界

1. 原源先锁本页可见、无Activity的功法与本命A→B→A：本页第一次真实保存可演一次；外页改变后旧局部sequence/全局短印及actor光撤下，恢复A不复亮。核document.hidden=false，不能用隐藏已清效的前提替代此例。两外页变更仍走原合法比较/即时原子确认/完整Game与唯一receipt。
2. 本页之后再真正新确认一次，原合法local echo/global cue必须出现一次；未提交quota原意图首次重试可演一次，旧receipt/replay/刷新不补演，显式cancel后fresh仍有新CAS。源补丁不修改这些API。
3. 同run普通LEARN首卷完成且nextCommand前移、BUY/USE成果、v7 DECIDE到Fate与END换Life的合法首次成果继续有效；仅Game对象或无关revision变化不清配置语义。用合法loadout字段顺序重排确认键语义不变。
4. 原visible/hidden/active/available/error/pausing、活动id/gen/owner变化及销毁清理，与全局旧敌人/终态/异步绘制取消仍回归。mark重新标记时旧timer取消，到期仅撤当前标记；32项上限不放宽。

补丁当前没有类型/纯例/UI绿灯，更不是独立工程交付。严格等待root原红终态/解冻；届时只应用获授权范围、冻结实际源，再按0028运行当前授权检查与像素，整体目标/美术/长期/完整矩阵/真人仍开放。
