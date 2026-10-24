# TA08 自然取材与宗门委托实体合同

2026-10-24。承接TA07实现7f0feac/资料ab43dea；当前只TA08。完整Goal1、TA09/CHECK-TA-03八页、M04/5/6、同源干净包/最大评审/真人责任保持。用户“每页内部仍像工作台”的负面复验继续有效，固定1440×900/font1单Chromium，兼容/环境性能不执行。原话/计划/任务/保护13先于运行代码，旧目标nextR1为历史，不新建Goal/聊天。

## 实际基线与目标

SourceField的六自然点仍主要是30px图标、54px圆底与conic环，十宗门差事主要是矩形木签；已有真实逐轮与完整proof不能代替对象/工作形态。此为源码发现，独立基线实际画面/合法入口红例另存，不能冒称已看新像素。复用指定game-studio→game-ui-frontend/game-playtest，保Vue/DOM正式引擎；确需绘画的六自然冷态件使用内置imagegen，不以SVG图标替代绘画。

六自然实体：山野药株、承露叶、古境玉脉岩、寒池莲、凝魂晶簇、道砂石盘。十差事工作主体：杂务器具、护送文书、勘脉拓图、护阵令、药圃册、授业卷、安魂灯/信物、镇脉印、修碑拓片、护州图令；均为既有SOURCE的视觉叙事，不新增采矿/战斗/旅行、工具消耗、成长、随机或枯竭规则。绘画是地点资源示意，不能冒实有库存；实有与本段成果在独立袋/匣明确标注。

## 玩家动词与完整有限授权

1. 探看/择取：原source-ID入口选择只读，六自然资源和十差事全目录/原4项分页与锁境门槛保留；当前对象优先，目录低权，hover/focus仅说明。重复同对象、同分类与往返不覆盖草案，不旅行或开战。
2. 定程：当前自然物件/差事可点击打开原source-plan-open的安排表面，SourceField增加arrange只读emit，SourcePlanner仍独占正式plan/quote与dialog。默认5轮、累计月预算5×单轮月、余寿保留1；目标/数量/最多50轮/月份/余寿/预计整轮超目标全文均可查。关闭仅保留草案，不保存活动或消耗。已存活动与下次草案分别显示。
3. 安排取材/承办：唯一source-start仍沿原emit(start,plan)/确认/CAS，不改原点击链、不新增软件式预选提交、逐株点选、每轮盖章/领取或点击加速。新执行的pending/sync门槛和原意图重试保持，满修为仍可取材/筹石。
4. 停手续办/检视：原跨页唯一活动条暂停/继续/原安排/完整回执保持；新袋/匣仅检视实际持有与已保存本段累计，打开它不领奖、不重开活动。当前目标/预算/余寿/危险/NO_CHANGE等停止从正式状态读，不让短动画替代持久结果与下一步。

正式来源不变：herbs/dew/work30秒，jade/work_foundation60秒，jade_task/lotus/work_golden90秒，core/lotus_task/soul/work_nascent120秒，soul_task/dao/work_spirit150秒，dao_task180秒。来源items/stones/xp与条件/费用/月份由正式C.sources/preview取；修为受上限约束，不按静态产量虚造收益。凡人/洞府/坊市仍有完整空态、地点查看与返回。

## 周期、工作与成果表现

SourceField仍是唯一useActivityPresentation(v2/sourceId)所有者，沿现有完整Game→resolve→完整result→completeActivity与非重放/public证明。新子组件只读props和emit，不访问IDB/Store命令、不setTimeout/发奖/另建时钟。选中来源匹配当前人生/地点/活动id/generation/owner/真实runtime时才工作，不能把全局running当当前所选对象正在执行。

自然工具/接触部位与差事笔墨/印拓按真实progress分接触、作业、收拢；保存中停在封存，不能让物件脱落/入袋/数字增加，不能显示永久采空或假成长。只有同源effect首次原子成功后一次材料/灵石/文书信物朝袋/匣收束；全部变化直接取正式delta与已存Activity，纯筹石不画假物品，混合产出不漏石，短表现复用原1400ms effect/sequence清理。原全局SOURCE活动反馈抑制边界不放宽，不与局部再叠统一环。

暂停请求、隐藏、选点/地点/人生变化、KeepAlive失活、外页同id接管/换generation、错误与销毁撤工作及短成果。未提交原命令首次retry仍可合法反馈一次；旧回执/刷新/外页观察/重放不补演。图片失败保文字轮廓替代及全部合法动作；两减效模式保静态主体、实际读秒/结果，取消装饰运动。所有文本数值/操作DOM渲染；场景留白与物件阴影、工具/入囊路径外缘必须核对真实文本/分页/导航，不靠pointer-events:none或中心命中替像素审阅。

## 模块接口与预算

最多五个新原生文件，合计≤42000B：SourceObject.vue（六自然实体/工具/只读打开安排）、SourceCommission.vue（十差事工作器物/只读打开安排）、SourceSatchel.vue（实际袋/匣/成果路径）、source-choreography.ts（只读六绘画/十形态映射与阶段投影）、ta08-source.css（独立对象/目录/布局/交互与失效样式）。SourceObject/SourceCommission props为sourceId:string、state:string、progress:number、sequence:number；arrange emit仅打开原安排。SourceSatchel props为game:Game、sourceId:string、activity:Activity|null、result:ActionResult|null、sequence:number；只显示正式SOURCE结果与v2本段、无写API。source-choreography导出SOURCE_ART六id→冷态路径、COMMISSION_OBJECTS十id→专属形态，SourceField沿原effect传结果/sequence，真实working/saving状态沿原hook。

SourceField/SourcePlanner为实际旧接线；可移除被真物件替代的icon/conic/旧布局样式，须记录语义替换，不保隐藏旧token，不搬旧计划/proof进新文件逃预算。原ART02九文件45000B、SourcePlanner+idle-sources24000B、R2 CSS14000B及所有旧cap不涨。实际新代码/原代码身份分别记账，SourcePlanner原参数逻辑保持。

六独立冷态透明件，每件512×512 WebP≤160000B，总≤960000B，不生成16张流程图或带文字/运动/奖励的静画。路径web/public/art/v2/sources/{herbs,dew,jade,lotus,soul,dao}-cold-v1.webp，源稿art/redesign/ta08-resources/对应PNG；提示词集合、每件工具回执/原稿与导出hash、真实RGBA/alpha/bbox、确定cwebp参数/重导出及正式消费者全部保存可提交路径。现有资产不覆写，真alpha不符或留白不足如实记/修，预算不放宽。新ta08账本/正负守卫复用旧工具；图片每次至多两张，逐张审，不批量回传base64或大量原图。

## 独立验收声明与执行顺序

新增source-actors.spec.ts十二具名业务，开测前实际list逐file/title/project确认：A1六自然冷态/选择只读/门槛；A2十差事三页与混合/筹石收益；A3自然两完整周期自动入囊/整轮超目标停；A4满修为委托两周期筹石不领奖；A5真实30秒委托/首次读0<left≤30/递减/first native put≥due/完整Game与唯一receipt；A6最长180秒179999+1正式复合产出；A7真实保存hold与quota原command首次retry/幂等；A8暂停请求/hidden/换来源撤工作与旧成果；A9外页同id接管/刷新/原历史无重演；A10全部非默认草案/来源往返不重授；A11新人生不承旧物/草案/成果；A12系统/偏好减效、缺图、错误四委托/自然全文几何。参数组合在各例内展开，不以重复保存/多帧/子循环充业务数。正式合法driver前缀经公开测试import入独立上下文，不手改Game、不用用户档；约30分钟/虚拟钟不代平衡。

运行源码冻结后当前新12与受影响旧30精确声明，保原60/8/15与0retry；原虚拟截止前完整Game/Activity/全部库零变化、最终1ms完整正式结果/成本/唯一原回执/proof及累计停止都保。原相关native/规则按真实依赖继承或当前执行分别列，App34须当前；绑定全部源的配置/类型构建/新旧资产守卫当前执行。不称全部429UI或当前同轮332native。先用原4640894e冻结的合法A1独立红/实际图作基线，配置启动/fixture错误另列不当产品红。

早期逐页像素先看山野自然/宗门承办与保存后、完整非默认安排/错误四差事；后续至少每种自然本体和差事形态检查实际消费，代表帧按需逐张，未审帧不冒全审。硬核18px正文/14辅助/44目标、全部来源/回执/预算/返回、祖先裁切/工具与成果路径外缘及真实点击。机器绿而像素混乱仍需修，不能裁字/缩字/内部滚动或隐藏能力。

先合同/原话/计划任务/13保护→独立基线红与六内置绘画→正式接线与早期像素→最终冻结/相关UI、规则proof/native、类型/资源与真实30秒→独立提交→Git archive/重建/冻结/实际HTTP逐hash及原56884只读进度/实际加载入口→更新tasks/杠精并结束当前轮。下一仅TA09，后续全部父项保持active；不push/PR/合并/公开部署/改权限，不创建重复工作流。

回滚只独立revert本项展示/画件/守卫，保DB9/DB1可读及原档/原画/原件/旧冻结/v0.3/全部失败/13在途，不降数据库或删除历史。工程检查、实际像素、整体艺术/长期与真人分层，不凭当前局部达成标整个目标complete。

[杠精审查] 实施前通过：真实主体/工作与玩家动词、完整有限授权和逐轮成果责任都明确；六张资源图不是任务完成，尚需真实正式页面和全清理/保存/像素/交付实证。固定桌面内实修，不恢复兼容/环境性能。

## 首版早期实际缺口（跨至2026-10-25）

首运行源0ac99ef7，253源码/69载荷8306184B，Vue类型构建及资产正向通过；A1/A2/A7三例0过/3红，710输入pre/post完全同。合法主体/图/工具外缘及A7真实native持写、完整Game/全库未变/尚未入囊已过，quota/retry尚未到达不报过。实测header旧strong margin-bottom14令标题向上超1.797px，14px/line1.4 Range超1px、22px数字/line1.2 Range越3px，混合收益差事文字超按钮。root实际单张看山野/宗门原图亦确认目录仍被主题填大卡、分页换成两行、委托器物偏线稿。

修复保字号/全文/44目标：清本header旧margin，辅助行高1.65与数量1.6；目录按内容自动高度/低权透明、完整混合产出不被等分fr挤压。来源独立小分页沿原page/page±1只读emit，用可见“上页/下页”及完整aria-label“上一页/下一页”，一行44px入口与全数量保留，不改共用CataloguePager/全局预算；不是隐藏分页或兼容开发。当前对象/袋匣增加同SVG内有形材质/立体面，保持原10分支/工具边界/实际结果/时钟；不是再增加位图、成果或新玩法。全部首源、原图/矩形/报告/未到达分支保留，新源须重新构建/冻结/原三例与实际像素核，不能只据源码静态修补提前标绿。

Source2 fea14dc8早期同三例1过/2红、710输入同。A1六自然/三地点/锁境/只读及全部文字外缘真过；A2只剩分页按钮向下超实际父0.515625px，viewport/命中/其它祖先通过，不冒称实际文字被裁，保原0.5容差，收1px目录间距解决。A7真实native held保存全库/完整Game未变与无提前入囊、release后完整Game/唯一原回执/正式result已过，随后新测试误按v6读proof而中止，quota/原retry尚未测。

正式SOURCE活动版本2的持久ActivityReceipt为version1，七字段无proof；只有活动5/6/7强制version2 proof，不能为测试改DB/Store或造字段。新spec.saved按实际协议硬核exact7字段、input.tick全部CAS/id/gen/owner及fingerprint、完整command/resolve Game/result、原生全库/唯一回执/validate及completeActivity全等；running用实际activity.startedAt（须不早于due），stopped以原due重构且说明该now不影响stopped状态，不冒实际resolvedAt。真实30秒A5原native firstput/complete>=due独立断言保持。完整表现proof仍在原共享hook，不把v1持久回执说成持久完整transition proof。原错误代码/trace/报告/未达分支和测试最小diff保留。

Source3 2ea520d0早期1过/2红、711输入同：A1全过，A2已越过原0.5px边界，后因本次真实分页遗漏原catalogue-prev/next定位而中止（可见button与完整aria一直在）；在真实上/下页按钮补回原data-testid，不能假留隐藏token或改共享helper掩盖。A7首周期保存/完整v1回执、CAS/Game/Activity/allDB与真实入袋已过，第二周期真实quota原Game/全库/command不变亦过；错误页仅自动入囊说明超source-focus底23.844px/scene底13.844px，未到retry不报过。将同完整静态说明移到资源页头，袋匣/库存/累计/完整回执与字号保持，不删除文字、裁切或缩字；移除实际已替换的旧hint样式，后续新源核原quota/首次重试与所有几何。

root实际看source3 quota原图确认：袋框外缘也越到安排区，不能只修被测试点名的文字。保完整自动入囊说明移页头后，错误袋内上下padding再按实际边缘收6px，字体/数据/44px按钮不变。真实错误态主按钮不应仍提示“先暂停”；显示优先与原unresolved/sync原因一致，先处理存档或重新读取，原disabled/命令/重试完全不动。首次source4预构建与源码归档另存preflight（未UI执行），修正后另做ready构建，不能把预构建当最终源通过。

Source4-ready 3c93d690完整新12实际5过/7红，712 pre/post与253运行源相同。A1/A2全目录、A5真实30秒（首次put due+28ms/complete+46ms）、A8/A9通过；A3/A4/A6首周期完整Game/回执已过但结果层覆盖安排，后续周期尚未测；A7真实持写/abort/原command首次retry/唯一回执及一次入囊已过，末图结果行越源舞台；A10展开标题28px Range向上越1px；A11新人生与预算/120秒无旧奖励已过，导入notice压缩后四项纵目录越界；A12只到system分支末几何，preference与两error上下文尚未测。原报告/原22PNG/精确矩形全部保留。

Source5修缮只重排展示：来源仍每页4项，低权两列避免notice下四行纵向挤出；袋匣重复标题合并到原检视按钮，原实际持有/本段已保存文字与真实开合保持。检视绘画64px、库存按品名/数量/完整本段累计同行，宽度与余白重分配，字号/44目标/全部事实不删；真实入囊路径随袋内器物上移，不穿过库存/读秒。安排标题保持28px并足行高。当前新spec原c66e不改，注册正式固定桌面idle配置；后续重验全部12及相关旧30，不将原5项假贴新源通过。

Source5 c6439926完整新12实过（712输入相同/253源/69载荷），并不证明整个动画路径。独立review后加强helper纳入检视文字保护；首次虚拟+400/+450仅令真实CSS到233—300ms，两例虽绿只算早期采样，原件明确保留。随后改为原生CSSAnimation.currentTime≥750/1000且<1100、alpha>0的硬握手，无sleep/修改动画钟/收益钟，在原source5真跑A3/A6均中段红（714输入相同）：783.389/800.043ms、alpha1，图形6px外带right1209.37/1209.65与检视文字left1183相交；在middle停，late未测。

Source6只将原入囊横移的75%/终点90/110px收为36/42px，仍在同1400ms效果及1100ms装饰动画内，真实物/石各一、实际结果/完整参数/原proof不变；路径落原袋图中心，不能用pointer-events:none或早帧绿掩盖扫字。新helper保原断言/12callbacks、同一业务内补实际中末帧；A1/A2仅补每种已测对象的原图，不加业务计数，原时限不涨。source6须当前完整新12及实际逐图后才交付。
