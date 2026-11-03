# 当前视觉缺口的接续定位（尚未实施）

V01已由真实失图截图确认，不是猜测：RecoveryRitual的药盏绘制层盖住了ItemArtifact备用说明的部分文字。具体源为web/src/RecoveryRitual.vue的recovery-jade-bowl、web/src/ItemArtifact.vue的asset-fallback/完整small，以及web/src/art11-inventory.css的recovery-medicine绝对定位。下一项先量实际字形与碗体/伪元素外缘，再调整失图时的排布；正常绘画与全部物品名/实际库存/费用保留。不能以隐藏完整文字、缩字或仅抬z-index遮盖另一对象当解决。当前没有登记或验证任何新的像素参数。

V02源在RelicAtelier的已炼成/尚未装备状态、MarketCounter的交换说明及RecoveryPlanner的有限授权摘要。优先给有意义的短语与数值分组，容许组间换行；不对整段强制nowrap造成新越界，不缩18/14字体，不丢次数/目标/保留库存。实际完整文本、最长合法值、运行/暂停/错误/失图状态仍须核；旧预算和来源哈希不重签，具体变更前须先细化合同。

V03现有实拍仅确证功法暂停页同一原安排/继续提示重复。先定位LearningPlanner/JadeStudyScene/StudyQueueRail与preparation-view的显示消费者，保HUD当前活动和原继续入口、真实预算/原安排与下一草案区分。减少重复显示不能改持久停止原因、原CAS/命令/回执或移除实际功能；不能通过直接修改历史proof字符串减字。后续其他页面的文字密度仍按用户反馈逐项核，当前不冒全面文案通过。

三项均为下一独立视觉/交互局修的输入；当前未修改产品。当前1281功能证据保原e9b身份，新产品改动后须为受影响消费者重新取证，最终同源候选义务不减少。固定1440×900/font1单Chromium；兼容、环境性能及用户档边界不变。
