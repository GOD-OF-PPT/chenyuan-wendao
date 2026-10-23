# ART02 独立生产代码复核

2026-10-23；审阅者：`art02_battle`。本轮主控的 source5 构建已完成，新14项与旧来源/行旅/战策 UI 正由独立验测继续执行；本报告写入时该轮未终结，不能登记为全部通过。本报告不修改生产源码、不运行浏览器，也不操作用户档。

## 范围与依据

完整回读0023合同，审阅本轮生产diff，以及 SourceField / JourneyMap / BattlePresence / BattleDeck / activity-effects / use-activity-effect 和三个新CSS。对照原0008/0014/0016规则、Store真实提交/观察/暂停/接管顺序、ActionFeedbackStage原守卫。仅固定1440×900单Chromium为当前UI义务；兼容、环境性能、长期平衡、完整飞升路线及用户整体美术验收仍是后续责任。

审阅锚点：`use-activity-effect.ts` 3006B / `287acb5260d3d70da2d6e0bbbdae660df08b764f26e1a646fc2c6cd80122b95d`；`activity-effects.ts` 2680B / `c4672394965dd76cbdbfeaabbe5d5dcf0d78667a92868be3e572ee0c77e17451`；战场CSS 8763B / `598e73190e72148b6db254d8c94834d2664dcd8fa78daca801726e81b9435261`。后续源改变须重核对应结论，不改旧测试源标签。

## 已实修，不能继续当未完成

- 成功暂停后的短效清除已有真实生产watch：匹配活动状态为paused时调用clear；活动id替换也清旧身份与短效。隐藏、KeepAlive离开、销毁、对象/人生key变化保持清除。普通completedCycles不清，末周期stopped仍可通过正式证明显示实际成果。
- 行旅/迎战与自动/手动斗法现在都从game-scene只读error；新安排、自动开始和七招同步禁用并显示核对原操作的理由。该修改补上了startActivity受理失败、尚无running活动时覆盖原重试意图的入口；查看、选点、战策编辑继续可用。Source同样禁新开始。
- Journey通过`#game-content .adventure-planner`的精确嵌套规则重置旧三列布局；六目的地不再塞入280px左格。迎战object布局同样有父grid与对象布局明确覆盖。游戏内`.hub-reduced`与系统media均有静态减效出口。
- 已实际看过旧`battle-red.jpg`：旧R2把内层四招排到第2列第3行、药物排到第4行，并以同specificity的width100%覆盖敌画。战场CSS现在为4+3内层显式指定同行列位，敌画采用更高specificity的双侧坐标/宽高/网格重置；图符与招名同首行、原purpose/cost/reason全文保留，无删能力、缩字或裁切。当前像素与几何仍以新一轮实拍为准，本报告没有把静态CSS当新像素通过。

## 尚存两项具体生命周期边界

1. **同id活动被其他页接管后，旧短效可能残留。** `use-activity-effect.ts:25`仅观察activity.id。原Store读取外部更新会停本页runtime，但合法接管可以保持id、改变generation/owner并仍是running。若在上一周期入囊短效出现后的1400ms内接管，key、id、status、eligible均可保持，短效不会立即清除。完整结果proof会拒绝给旧代际发新奖励，因此这是归属已变化后的短TA残留，不是重复发奖。建议按id/generation/owner隔离，并验证接管发生在短效存续时；不能用任意revision或completedCycles清掉合法本周期成果。
2. **暂停请求已停止本地时钟，但暂停事务未返回时，短效尚未清。** 当前hook观察`phase==='pausing'`，而Store `pauseCultivation()`实际先令公开activityPausing=true，再清runtime，等待在途写/暂停事务；没有给runtime赋pausing。故延迟事务下phase变idle、活动仍running，旧arrival只能等到paused提交或1400ms结束才清。建议直接观察公开activityPausing，验证“已保存成果短效出现→立即暂停→暂停事务暂未返回”时短层撤下、Game和原命令不变。成功提交paused后的分支已经修好，不应重复列为缺口。

这两项仅要求显示生命周期修缮，不需要修改Game、DB9、正式时钟、活动命令或奖励结算。

## 证明与失败重试的复核

共同tracker保存当前完整原Game与活动快照，核对公开action去掉命令元字段后的完整事实、公开/私有结果、正式resolve整Game/result、completeActivity整Activity，再交给原全局feedback tracker；公共脱敏观察不被写回。Alchemy保留原API包装，不以抽取模块冒充新玩法。静态未发现可借旧回执、任意delta或不匹配对象制造新Source/Travel奖励的放宽。

未提交quota失败后重试会通过原waitUntil同步tick重新取得同周期身份；已经提交但丢回复后若重读到下一command，旧重试不能匹配新arm，并且原replay守卫继续拒绝演成新奖。错误隐藏只清可见effect而保留尚未失效的原意图证据；对象/人生/隐藏/代际变化应撤销该本地证据。上述为生产顺序与规则代码复核，不能替代真实IDB/浏览器的两个重试分支。

## 证据限制与交回

已保留旧对象UI首轮2通过/11失败、第二轮9通过/4失败，以及受理错误入口红例；不能以其部分绿灯登记当前source5通过。15项共同proof纯规则也不证明composable生命周期、实际读秒或像素。当前仍须终结新14项及相关UI、核对上述边界的定向红绿、逐张看实际新图，并完成同源原子/资源预算/类型与候选身份核对。本审阅者没有执行这些终轮检查，也未将用户负面游戏感反馈关闭。

[杠精审查] 生产改动确实把资源、行路与战斗动作组织为可操作对象，并保留完整正式授权与结果链；不以图片/机器绿灯代整体游戏感。已修事项与两项未验证边界分别记录，当前不为ART02或父Goal签署完成。

## 当前修复与实际证据范围（source8追加）

原source5审阅正文逐字保留。此处修正其错误推断，并更新当前状态；不重标旧报告或抹去失败。

**对前文布局结论的更正：**前文称`#game-content .adventure-planner`已经使六路标脱离280px左格，是审阅者未核对真实祖先结构的错误静态推断。主控第三轮实际UI为26通过/17失败（`artifacts/goal-4/art02/ui-related-third.json`），否定了该推断。App普通Explore在主玩法center-column内、与带`id=game-content`的条件section同级，那个ID不是普通Explore的祖先。source8已改为`web/index.html`中真实挂载祖先`#app`，并按行旅页当前可用高度把地图区限制在220—310px；标题/预估、地图与确认行显式分格。该代码修正已核对真实DOM来源，但仍须当前实拍/几何复验，不能将旧17失败说成已经通过。

**两项较窄生命周期边界已在当前代码修复：**`useActivityPresentation`现在共同观察匹配活动的id、generation、ownerId及公开activityPausing；变化时清旧tracker/effect后只对真实当前runtime重新arm，eligible也明确排除activityPausing。普通周期不会改变id/generation/owner，故没有以每次completedCycles/revision清掉当前合法末周期成果；真实最终stopped不触发这组清理。隐藏、错误、对象/人生和退出原守卫保留，Game/DB/原命令未改变。

这里的证据必须分开：`ui-effect-boundaries-red.json`实际是一通过/一失败，失败为资源短效出现后阻住暂停事务、立即暂停时旧arrival仍可见；这是延迟pause的真实红例。同id接管旧例当时通过，不能把它编成红例；当时document.hidden前提不足，随后测试已加强为接管前后均明确false，并核对活动id不变、generation增加、owner改变、Game无额外变化。加强后的当前例要等当前源终结结果，不能以旧绿灯替代。

当前所审生产锚点为：hook 3119B / `da28ee98d9a801428a7e52803c19fbc3b3060a955cec792caf1010a503db29d5`；Journey CSS 4525B / `e861d5c44ef78ab0ceab0ccf1111275161a04f46fbff26ae8874b3581819c312`；Battle CSS 8582B / `6ad8988e44c4aae4dadd1e56e40040c241404e100267e5bda4a7767dd94d23ac`。新9文件实际44991/45000B，旧cap未增加。Battle CSS仍保留精确敌我位置与4+3招式同行、≥300场景/≥240敌画以及完整18/14px文字；本追加没有实际看source8新图，不为其像素签字。

主控说明source8已构建冻结；当前43项相关UI与179项后续回归仍在执行，完整终轮UI须在定向结果稳定后继续。此追加只复核当前生产修复、真实祖先和现存报告，不启动构建/浏览器或用户档测试。尚未得到终结绿灯的当前运行、所有未看图、完整同源矩阵、长期平衡及用户整体验收保持未证明；前文两项代码漏洞现不再作为未修问题重复登记。

[杠精审查·source8] 已承认并更正祖先选择器的错误静态判断；保留17失败与延迟pause真实红、没有制造接管红例。代码边界现已修，终轮运行/实际像素/用户认可仍须独立证据。
