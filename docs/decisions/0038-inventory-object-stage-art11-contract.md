# ART11：找物、辨用途与有限服丹／交易

2026-10-26，基线c37c3f5（ART10实现b38ee47），codex/goal-4-online-recovery；运行c2e9c18d／263源73载荷。原目标原话保存goal-4/amendments/2026-10-26-goal-continue-art11.md，原13全hash／patch保护。本轮只ART11，后续ART12／CHECK-ART-03、其它ART、M04／5／6兼容最后、干净包／最大评审／真人不缩；不重做原生目标历史nextR1，不另建Goal或聊天。

## 依据、真实基线和边界

沿用户game-studio→game-ui-frontend/game-playtest，Vue／DOM正式引擎不换。XAG112本轮实读：一致逻辑导航、可预知焦点、复杂物资多种定位和返回入口，用于当前所选物／按需目录／明确查看与安排；布局、分页、读秒均项目推导，非认证。Riot页本轮fetch失败，保历史资料，不冒当前实读。记录research/art11-object-sources.json。

旧InventoryStage已有真实物件/库存0图谱与来源主操作，不能假称不存在或Game错误；问题是300px目录＋主体＋330px资料常驻、空物仍同时强调两用途、转药盏／交易案又回同权三栏。先合法独立Game／全DB9只读成立，再锁默认目录常驻真实红。查看不消耗，真正写链仍App.inspectPreparation→明确start→原v5原子事务。

## 实装参数与玩家动作

1. 行囊常态只一个所选物及真实数量／完整作用和一个当前主要决定。翻找行囊才开单目录表面；保全部14物、原4每页、全部／灵材／丹药／突破物、后续境界。选择／翻页／分类只查看；同物重选、来源返回不清页和草案，真正晋境／归零只校正有效所选页，新人生依原run隔离。
2. 库存0明确图谱未持有，绘画在图谱位而非拿出实物；主要决定查来源。用途与价格另开可读表面，完整buy/sell／不可用原因／丹药作用保留。实存药瓶主体只查看用途，明确服用调息或售出换石才开原use/sell草案；不得把选择或合页当成已服丹／已卖出。材料同时能查正式丹方／器物用途及来源；用途列表来自现C.recipes/relics可分页，不造自动推荐规则。
3. 两恢复丹的服用／出售均完整，5突破物禁售／原因完整，突破筹备只读。非药物不伪造USE；已满／无物／活动冲突／原retry或syncIssue给真实原因，不靠禁用空按钮争主位。药匣原rest方式持续可达。Game选择／成本／数值／成长不变，初值未平衡。
4. 原药盏和交易案常态改为当前药／货、实际不足／价格／单次预估、有限授权与原主要开始；其它恢复方式／商品目录和完整参数按需，不能两份完整表单同时摊。use／sell／buy草案及保存标记仍原各域；Market原mode:item DraftMap保，Recovery原单参数组不是每药一份，不静态承诺新增分药缓存。查看原安排仍沿完整canonical身份，修改只是新草案。
5. 查看来源沿原trackProduction／detailParent，行囊来源返回原物和原目录页；药盏／交易案进入来源的嵌套返回先观察既有明确标签，默认返回行囊可沿原用途重开已编辑草案，不能无提示丢限额。仅合法真实红证明有缺口时窄修App已有返回归属，不预设缺失，不新建导航框架。明确旅行才原6秒，不自动采购／服丹／出售／取材；返回不缓存写命令。
6. USE6秒、BUY/SELL15秒、REST30秒与完整原v5 proof／共享1400ms／原反馈和当前command冻结不改。真实受理后才读秒；saving不先扣／奖，成功须原子提交，再专属入盏／货物交接。短效停后实际库存／费用／净HP/MP／完整回执可读，恢复预估不冒本次成果；旧回执／刷新／外页／错误不补演。原失败同意图重试／取消fresh、暂停／接管／隐藏／换人生保持。
7. 新翻找／用途／方式表面与原完整参数一次一个，Esc／关闭返回原物和可预知焦点；KeepAlive失活和换人生关闭只读dialog不清原预算／意图。主导航八入口和唯一活动条不改，所有14条正文／18px、辅助14px、关键44px与原Range/真实祖先／工具外缘同屏硬验，不clip／缩字／内滚藏功能。

## 代码与绘画预算

旧所有cap不涨：ART04四文件32396/40000，preparation58309/60000，stageR316828/18000，playable59921/60000；GoodsPanel4046所在playable仅余79，目录移入InventoryStage的真实directory slot，父controller留原处，旧常驻布局与重复信息真实退休，不搬controller逃帽。MarketPlanner11294／RecoveryPlanner7490的正式参数／rest／restore／门槛／原retry保持；可用slot收目录而非挪逻辑。supply-effects与Game／Store／DB9／原period和价格不改。

新原生仅ItemArtifact.vue与art11-inventory.css两文件合计≤18000B（ItemArtifact≤4000，CSS≤14000），为当前实体物件呈现／图谱与单目录等新表现，不迁旧controller。Items受实际content14白名单及原stock，绘画不表示拥有；文字／数量／按钮DOM。旧GameIcon保缺图fallback和小辅助图符，不能用新大图符加环冒绘画。

新增最多14独立物资绘画，分别覆盖7材料、2恢复丹药瓶、5突破物；与当前青黛／墨绿／玉色／旧金材质一致，冷态无浮光／数量／文本／角色／背景。每件内置imagegen单调用，原PNG／完整prompt／本地回执hash／alpha／像素／实际消费保，参考图如用于edit先实看。runtime固定512透明，每件≤120000B，14总≤1680000B，旧所有绘画/字体不覆盖；无额外字体。不用一张联系图裁出多物代独立件，亦不改图以捏造库存。导出复用现有Pillow+ cwebp q82/m6/alpha100/metadata none，等比完整alpha内容contain留32px外缘、中心／底缘对齐，不能裁主体或硬拉伸。guard独立记录全部14、旧cap、原alpha/hash/双次导出一致及DOM真实fallback。图片逐张至多两张，原尺寸JPEG68查看副本与原PNG分明，不批回base64。

## 验证与任务顺序

新8具名：A1常态单物及按需完整14目录/原分类页/返回；A2零库存图谱主来源/完整用途价格5禁售与无Game写；A3实存两丹主体查看/服用售出/原rest不丢，选用途不扣物；A4 use/sell/buy非默认草案与原安排跨用途/返回/新run不串保存；A5来源普通返回/明确旅行/原物及参数，不自动取材；A6真实原生quota后新表面只读、原意图retry唯一/取消fresh；A7晋境/最后1件耗尽/新run目录和查看归属；A8新表面keyboard/focus/最紧error/notice/缺图14及两种减效，保全文/18-14-44/原几何与Game。各例参数和正式具名列表开测前实际冻结；只独立合法fixture，严禁用用户档／手改Game加物当路线。

旧主42／8文件：inventory-objects12、stage-check13纯补给、idle-preparation4、drafts4、active4、idle-stage库存1、stageR3库存1、stageR3layout3。原真实15/6/30沿ART04-A4/A5/A6与旧当前例，不新造重复native覆盖。若Goods炼丹模板改变，补Alchemy完整设置/来源1；App若真实跨域修改，补CHECK2-A1—A7、CHECK-U8五次采购完整回执、八页C4，实际声明逐file/title/project，不模糊regex凑数。旧入口／图元前提须先实际红再最小公开入口适配，原全部Game/Activity/allDB／费用／净变化／receipt／预算／时限／字体外缘保，不能空loop或假留旧节点。

当前App34原生实跑；原298仅83精确闭包／common13／harness不变可继承，原报告source不贴新。815／61规则、根TS／Vue构建、新旧完整guard负例／所有cap／确定导出实际验证。每phase源码／spec／manifest冻结，真正pre→owned terminal→post；cwdweb/actual public10+generatedMeta1/实际payload全集HTTP，原60/8/15和既有90／75窗不涨。当前只固定1440×900/font1单Chromium；不兼容／字号／跨浏览器／移动／环境性能。

顺序：原话／合同／参数／保护基线→合法旧冻结真实默认三栏红→各页正式对象／14绘画与早期逐图→新8/旧相关声明及真实周期／原子恢复／完整能力→类型/规则/native/guard同源验证→独立本地提交／Gitblob／重建冻结HTTP／原Chrome可见进度只读→tasks/GJ与本轮结束。原用户档无Game操作/导入/恢复/重置；试玩静息才更新，真实当前Chrome进度而非历史IAB baseline。

回滚仅独立revert本项UI／consumer／guard，保DB9/DB1可读、原件／输入／v0.3／旧冻结／13和所有失败。工程候选不代整体艺术／长期平衡／真人，不push／合并／公开部署／改权限。

[杠精审查] 开工通过：不是旧三栏换色／图符加环，具体找物／查用途／有限安排与保存成果进入正式页；完整能力／预算／原意图和后段目标不缩。复用现有Skill／agent／测试与资产管线，不建重复workflow／自动化。


## source1早期实际结果

新8真实4过4失败，582输入pre/post exact。A4完整安排h3 28px/1.4的CJK Range上越1px，实际增line-height1.65不缩字；目录后续境界label是独立可操作正文，补真实slot label18/44，不能因旧14默认就假豁免。另A1主动分类按原turn(0)换选物后错误期待旧ascension_seal，只改记录关闭前实际选择及正式分类首物/只读不变；A2关uses后误点隐藏oldtrack-herb，改真实库存0主入口inventory-main-source，保原全部来源／返回／GameDB。原spec/trace/diff保存，游戏／时限／正文／几何不减。


source2新8真实6过2失败。恢复保存结果实际18px但旧行高24使CJK25px越界，来源按钮下缘越父15.1875px：保18和完整成本，结果line1.65/min30，收装饰药盏高度220→180腾40px，实际图符／绘画／文字／44仍硬核。A1重复已激活分类不触原watch/turn，测试按真实点击前aria-pressed区分同类保原选与换类取首物，完整只读不减；原假前提／trace/raw保留。


source3旧42真实32过10失败／590exact。7条交易物件同源几何红：装饰负外缘使normalclip，error货物stock与周期可见重叠、货物越父23.844px。只MarketCounter专属CSS收装饰底盘入盒、goods真实内边并按当前行高normal160/failed140缩装饰艺术，不改脚本／模板／Game／15秒。三旧前提仅漏helper import、数量b选择器排新增item-artifact、晋境查看选物时先开真实目录；原14数量／晋境Game／原时限全文不减，raw／逆换保留。
