# ART24 择法舞台：纵深、道器与真实比较

2026-10-29，基线6a942dc41dcf5a9e28200b506d4db5a74ebae68d/1fd651bb，codex/goal-4-online-recovery。上一CHECK-UX21-23为progress，三项周期归零；本轮只ART24一个独立艺术项，继续现有Goal4，不建新Goal/聊天。原话/本合同/plan/tasks/13保护先于生产代码和绘画消费。

## 真实缺口和本项边界

已实际看当前C5功法中的修法页：大块墨绿平面覆盖场景，剑架/符案painted轮廓偏小，标题/五分类与两道器下面的多行文字占主要注意力。ART16已有两件冷态透明道器、真实SCHOOL比较和短保存echo均可复用。当前代码EquipmentPanel→LoadoutConstellation school分支，与研习、剑简、法宝、summary配装分开；本轮交付完整择法舞台，后续研习/配装逐项艺术不由此关闭，不缩成给旧卡加光或宣称功法全页完成。

一张有纵深且留空的静态修法心境场景与既有剑架/符案分层，两个可操作对象在场景前景。扩大道器真实绘画占比，正常painted长边目标≥230px（原144门槛保持），两派名称/特点/三基础法、实际当前道途、条件和比较动词完整常读。可采用各道器一侧图、另一侧文字的布局，让物件充分占位，减少大平面和重复框线；标题/真实状态/文字/按钮皆DOM。青黛墨绿/玉色行动/旧金克制，场景内无字/按钮/人物/已修成或已持有标记，不用通用丹炉代替剑符。场景仅为修法比照的内景，不声称已经旅行到新地点或解锁新玩法。

按钮仍原school-sword/school-talisman，发原emit('school',school)，沿原App/ConfigurationDialog完整三槽前后/效果/战斗预演与明确即时原子确认，无费用/月、不加假读秒。当前school和disabled原因仍正式查询，确认/取消/失败同意图重试/CAS/换人生/外页接管和原scope保持；不自动研习、装备、铸造、续接活动或重置草案。summary等其余分支不重排或迁controller。

hover/focus/press有对象边缘、投影和落点反馈，背景无持续闪烁/伪灵气收益；默认冷态，只有原已验证SCHOOL echo可短突出实际新道途。动作强度克制不盖字/分类/导航，降低动效仍有静态当前态。所有入口一屏可达、原18正文/14辅助/44目标和完整文本不删不缩不裁/内滚，真实几何/中心命中和实际像素分别验证，错误栏/禁用/失图状态也保持。

## 绘画、源码与预算

本轮用已显式授权imagegen，默认内置image_gen，game-studio路由game-ui-frontend/game-playtest，保正式Vue/DOM引擎。生成1幅新的宽幅不透明scene，旧素材/原图全部保。新原稿/完整prompt/实际本地工具审计（不冒provider签名/model/requestId）复制入art/production/art24，runtime为web/public/art/v2/schools/sanctum-v1.webp：最多1件、≤280000B、最长1536/高≤1024，等比缩放保全原画，无语义Pillow改画/抹除，不做背景移除或假alpha。实际尺寸/alpha/hash/两次确定导出/消费路径记ledger，0新字体和外网资源，原全包15MB/原ART16两物件320000等帽不涨。

尽量复用旧image_facts/identity/encoding helpers与cwebp确定导出，只新单件适配，不重建工作流。新ART24 ledger只认1背景和实际代码/引用，固定cap/人验false/路径/typed字段/实际Source与导出hash及真实consumer守卫。旧ART16两512透明资源/原prompt/审计和导出协议不改；新背景不是其第三件资产，不放宽旧budget。

生产接线只在LoadoutConstellation的school模板加一个装饰AssetImage层及必要class，保原script/echo/act/gate和summary原字节；原ART03五文件总45000现43545不涨，新增模板在原余量内。主要造型布局写回现有art16-schools.css，原4999/12000不涨（退役被替代school声明，不能压代码格式或搬controller躲预算），保原configuration-dialog/其它模式语义。新绘画不产生新运行TS模块；若发现必须突破这些既有界限，先有具体证据回本合同落实，不能偷偷涨帽。

## 验收与执行

先冻结旧实际学校画面，新增定向正常对象占比/场景真实消费红例，再按原门槛有/无修法、剑/符、凡人锁定和两真源断图检。新背景可失败，旧透明件可失败，两者组合仍全部名称/特点/三法/真实状态/可用比较入口。不得用透明图盒尺寸冒绘画长边，按已有原alphaBBox和实际img.contain投影核painted≥230常态、保旧144与错误状态可读约束，源图不裁。

完整原比较/三槽变化、真实额外已学/剑简/本命保留；取消全Game/全库不变，明确确认完整正式resolve/配置receipt/原子成功与原意图重试；native quota/已提交丢回复分层，暂停/活动/事件/斗法门槛、外页A→B→A和新人生/刷新不借旧印。原ART16八例和实际影响的equipment/配装/研习/手记/模态/UX22入口相关文件完整定向执行，保真实时长/成本/完整Game/Activity/读秒/0retry与原时限。必要native配置完整具名，未变规则/DB闭包只以原CHECK实际873/415源身份继承，不冒当前整642/415/32执行。

资源真实与沙盒正向先过，再本项源/预算/实际consumer/导出/旧cap守卫，根/Vue类型构建与producer --verify、当前像素分别核。新增测试和脚本输入、运行与public资源在验证前冻结，无HMR，重型错峰。只1440×900/font1单Chromium，不兼容/移动/响应式/分辨率/多字号/跨浏览器/环境性能；Skill通用跨端建议不恢复被用户暂停的专项。

实现独立本地提交，300+实际新runtime source/受测-重建-冻结/Gitblob与HTTP逐字节核；原Chrome已保存/停止时只读更新前后HUD/活动，不读取/测试/导入/恢复/重开用户档。任务/GJ按真实结果收尾，三项周期第1项；不push/合并/公开部署/改权限/重建目标或自动化。工程与真实游戏感/整体艺术/长期/真人分开。

## 来源、风险与回滚

本轮实读Riot Clarity的轮廓/层级/噪音与XAG114可预知功能，具体场景、左右结构、230px与资源/源码数值是本项目推导，非来源规定或认证。新scene若光线/地面位置与两件绘画不匹配，应按实际像素定向迭代，不能拿半透明大绿罩盖住新画假装融入；画错不代持有/掌握。error/banner后不可把对象放大挤掉完整文字或菜单，宁可收装饰余量，不用缩字和内滚。

失败只revert本项模板/样式/资产消费/guard，保原图/原输入/v0.3/存档/DB9可读/旧冻结/失败与原13，不回滚新DB版本。ART17原4性能红/unknown、其它玩法艺术/TA、后段完整兼容/性能、同版干净包/最大C端代码安全/长期平衡与真人全部保为未完成。

来源：https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/ 与 https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/114 。

[杠精审查] 计划通过：真实绘画/消费/占比/原比较和全部状态，不以换背景、CSS光效或个别截图代整体交付；具体最终像素和人验待实证。

实际原稿1774×887/opaque，经既有facts helper+cwebp两次相同等比导出1536×768，171716B，无裁切/语义改画。首4新/原8均实际通过；像素发现通用interaction-press会给两道器短时套1px矩形，改仅school对象移除该框而以落点环/原动词下划线和明暗作为按下/焦点反馈，原全局计时/事件类不改。背景上延至分类后且原分类置前，避免同页双场景断层；数据和比较流程不变。新scene对比只作内景，未变实际地点。

失图边界分层：仅背景失败、全部WebP位图失败但原SVG图符可用、连SVG在内全部art资源失败三种分别取像素；第三种以完整DOM名/特点/三法/真实门槛和入口仍可读为底线，不把SVG盒可见冒实际图符已绘制。通用interaction-press class/计时不改，仅本地school物件不画矩形outline，以对象落点/文字边缘提示替代；键盘焦点专属3px落点环保留。
