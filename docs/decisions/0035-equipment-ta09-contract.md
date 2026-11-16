# TA09 玉简卷串与四器铭纹

2026-10-25。接续TA08实现33f0dda／资料0861d88，当前codex/goal-4-online-recovery；上一轮真实progress，原19f9f70b／253源／69载荷与HTTP、角色可见进度及13在途已交付。本轮仅TA09，完整Goal1／CHECK-TA-03八页、M04/5/6、干净包／最大评审／真人仍保留，旧原生目标nextR1不重做、不新建目标或聊天。原话amendments/2026-10-25-ta09.md、保护基线、本合同／plan／tasks先于运行代码。

## 实际缺口与方向

JadeStudyScene当前十二法／剑简共用五片玉片+图标与通用环；LearningPlanner默认只计清单卷数，完整清单在原dialog分页；RelicAtelier已有四幅冷画／材料／本命，但铸造中仍同成品画，阶段主要换字与环。此为源码发现，尚不是新像素红或原对象不存在。按指定game-studio立即路由game-ui-frontend／game-playtest，保现Vue／DOM／正式规则，不引Phaser、兼容或环境性能。两一手实际回读见research/ta09-design-sources.json；轮廓／层级／系统取舍支持设计方向，所有形态／布局／周期／proof是项目推导，未读媒体或试玩竞品。

## 物件、玩家动词与状态

1. 玉简以两派／心法、起手、终结及剑简的不同主轮廓、绑绳／玉页／刻笔／槽扣组织。待研保持冷态合卷，当前可信running才展开、按真实progress显临时刻线，saving收笔封卷，不冒掌握；完整proof后一次刻成，静态掌握／装配从实际Game保留。不是给原五片和文字加光。真实名称／全部作用／门槛／成本DOM可读，阅读选择即时，不加逐卷点刻、领奖、假知识值或配装等待。
2. 所选阅读卷、待确认草案、原已保存清单、冻结实际当前卷四域清楚。新增实体卷串每页最多两卷，完整名称／已掌握／待研／当前状态可读，分页保持全12卷；默认按已存安排或草案显示，显式切换原安排／下次草案。切换、翻页、点击卷只沿原focusSkill查看，不改queue或Game；调整完整清单／移除／预算仍从原learning-plan-open／dialog执行草案编辑。当前三槽查看完整保留，可在同一卷串表面的‘当前三槽’模式按需看原nav，避免叠加常驻面板；返回只切查看，不重建活动、清草案或抢读秒。跨mode／分类／返回／新人生依原缓存合同。
3. 当前卷只取useEquipmentCycle已经冻结的running cycleCommand（仅新增只读返回），saving不从已经前移nextCommand推当前或给下一卷借光。原Activity的顺序／Game.learned用于已存事实；没有本页冻结命令时只标原安排／下一待执行，不伪称本页正在描写。当前全局活动条保持唯一／真实读秒／暂停／原安排／完整回执。
4. 四器各有实际工作主体：青霜剑长剑坯／导轨／沿刃刻刀；玄玉印方玉坯／铜夹角／印底侧纹；照魂灯闭灯座／分离罩肋／内沿刻针（无火）；流云镜镜胚／分段铜框／周缘刻刀（无镜中幻境）。原progress0—.2夹胚、.2—.8刻纹、.8—1收拢；running只画工作胚与工具，保存前不揭已完成冷画为所得；saving封纹收刀，原proof首次成功后揭成器。未拥有的idle可读器谱冷画明确示意，真实owned永久显成品，bound另有本命扣位；器纹不造材料已扣／成功率／热度／额外规则。
5. 点击铸器对象只开原完整预算，不自动FORGE／旅行／采集／认主；铸成不自动装备，原比较／ConfigurationDialog及即时SCHOOL/EQUIP/EQUIP_RELIC完整CAS／原retry保持。所选器与当前本命、未铸／已铸／已认主有不同形态与真实文字，四画继续复用；当前三功法／本命槽不能丢。Scope不重搭修法页面，必要缩影可复用本轮只读对象，不新增全局强光。
6. 默认有限授权及全部12法／两派／四器／剑简、成本、材料来源、比较／返回／完整回执／门槛／停止保留。正文18／辅助14／目标44，固定1440×900/font1单Chromium一屏；普通／mixed／错误／notice与完整预算均核实际祖先和工具／刻线／短结果外缘。不能内滚、裁切、缩字或以隐藏能力减负。

## 接口、时钟与预算

最多五个真正新增文件合计≤30000B、0新位图：JadeEngraving.vue、StudyQueueRail.vue、RelicInscription.vue、equipment-choreography.ts、ta09-equipment.css。四器原PNG／512透明WebP／回执继续原hash，总136870B；本轮新形态为原生DOM/SVG，适合代码表达展开／刻纹／胚件，不为关键词强造位图。

JadeEngraving props skillId/manual/state/progress/mastered/equipped/sequence，只读内容／真实局部状态，无Store／IO／时钟；StudyQueueRail props game/draft/activity/command/viewed，emit inspect/limits，仅本地模式／分页，不缓存写命令，slot保原三槽nav。RelicInscription props relicId/state/progress/owned/bound/sequence/saved，slot保父原AssetImage及fallback，emit inspect只开原limits。equipment-choreography只导出有限进度／形态／队列投影，无规则结算／宽松证明或新tracker。新CSS只作用本组物件／被替换场景，不改全局动效。

现ART03五文件44943/45000，仅57B；旧preparation54832/60000、production20456/26000、stage-r3 16826/18000、playable59921/60000、global33973/34000都不得涨。Jade旧五片／orbit与Relic旧环实际替换后删除真冗余markup/CSS（调查约2699B可删），保原controller／正文／预算／缓存／proof，不搬旧实现到新组逃预算。新文件只放本轮新增形态／卷串／纯投影。账本ta09.json复用原守卫，原art03及preparation等仅记录实际变化hash／原cap不改，不能假留旧token。

原LEARN逐卷30s、STUDY剑简一次60s、FORGE一次60s／2月，三配置即时确认不假等，成长／数值仍未平衡。useEquipmentCycle v4FORGE／v5LEARN-STUDY、useConfigurationEcho、完整原Game→resolve→result→completeActivity及非重放证明和1400ms生命周期不改。父唯一owner，子件只props／emit，无新奖励钟／observer／Store写入。pause请求／hidden／KeepAlive失活／换对象或人生／owner-generation／错误撤工作和短成果；未提交原命令首次retry可一次反馈，旧回执／外页／刷新不补演。

v5学习持久ActivityReceipt v2带proof，v4炼器仍七字段v1无proof；新测试按实际协议，不改DB／engine凑断言。收益钟和CSS动画钟分层：形态随真实runtime.progress可用虚拟边界证明，任何CSS自身中末演出须取原生动画时间和实际不透明度／外缘，不用虚拟推进冒充已看帧。降低动效保静态物件／读秒／真实成果，取消装饰移动；none与有限identity按无位移语义验。

## 声明与交付

先原19f9冻结的合法金丹宗门档独立红：原对象／正文／可用原学习入口与完整只读Game／全库先过，再断新玉简物件／卷串缺失。完整保原图／trace／前提，不以启动失败当红，不用用户档。原19f9受测源码/载荷单独保存并实际HTTP核对，源变化后另冻结；测试期间不改源／spec／guard／账本。

新12具名：A1两派十二卷冷态／槽类／全部作用只读；A2有限卷串与原草案／预算／返回／新人生；A3正费跨派sword_guard+talisman_frost两卷，29999+1完整Game／全库／proof、自动下一卷且不装备，查看B时A及保存交接归属；A4累计预算／保留／已知／合法零价停止；A5真30s正费研习first put/complete>=due／初读0<left≤30／递减；A6真60s剑简leave开场符修记录、一次且不换派／重复收费；A7四器／独立形态／器谱-已铸-本命只读；A8真60s正石材炼器、完整2月／资源扣费后才成器且不认主；A9LEARN周期quota+FORGE STARTquota全库不变／原意图retry一次；A10pause请求／hidden／同id外页owner-generation／刷新历史撤纹；A11三配置比较取消／CAS／原retry／外页A→B→A无旧光；A12两减效／四器缺图／notice错误密度／完整正文／工具结果外缘。实际fixture均正式driver合法前缀／公开导入独立上下文，不手改Game。

旧相关42精确声明在启动前list：equipment-objects12、stage-r3-layout10、stage-r3四、idle-preparation四、drafts二、active二、check-art-02六、idle-stage-ui二；不得把两个数字相加当全矩阵。新12与旧相关须保原断言／时限，旧视觉若已被真实替换先留红再最小适配当前物件，冷态不能空循环。常规60整例／expect-action8／navigation15，原真实60秒两条沿90整例／75000观察，不涨真实周期或加sleep。

当前App native34一次+原M03精确298仅在原83依赖／公共13／harness完全同源时继承；不改CataloguePager等闭包，若有变则实际纳入消费者。当前显式815规则61、根TS／Vue构建／新旧资源正负与预算，必要新纯投影行为验证融新12／有意义guard；无跨浏览器／响应式／移动／字号／环境性能。像素至少两派三类+剑简／四器阶段／真实当前卷与错误、保存／比较代表，按需逐张≤2图／调用，JPEG68原尺寸副本及原PNG/hash分开，不冒全帧或真人。

本地独立提交，核受测source／Gitarchive、提交后重建／冻结／69+实际载荷HTTP及原56884真实JS/CSS；仅静息时更新，前后只读原进度，不执行用户Game／导入／恢复／重置或存档测试。关闭本项后下一CHECK-TA-03综合TA07/08/09八页，用户整体工作台感／美术／长期与全部后段义务不关；不push／合并／公开部署／改权限。回滚仅revert本项表现／守卫，保DB9/DB1可读、原档／v0.3／原画／原输入／13／旧冻结与所有失败。

[杠精审查] 开工通过：真实实体展开／刻成与四器胚件／接触部位，队列四域、有限授权／完整内容及原原子proof须实证，不以新增术语／圆环／文档或机器代用户艺术认可。现有Skill／绘画／守卫／子agent复用，不创建重复流程。

## 首版真实检查与查看状态补齐

原19f9基线A1在两派12卷／原合法入口／完整Game全库只读后实际缺新形态而红，283输入同；source1 2504c228／258源69载荷8336597B，Vue构建／新21guard／positive实际过。当前A1原新对象／展简／实际SVG外带均过，首normal几何仅h3 26px行框36.391小于实际Range37，上缘越1px；祖先inside／visible，没有实际裁字，不放宽0.5容差，补足本标题line-height。root已单张看原图，空卷串仍显示一页的禁用上下页和重复调整入口，按实际空态整理，不加新的业务。

空串与仅一页不常驻无用分页；多页仍全部可达。唯一原learning-plan-open移到实体卷串的‘定卷／完整安排’实际按钮，剑简无卷串时保原右侧按钮；右侧预算／轮数保完整只读说明，去重复大按钮。旧入口不能靠隐藏token伪留。

新Queue纯查看状态需跨skills/manual销毁重建保持：LearningPlanner增加按run隔离的QueueView{runId,domain,pages,touched}，只经Jade透传snapshot prop／remember emit，Queue每次明确查看更改即时上交（不在销毁晚回调写），初建核run，不缓存command／runtime／Game；新run重置。同域清单缩短及时校正本地页，不反弹到过期页。普通周期不会重置阅读mode/page。原草案编辑／预算仍原controller，不让原安排或周期存档覆盖未确认值。A2须实际验证，当前仅静态指出生命周期风险，不冒产品已实红。

Jade保存封卷优先于本地展开偏好；即便先手动展简，保存中也收卷，不冒掌握，偏好可留到保存后只读查看。正在查看另一卷时，以冻结command及实际runtime.phase说明当前研习／保存哪卷；无当前本页周期仅显示原安排／查看状态，不把前移nextCommand当当前工作。以上为0035交互完整性补充，不改学习／铸器／配置的命令或时钟。


## source2真实缺口与分层修缮

source2 dfaab1bc早期五例为A1真过、四例失败，294输入前后同。A3两正费卷完整Game／全库及正式proof已过，真实掌握印章与status／inspect文字相交；保原1400ms hook，在对象内专用40px成果行留位，横向静态18px字与6px演出外带避正文。A9真实quota后玉简180高溢出实际140父行，修实际stretch／auto尺寸及min-height继承，缩装饰画不缩正文或命中，不裁切。A7标题实际Range超行框1px需补行高；器谱说明／安排摘要／预计摘要／短成果为原16px辅助，按既有14px门槛验证，其余正文和成本18不降。A12第二次同页导入误找初始入口，测试改走原设置与替换确认，全部600／599边界与完整Game保留；不当产品导入红。

独立源码复核还发现两项未实拍断言的缺口：已掌握始终spread1导致‘合简’无效；两减效!important把saving0覆盖为1。局部查看默认按实际掌握初始化／对象更换，手动真开合；实际首次掌握可打开一次，running与saving按真实阶段并明确不可手动折叠，保存仍合卷。降低动效的静态展开仅作用working，不覆盖保存／待研／手动合卷。无新Game／授权／时钟，原失败与静态推导分开，守原新5≤30000B及旧cap。


source3早期6实4过2红（302 exact）：A1已掌握真合／展、A2清单查看跨mode/新run、A3两卷完整proof及成果留白、A7四器全态过；A9不仅按钮，右侧article191.78也超真实140父行，不能只压装饰漏正文。source4将原标题与类型／境界按一行基线组织，错误态卷串保完整名称／状态横向44px物件、压空白而不缩18/14；补整体article／facts／槽文字和祖先边界。右预算说明复用已有preparation-estimate样式，删除真重复样式；旧card/controller不挪，新5总cap保持。

A12的system整链过，preference真实hub-reduced仍存在却有1条工具transition。实际Vue scoped :global(.hub-reduced)后代写法编译为只有ancestor，须将完整后代整体置于:global(...)，保静态SVG工具锚点；不是允许1条动画或伪称偏好丢失。忙态aria不再冒手动toggle，仅空闲使用opened。旧42因当前独立error红而root取消exit130（11pass／10fail观测行，JSON记者未flush明确缺失），原log／trace和716 exact保留，不当完整42。旧10红中8是新物件真实替换旧locator、1需先只读切三槽，另1 EQUIP错误正文同根真实溢出；后两类分别实修／最小入口适配，所有原Game／费用／读秒／18-14-44／重试断言不减。


## source4完整轮与缺图实拍补强

原source4完整新12实际11过1红，306 exact；三真实30/60/60周期put均不早于due、完整Game／回执有证，不重贴最终源。唯一初次SCHOOL比较红为四槽“前→后”p实际16px：这是玩家判断换装影响的核心文字，source5保持断言并改原configuration-slots p为18，不笼统豁免为辅助。

独立逐图与root实看发现已炼成缺图帧主器物区空白，结果提示覆盖上沿小图符。same A12加强后原source4单独真红（300 exact）：首正常frost_sword主canvas297.3×266.8而fallback SVG实际26×26／glyph20×18；saved碰撞分支尚未到，不追认通过。source5仅所选器物.relic-finished-art内fallback居中、128px宽及144px高上限，永久预留56px顶部结果带避免提示出现／清理导致跳位；使用现四种真实GameIcon，不改全局AssetImage、正常四幅绘画、时钟／Game／费用／proof。正常主画布SVG≥100、完整祖先和当前结果6px外带真实硬验；紧缩故障画布装饰可随实际可用尺寸收缩，文字18/14／操作44不变。新五原生仍29931/30000B，旧cap不涨。旧12／42、源5相关34／815／363与源、提交、冻结／HTTP分层再核；全部原source4绿／红／实际图片观察和未达分支保留，整体ART／真人不由机器代签。


source5 target两例实际A12全过（两域八个cold及两saved主fallback≥100、父边界、结果6px外带均实执行），A11比较18和SCHOOL原quota／retry完整Game／回执／全库过后首次到择法标题。28px标题继承stage-r3.css49 line-height1.4，首字形Range上越行框1px（祖先可见／clip=false，不冒称裁字），其small正文完整。source6仅该实际源规则改1.65，不放宽0.5容差或将h3排除；旧stage-r3 ledger仅实际hash/bytes更新，原18000B cap不涨。后两配置／ABA及完整12/42仍须当前继续，未达分支不追认。source5 363／815／native34原执行保持原身份，后源检查另记。


source6完整新12/301 exact实12过，三真实周期put/complete均>=due；完整旧42/717 exact实41过1红，不改标签。唯一旧ART03-A8当前EQUIP quota弹窗背景：完整太清符心article536—700.781，reader536—694、status698，真实越界6.781px；18px正文/所有4控44/47及hit真。实际AX明确“下次草案0卷／此串尚空”，不是槽或有卷清单。source7只在当前failed舞台把空卷串装饰原min-height38缩为24（原SVG24与辅助14/line1.65不变），归还14px留白容纳完整正文；不隐藏清单入口、缩字、裁切或放宽旧断言。新5仍29931与旧cap不变；原A8、全部新12/旧42及原子/读秒当前复核后交付，source6全53绿／实际红与像素原图保留。
