# ART04 独立只读复核

2026-10-23；基线8222f30，当前在途实现。仅审源码与测试，不运行浏览器、测试、构建或存档操作；未查看任何像素，不替整体美术、长期节奏或真人验收。只新增本文件，未改运行源/测试/资产与保护13。

## 当前结论

本次未发现供应反馈适配放宽完整证明、行囊查看直接执行Game，或父参数/目录能力被移除的实质缺陷。以下生命周期与布局仍须当前固定桌面实际运行，不能由静态阅读或纯函数绿灯代替。

- `supply-effects.ts:6–20`仅匹配version5与所选buy/sell/use/rest；物品种类与当前命令分别匹配，rest不伪造物品。显式extra5复用原共享证明，默认2/3/6不改。运行时在running阶段冻结命令，在saving阶段不随已前移的nextCommand换物；engaged、phase、working、progress均来自同一个原运行时，没有第二结算钟。
- `activity-effects.ts`仍比较原命令的公开字段、完整正式resolve的Game/result、completeActivity的完整Activity及身份/代次/版本/周期。`use-activity-effect.ts`继续按当前可见、可用、无错误及保存状态决定演出，隐藏/切物/人生活动身份/暂停请求撤短效；错误只撤演出而保留原proof供同意图重试。下游effect再次按实际结果类型与图标物品过滤；未见从点击、预估或历史回执生成新收益的路径。
- `InventoryStage.vue:10–29`的主要用途仅在服丹、出售、来源之间选择；该按钮和辅助用途转发当前props的物品，不保存或重授写命令。`GoodsPanel.vue`保留四分类、未来目录、四项分页、实际库存与人生/有效对象校正。`App.vue:268,323–342`仍将USE/SELL等转为只读inspectPreparation，必须后续明确start才安排；两丹的服用和出售均可达，五突破物没有出售入口，全部用途与来源保留。零库存只改变主要查看动作，不删另一个合法用途的查看能力。
- Recovery的`#options`仍是父组件原三选择，`#decision`仍是父组件完整quote、限额、正式门槛、start/travel；原dialog、缓存、回填与预算未迁移。子组件没有写方法或独立定时器，当前两体魄和单次预演取正式Game/preview，可信effect才产生短成果。错误下冷态，新的输入阻断仅error且canRetry/syncIssue，未将历史error永久当作新意图阻断。

## 测试质量与未证范围

`tests/supply-effects.test.mjs`有7个独立声明；14购入/9合法售出的循环是同一业务声明内的数据覆盖，不增加业务例数。fixture先使用合法UUID并validateGame，再由正式createActivity/resolve/completeActivity/writeObservation构成预期；原UUID脱敏造成的正例失败属于测试前提，不能当运行时bug。主控报告的组合37通过不是本审查独立重跑。

七例包含正式单件费用/库存、6/15/30秒周期常量、真实封顶恢复、默认不准入、独立逐周期arm、重复/重放/外来/失败/刷新、暂停代次，以及完整Game/result/Activity的篡改拒绝。未用部分delta相同替代完整证明。

需要保留的实际运行义务：

1. 七纯例没有挂载`useSupplyCycle`，故不能证明watch、KeepAlive、document.hidden、same-id换owner或运行中改当前查看对象的实际清理；由新UI用例核对当前runtime和短成果。纯暂停例的显式clear只证明纯tracker契约，不是组件自动调用clear已通过。
2. “unrelated preparation domains”这一纯例逐一检查了其他供应种类及默认extra0/4，但没有构造真实v5 learn/study再调用供应匹配；源码的封闭输入和没有item的两种计划目前可拒绝，标题不能替直接数据反例。可补直接合法learn/study负例增强证据，不据此认定现有产品缺陷。
3. 行囊只读、返回非默认草案、保存中切物、原意图失败/重试、降低动效与SVG失败下的完整文字/可命中入口仍待真实UI与IDB验证。

## Recovery旧样式风险复核

`RecoveryRitual.vue:40`根显式display:grid，旧源码没有同名根规则；原`.recovery-cabinet`的display:grid已被更具体的`.recovery-ritual .recovery-object`覆盖，原体魄/选择布局也有更具体的规则。这两项未见可直接确认的display失效。

但inline组件样式与main.ts后续导入的旧CSS有两项同优先级继承风险，必须测computed style与错误横幅占位后的完整文字/操作矩形：`RecoveryRitual.vue:52`的`.recovery-ritual .recovery-decision`和`idle-preparation.css:35`的`.immersive-stage .recovery-decision`均为两个class，旧gap16px可能覆盖新10px；`RecoveryRitual.vue:49`的h3与旧`.idle-preparation h3`同优先级，旧底距也可能增加高度。此处仅提醒，无像素证据，不提前标产品红或改源。不得通过缩字、裁切、内滚或删掉完整说明解决。

## 输入身份

| 输入 | SHA-256 |
| --- | --- |
| web/src/supply-effects.ts | 6b11c6aab3e634831854d0c1723b76916bbb26fdbccf640e4adc6e043ee72a19 |
| web/src/InventoryStage.vue | bde073a8d3dd216eb8c76fb23ed6f1a4e917ea2ee7f42aa561dde37e897fd082 |
| web/src/GoodsPanel.vue | 60c92db3041bebc0052a74bcc45b69fc42b530996552691265897b12bc6eafb7 |
| web/src/RecoveryRitual.vue | 82b1ad7e496a57df9904bab10f475fd2bdc91ca624639c2a7594aa1eeef229be |
| web/src/RecoveryPlanner.vue | 00a690f3d5f370fdc0642e44c54f79caa35021c553d517fc37327fc153f3c6e6 |
| web/src/activity-effects.ts | 343f294b3a70c7ded905f856a90b71596934087a131da7a2517989ac339efc0d |
| web/src/use-activity-effect.ts | 7945d768908d12361720bdf4afaab73f3e1479f950f0e7dbe8690ec888c548c7 |
| tests/supply-effects.test.mjs | e0b3850786f071601b92893d331c55281b91786dbe3f4e98474b356718bc7d25 |

## source3候选的静态追加复核

此节为后续输入追加，保留以上首版审查身份与当时未证项。尚未完成source3整体UI，不能把早期定向绿灯替代当前完整轮或像素结果。本次仍只改本文，不运行测试/浏览器、不读存档；未查看新候选像素。此前物体实现子任务仅实际看过旧`recovery-saving-red-source1.jpg`一张，用于识别88px徽章过弱，不能证明当前源的新物体已通过美术。

当前Recovery已改为160×170的冷玉药瓶/药盏与石托，疗养为石台静坐标记；`recovery-pill`仅在当前真实stock>0时存在，装饰不代表新增、已用或已恢复。灵息层只在working时使用原progress，saving不使用running环；显示数值仍是正式Game。新增两个大图标使用`#app`限定尺寸，原body、说明、per-cycle、clock、可信result、来源与两个父slot保留，没有新增写命令或独立时钟。错误态只调整装饰高度，不缩文字。

父Recovery的强错误门槛仍为`scene.error && (scene.canRetry || scene.syncIssue)`并叠加原available/busy/running和正式quote；未见清旧error伪造Saved，也没有丢弃/重授原意图。运行中修改的参数状态现明确叫“下次安排草案”，原活动条继续是执行依据。保存阶段的“等待本页主动续接”已增加`!engaged`，不会对本页正在保存的同周期同时声称需要接管。`ui-saving-red.json`实际0通过/1失败原件仍在，随后`ui-early-2.json`实际3通过/0失败/0skip/0flaky；这只是该早期源的定向证明，不称source3通过。

Inventory的`#app .inventory-stage .inventory-held`已增加对实际大物体按钮的样式优先级，没有新增隐藏替代按钮。物资的服用、出售、来源仍各保留一个真实入口，主要用途只是把同一入口置于物体上；两丹副用途、五突破物禁售、零库存图谱/未来目录和原筛选分页未删。当前物体图标的尺寸仍由其原class规则控制，不能只凭`#app`出现在按钮选择器就认定所有图标/底板已看过。行囊底板与坊市长说明的像素红仍在修，均保留pending，不能代签。

此前纯例“unrelated domains”缺直接数据反例的观察已补齐：新增合法Game先将school设null并与全空loadout/learned配套，然后validateGame，再正式createActivity构造learn和study；每个都直接拒绝四个供应kind及命令。旧school=sword却空基础槽的fixture验证红属于不合法前提，按主控要求保留core-source2原红；当前补强仍在原第3例内，总业务声明仍为7，没有把两个反例另算用例。此补强没有放宽任何正式规则、proof或历史断言；其运行绿灯由主控执行，本审查仅核当前源码。

本轮静态未见既有功能删除、读取暗中消费、另一用途被主按钮吞掉，或从结果演出写回Game。原生失败/同意图重试、DOM生命周期、错误完整布局、SVG失败和减动效仍以当前候选完整运行结果为准；source3未完成的UI保持pending，兼容/环境性能和整体真人验收未执行。

| 追加时实际读取的输入 | SHA-256 |
| --- | --- |
| web/src/InventoryStage.vue | b3eee5dbf1f03ac9f8cd19c409475e6f57b86fefef696fa97f0f79bce5f0e83d |
| web/src/GoodsPanel.vue | 60c92db3041bebc0052a74bcc45b69fc42b530996552691265897b12bc6eafb7 |
| web/src/RecoveryRitual.vue | facf11f3a29e6f42d8f7f242ae2f0a21b857e6a9f1c4fe672374befe9dfbf179 |
| web/src/RecoveryPlanner.vue | 53f0a3038baf13cd5432f20315734cf1015514ccecbfb38d21d1c70fdf1b3511 |
| web/src/supply-effects.ts | 6b11c6aab3e634831854d0c1723b76916bbb26fdbccf640e4adc6e043ee72a19 |
| web/src/activity-effects.ts | 343f294b3a70c7ded905f856a90b71596934087a131da7a2517989ac339efc0d |
| web/src/use-activity-effect.ts | 7945d768908d12361720bdf4afaab73f3e1479f950f0e7dbe8690ec888c548c7 |
| tests/supply-effects.test.mjs | 687bfeac665fdcf96edae661327adc7444102bd14ac8259d16b5cf0589026b23 |


Root交付补记（2026-10-24）：以上为审查当时原记录，保留原输入hash/未执行边界；最终source8 e5560974同一独立86/86通过，声明逐项相等/0skip-retry-flaky，三旧前提与实际59/预计37、两宿主及错误态均当前实测。8当前代表图root已逐张实际审，217/220同源继承与当前9配置/供应7另记；实现92aa57c/实际HTTP与用户只读进度见verification.json和review.md。不代作者新增像素判断或整体艺术/真人验收。
