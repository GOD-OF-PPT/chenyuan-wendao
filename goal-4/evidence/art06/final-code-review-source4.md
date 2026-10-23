# ART06 source4：当前静态与C端复核

2026-10-24。原source3报告保留（含FateCatalogue遗漏的明确更正），本附件只对应`615e28fb3db7db2d2d13466934b50d88c9195ad269b3615f720a534ca81a7303`。只读源码、diff、冻结build与实际已生成帧；未运行测试、构建或额外浏览器，没有改运行源/测试或接触用户档。

## 当前结论

阶段导航/对象/完整授权和原proof的当前接线未发现具体代码阻断；但root实际已发现修行首次成果压住人物面部的像素问题，见下面独立证据，**当前不能作C端/TA已完成结论**。新17及资产检查仍在执行，本附件不写其通过数。source4两代表的实际审阅范围另记final-art-review-source4.md，不将source3图片继承到当前。

## 导航与阶段见证

App99的新增返回仅针对`kind=action`、operation CHOOSE、非replayed、实际phase opening→idle、lastFromActivity、activityOwned、v7且正式plan.action CHOOSE、当前run与当前结果revisionAfter、当前页current。selectTab只改变本地导航/查看上下文，不执行Game或续下一个活动。refresh/sync/import/旧回执没有这条自动跳转；源Game/生命周期仍沿原Store。

current和home均在Host.active集合内，导航不改变run/布尔active。Host常驻、无realm key，running目标不依赖旧Gate挂载；共享tracker也不因hubView字符串变化清见证。停止不是按每revision清短成果；本次合法effect在父handoff变true后经post-flush锁sequence，明确“本次已保存”，离开/关闭后不迟领。此次返回的表现身份保持静态可解释，真实6秒及绘制帧仍由受测用例证明。

普通开场详情现已包Gate，原标题/完整正文/三ChoiceCard/各自cost、detail、reason/剑简说明和原MilestoneReview确认保留。读秒只在真正runtime/engaged时出现；预选/查看不写Game。captureStageReturn仅在原origin列表加cultivation，StageReturn仍保存原parent/opener/outer opener；返回goal/character/receipt后先回修行详情，再沿其原parent返回，未缓存写命令或新增授权。

## 当前操作、保存与美术边界

- Site的method切换只有emit草案；主执行、疗养、比较、筹备与全参数仍由父原handler处理。实际修为取Game；剩余/总秒取原runtime；短成果数字取完整proof后的result，CSS时钟/呼吸不参与收益。冷态人物、灵脉和石位分层，没有新热度/概率/额外奖励。
- v1严格method+原realm+本地running命令，v7仅CHOOSE/BREAKTHROUGH/START_TRIAL；完整Game/result/Activity completeActivity仍沿共享proof。共享两个文件只将extra联合各加`|1`，默认0、default2/3/6、显式4/5/7与恶意version0拒绝不宽。没有每revision清掉正常/末轮成果。
- pending原意图或syncIssue阻断主修行及阶段新确认，原retry/cancel后fresh保持。错误/不可用/hidden/active/暂停/活动id-gen-owner沿原清理；没有用动画冒充saving/成功。
- TrainingPlanner原完整目标、1/5/20/50/非默认轮数、累计预算/保留、savedPlan精确回填、在线/刷新说明保留。GoalPanel完整追踪物/功法/器物/已见事件和数量、缺口分页/来源/材料/地点/替代路线与返回仍在原slot，不因新台座删行为。物品图标放大为目标示意，真实实有数/尚缺单列，未把画当已拥有。

有一项仅为静态门槛差异，尚未实证：PreparationPanel.canTravel仍只核available/busy/running和正式旅行preview，未接pendingError/syncIssue；GoalPanel已接writeBlocked。候选合法路线是某CRAFT START保存失败后，在突破筹备切成丹采购→缺灵石来源→异地前往；可能按钮仍enabled而底层Store拒新intent。已告root/QA按合法前提核对，不能据推断改Store、改历史结果或登记成已复现红。

## 已确认的像素阻断与最小修缮建议

root已实际查看当前`ui-focused-2-results/cultivation-objects-ART06--e7c19-t-an-automatic-breakthrough-chromium/natural-real-saved.png`，发现“修为+5”短成果矩形压住人物面部，且修行详情仍有两层大实底框。原PNG SHA256 `22bec57ec06f202209b9522db5d57bdfa711522a17fbf8c714e8f57ec257541c`；root所看原尺寸JPEG68 `visual/natural-real-saved-source4.jpg` SHA256 `50fd45eeb8542bf37e902e74619dc3db8ff72f39d63e89f533014251333a2640`。本审阅者未把这第三方实看帧伪写成自己已看或绿色。

代码根因明确：`.art06-harvest`绝对top:0/z5；带note的compact actor同样从top0占66%高，造成结果矩形和面部共享空间。建议复用现status区或现progress旁真实保留的成果行，effect与冷态标签互斥、保原saving/clock，人物边界与结果文字区明确分开；撤掉top覆盖，不能只调z-index、藏成果或缩字。重复框可只在当前training-planner真实宿主撤掉重复border/background/box-shadow，保既有外层可读实底，不改正文/预算/入口。具体最小方案仍需实际几何+像素验证，本轮冻结源没有实施这些建议。

## 身份与预算

build-source4.json与source4-focused-inputs/build.json同sourceDigest；234 runtimeSources与本次只读现文件逐hash一致。当前新七文件44063/45000B（余937B），ART02 44996/45000B，旧修行21251/22000B、playable59787/60000B，GoalPanel18181/19000B。不得提高cap，只能真实复用/去重/重排。

冷坐修士运行资源实际512×512/65978B，SHA256 `66ff79c01b418faa5c0abb0b3490e54b9d30a8568abb796d410a9559d0a36ace`，alpha extrema 0–254；元数据证明透明通道/尺寸，不单独证明面部可见或TA合格。原稿/提示词/导出/消费者与资产最终检查仍由正式资产证据负责。未运行任何当前UI/规则/原生/配置/资产命令；root通知的配置结果不在本附件冒称独立重跑。整体艺术、长线平衡、最终矩阵与用户验收保持开放。

后续状态补充：QA已通知原source4新17终止且仍有失败，普通current的A17已实际生成saved下一步帧；本审阅者按约实际看了目标物件与该saved下一步两图，见同源final-art-review-source4.md追加节。root发现的natural短成果遮脸仍是当前独立像素阻断，不能以局部导航修正关闭。等待本轮原红/新锁红后统一最小修缮，未改运行源或测试。
