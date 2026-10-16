# 工程任务

以 docs/v0.3 为完整设计基线。约 30 分钟仅观察基本玩法理解，不限定通关时长。历史M1玩法来自G1分支；当前Goal 1在独立叠加PR中接续full规则并逐步接通网页，尚未合并main。实际状态以Goal 1逐项记录为准。

2026-10-16开始 [Goal 1](../../goal-1/plan.md)，分支 `codex/goal-1-reproducible-baseline`。T01归拢G1与研究文档，整合实现`4907e1d`已重新通过本地与同SHA远端83规则/17 Chromium、经济回放、类型与构建，交付 [PR #10](https://github.com/GOD-OF-PPT/chenyuan-wendao/pull/10)，未合并。下一项T02接续full规则；任务和证据见 [tasks.md](../../goal-1/tasks.md) 与 [基线实施记录](../implementation/goal-1-baseline.md)。后续全境界网页、存档切换与正式美术保持未完成。

T02在`codex/goal-1-full-rules`接续`a49c0b4`全境界规则，增加配置审计、24组正常纯引擎路线、功法法宝效果及逐境恢复验证；正式网页与数据库仍用Adventure。当前进度与待修责任见 [T02记录](../implementation/goal-1-full-rules.md)。后续T03先明确契约与共享查询，再进行正式存档/网页切换。

T03在`codex/goal-1-contracts-queries`落实 [运行契约](../contracts/full-runtime.md)，纯结算/预览使用共享成本门槛，明确full v1转换与结束语义，支持机制复用扩展；[CHECK-01本地记录](../implementation/goal-1-contracts-queries.md)为202规则/24 full回放/17现有浏览器及构建通过。正式数据库迁移、Store和网页切换仍未实施，由T04—T06承接。

T04在`codex/goal-1-full-persistence`实现独立full事务库与已知旧档迁移，真实IDB验证及边界见 [T04记录](../implementation/goal-1-full-persistence.md)。正式Store、恢复API和三浏览器完整矩阵仍由T05/T06承接，不因模块通过提前关闭网页验收。

T05在`codex/goal-1-recovery-idempotency`补齐恢复API、回执/幂等/并发/失败语义与原件只读备份，数据库升级v3并保护full权威进度。[T05记录](../implementation/goal-1-recovery-idempotency.md)为206规则、42原生IDB与17原网页回归通过。正式Store/页面切换与CHECK-02三浏览器关键路径留在T06，不把模块验证写成网页飞升。

T06在`codex/goal-1-full-ui-cutover`把正式Store和最小页面切换至full，接入失败显示/原意图重试、旧档迁移与重复恢复。三浏览器首境界/原生IDB及CHECK-02结果见 [T06记录](../implementation/goal-1-full-ui-cutover.md)；高级构筑、完整飞升网页、正式视觉和真人验证仍由后续任务承担。下表M1项保留历史范围，当前结果不能只读旧行。

| ID | 任务 | 状态与剩余边界 |
| --- | --- | --- |
| SETUP-01 | 仓库接入 | 已完成，保持原 public 可见性 |
| SETUP-02 | 核心设计入库 | main 已有 v0.3 文档、样例、约定和美术预览 |
| ART-01 | 高清原图与生产素材 | 待完成，当前仅压缩预览和头像印记占位 |
| M1-01 | 独立 TypeScript 规则 | 原经济规则 + Adventure 战斗封装，已有规则测试 |
| M1-02 | 经济数值 | 首境界初值可运行；全境界与真人平衡未完成 |
| M1-03 | 采集、委托、交易、炼丹 | 已接入真实网页控件与原子保存 |
| M1-04 | 修炼与突破 | 双条件校验、真实扣物、批量停止；截至筑基 |
| M1-05 | 剑符意图战斗 | 两个固定修法组合、两种敌人、回合与奖励可玩；完整功法搭配未完成 |
| M1-06 | IndexedDB | 原子状态/回执、导入导出、检查点、过期写入与回滚测试通过 |
| M1-07 | Vue 主界面 | 四个主页面可运行，桌面与移动宽度自动测试通过；最终美术未完成 |
| M1-08 | 开场与首境界整合 | 3 开场 × 2 修法 UI 路线含战斗/炼丹/筑基通过；另有不战斗采购路线 |
| QA-01 | 自动化 | 历史83规则/17 Chromium；当前206规则及三引擎首境界/存储见T06，完整飞升矩阵、真机/真人待执行 |
| BUILD-01 | 构建与交付 | 已生成静态运行包和测试附件，无公开部署 |
| BUILD-02 / #4 | 前端传递依赖锁定 | 已入 Git 且采用前端 npm ci；同 SHA CI 已通过，PR 评审待完成 |
| M2 / #5—#6 | 后续境界、法宝、人物回响、渡劫飞升 | 规则已接入正式Store/最小页面；完整逐境操作、构筑、因果和终局网页验收未完成 |

运行入口：[web/README.md](../../web/README.md)。测试证据与明确边界：[可玩版记录](../implementation/M1-playable-web.md)。

G1 锁定提交 `d6b1f75aefee3ea1ecb75138385bb318538ef75d` 的 [core CI](https://github.com/GOD-OF-PPT/chenyuan-wendao/actions/runs/38367640840) 与 [web CI](https://github.com/GOD-OF-PPT/chenyuan-wendao/actions/runs/38367640849) 已成功。后续新提交的 CI 应单独核对。不要把通过自动测试写成完整数值、艺术或用户体验验收通过。
