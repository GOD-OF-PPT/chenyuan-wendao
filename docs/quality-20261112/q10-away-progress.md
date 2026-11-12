# Q10：离开累计（进行中）

依据[0157合同](../decisions/0157-away-progress-contract.md)，完整20项中9项已递交；本项尚未交付。分支codex/quality-q10-offline-progress，基线Q07–09/2fc9547。

## 规则内核阶段

新增scheduled-activity Module，时间通过参数输入，仅复用正式create/resume/resolve/completeActivity，尚未导入生产Store或Repository。每批最多64周期、持久窗口最多8小时，固定首次观测截止、保余量和过期段截断；同规则/人生/活动/修订/owner/generation绑定。新/旧数值沿原规则，旧在线安排须明确继续后向前建钟，不追溯旧时间。

当前10个公开Interface行为测试与根TypeScript检查通过：四周期＋15秒余量、8小时跨分段/换页不重领、窗口改写拒绝、累计预算、暂停/新周期续行、旧安排前向接入、时间回拨/非法时间、最大时间安全停手、入劫后待问心、真实危险停手。原红/绿在artifacts/q10-away/各阶段tap与类型日志；不把它们称作存储/浏览器或完整离线验收。

下一接真实DB10/full-schedules与同事务回执/CP、原意图重放、导入清理及Store/返回汇总。现有生产UI仍沿已交付Q07的在线方式，不能因为纯规则内核通过就宣称关闭页面已经有收益。

独立任务仍新组2/3，Q10完成后强制Q06/Q07/Q10综合；兼容/环境性能未恢复，真人/长期/整体美术仍待。原生目标active。
