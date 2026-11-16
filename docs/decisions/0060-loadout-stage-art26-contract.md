# ART26 三法一器配装舞台与明确比较

2026-10-29，基线e011c479/c43b4b5，codex/goal-4-online-recovery。继续原Goal4/完整Goal1，不新建目标/聊天。上一ART25为实际progress；本轮只ART26，三项第3，完成后强制CHECK-ART24-26，不在本轮偷做第二任务。原话/合同/plan/tasks/13保护先于代码与绘画消费。

## 真实缺口与玩家操作

已实际看同源配装页：半身头像和四个等权矩形卡，主次/器位与人物联系弱。仓库已有TA07完整透明角色，但为施法手势；保其身份/服饰/光照，内置imagegen只生成冷态安静站姿的独立变体，原战斗图不覆盖。角色不持武器/法宝、无施法/光效，避免把示意立绘画成已持有装备或正在开战。复用ART24无字内景；人物外观仅观照示意，真实姓名/修法/三槽一器/数值由原Game和DOM显示。

角色为中心，三个实际功法器位与一个本命位环绕；弱化四个大平卡，明确是“查看器位→翻阅可选项→比较→明确确认”，不暗中装备。心法/起手/终结原槽位与真实名称、空槽/未择法/未认主、静修/护体/符印原实值、完整返回与原成功文字保留。只在Game.loadout.relic有值时显示对应原成器画，空位是无物占位，不画随机已持有器物。hover/按下/键盘有器位提示，原新配置proof后的短echo保，历史/刷新/外页旧回执不补演；降低动效仍读真实文字。

当前本命位的查看必须到达当前实际器物。旧EquipmentPanel只section='relics'，ProductionPlanner无显式highlight时选首器；先用合法已认主jade_seal与完整Game/全库只读证明实际目标，再断言目的地。若实红，以仅查看请求relicInspection={runId,id}逐次新对象传给原forge消费者，locate读取并按既有select/id规则定位；同id不重置预算，重复查看能在子视图曾换物后再次定位当前器。请求不含command/授权，不作Game写，不按普通revision重建读页；模式/外部highlight/新人生清或忽略旧请求，craft不消费。父/子原预算/保存/原意图归属不移交。

原确认窗口在恰好一槽changed时突出本次“原→拟换”，其余三项完整保留但为次要；SCHOOL三槽变化及无变化/禁用保持原完整核对。只以原changed类组织CSS，不改ConfigurationDialog/Outlook脚本/DOM内容或quote/CAS。配置仍即时原子确认、无灵石/丹药/岁月，不加假倒计时；本境预演只读、不暗战/疗养/补药。原活动不自动继续。

## 文件、预算与资产

生产边界：LoadoutConstellation模板，script完全不改；art03-equipment.css真实替换旧summary样式，不迁controller/压格式逃帽。保school整分支原字节/ART24真实对象与入口，第一阶段图片约束不代整体美术验收。新立绘AssetImage有原portrait fallback，所有图失败仍完整DOM姓名/4器位/真实值/动作；内景失败保实底。

EquipmentPanel仅只读查看请求及生命周期清理（当前4125B，新独立上限5000B）；ProductionPlanner仅可选请求/locate输入/同run forge守卫，原select/预算/restore/周期/写入口不改。保原idle-production24325/26000、ART03总43937/45000、art16 CSS6940/12000、preparation59962/60000/TA0930000等全部旧cap，不改变ConfigurationDialog以躲38B余量。不新增TS/样式模块，不动engine/Store/DB9/物品/功法数值/成长节奏。

新位图最多1件player-loadout-idle-v1；原图/完整prompt/真实本地工具审计（非provider签名，未知model/requestId为null）复制art/production/art26，runtime web/public/art/v2/actors/player-loadout-idle-v1.webp。真透明保发丝/全身/衣摆/双脚，空手/静态、无字/边框/UI/水印/武器/地台和光效。source为新PNG不覆盖原TA07，运行等比整幅缩至≤512×768、≤240000B，0裁切/语义Python改画/字体，全包15MB不涨。复用既有image_facts/identity/cwebp流程，单件适配且两次确定导出、alpha/bbox/hash/完整消费核实；不新增重复workflow/Skill/自动化。

正常无错误/无活动压缩时，实际立绘alpha16投影长边目标≥300px，非大图盒；错误/保存/暂停可以收装饰但完整18正文/14辅助/44目标与所有器位/姓名/数值/结果不缩不裁/内滚。16字合法道号是固定桌面内容边界，不做多字号/viewport专项。比较窗口首帧可读，不位移/淡化正文与按钮；真像素、文本Range、祖先/阴影外带、互不覆盖与真实中心命中分别核。

## 独立验证与回滚

新5类业务：A1合法实际组合的角色/4器位/实值/新图真实绘画与全库只读（先证旧功能和原事实再锁新画红）；A2当前本命位目的地及同对象非默认777/9预算反复查看/换物/新人生的纯读取；A3真实一槽变化主次、完整原4槽/成本、原比较取消/明确原子确认与完整Game（三槽School沿原完整例）；A4空槽/两派/16字姓名、运行/事件/斗法/原失败重试可读与全部入口；A5新body失败→portrait、全art失败和两减效的原功能/键盘/真实状态/返回。实际独立案例按执行前具名细化，不以一张图或0时间脚本冒完整放置体验。

原所有受影响配装/研习/法宝/确认/原意图/模态/跨页组合相关完整文件具名定向，保原30/60等真实时长、所有Game/Activity/DB/回执/成本/0retry和原时限。必要15native两配置文件与42配置/装备模型，真实/沙盒资源正向先于新旧预算/alpha/consumer/只读请求和script/proof守卫，根/Vue类型/构建、确定导出、逐张像素。先冻结当前源码/声明/输入，无HMR，重型错峰；旧检查/失败保原source，不冒全UI/415/32/873/整资源本轮重跑。

只1440×900/font1单Chromium，不恢复兼容/移动/响应式/多分辨率/多字号/跨浏览器/环境性能。独立代码提交后核Git blob/受测/重建/冻结/HTTP；原56884已保存停止时只读前后核对，不用用户档测试/读DB/导入恢复重开或更换授权。再tasks/GJ/README和实施记录提交。本项结束后仅排综合检查。整体艺术/长期平衡/真人、原ART17四红/unknown及最终全部矩阵/兼容最后/同源干净包/最大C端代码安全评审仍未完成。

回滚仅revert本项展示/只读查看修缮/消费/守卫，保DB9和原可读性/原件/v0.3/输入/旧画/旧冻结/所有失败/13，不降库、不push/合并/公开部署/改权限。

## 来源与审查

本轮实际回读Riot Clarity和XAG114：重要变化保持层级、视觉噪音克制，按钮可预知查看/比较/真正执行。具体角色立绘/器位构图/300px/预算/单槽主次均为本项目推导，非行业数值/认证。game-studio→game-ui-frontend/game-playtest，保Vue/DOM正式引擎；imagegen仅真实位图变体，不生成假整页替代代码。Skill的通用跨端建议由当前用户暂停覆盖。

来源：https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/ 与 https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/114 。

[杠精审查] 计划通过：完整三法一器/正确目的地/比较及原确认均需实证，不以换背景或新画代真实玩法，不借新查看请求放大为写授权。实现/像素/测试/身份/真人仍待，不先标完成。


首原稿站姿/空手/身份已实际看过，但视觉仍有背景晕染，RGBA范围0–254且alpha bbox触画布边缘；不因存在alpha通道就冒干净透明，不消费该候选。保candidates/idle-v1.png与首prompt，内置imagegen仅背景提取/少量透明边界迭代；后续以真实清透边缘和核心≥250（若工具max254不伪报255）/全身/真实消费为准，不用Python语义抠图。旧本命查看红为实际jade_seal却到frost_sword，原4槽/全Game/全库只读前置均先通过，证明纯查看目标差异而非缺功能。


第二版实际1024×1536，alpha0–254、alpha16边界(49,4,982,1529)，透明0像素739615/1572864、核心≥250为757213，四沿max(1,3,0,0)，不能伪称每沿全0/核心255。选择该真实alpha原稿；透明区RGB仍可能留底色，查看器的RGB展示不替代真实浏览器alpha合成。导出不语义抠图/改alpha；以实际舞台复核有无可见晕染，工具两次原图/prompt都保。新producer只允许边沿≤3及明确0透明/近不透明核心，均为本项目质量门槛，非来源数值。


首2新例过后原像素确认：RGBA在真实舞台合成无可见矩形底，身体/姿态已显示；但内景的局部stacking盖住统计，旧主题important使节点仍平卡，顶部分类对比不足。背景移到loadout根同层，summary父提供隔离/实底、负层背景加明暗遮罩，退役不必要连接装饰释放原45000余量，节点局部#app真实覆盖主题；统计的实际Range/层级及像素加入检查，不能以先2绿当艺术完成。

真实资源正向还命中ART25的父控制器旧快照约束。旧art25.json/SCRIPT/UNCHANGED原始记录不改；ART26保父/producer原文TXT，精确撤回本轮只读请求增量后必须逐字等于原文hash（Configuration脚本/Loadout script/School分支仍原字节）。ART25仅允许EquipmentPanel这一项差异且必须完整validate_art26通过、基线SHA等于其原UNCHANGED后才能接续；其它脚本仍严格。旧ART25沙盒在只测旧合同时使用已保存原父TXT作为有效正向，不把缺ART26依赖的早拒绝算负例。此为构建资源归属接续，不改Game/回执proof或放宽持久兼容；先正向真实/沙盒再守卫。


首真实资源正向通过，三项正向组中新A26自身/旧A25通过、全局沙盒缺src/full/configuration.ts。此为fixture依赖未齐，不冒各负例覆盖；将该实际未变规则文件明确加入新ledger sourceReferences并按原复制清单入沙盒，保持validator不放宽。原失败正向log保留，再正向后才最终负例。


代码审查将只读请求隔离为独立watch：不把暂存inspection当作每次locate的优先默认值，避免遮蔽后续原导航；原locate/原run-mode-highlight watch逐字保，只有新对象请求触发同run/forge/自有id检查后的既有select。普通周期/保存/草案更新不重放查看，null不触原locate或改授权；保parent清理。规范化只移除新增prop/watch即可等于原producerTXT，严格证明未改原导航/默认预算/周期控制器。


## 本项实际工程结果（2026-10-29）

代码a8ef73db211bae8c85a3730a27e5d36150689608，运行74d659f2b18a95601dd2c2a1fd797096db626d0eda7deb9757780b264b3b38e1。191去重UI=其它23文件178＋旧名称补正后的完整stage-r3文件13；原完整191实际190绿/1名称定位红完整保，不冒一轮191绿，原Game/预算/全库/时限断言未删。15原生两配置文件整轮、42模型、正向先于42新旧资源、root/Vue类型构建与确定导出过。14最终实拍逐张审，原PNG/同尺寸JPEG68/hash保，每次至多2。302 Git blob/受测/重建/冻结及93载荷9534862B/HTTP解码hash同；原试玩只读更新前后可见HUD同，未用用户档测试或读取DB。

仅当前独立配装舞台工程交付；原45000/12000/26000等帽不涨，parent4464/5000只读归属精确规范化。整体艺术/游戏感/长期/真人、原ART17四性能红/unknown与最终全矩阵/兼容最后/干净包/最大评审仍未完成。下一唯一CHECK-ART24-26，不能跳过三任务全面检查，也不借综合恢复暂停专项。证据见goal-4/evidence/art26。
