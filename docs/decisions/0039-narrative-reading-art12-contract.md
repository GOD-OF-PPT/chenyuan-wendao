# ART12：人物缘牍、真实会面与命卷读页

2026-10-26，基线63e6571/ART11实现19e00a8；codex/goal-4-online-recovery，运行186c9973/279源87载荷9068677B。完整原目标amendments/2026-10-26-goal-continue-art12.md已保存，原13全hash/status/patch保。当前只ART12，下一CHECK-ART-03综合ART10/11/12；其它ART、M04路线恢复/M05性能/M06兼容最后/干净包/最大评审/真人不缩，不重做旧nextR1或另建Goal/聊天。

## 依据与基线

按指定game-studio→game-ui-frontend/game-playtest，保Vue/DOM正式引擎。XAG112/114本轮实际回读，一致可预知导航/返回、按钮行为/当前context用于本项目。具体dialog/布局/6-12秒均原项目推导，非来源时长或认证；见research/art12-narrative-sources.json。复用四人物原画与原纸面/印章，不新生成位图。

现Fate人物名在header/名笺/portrait重复，常驻174px四名笺+180px头像+正文；实际EVENT主要动作另藏events切面。Life四章大侧栏、景画/序言与卷尾按钮各等权；Response全签+portrait+当前详情多栏。先独立合法Game/原演员/完整事实与全DB只读，再锁默认常驻名笺真实红，不假称旧人物/正文不存在。

## 玩家动作和完整内容

1. 仙缘常态一份当前缘牍及真实记录，人物姓名只作为主对象题名，不多处同权标题。‘换缘牍’按需单表面含全部四人/portrait/原标签；选择只改personIndex并合页，保原peopleRows、分页140码点、row.key+part/journalKey锚。未识明确图鉴/尚未来往，绘画不表示人物已经在此处；已见、待会面和当前已会面事实可辨。
2. 人物的已记事实与未来可知内容分开。‘查看来往地点/后续’只打开地点、境界、完整门槛/原route说明；真正前往沿原navigate/TRAVEL6秒，抵达不自动EVENT。不能用next.unlocked(仅境界)代真实availableEvents/phase/preview。没有未来时仍可换人/读记录，无空主面板。
3. 所选人正对应当前实际pending会面时主决定‘读对方来意’沿原dialogue；本地可开启的next在availableEvents且preview、原enabled/busy/running/pendingError门槛下提供‘递拜帖/查看拜访安排’，仍原完整有限确认与EVENT6秒，保存后停为已会面待回应。其它人物/旧回执不能借会面/成果，未决写意图不被新拜访覆盖。events/journal切面原全部事件/100手记/继续遭遇/生平入口完整保。
4. Narrative阅读正文/已记来路即时。进入抉择仍原mode，所选一签与完整已知后果/实际成本/预估/资格为主体；‘换回应签’按需显示所有原2/3等选项，预选只page并合签，不立即DECIDE。原ChoiceCard详情、核对/确认/取消与6秒保持；未知问心不代选，所有非NPC开场/试炼/结尾叙事域仍原narrativeFor，不把它们误当NPC查询。
5. 命卷当前人生/实际篇章正文是主体，四篇轻书签在卷边可达，完整所有正文140码点分页保留字符/空白，不省略/缩字/内滚。默认读原life首篇，不擅自按最高境界跳页；正常revision不重置、普通返回/新增事实按原row.key+part锚。章节切换只读，不执行收卷。
6. ‘此生处理/卷尾’低频单表面保原导出生平、RETIRE、合法END_LIFE、已结束原收卷回执、hasCheckpoint恢复、restart/新人生全部入口/门槛/禁用原因；所有实际行为沿原emit/父确认/CAS，阅读/合卷不结束人生。seal篇库存/身份/范围/恢复说明仍为完整阅读内容。原12秒有限确认/费用/原意图重试/状态key切换和稳定host保；导出生平不当完整存档。
7. 新名笺/路线/回应签/管理表面一次一个，Esc/合页回原对象和可预知focus；KeepAlive失活/run/context变化关普通dialog，不清原阅读锚/预选/已受理意图。原唯一EncounterTable/ResponseTable/LifeScroll的useNarrativeObject仍唯一claim；不能目录再挂第二hook抢成果，不能给组件按人名/页码/model重key丢运行见证。
8. Game/Store/DB9/规则/周期/价格/100journal与6类v7证明集合不改。running/command冻结当前人物/回应，saving不先落字已发生；完整原Game/resolve/result/completeActivity proof非重放保存后才一次墨迹/印章。暂停/隐藏/换物/新run/错误/同id外页/历史/refresh不补演。短印章留白避整个正文/选项/页签/页码/导航，原actor/scene反馈身份不放宽。降低动效/图片失败仍有完整DOM/状态/读秒。

## 文件和预算

0新位图，所有原画/字体/旧素材/历史证据保。旧cap不涨：story-journey8文件47957/48000只余43；stageR413962/14000只余38；ART05对象六文件27099/45000余17901；actionfeedback33973/34000、playable59881/60000及全部其它帽不动。Fate/Narrative/LifeCatalogue的正式rows/reading/quote/controller不搬新组逃帽；通过真实退休重复标题/老常驻布局CSS抵销新markup。现LifePanel是非singleScreen fallback，本项不顺带重构。

新只一文件art12-narrative.css≤14000B，承担新名笺/单阅读/卷签/管理表面，不搬旧controller/旧画布逻辑；main显式import。现EncounterTable/ResponseTable/LifeScroll可持新增本地readonly dialog与focus、真实slot承接原四名笺/原choices/原management按钮；父仍原Game/quote/gates/cache/emit，不迁费用或保存逻辑。旧story-book/narrative-objects/style退休部分须真实失用/重复依赖核对，不删除仍在用fallback/正文/减效/印章安全区。App仅独立实际红证明导航/印章接触缺口时窄修，不能静态预防性改写。

## 八个具名新验收与旧责任

A1默认单缘牍/按需四人/完整已记事实和未来内容，选择不写Game/不假现场；A2本地真实可拜访与异地门槛/路线预览/明确6秒旅行，仅抵达无EVENT；A3实际pending读来意/所有回应预选和取消0写/原有限EVENT-DECIDE全Game唯一回执，不代选未知；A4人物/100重复手记/普通生平返回/新增0/1/2条及新run阅读锚/relocated不抢页；A5四篇完整字符140码点/原页码/篇章/currentstatus，管理默认closed且开合只读；A6卷尾所有active/ended/寿尽/归隐/飞升/检查点缺/恢复/restart/export/receipt合法入口，原确认取消和END边界；A7原生保存失败/丢回复/原intentretry与新表面只读/运行gates/同id外页和刷新不重奖；A8新表面真实keyboard/focus/最紧error/notice/缺图/两减效/印章外缘18-14-44，全正文真实祖先。具体新8实际list/参数在开测前冻结；不能用空callback或重复真实周期凑覆盖。

旧具名59/8文件候选：narrative-objects14、stage-r4 24、idle-milestones10、M03-MF1/2/3、idle-stage committedclosing1、CHECK-U8 invalidatedmilestonejournal1、KeyboardK1/K3/K4、CHECK2-A2/A6/A7。实际freshfile/title/project先声明再执行，不模糊regex凑数；共用其它入口若实际source变依影响补具名。真实6/6/12沿原ART05-A4/A5/A6与原时限、原firstput>=due/完整Game/allDB/唯一receipt证明；虚拟只证规则不冒真实节奏。旧视觉/入口如确实退休，先真实红再公开新表面适配，保全部费用/原callback/时间/字体/祖先/原重试，不假留节点或对已删集合空loop。

原生App34当前实跑；原M03 298仅83/common13/harness全exact可分层继承，原源标签不贴新，不拿83证815。815/61规则、根TS/Vue构建、当前新旧资产正负guard/caps及固定1440像素逐张核。新CSS单ledger/guard可有12意义负例（old413全方法保），完整425实际声明为准，不拿新12+旧报告拼全绿。每phase源码/spec/manifest冻结，真正pre→ownedterminal→post，cwdweb/public10+generatedMeta1/实际HTTP全集，原60/8/15及已有90/75窗不涨。

图片每次≤2，原尺寸JPEG68副本/原PNG/hash保，不批量base64/把188或其它生成图当全审。当前仅1440×900/font1单Chromium，不兼容/移动/字号/跨浏览器/环境性能。原13hash及v0.3/存档/原画/旧失败保。

顺序：原话/合同/计划/任务/保护→合法旧冻结人物/全DB只读后常驻名笺真实红→正式缘牍/会面/回应/命卷/管理及早期逐图→新8/旧59+具名影响/真实6-6-12/规则nativeguard类型构建→独立提交/Gitblob/重建冻结HTTP/Chrome静息原进度只读→任务/GJ并结束本项。下一CHECK-ART-03，整体艺术/长期/矩阵/干净包/最大评审/真人保持。回滚独立revert本项展示/consumer/guard，保DB9/DB1可读与原件；不push/合并/公开部署/权限变化。

[杠精审查] 开工通过：具体人物/已见事实/真实拜访/明确回应和读页管理进入正式页，不只旧三栏换色；全部正文/选择/原确认/有限周期和后段责任保。复用现有Skill/agents/原画与测试管线，不另建workflow/自动化/目标。

## 组合红例后的局部交接修缮（source2）

source2新8为7过1失败，A3正式EVENT/DECIDE完整Game、费用、全DB和唯一回执均通过，但已缓存Fate在回应完成后重新激活未能显示本次墨迹；独立pending新建Fate的A7/A8通过。原窗口和完整证明不删，不将已提交成果说成保存失败。诊断/修复限定原useNarrativeObject的同一渲染认领：KeepAlive重新激活可在原delivery窗内核对现对象；同一组件已经认领的同份effect与相同kind/id可幂等保留，切对象/失效/离页仍清，晚返回和已消费回执不能再认。原host单render窗、claimed唯一、1400ms、完整proof和保存边界不放宽。先保旧源/trace，再定向A3与完整新8、旧归属/隐藏/换人/刷新例；不是新奖励时钟或新授权。

源2旧59原样整轮22过37因旧公开入口/closed管理DOM前提失败，原件/真实终态603exact保留。只沿新公开名笺、回应签、管理及ART11目录打开原完整操作，保全部费用/Game/时间/正文/几何与原retry；closed按钮仍存在时核不可见与Game不变，不保隐藏旧token。observer重复安装先断开旧观察器仅修采集，不以此抹去A3更早的DOM无反馈红。

source3精确CDP只读诊断（非正式绿/性能）最终确认：seq2先由response/shen_return认领，再由fate/shen两次被拒；之前“Fate引用变化”只是被原样保留的假设。source4只在本组件真实root仍连接并可见时认领，使用已有visibleFocusTarget；首次挂载与原激活在同一原delivery窗尝试，不增加延迟重试。旧Response已脱DOM即不调用claim，原Game/CAS/完整proof/host窗口/1400不改。菜单实红为选中签右移4px超立即父，CSS在原列表内预留4px并保原位移/所有几何断言；MF新增测试helper漏import另存为适配准备错误，不冒产品故障。

源5最终仅明确focus.ts导入，Node规则实跑通过。实际生成演示sourceDigest/节点hash及bundle元数据变化使源4/5的87资源并非逐字节相同；已保原失败比较，并以源5完整新8/旧59两轮及815/34/425全部当前实跑证明，不使用原拟“字节相同继承”方案。当前7aeb4181源280、87载荷9074609B，下一提交/同源重建/试玩只读和工程审查后才关闭ART12，整体Goal与真人不关闭。
