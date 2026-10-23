# ART05 两张当前代表画面的C端与TA复核

2026-10-24。仅审source4 `67ed71b9985f001fe959bb9932c7a2235cf94db58363a6226e9645e87fc9e4e5`两帧：真实6秒回应运行、真实12秒飞升封卷已保存。读取当前组件/CSS与本轮原始报告，没有启动浏览器、运行测试、修改源/旧测试或使用用户档。两张原PNG均保留；各转原尺寸1440×900 JPEG质量68、4:2:0有损查看副本，未缩放，并实际逐张看过。转换与双hash见`artifacts/goal-4/art05/visual/source4-review-two-images.json`。

## 两帧结果

1. **回应运行**：`ui-final-2-results/narrative-objects-ART05-A5-652eb-s-the-exact-whole-Game-once-chromium/response-real-running.png`。所选“另订药约”的签、18灵石/6秒、完整作用、当前进行中的禁用说明与“详情”同时可读；另一签仍可预选。当前人物画像与回应签分开，原唯一活动条5.9秒和对象ceil读秒6/6秒各有明确用途，没有提前成交/发药的成功提示。段落已经回到案面以内，原source1长行外溢不可用此绿帧抹去。

2. **真实封卷已保存**：`ui-final-2-results/narrative-objects-ART05-A6-b2f55-s-the-exact-whole-Game-once-chromium/ending-real-saved.png`。这是结束后没有immersive祖先的命卷，仍呈四书签、完整正文、导出/返回/分页。标题“飞升·留道传承”、卷边“飞升封卷”与本次已保存文字相符；命卷继续可读，不靠把正文合起或隐藏表示结束。原全局短印章处于右侧场景留白，当前帧没有盖住正文、书签或操作，局部成果为纸内状态文字，未叠第二个浮层。实际原子proof对应`status=ascended/ending=transmit`，不是主题图或计时器推定封卷。

当前来路书签与其他三签可辨；此前暂停虚拟钟下连续点四签留下的240ms按压框不作为永久多选证据。两帧没有发现需要改源的实际视觉阻断；结论仅限这两帧，不代整个动画时间段、所有正文页/错误态/恢复模式或用户整体游戏感验收。

## 几何、字体与保存依据

读取`ui-final-2.json`原附件，两个真实周期用例均`passed/retry=0`；本审查没有重跑。picture流程的geometry、PNG与随后object-ancestors为分次采样，例如A6正文top分别508.703125与526.203125，两个采样均在祖先内；不冒称每个瞬间矩形完全相同：

- A5 `response-real-running-geometry`：document1440×900，舞台(42,315.1875)—(1398,683)在实际父内；22个可见控件最小高44，未有越界或中心被截获。`response-real-running-object-ancestors`补核当前签正文18px、所有记录的实际祖先包含/无裁切及签架无相交；原geometry的普通p列表为空，不能据此单独声称ChoiceCard文字已经测过。
- A6 `ending-real-saved-geometry`：命卷(188,225.09375)—(1252,828)，实际父(170,149)—(1270,892)；正文18px，(428,508.703125)—(973.265625,538.390625)完整在其阅读区，未裁切；10个可见控件最小高44，未有越界/截获。局部结果14px/opacity1、(428,546.390625)—(973.265625,573.390625)，原clearance附件无与正文/操作相交。
- 原完整Game/唯一receipt检查属于QA实际用例。A5首次写在原dueAt后41ms，A6后48ms；各记录恰好一条提交。两图及本地动效只消费该已保存事实，不改变Game、费用、时长、命令或发奖。源中错误态冷却、精确Action/事件/NPC归属、隐藏/换页/接管清理及减动效由原helper/完整proof保护；两张静态图本身不证明这些生命周期全部通过。

摘录仅这两帧的祖先结果见`artifacts/goal-4/art05/visual/source4-review-two-ancestors.json`。两确认正文升18px的源规则只指向life-confirmation/ascension-confirmation，辅助small仍14；这两张代表未重审所有确认页。

## 图像身份与证据限制

| 帧 | 原PNG SHA256 | JPEG68 SHA256 |
| --- | --- | --- |
| 封卷已保存 | 281b394ebaa423eb201c86192277792bc44199d8ea6a712567f04d57931d165f | 3e7b53d9c097b4c6fad86df2eced9da69bcfacb2bfc3f2d8e1b6223276a23c57 |
| 回应运行 | 8647e73709fa0354bd162974080bd9e7f322de83e3cb5c16bf05c93def0acb9b | 620b358199e1c09df5b01a1b03cb65408ecb15bf86deab60357a0e20116ed0e9 |

查看副本为`visual/source4-ending-real-saved.jpg`、`visual/source4-response-real-running.jpg`。审阅时原终轮报告82通过/1失败：A13偏好减动效分支查找game-settings入口超时，另由主控/QA核对真实入口前提；本文不据两个代表通过写成83全过，也不以修改游戏周期或弱化完整Game/几何断言处理它。最终覆盖与同源交付以主控后续明确报告为准。

这是当前ART05工程的两帧C端/TA复核，未恢复兼容/环境性能，没有代签整体美术、长期平衡、完整矩阵、最终包或真实用户认可。
