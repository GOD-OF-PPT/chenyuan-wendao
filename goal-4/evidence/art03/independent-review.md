# ART03 独立静态复核

2026-10-23，基线c18d51d，合同0025。审阅者art02_battle；本次仅读取生产代码、差异与已有报告并写本文，不改源码、不运行构建/测试/浏览器、不操作用户档。此前参与器物原画流水线与RelicAtelier实现，本次尤其交叉核对其与其他新组件、共享证明及父组件的接线；不称真人或外部独立验收。

## 审阅范围

新增五文件JadeStudyScene、RelicAtelier、LoadoutConstellation、equipment-effects和art03-equipment.css，以及Learning/Production/Equipment父接线、activity-effects显式扩展、use-activity-effect转发。核对实际对象、保存/运行/停手/接管/隐藏、切对象与新人生、配置归属、原子结果和全部原能力，未执行兼容或环境性能专项。

## 原两项问题与实际修法

1. **多卷研习的saving曾归给另一卷。** 原helper按计划包含当前所选经卷匹配整个活动，这是保留合法成卷证明所需；但engaged直接取当前Activity.nextCommand。当A正在保存而玩家查看队列B时，旧Jade state仅看runtime.phase就给B显示saving/器纹光。A提交后Activity已前移到B、Store仍等待元数据交付时，原engaged又会把A的saving runtime认成B，出现B尚未开始却显示0/30秒的问题。这是当前对象显示归属错误，不是多收费或多学一卷。

   当前helper新增只读cycleCommand；runtime处于真实running时记录原nextCommand，saving期间不换目标，runtime失效时清除。Jade saving同时要求engaged。真实完整结果仍按原活动计划与实际notice对象过滤，不把matches改成只认新nextCommand，不吞A的已保存成果。正常/最终stopped的完整proof及effect保留，私有显示缓存不写Game、命令或存档。

2. **空功法槽曾定位到任意默认经卷。** 原空槽传null后仍进入skills并清learningFocus，可点终结槽却出现心法。当前Equipment父层有id仍精确定位该卷，无id改为school；Loadout节点与提示明确“先择修法”。该操作只切查看，实际SCHOOL仍先打开原比较确认，不代选流派、不改清单/预算或Game。原非空三功法槽与法宝查看路径保持。

当前静态锚点：equipment-effects 4840B / `7e92cdaf12f121a8e707691405a6828ad7454bfac009df66530ccb84b6b0867c`；JadeStudyScene 4281B / `6b60402d097eca69d1736a83d1f72620118acee7fd5be394c5c1285b218b57b6`；EquipmentPanel 4046B / `664190648f48abcf3172388a10c7df7b509e6c4c6a66c7417cd62c7266e3968a`。后续改源须重新核对应结论。

## 已获的定向证据

已读取`artifacts/goal-4/art03/ui-jade-ownership-red.json`：A3真实失败为另一所选卷状态收到saving，与上述第一项一致；原件保持。

已读取source7的`ui-recovery-2.json`及runtimeDigest，和`source7-build.json`的`3cdb72ee08b48dd8746efd5c6e2a3d68bb17113a1c30108cf7ae6a36fa59e29a`一致。该轮4通过/1失败：A3通过；旧玉简对象边界、凡人空目录、图片失败原生选择三例通过；A9仍有catalogue-prev几何失败，不能拼成全绿。A3测试保留两卷各自正式完成、原库存/完整advance/回执断言，并另用独立原生上下文阻住写入，随后放真实提交、延迟原元数据交付；实际Game只掌握A且nextCommand已是B时，B不显示saving、无新成卷、无借用光与读秒，真实下一运行周期开始才engaged。

进一步读取旧凡人用例的当前实际正文，现已包含：真实新档至凡人→配装三空槽→点击空终结槽→进入school并显示两修法及“先择修法”，逐项比较完整Game、原Activity及全部IDB行与进入前相同。故该条source7绿灯确实覆盖新空槽改路，不只覆盖空目录标题；不能将已获验证重新登记为缺口。

本审阅者未亲自运行这些用例。主控继续在source8修A9父details/CSS具体性；当前文档不为其终轮或像素签字，也不重标source7报告为source8执行。后续完整终轮仍须绑定当轮源码。

## Game、规则、预算与隐私边界

- 当前Game/engine/content/Store/Repository差异为空；原LEARN30秒、STUDY60秒、FORGE60秒/两月/单件，费用/槽位/数值/DB9均保持。实际配置仍经原ConfigurationDialog、活动CAS、取消/过期核对和原意图重试；没有新写旁路、自动旅行/研习/装备/认主。
- 共同周期证明默认仍严格准入2/3/6，显式extra4或5只交给本轮精确adapter。完整原Game、正式resolve结果、完整Activity、公开结果事实及旧replay/seen守卫均保留；没有为图效删除成本、净变化或隐私校验。
- 新配置echo核对正式resolve整Game/result，随后沿原tracker记录已观察；即使隐藏或暂停而不演出，也不能在恢复后补演旧配置。只为真实改变且当前实际装配的槽位留痕，不拿预选/取消/外页读入作本地新成功。
- 共享生命周期仍按可见性、当前对象/人生、活动id/generation/owner、公开activityPausing与错误隔离。真实失败挡新执行，原retry保留；只读完整内容仍可查。没有按每revision/completedCycles或末轮stopped清掉合法成果。
- 当前新五文件44644/45000B，准备55464/60000B、生产20456/26000B、ART02共享44997/45000B；旧cap未增加。四器物是独立透明冷态图，Game持有/本命与活动效果由DOM区分；真实alpha/bbox和生成留白偏差有记录，不能把图片当持有或运行证明。
- 公共观察脱敏保持；运行周期/配置短效的私有身份仅供本地显示，不写Game或公共记录。DOM文字由Vue转义，静态器物路径来自正式已知id，未引入eval、脚本执行、密钥、字体分发或新的外部写入。

## 交回结论与限制

原两项对象归属/导航问题在当前代码已实修，当前未发现其他需要改动Game或原子边界的实质逻辑阻断。A9错误态布局、当前完整UI与同源包由主控继续；源码/纯规则/部分UI通过均不能代替正式场景像素、整体游戏感、长期平衡或用户认可。

本次没有查看source7/source8整页新截图。此前实际看过四张器物运行资源只证明独立冷态图语义；不能据此宣布器物场景、完整12功法/四槽/四器都已通过艺术验收。完整后段矩阵、兼容最后、干净候选、最终C端/代码/安全评审和真人责任保持。

[杠精审查] 原错误、修法、定向红绿与尚未通过的几何项分开；不把A3绿灯或代码推导当作ART03整体完成。保留原报告source身份、全部失败、原13及用户档，未扩展玩法或擅自发布。

## source14与实现提交的最终静态追加

追加时已核实现提交`764c964`，最终运行源为`8e0f4f6ae9138ed60858d7145a4b2b290db240863a68e00d4eb9240bfcf902ef`。本次仍只读代码/已有报告并追加本文，没有运行UI、构建、修改其他文件或扩大组合范围。

三处执行门槛现分别在LearningPlanner、RelicAtelier、LoadoutConstellation使用`error && (canRetry || syncIssue)`识别仍需原意图重试或同步核对的阻断；available、busy、running及正式preview门槛继续独立生效。已核原App关闭确认会调用`discardRetryFor`：只撤销指定pending意图和canRetry，不清error、不把saved改成true、不改Game或回执。用户明确取消后重新点击对象仍经原prepareConfiguration生成新的commandId，再比较并确认；没有自动刷新旧命令、重复授权或放开规则旁路。仍有原retry或同步失败时，新意图继续被挡住。

该门槛调整不改变TA的错误关停。Jade/Relic状态与共享eligible仍对任意当前error保持冷态、撤短效；普通错误显示“保存待核对 · 请查看上方提示”，同步失败保留同步语义，不再把已取消、没有活动可重试的错误误指向不存在的活动条按钮。新保存仍须原子成功后才显示真实成功，取消本身没有伪造Saved。

学习cycleCommand仍只在真实running时记录，saving沿原卷目标，runtime失效时清除；没有恢复被修掉的nextCommand前移误归属。正式Game/规则/Store/DB/费用、30/60秒周期、有限队列、全部原预算和隐私守卫保持。当前新五文件44990/45000B；四运行器物仍为原四hash、512透明图，总136870B，实际逐hash核对与asset-facts相同，未扩大资源或旧cap。

已读取`ui-delivery-14.json`：当前source14实际14/14通过，0skip/0retry/0flaky；包含12对象例、原取消quota例及实际所选器物旧例。A8实际正文循环三类SCHOOL/EQUIP/EQUIP_RELIC，分别核对quota后原确认可重试、明确取消时完整Game/Activity/全部DB不变、错误仍可读、显式新确认的commandId与被撤销命令不同且旧命令无回执；真实新确认保存一次并匹配完整正式resolve。原取消旧例也在这同一当前轮通过。此前A9失败的原报告保留，当前A9已在14项中实际通过，不再列为未修问题。

已读取source12原完整报告和当前覆盖记录：原source12为254通过/3失败；当前source14只有5个运行源差异，211/216份相同。`coverage.json`明确以当前14替换原11个已过例及3个失败，另243个未改通过按精确输入/运行分支证明继承；257条声明重建无重复/缺失/多项。**这是243继承＋当前14的证据映射，不是同一轮257全绿。** 原报告不重标source，也不能把声明报告的257 skipped称作执行。

就当前0025独立工程范围，未发现需继续修改Game/原子规则或已审显示边界的逻辑阻断。上述最终代码/报告复核不代正式场景像素评审或整体游戏感签字；本审阅者未查看最终整页新图，整体美术、长期平衡、后段矩阵、干净候选和用户/真人验收仍保持开放。

[杠精审查·source14] 显式取消与原意图重试分开，错误冷态与允许新的人工确认分开；保留原命令/费用/预算/资产/hash和历史失败。当前工程交付有分层证据，不声称同轮257通过或整体人体验收完成。
