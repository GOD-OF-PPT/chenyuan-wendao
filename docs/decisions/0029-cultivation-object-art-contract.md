# ART06：洞府潜修、道途筹备与阶段门槛

2026-10-24，237686d0e3fe574363353f4dbe9cb0684d4eb9c0 / codex/goal-4-online-recovery。上一轮为progress：CHECK-ART-02实现c758838、资料237686d、285091be试玩和原进度/13保护有证。只接最新tasks的ART06，不重复原生Goal文字的历史R1、不创建Goal/聊天/重复工作流。原话、保护基线、计划/本合同先于测试和运行代码。

## 实际缺口与依据

TrainingPlanner仍是方式nav、目标select、预算表和预估，原插画被stage-r1隐藏；主场景运行后只有“上方暂停”的文字。主画人物/炉烟与ink灵光已经画死，不能表达停功。Goal/Preparation仍按表格卡片找缺口。复用game-studio→game-ui-frontend/game-playtest及既有Vue/DOM、正式规则和资产工具；本轮实际回读Riot clarity（层级/少噪声）与XAG109（可回看当前目标/明确进度和下一步）。下面的物件/布局/时长/预算为项目推导，非竞品试玩、来源规定或用户认可。

## 正式交互范围与参数

1. 正式洞府主场景及修行安排详情以冷态坐姿修士、蒲团/灵脉与可选择灵石位为操作对象。自然/辅助是明确真实方式选择，选方式不受理活动；主决定安排一段/停功，完整目标、最多轮数、累计预算/保留与离线边界按需打开，默认有限授权始终可读。旧default natural最多50轮/圆满即停、所有1/5/20/50及非默认已保存参数保持；草案与已保存安排分开，切页不清草案或重建时钟。疗养/择法/筹备/回洞府/比较/完整成果入口保留，不强迫逐轮入定/领奖。
2. 当前目标和突破筹备用目标物/条件位、实有/尚缺、来源路标和下一段组织；改变追踪、数量、全部物/法/器/事件与完整来源/成本/替代路线/返回不删。查看/预选/查来源不旅行或消耗；真正前往沿原导航/确认。已齐物不重复采购制作，缺修为/受伤/缺地点分别明确；进度圆满不表示物资和门槛齐全。不能只给原表单换边框或包新画。
3. ART05未覆盖的CHOOSE/BREAKTHROUGH/START_TRIAL接到独立窄域阶段物件：开场药匣/三种原选择、普通破境的境界门槛/实际突破物、入劫的现阶段准备与天门。保留完整阅读、原确认、单次授权和未知分支待决定；CHOOSE6秒、BREAKTHROUGH30秒、START_TRIAL15秒及正式全部成本/恢复检查点不改。破境仅本境，入劫后停问心，不自动续关/飞升；开场当前详情与主入口都保全文和真实行为。
4. 普通修炼沿原30—240秒完整单周期，呼吸/灵气只作随真实runtime进度的装饰，不添热度/成功率/额外修为或阶段奖励。自然/灵石有可辨资源状态；保存中收束、原子成功后实际修为/石/年月静态可读，强表现留阶段变化。暂停/失联/错误/隐藏/换人生/换对象/接管撤短效，失败保原周期首次成功重试；旧回执/外页/刷新/重新查看不补演。

## 接线与资产预算

正式v1修炼尚未在共享proof准入：只加显式extra=1（仍保default2/3/6、extra4/5/7和version0拒绝），严格matches v1/CULTIVATE/method/原境界，运行命令/完整Game/result resolve及完整Activity completeActivity均核对。v7另显式只接CHOOSE/BREAKTHROUGH/START_TRIAL，不扩大Narrative原六动作或默认域；稳定host跨realm/key/phase变更保本次见证，后续查看不能借旧结果。共享hook/跟踪器的类型联合各多2B，ART02当前44992/45000的原cap不涨；若不满足预算只能真实去重，不能搬旧实现逃预算。

新增七个生产文件总上限45000B：CultivationStageHost.vue、CultivationSite.vue、MilestoneGate.vue、GoalBoard.vue、cultivation-effects.ts、cultivation-objects.css、milestone-objects.css。按对象/生命周期职责划分，不迁出旧实现避旧cap。旧TrainingPlanner/GoalPanel/PreparationPanel/App按正式对象接线保原能力与旧预算；style入口由新组件引入，主画只在相应舞台选择已有无人物cave，保原画和非本轮页面。

调查补齐：旧TrainingPlanner组21297/22000、PreparationPanel所在playable-flow组58905/60000均保持；GoalPanel原15498B无旧files预算，本轮新增整文件19000B上限，不将它变成无界新容器。Preparation默认旧CatalogueArt由实际GoalBoard新对象替换时，旧资产binding改为真实新消费者链且负向守卫相应更新，旧画/旧模块保留其它消费者；不能藏旧图或假token满足守卫，不提高任何旧byte上限。

确需一件冷态坐姿透明修士：imagegen内置生成/参考既有player，原稿与提示词/回执保留；运行512×512透明WebP≤160000B，有限新增1件、独立ledger/确定导出/hash/像素/alpha/消费者/负向守卫。人物没有预烘焙光/烟/灵石/文字，效果和操作由DOM/CSS/SVG实现；旧素材不覆盖、字体不分发。没拿到实际合格图不能用SVG替代绘画冒交付。

## 检查、提交与回滚

先原285091be独立旧场景红；新增v1/三v7完整proof/生命周期/恶意域规则负例、对象与真实行为固定桌面用例。定向实际30秒自然吐纳、辅助实际周期和30秒普通破境（入劫15/开场6沿相关真实例），全Game/费用/截止前零变化与首次原子结果；保存失败/同意图重试/丢回复/取消fresh、预算/保留/满修为、暂停/外页/刷新/不离线补发、全部参数/来源/追踪/返回及新对象冷态/减动效/图片失败。pending原意图/同步错误的新执行先核真实红，显示门槛沿原Store/API；不清error假saved，不重授旧命令。

保持18px正文、14px辅助、44px目标、八入口一屏与一个活动条；看实际祖先/页码/对象/短效边缘和真实点击，错误栏的测量/绘制就绪与Game提交分开。不裁切、不缩字、不隐藏能力或改内长滚；图片逐张、每次最多两张，原PNG与原尺寸JPEG68分别hash，机器/解码不等于像素审阅。

当前只固定1440×900单Chromium实际玩法。相关旧UI、规则/原生存储/原时限、当前正负资产/类型构建逐项核对；未变依赖保原执行身份，配置全源指纹当前另验，不把叶子映射叫单轮全绿。具体相关测试文件/声明数在调查收齐后开测前登记；不为ART06重跑兼容/移动/响应式/字号/跨浏览器/环境性能矩阵。旧39UI/9native与MATRIX/长期平衡责任继续。

测试参数补齐（新例开跑前）：旧固定桌面九文件93条为idle-cultivation8、stage-r1 6、idle-integration7、idle-milestones16、idle-stage-ui7、idle-review8、check-u8 7、stage-u8-b24及check-art-02 10，另新cultivation-objects实际声明约15；旧兼容混合文件不整文件恢复。原生选activity13/activity-store13/milestone5/milestone-store4/history-ui3和check-art-02-store3，共41（原Store不动，继承边界另证明）。规则保持显式59文件790基线加新cultivation-effects实际声明，配置9已在790内不重复计数。旧所有时限保持，新例60秒/expect8秒/navigation15秒，唯A5合法炼气辅助最短单周期60秒，开测前明确该新例整例90秒，沿已有真实60秒例总时限；不能为了60秒测试上限改造非法凡人辅助或拿虚拟钟替代实际周期。原30/60/6/30/15秒实际截止、首写与完整Game费用/先前零变化不放宽。原三基线对象/阶段和CRAFT START受理quota门槛已实际0/3红，285091be/原Game/全DB/原retry与无pageerror有证，原件保留。

首轮实拍与参数展开修正：source1旧paper底覆盖场景、错误态Site越界；source2恢复真实场景、阶段/意图门槛实绿后，真实限额summary及展开字段仍向导航溢出。故移除详情内重复角色大标题（HUD身份保持），完整设置只进一个training-limits面板，不再额外嵌套training-budget折叠。展开时人物/完整目标预算/主要决定三列并列，原字段、预估、累计授权、离线说明和原字号/44px全部保留；不是缩图删功能或锁滚动。旧隐藏details虚矩形前提按真实closed祖先排除，展开后的几何全部硬验；辅助摘要/边界原14px与本次成本正文18px分开，原失败/最小diff保留。只修当前固定桌面实际红，不开启兼容或移动断点工作。

实现独立本地提交后，运行源与Git archive、受测/重建/冻结/实际HTTP逐hash一致，原56884只在空闲安全更新并只读核对进度，不用用户档行动/导入/恢复/重置或存档测试。原13/v0.3/输入/旧冻结/全部失败保留；不push/PR/合并/公开部署/改权限。提交后更新tasks/杠精及证据、本轮结束；下一原MATRIX-M02/M03，再三项检查（ART06计第一项），不把ART工程和机器绿灯代整体游戏感/艺术/用户认可。整体Goal active。

回滚独立revert本项对象/显示适配/守卫，不降DB9/DB1或改变规则/周期/历史proof，原始画/回执/用户档保持可读，旧来源与失败原件不删。

[杠精审查] 开工通过：本项覆盖真实修行/阶段对象与筹备闭环，含此前未接的v1/三v7，不以通用hook或新原型算完成；完整授权/能力/长放置与最终义务保留。具体测试矩阵及实际资产仍须真实落实后交付。

## 实际执行范围补记与下一窄红参数（source4 后，2026-10-24）

保留上述开测前历史参数，不覆盖原计划：截至本登记，新 cultivation-objects 已为实际 17 条声明，相关旧九文件仍 93；新 source4 回合与原失败分别保留，不能先写成 17 全过或拼成整轮。规则 source3 显式 60 文件实跑 802（原 790＋新 12），其中配置母/子 9 已包含；source4 再实际执行配置 9，793 未变规则/helper 项按精确依赖继承，不计成 811。该次配置误设 `IDLE_CONFIGURATION_OUTPUT`，脚本实际只认 `CYW_CONFIGURATION_REPORT`，故只有真实 9-pass log，没有新 JSON；执行中的 sourceRecord 仍核对全部当前 runtimeSources/digest 及控制前后输入一致，不能伪造报告或把旧 JSON 改 source。

原生实际报告 source3 为 81 条、11 文件、0 skip/retry/flaky，不是原开工计划的 41，也不是 211 全矩阵：CLI 的 `activity.spec` 文件正则同时匹配 source/production/preparation/mixed/later-mixed 五个 activity 文件，额外 40 条；原计划六文件 41 条全部包含。保留原 source3 身份及实际名单，未变 Store/正式规则/harness 与测试输入按证据核对；没有据扩选顺带恢复兼容、环境或性能专项。source3→source4 234 个运行输入仅 App/GoalBoard/GoalPanel/两张专属 CSS 共五项改变，具体逐路径证据写入 `goal-4/evidence/art06/source3-to4-inheritance.json`，不称 source4 重跑 81。

本轮已实际修缮范围包括：START 未受理后修行/阶段/目标异地前往的新执行门槛，原 retry 和只读入口保留；当前开场/CHOOSE 结束后回修行的上下文；普通修行详情返回；入劫确认成本正文 18px；目标页大实底/小图标的实际像素问题改为真实所需突破物/台座、条件悬签与来源路标，全部物/法/器/事件与成本/来源/分页不删。当前已看到的 natural-real-saved 短成果压脸与双重底板另作本项最小 TA 修缮，保原真实结果与演出身份，不改 Game/时钟/结算。

在 source4 当前冻结回合（owned39736）真正终态前继续禁止运行源落盘。随后先实证以下两项静态风险，不能凭推断预防性改生产，也不能把它们写成已有产品红：

1. A18：合法足修为/已备突破物的修行详情，经原 footer BREAKTHROUGH 确认后，核该 view 是否缺本次局部 Gate/读秒，以及保存跨 realm 的真实 handoff。沿原 30 秒单周期、原确认/成本/完整 Game/唯一回执，不用 HUD 存在冒称局部阶段对象已接通。
2. A19：洞府 CRAFT START 受理 quota 真未提交后，从 PreparationPanel 选择购丹，再只读查看筹石来源，核本来合法的异地 travel 是否仍能发新意图覆盖原 retry。先证明正式行旅原本可行；材料/来源/计划/返回继续可读，原 Game/全 DB 不变，原命令重试仍可用，不以自然禁用项作正例。

两新例各 60 秒整例上限、原 expect8秒/navigation15秒、固定1440×900单Chromium，用虚拟钟只验证正式周期与完整保存边界；不加 sleep、不涨限、不改周期/费用/CAS/原重试。追加后预声明为新19＋旧93＝112，重复回合不增加业务计数。实际终态、红因、最小修补、像素与同源交付仍须另有证据；整体艺术、长期节奏及真人验收不在本登记关闭。

继承审计补充：原 source3 的新增 cultivation-effects 12 例有实际通过日志和当前源码标题/哈希，但没有单独保存其开跑前哈希清单，不能冒造历史 snapshot。因此最终冻结后，由主控实际定向重跑这 12＋全源配置 9＝21，原旧规则 781 按未变依赖继承，唯一总数仍 802，非同轮 802 全跑。当前不预贴 source5 标签。source4 原误设的完整环境为 `IDLE_CONFIGURATION_OUTPUT=artifacts/goal-4/art06/configuration-source4.json`（session52989，实际 exit0/9pass）；保原日志与 `configuration-source4-binding.json`，不为了补旧 JSON 重跑，也不把旧 JSON 改成当前结果。


source4实证后最小修缮计划：A19普通点击异地前往真实创建了新的TRAVEL START并替换原未确认CRAFT意图；故筹备源/收尾前往同时显式禁用，并在App现有arrangeTravel对异地操作再核pendingStoryError，同地只读查看仍可用，不改Store或重授命令。A18先发现ready首页丢失原完整修行入口，原timeout保留；合法先进入详情再正常积累圆满后的下层独立红又证Gate/本地读秒/一次跨境交接均缺。恢复主入口，详情运行中的正式BREAKTHROUGH显示独立Gate，只有本页own非重放原子完成及真实realm变化才回主舞台交接，不自动继续任何活动。A14实际入场成本16px改18px，保完整正文/原确认。root实际natural保存图证明短成果挡住演员面部：将结果置于进度旁独立文档流、保全部真实文字，去掉修行重复不透明底板并加强蒲团/灵石对象材质；专属文字/参数保实底，预算/字号/命中和完整内容不减。所有源修改等待21009终态后，重新构建并冻结新源，再做112声明核验。

source5六定向实际4过/2红保留：A14原成本仍被旧story-book高specificity压回16px，故新增作用域加实际#app且保字体比例表达式；独立root实拍确认演员与新结果已分离，但修行内层底板仍被旧catalogue高specificity压回，使用同一真实宿主限定优先级，使局部参数/决策实底继续保留而整体让出场景。A19的foreign禁用/全DB/原retry已硬过，末尾.catalogue-note是原14px导航辅助，测试按既有正式CSS分类，完整文字/18px成本/44px/祖先边界不减。当前只两CSS变化，重新构建并冻结，不回写source5原失败。

source6首次真正执行A14在线15秒：费用18/完整Game/首次原子提交通过，原15364实际2过1红；完成仍留行前核对、局部文字仍让再次确认且handoff缺失。只补本页own、非重放、正式v7 START_TRIAL已保存且phase从idle到trial-question后的显示导航，回主舞台给单次交接和明确问心查看入口，绝不代答/续关/再入劫。原读秒/全部数据/确认/未知决定保持。原失败和首次真实时间保留，新源重新冻结后先复原例再完整112。

source7完整112首轮实际100过/12红保留，新19全部过。旧11为新公开限额/取消内层折叠及入劫已回舞台的导航前提，保持原Game/费用/周期/18/14/44/时限而按真实入口最小适配。另旧受伤渡劫筹备是真产品回归：spirit仅XP满即primaryBreakthrough，新Gate越过正式recover步骤，丢失先恢复标题与原疗养直接入口。最小改为主Gate不得覆盖recover，复用原Site疗养主行动并显示正式step.title；地点/HP/MP/材料门槛、原只读疗养安排与30秒规则不改。修后先原受伤例并实际核恢复入口，再当前相关回归；原112和前提diff保留，不删原断言或把真实问题归成字面变化。
