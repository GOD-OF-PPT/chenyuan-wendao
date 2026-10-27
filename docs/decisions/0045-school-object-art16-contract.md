# ART16：修法道器与正式比较

2026-10-27，基线d74420f、codex/goal-4-online-recovery。上一轮CHECK-ART-04为真实progress（d2e92f6/d74420f、cdcc10c4、当前完整514/332/815/429和原13/原Chrome进度已核）。只继续ART16，原目标原话另存amendments/2026-10-27-goal-continue-art16.md，原input/v0.3不改；不重做历史R1/新建Goal或聊天。

## 现有缺口与操作合同

真实入口是EquipmentPanel→LoadoutConstellation的school分支；当前两块大矩形和原生道印仍像工作台。本轮按game-studio→game-ui-frontend/game-playtest，Riot本轮实读的轮廓/重要性/降噪与XAG114可预知上下文，做共享修法舞台内的两件可操作冷态道器：剑架与符案。既有Vue/DOM/正式引擎保持，不引入Phaser或新玩法。具体布局/尺寸/时长不是来源规定或认证。

点道器明确是“执剑/执符 · 比较修法”，沿原school-sword/school-talisman DOM入口发出原SCHOOL查看，原ConfigurationDialog完整三槽前后/真实效果与战斗预演、取消/刷新/原确认重试保持。图片仅为修法比照，不是已持有法宝或已修成。正式SCHOOL为三种即时配置之一，仍无费用/游戏月、即时原子确认；不添加假读秒、选项预选表单或新的战斗/研习。全部真实门槛/禁用原因就地可读，凡人能读两派和三基础法资料，不能越门槛选择。

三个基础槽/每派名称、流派特点、当前道途、已掌握记录/法宝保留的说明完整。当前状态只取game.school；短择法印记仅取原useConfigurationEcho已验证的SCHOOL且与当前school相同，复用原效果生命周期，不另开计时器、不借EQUIP/旧回执补演。hover/focus/press以物件抬起/光面反应，默认冷态不循环放光；错误/暂停/隐藏/外页/刷新/新人生按原echo清理，真实状态和文字保留。summary配装四槽与旧回调不重排，不搬controller逃预算。

## 资产、源码与预算

内置image_gen逐件生成2幅独立冷态透明方图，风格参照现有冷炉/器物，仅作材质笔触参考。剑架为朴素练功剑/低木架，符案为符笔/墨砚/卷纸；不画发光/火烟/已成符纹、人物、UI/可读字/角标或大黄色底。所有名字/数字/状态/入口由DOM。原图/参考图不覆盖，生成原件逐字节复制到art/redesign/art16-schools，完整prompt/本地工具审计/hash/真实alpha/边界留；不能伪造provider签名/model/requestId。

运行件web/public/art/v2/schools/{sword,talisman}-station-v1.webp，512×512、每件≤160000B、共≤320000B、真alpha。复用既有export_art10_blanks的image_facts/identity/ENCODING与ART11的完整alpha1等比contain/32px留边底中对齐；只增加两件适配producer，不另造工作流或用Pillow语义改画。两次导出字节同、源图不变，实际原图尺寸/alpha/painted bbox由解码记录，不预设工具固定1254。normal inventory仍只用现有header/hash读取，不加Pillow依赖。

只改LoadoutConstellation的school模板/必要只读展示、退休原art03 school专属卡片/道印CSS；共享summary、useConfigurationEcho/proof/原SCHOOL emit/can/reason保持。原ART03五文件45000B（当前44917）及全部旧cap不涨；退休已替代旧声明留容量，不能缩格式、删能力或迁controller。新增一个专属CSS文件art16-schools.css总≤12000B及main唯一import，无新生产模块。完整ledger/guard绑定两个真实school域、实际AssetImage嵌套在原按钮、实际动态资源路径/alpha/fallback、原act与effect类型/对象守卫；图/metadata绿不代像素/真人。

## 独立验证

先正式合法凡人/未择炼气/剑修/符修与原画像/全部Game/Activity/全库只读基线，再锁旧大卡/物件缺口实红。新8例：

- A1凡人两道器/真门槛/三基础法/一个择法决定、当前none与全部查看只读；轮廓需有辨识度，正常物件实际painted长边≥144px，不凭透明图盒尺寸。
- A2炼气两派完整原比较/三槽/取消、战斗预演及原返回/焦点，完整Game/全库不变。
- A3合法已有研习/剑简/本命的双向SCHOOL确认走原CAS，正式resolve全Game/唯一回执/持久当前态/原scope保持；既有即时配置无action-execution假等待。
- A4真实native quota未提交与丢回复原意图重试分开，先全库未变/唯一回执，再首次原子成功；新执行按原pending/sync阻断，原retry可达，旧error取消后fresh不永久锁死。
- A5真实运行/战斗/事件门槛与暂停后比较，理由就地，未知下一活动/回应不代选；不因看道器停手/开始。
- A6同run外页改派A→B→A、离页/新人生/刷新及其它配置不能补演旧择法印；真实当前school/四槽与全部资料保留。
- A7键盘两物件与原dialog的Tab/Esc/返回焦点、系统/偏好两减效，源/预算不变；静态布局不靠被减效撤掉的transform。
- A8两位图真正中断/紧错误横幅、全状态及summary原四槽，完整18正文/14辅助/44入口/0.5字形与真实祖先外缘、中心命中/实际点击/一屏主导航可达。

旧equipment-objects、equipment-actors、stage-ta-review、check-art-02、check-art03-combinations、check-art03-feedback-art、check-matrix-keyboard、matrix-ui-cancel、matrix-ui-local-recovery、stage-r3、stage-r3-layout完整相关文件实际list后执行；若共享接线实际依赖另涉入口则加该文件。旧费用/30-60秒真实期/全部Game/原intent/完整回执和60/90/240/8/15窗不减。保真实原红/最小旧视觉前提适配/逆向原件，不假留school-sigil旧节点或删原assert凑绿。

815/61规则、34当前App存储恢复与原CHECK-ART04实际332的非UI依赖精确继承条件、完整429旧资产+新增具名guard、根TS/Vue构建/producer --verify与当前像素分别核。新guard至少覆盖预算/成员/源和runtime身份、真实consumer错父/丢fallback、原SCHOOL/echo守卫、alpha/确定导出/原provenance、旧cap与外部CSS IO；新增计数以实际声明为准。

仅固定1440×900/font1单Chromium；不兼容/移动/响应式/多尺寸/多字号/跨浏览器/环境性能，不用用户档测试。source/spec/ledger/实际public10+generatedMeta先pre→owned启动→终态post exact；早期逐图至多2张/次，原PNG/原尺寸JPEG68/hash与实际像素/所有声明分明。原图、导出、界面/时钟、存储/规则与人验分别有据。

## 交付、回滚与后续

本地独立实现提交后，受测/Gitblob/提交后重建/冻结/全部HTTP同源；原Chrome静息已保存时只读核更新前后HUD/活动，不执行/导入/恢复/重置或用用户档。tasks/GJ收尾，本轮结束。回滚仅revert本项UI/新资产消费/guard，保DB9/DB1可读、原件/存档/v0.3/原13/旧冻结/全部失败；不push/PR/合并/公开部署/改权限。

本项是CHECK-ART04后第1项。整体ART/长期平衡/真人仍开放；之后原M04正常路线恢复/M05性能/M06兼容最后、每三项全面检查、干净包/最大C端代码安全/真人义务保持。新8/局部画件或机器绿不能关闭整体游戏感。

[杠精审查] 开工通过：实际物件/原比较与当前态/真实保存反馈完整，不仅给旧卡加光；预算/所有门槛/三槽/原回执不删。具体gen结果、全声明/红绿/像素/提交HTTP待实证，不先标完成。

接缝细化：A4新GUI例在真实configuration receipt put处触发quota，核事务全部回滚/原intent。丢回复沿已有configuration-store完整Native文件当前实跑，和UIquota分层记录，不冒新GUI丢回复覆盖；Native选择在原34上加此文件并按实际list校准，余项只以原CHECK04实际332/非UI闭包精确继承。未改变原三种配置或存档合同。

source1新8的Game/原确认路径已走通但几何首关全红：两物件外按钮/原比较tab继承16；辅助持久择法结果14应恢复18；真正quota时原比较窗口footer落在主导航下，缺图fallback行布局溢出。只用本轮CSS恢复18操作/结果、compact原比较的空白（正文/四槽/成本/原retry不减）及fallback居中无inline基线，保原0.5/44/费用/所有旧时限。旧8/实际截图/Source1规范保，未称通过。

source2新8为6过/2红：A8真实错误横幅下120px最低道器行迫使两按钮内容越框，改为可收装饰余量/备用图符contain，正文18/辅助14/44及原0.5几何保持；A5是第二次合法夹具载入在App公开就绪前检查设置入口的前提，补原15s welcome或settings就绪握手，不改Game/读秒/旧时限。完整原失败/trace保，源3须重新冻结全新8与具名相关轮，不拼绿。

最终Native选择扩为原26文件完整332实际同轮（含全部configuration-store与App34），不使用其余项继承，不增业务覆盖；仅固定单Chromium实际存储/故障规则，非页面兼容或性能矩阵。
