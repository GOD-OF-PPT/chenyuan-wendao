# M03游戏感与后续TA独立复核

2026-10-24。范围：只读复核本轮生产差异、0031合同和用户再次提出的“每个页面内部仍像网页工作台，交互/TA/动效都需要优化”。本次仅写本文档，没有修改运行源/测试，没有运行浏览器、构建或测试，没有加载任何图片。复用已指定game-studio并实际回读game-ui-frontend；其移动端建议与3D默认布局不覆盖本项目保留Vue/DOM、固定1440×900和暂停兼容的用户决定。

**结论：未发现本轮独立工程范围中新的、可以具体定位的代码或安全阻断；这不是整体游戏感通过。** 暂停主要决定、取消后的新授权、完整成本、菜单一屏阅读、键盘焦点和封卷回执都是实际交互问题，值得作为M03交付。它们不能证明每页内部已像游戏，不能反驳用户对TA/动效的负面复验。当前重验仍须按实际终态收尾；遇到本轮范围真红，应继续同项修复，不能用本文提前关闭。

## 审查身份与证据边界

- 历史source10为`e30ef7714c56cfa47d02ef0122785a2299786e038f837265b9a4ae3d539d3fff`。本次读取时发现一处源码不再匹配，已及时向主控报告；随后主控确认15叶子14过1失败，原修行方式标题/辅助文字Range仍重叠0.8125px。
- 0031先登记后，主控仅将`.art06-methods small`的行高1.4改1.6，保14px、完整文案、104px按钮、预算和周期。当前实际读取的[build-source11.json](/Users/gordon/githome/chenyuan-wendao/artifacts/goal-4/matrix-m03/build-source11.json)为`3daa6b703dd3e9fee84778e822fc0296b6d4bedee85a2ff6494884f70eecbb5c`；235份runtimeSources与当前磁盘逐hash核对，0不匹配。该核对只是只读身份检查，不是重新构建或UI通过。
- 当前[cultivation-objects.css](/Users/gordon/githome/chenyuan-wendao/web/src/cultivation-objects.css:13)为14757B，SHA256 `7e56fa0d0d377965f7c2fe9f5a3fee1879f42c8f05462e53519d1a458b20de25`。新行高仍待新源实际验证；本文没有看像素，不能把旧Range测量描述为已经消除的可见叠字。
- source10的原整轮和叶子结果保持原身份。主控当前准备/执行的新源验证、332原生的精确依赖继承、802规则与资源检查，由各自原始报告最终归账；本文不新增测试次数、不把当前385声明或待运行结果写成通过。
- 输入包括[0031](/Users/gordon/githome/chenyuan-wendao/docs/decisions/0031-game-ui-matrix-intent-contract.md)、[用户原话](/Users/gordon/githome/chenyuan-wendao/goal-4/amendments/2026-10-24-game-studio-recheck.md)、最新plan/tasks、实际生产diff与当前对象消费者。2026-10-23对象方向文档中的早期“未交付ART01”是历史；当前状态以最新账本和实际源为准。

## 本轮合同与代码复核

1. **授权和表现错误分开。** [store.ts](/Users/gordon/githome/chenyuan-wendao/web/src/store.ts:28)只新增只读`unresolved = error && (canRetry || syncIssue)`及公开getter，没有改变正式事务、Game、DB9、费用、周期或CAS。SourcePlanner、AlchemyWorkshop、AdventurePlanner、BattleStrategy的新执行门槛采用该值；待原retry/同步仍阻断，明确取消后历史error不永久锁新授权。共享表现层仍以任意error撤短效，不因fresh入口可用重亮旧奖励；没有清error来伪造Saved。
2. **暂停默认继续原安排。** [TrainingPlanner.vue](/Users/gordon/githome/chenyuan-wendao/web/src/TrainingPlanner.vue:18)比较完整canonical plan，含方式、目标/次数、累计预算与保留量；原计划相同时不新建id，提示上方继续。真正改排有“替换暂停安排”语义。App的另排入口只进入草案；原保存参数仅在明确查看原安排时回填，savedPlan清空不会覆盖正在编辑的草案。停止/idle的原开始入口保留。
3. **菜单没有删除能力。** App保存全部原存档/显示/帮助/演示入口；帮助按原guideCatalog完整12章翻页。LocalExperiencePanel三分面保留采集、总数/未知、已加载列表、清除、重读、临时记录和导出。viewRequest防止旧recent/prepare回到后选表面，原listRequest/exportRequest、epoch/preference失效、validatedDownload和隐私合同仍由原helper负责。列表每页一条只是已加载20条的阅读，未冒充全部本地记录；不可读没有变成零条。取消预览回真实入口，重开设置合起旧details。
4. **焦点与完整成果真实接线。** [focus.ts](/Users/gordon/githome/chenyuan-wendao/web/src/focus.ts:6)只排除closed details中非summary目标，不改变真实双向Tab包围或Escape原归焦。LifeCatalogue新增`life-receipt`仅在结束人生且当前有效已完成v7上出现，沿App.viewReceipt→inspectMilestone原只读分页；没有补造回执、保活结束HUD、产生新命令或重演成果。普通成本/周期正文恢复18，明确辅助状态保14。
5. **真实舞台与资产保持。** 七招在选择前保完整成本及3秒/回合，药物/撤退不再只有“占一回合”。当前demo八入口DOM与正常/演示域隔离未删，底部工具只让出实际位置。天门变更仅清父容器实底；原画fit/crop、门坐标/gate计算和无图fallback没有改。story-book预算整理为相同值或后规则已覆盖值的归并，不是新增兼容断点/样本。

以上是代码和合同判断。实际字体/外缘/遮挡/全页可命中与短反馈像素，仍由新源UI和逐张实拍判断。

## 用户负面反馈仍然成立的源码依据

[BattlePresence.vue](/Users/gordon/githome/chenyuan-wendao/web/src/BattlePresence.vue:35)已有真实敌我、意图和周期，但玩家/敌方主要为静态半身绘画，七招以共用蓄势环/全局斜线及数字表达；成本可读不等于招式动作辨识充分。[SourceField.vue](/Users/gordon/githome/chenyuan-wendao/web/src/SourceField.vue:37)已有自然/宗门分区、资源选择、真实行囊，但主要物件仍是GameIcon与环形进度。[JadeStudyScene.vue](/Users/gordon/githome/chenyuan-wendao/web/src/JadeStudyScene.vue:28)和[RelicAtelier.vue](/Users/gordon/githome/chenyuan-wendao/web/src/RelicAtelier.vue:44)已有玉简/四器/实际槽位，但运行变化仍多由轨道、环和阶段文字承担。这里是表现深度的静态判断，没有冒称本轮新像素红。

game-ui-frontend强调玩家动词、主次层级、保护场景和有意义的状态变化，反对等权框/通用工作台及每个元素不停闪动。后续必须改玩家操作的物件和对应反馈，不能只加统一粒子、再叠一层框或把“准备/研习/凝形”文字算作TA完成。

## TA07→TA08→TA09的顺序与可验证边界

建议先完成本M03实际收尾及既定CHECK-MATRIX-01，再按三项独立任务推进。下列编号来自本次后续审查，**尚未实施，不能写成当前ART交付或HUMAN验收**。每项先另存参数、资产/代码预算、真实周期与回滚合同，再开始代码；不能把M03顺势扩大成三个TA实施任务。

| 顺序 | 真实对象和改进焦点 | 独立验证边界 |
| --- | --- | --- |
| TA07 战斗七招 | 在真实当前敌我上区分普通攻击、护体、起手术法、终结、两丹和撤退。剑修积蓄/释放与符修留印/引爆有不同的动作方向与节奏；当前意图、危险和下一招优先。自动战策照原有限授权运行，不强制逐招点击。 | 复用当前v6完整proof和冻结的running命令；3秒、真实成本/用丹/保留/危险停止不改。蓄势可随原runtime，保存前不画实际掉血/治愈/胜利；保存后才展示真实净变化，治疗与对方伤害不能混成假净增。七招各自执行，含两派、自动/手动、saving/暂停/失败原retry、同id接管、跨敌/跨关/撤退、隐藏/刷新和减动效。下一敌人不能套上一关胜利光/伤害，完整回执和18/14/44保持。 |
| TA08 采集实体 | 自然资源成为可辨的草丛/露滴/晶石等资源点，宗门委托成为独立差事物件；选择只查看目标与取舍，安排后自动逐轮工作。材料、灵石和副产修为来自实际保存，不强制每次点采或领奖。 | 全六地点/十六来源、全部分页/目标/预算/余寿/返回与草案保持；原30—180秒不改。复用v2 proof，资源工作只跟当前所选本页周期，入囊只用实际delta。副产XP封顶与已有目标物不重复、预算停止、失败/保存中停手/接管/离页/原重试必须核完整Game/Activity/DB。禁止新增资源血条、掉率、热度或用装饰成熟度推导奖励。 |
| TA09 玉简与器纹 | 让真实所选玉简、待研队列、当前三槽和四件器物的纹理/符文形态承担阶段变化；掌握、铸成、装备分别可辨，比较仍即时，不能把一套环换色当三种玩法。 | 复用v5 LEARN/STUDY、v4 FORGE和原配置echo。学习30秒、剑简/铸器60秒；先冻结当前卷命令，nextCommand前移不能借光或吞上一卷合法成果。保存前不显示已掌握/已拥有/本命连接；保存后从Game留静态成果，装备另行确认。全12法/剑简/4器/各槽/跨派/完整成本与预算不删，已有项目不循环，原即时配置不加假等待。错误/暂停/换卷/隐藏/接管/刷新/旧回执均不补演，原retry首次真实成果仍可恰好一次。 |

该顺序有实际依赖：战斗先建立当前演员、动作方向、保存前后及旧敌人失效的表现边界，直接改善最强交互场景；采集再把同样的可信周期表现落到长期放置最常见的资源工作对象；玉简/器纹最后处理队列前移、已掌握/已拥有与即时装备三种不同身份。可以复用证明和取消机制，不能复制同一个舞台/动画模板。

预算必须先解决：本次只读实际合计ART02为44887/45000B（余113），ART03为44943/45000B（余57）；当前菜单16149/18000B、专属CSS5479/6000B。后续不能假定旧组有足够空间，也不能提高旧cap或把旧实现搬出组逃预算。确需独立表现模块/新冷态素材时另立明确可守卫预算，保留旧消费者/资产与provenance；能用现有DOM/SVG/CSS表达的部分先复用，不为凑数量重绘全部资源。任何新增素材须有原稿/提示词/回执/hash/alpha/确定导出与真实消费链。

每项交付都必须进入正式页、包含可交互物件和至少一个真实在线周期，保完整规则/原子验证及独立实际像素复核；虚拟钟只验证截止/归属，不证明长期节奏或吸引力。三项后做当前授权综合检查-debug；M04正常新档与完整失败恢复、M05性能、兼容最后、干净同源包/最大review和真人整体反馈继续保留。

**验收责任：本轮代码复核通过的范围是M03合同的当前技术接线；整体ART、长期平衡和HUMAN仍开放。** 新源全UI/叶子终态、同源发布身份和实际像素尚待主控汇总。只有用户再次试玩并认可逐页游戏感后，才能关闭对应真人责任；测试数量、菜单一屏和代码守卫都不能代签。
