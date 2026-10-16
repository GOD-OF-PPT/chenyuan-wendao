# Goal 1 / T04：full事务适配与旧档迁移

日期：2026-10-16。状态：本地验证通过，准备交付。分支`codex/goal-1-full-persistence`基于T03的`68a1b42b2830c657228e09730a5d3f83fcb2f558`，PR叠加于PR #12，不合并main。

## 实际实现

新增FullSaveRepository和[数据库契约](../contracts/full-persistence.md)。原生IDB升级/读写事务负责最新状态读取、已知格式转换、原件备份、身份校验、状态/回执/检查点一致提交；不接入正式Store。原数据库v1数据在成功升级后仍原样保留，失败时连schema升级一起回滚。

create/import具有独立写入身份，普通动作沿用Command。异步前复制参数；导入采用真实event.id。已有full v1当前档、previous与检查点一次校验/备份/转换，未知或矛盾记录不覆盖。已提交动作返回原result及最新state；检查点保存完整准备状态，恢复API留给T05。

新增独立Playwright配置和开发测试页，使用真实Chromium IndexedDB验证模块；测试页不属于生产构建。网页CI增加此命令和报告，旧17项生产网页回归保留。没有新增依赖或升级锁版本。

## 真实验证

环境：macOS26.6.2/x86_64、Node24.19.0、npm8.11.0，Playwright1.56.1/Chromium141.0.7390.37。当前测试不是正常full网页流程，不能混同：

- 真实旧引擎3开场×2修法，各9阶段共54个快照，原生IDB升级后资源/时间/未决上下文一致，原current/previous/checkpoint与旧回执保留。
- 实际旧Repository的versionchange关闭连接，旧写入不能覆盖新run；原始M1不凭空增加修法。
- 升级因坏档/未来版本/检查点问题或配额失败时，版本和数据均回滚；已拒绝blocked请求不会晚到迁移。
- full v1当前/previous/检查点与版本头一致升级，全部原件归档；重开不再改变身份/奖励。
- 非破庙事件/未决战斗导入，坏导入与过期替换拒绝，原好档和回执不变。
- put成功后再abort不发布成功；回执写入失败连状态、突破物和检查点一起回滚。
- 调用者改动原参数不改变在途意图；重试返回原结果与最新状态。
- 普通突破与渡劫准备检查点、问心和战斗经关闭/重开仍完整恢复读取；本轮没有执行检查点回退API。

| 检查 | 实际结果 |
| --- | --- |
| npm run typecheck / npm test | 通过，202/202纯规则，0失败/跳过；full规则未改 |
| node scripts/check_lock.mjs / npm run check:content | 通过，原112项锁及已知配置合法 |
| npm run replay / replay:full | 六条M1、24条full通过 |
| 两版文档检查 | 通过；研究外链本轮未重新核验 |
| npm --prefix web run build | Vue类型/Vite构建通过 |
| npm --prefix web run test:persistence | 22/22原生IDB模块用例通过，0重试；含54个Adventure阶段快照和各故障场景 |
| npm --prefix web run test:e2e | 原生产网页17/17通过，0重试；仅首境界 |
| 来源/产物 | 原full/M1规则、App/Store/旧适配器、两锁、v0.3及原始输入不改；恰有四个生产文件，哈希仍等于T01，测试页不在dist |

自审补充了两个恢复边界：current缺失但previous/检查点仍在时明确拒绝，不误建空档；旧检查点来自另一人生时拒绝升级，避免跨档混用。均保留原数据库版本和原件并加入实际IDB回归。最终构建和22项模块套件再次通过。

## 明确后续

T05完成完整幂等/回执损坏/并发/失败提示与可重复恢复；T06同时切换正式Store与最小网页并执行CHECK-02三浏览器关键流程。当前普通网页仍到筑基，full模块通过不等于已接线，更不关闭G2—G5或最终Demo。继续保留数值未平衡、正式美术/性能/真人待验收状态。
