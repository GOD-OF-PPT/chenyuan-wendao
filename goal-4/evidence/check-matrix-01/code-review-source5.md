# CHECK-MATRIX-01 source5 窄修代码／安全复核

本审查只读source5实际源码、diff与原始报告，唯一新增本文件；未动675冻结输入、其它审查／语义账本、生产、测试、合同或AGENTS，未运行测试／构建／浏览器或看图。结论不复用旧source3身份，不代当前target36、最终full414或HUMAN验收。

**未发现这三处窄修带来的明确必须再改的代码／安全阻断。** END的原位focus保原所有权门槛；己方护体／两药转真实演员；无演员时只压制短表现。实际保存成果、原完整proof／回执／重试均未被改变。K13在source4的真实红仍必须由source5实际复验裁定，不能凭静态相符预写已修好；当前target36及最终full414仍pending。

## 实际受审身份

Runtime `2ef1fcd1532f6815bdd5402cff363d9a8f24dedd6da115c65dbdd3c348c4b05d`，236运行源、62构建文件／7,814,313B；App `007bfc19…`、Stage `3c24db47…`。实际build的每个下列源码hash与本地相同。

| 文件 | bytes | SHA256 |
| --- | ---: | --- |
| `web/src/App.vue` | 148548 | `007bfc19736edcc707371abc918a61aca8d95d4664bc97cd0c4eadd14b52278d` |
| `web/src/ActionFeedbackStage.vue` | 10874 | `3c24db47cb31feb789b92f21714044a9042e080376221746998f29f6e19718f0` |
| `web/src/FeedbackSkip.vue` | 2263 | `4a6ff806b165a34558574ee71139769e1c2ab0abe9d762fe48b5e3010e88ba20` |
| `web/src/action-feedback.ts` | 11195 | `e947bb62b1de54e51f172a2d412110ea662a01b599f0b97061e8c238f31a3606` |
| `web/src/action-motion.css` | 11930 | `fb7d717829fdca981c9fd94050285bca0b23a9aff434f663dd3317d0c20b69d9` |
| `web/src/narrative-objects.css` | 13157 | `b55fa5de92a6ad82600864c5ef648c4a0e489841688f089a2a5f2c8c4ec7ab9a` |
| `web/src/store.ts` | 30246 | `cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7` |

相对HEAD，生产仍只有App、ActionFeedbackStage、action-motion.css、narrative-objects.css四个旧文件＋FeedbackSkip一个新文件。正式src、Store、DB／repository、周期／费用／Game规则／CAS和公共记录schema未改。source4→5运行源逐hash比较仅ActionFeedbackStage不同；本轮新增条件是实际target存在。

全局反馈三文件实际33999／34000B，原14族／12粒子／1600ms不涨；FeedbackSkip2263／4000B，无新位图。仅1B余量是实际预算边界，后续源变仍须重新核hash／cap，不能借审查改宽预算。

## END已有命卷时原位聚焦

`App.vue`的`deliverStageFocus`仍在nextTick前后完整复核原请求的run／id／generation／owner／revision、导航与sync代次、error／replay／暂停、busy／saved／available及dialog／当前焦点归属，且请求一次消费。只有`p.target==='life'`且真实可见的`life-title`已存在，才用原focus服务直接聚焦该标题；否则才沿原showLife打开实际生平。

可见标题经`visibleFocusTarget`筛掉隐藏缓存。原位分支不调用selectTab／showLife、不增reading／导航代次，不重建当前命卷或重置封卷短印章／页签。它也不清Game／Activity、lastResult、Store错误或原回执。新设置／新导航／人生替换仍先使原请求无效，不会因为查到某个标题就跳过原所有权门槛。没有可见标题时的原fallback仍是只读导航，不自动重新END或开始新人生。

原 `idle-stage-ui.spec.ts` 的 **the committed closing seal is anchored inside the life canvas and never crosses the reading tabs or actions** 在 [closure-source3-report](../../../artifacts/goal-4/check-matrix-01/closure-source3-report.json) 实际一红；[target-source4-report](../../../artifacts/goal-4/check-matrix-01/target-source4-report.json) 同一具名例已实际passed/retry0，35项整轮也实际通过。这个原红与绿均保原runtime，不能说成source5终轮；本审查没有看该帧像素。

## 己方动作使用真实当前演员

Stage的battle selector对guard／heal／restore三类取`.battle-player-art`，不再借HUD姓名／头像卡片。`center()`只对该真实演员框取高度0.6，其它对象仍0.5；未增加Game数字插值。实际post-commit actor mark对这三招用`actor-arrival`，不把护体误标成受到攻击的impact；敌方攻击／其它招式的原分工保留。

这些更改发生在原完整可信notice产生之后，不扩大proof准入、不重新计算伤害或用药，不变更单回合3秒、费用、原nextCommand或正式结果。`floats`继续从原ActionNotice真实数字取，当前actor／view／error失效仍经原clear撤下。root此前两次审图发现姓名遮挡、K9真实红及source4的几何／像素绿各保其证据；本静态审查只验证所读定位与标记逻辑，不代像素或全七招表现验收。

## 策略页没有hero时不使用视口假位置

source5将`showMotion`约束为`!!target`且原reduce／blocked-dialog／fresh／terminal门槛全部满足。策略页的hero确实由原BattleStrategy分面卸载：K13明确核battle-presence不存在，此时`.battle-player-art`不应被HUD姓名或默认视口位置替代。代码虽仍可计算原位置fallback，`showMotion===false`让实际action-motion、floats和依赖它的fx-skip都不渲染，也不施加actor mark，故不会在无演员处出现可跳过的假演出。

`tracker.consume(...)`仍在这条展示条件之前执行，只观察同一原子成功一次；它未因无target跳过正式结果／身份校验。notice状态和原Game／Activity／费用／库存／战报／完整回执仍来自已保存事实。非terminal major BATTLE在没有hero时不强造全局toast；其持久成果沿已保存活动事实与真实战报可读，不把没有光效等同于没有保存。

返回场景时并不重新consume旧结果：showMotion是该次消费时赋值，DOM以后出现演员不会自行回放；原viewKey／activity id／generation／owner／暂停／error／隐藏／销毁清理继续适用。新`!!target`是表现层存在性门槛，不给演出发奖、不清Store结果、也不松原原命令重试。该门槛作用于Stage各family，不仅guard；缺真实目标的页面应保持持久事实，不能依赖任意视口中心代替当前游戏对象。具体其它消费者是否都符合仍由当前完整UI验证，不用静态判断关闭全部页面。

[no-scene-source4-report](../../../artifacts/goal-4/check-matrix-01/no-scene-source4-report.json) 的K13 **a saved guard while only the public strategy is visible keeps its original cycle and factual receipt without a viewport fallback or later borrowed actor** 实际failed/retry0：预期action-motion为0却为1。它是公开合法guard受理后仅查看战策、完整原3秒周期保存的真实产品红，不是任意改Game夹具。当前source5只补target存在性；其定向实测还未由本文件接收。

K13原断言保留：due-1完整DB不变、最后1ms正式resolve／Activity／唯一proof，策略页无actor／motion／number／skip／held class，原完整护体战报的净变化与成本可读且18／14px，返回hero后2400ms仍无旧演出。重复同一例／补拍截图不增加业务计数。

## 保持的控制与最终边界

四个持久dialog的late-close `.open`guard、fresh CHOOSE且retry不arm、原wasConfirmedFor精确返回见证、nextTick双归属复核和FeedbackSkip的alive／blur／focus.restore均仍在，不因这三处定位改动退回。旧close合成控制明确isTrusted=false，真实取消／重开流程及未受理红另外保留；未把UI消费事件写成原生DB故障。

未新增eval／v-html／外部URL／上传／存档／身份泄露；数值与判断仍由原正式模块／Store提供。root源码范围核对和本审查不能代实际source5目标／完整回归、资产／类型结果。source3/source4/原source2失败、输入时序勘误、A9／native／CDP原因unknown均保留，不把后来绿灯说成原根因已修。

当前只可给本窄修的静态code／安全意见。最终full414、同源交付／干净候选、TA07／08／09、M04完整路线恢复、M05性能、M06兼容最后、最大review与真实用户整体交互／美术／长期放置复验仍开放，用户工作台感负面反馈有效。
