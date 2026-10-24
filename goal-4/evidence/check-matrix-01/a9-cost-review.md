# ART03-A9只读重复工作与挂起点复核

承接 `a9-host-diagnosis`，只读现有source5 trace、A9及辅助源码，没有运行并发UI或改675输入。结论仍是原60秒总限耗尽；未找到新的可证明产品挂起点。

确有一项小重复：`support.ts:29` 的 `revealPaged` 在目标不在当前页时，总先退到第一页，再向前找。`stage-support.ts:32` 每次选卷调用它，而A9逐原目录顺序读12卷、每页4卷。当前trace两次从第二页到第三页均真实出现prev→next→next；前两个动作退而复返，可直接next到同一目标。4个多余Click API实际累计287.731ms（原callId与完整顺序保存在 `artifacts/goal-4/check-matrix-01/a9-host-diagnosis-source5/actual-pagination-api.json`）。这不足以证明补足本次总时限。

最小候选建议仅为：当前全轮终态之后另获授权，在A9局部按已核目录顺序走公开下一页；遇非预期次序/可见性仍回退原通用helper。保原目标可见、选择点击、12卷全文/成本、逐页18/44/完整几何、每卷全DB/活动、原retry/唯一回执、完整原36张计划截图（本次trace实际33张）、4context与60秒总限。不要在当前冻结全轮中改公共helper，也不挪准备到计时之外。

其余未见可安全删除的重复：`unchanged` 已是一笔全库readonly事务，并从同一结果断言Game/Activity/全库；每卷不同对象的文字、代价、门槛和几何不是同一证明。A9调用自己的quotaFrame，没有同时再调用通用frame，所以未出现双截图同一入口；本次已执行33张不能删，第四forge-cycle尚未执行的3张也仍属原计划。完整原四组合为15+15+3+3=36张，并非新增截图。finally restore虽在正常注入后为幂等，但仍保护注入之前失败的路径，不能直接删掉；4个隔离context也不能合并成共用存储。

本地安装的Playwright实现额外证实：`BrowserContext.close` 在可见CloseContext channel调用前先await request.dispose及instrumentation；`ArtifactsRecorder.willCloseBrowserContext` 会停trace chunk、保存临时failure截图，可能取错误页snapshot。因而host清理窗口2.591/2.524/0.998秒不等于trace13ms CloseContext API。现有被动记录没有各子步骤时长，不能把全部剩余时间归为trace、截图、磁盘、DB或产品。

原trace在总deadline前没有locator/API timeout，前三段均case-verified；第四newPage在deadline之后Test ended。截图和只读/清理消耗是真实观测，具体慢因仍unknown。当前没有一个不减验证、不卡预算的有据修改能保证四段60秒内完成，不能为了交付制造这一保证。原失败、全部截图和完整四段义务保留，最终rawreport终态到后再补核身份。
