# 工程任务

以 docs/v0.3 为完整设计基线。约 30 分钟仅观察基本玩法理解，不限定通关时长。M1 玩法状态以 G1 分支 `feat/g1-locked-playable` 为准，继承 `feat/m1-playable-web`，未合并到 main。另一个分支有 `src/full` 规则但网页尚未接入。

2026-10-16开始 [Goal 1](../../goal-1/plan.md)，分支 `codex/goal-1-reproducible-baseline`。T01归拢G1与研究文档，整合实现`4907e1d`已重新通过本地与同SHA远端83规则/17 Chromium、经济回放、类型与构建，交付 [PR #10](https://github.com/GOD-OF-PPT/chenyuan-wendao/pull/10)，未合并。下一项T02接续full规则；任务和证据见 [tasks.md](../../goal-1/tasks.md) 与 [基线实施记录](../implementation/goal-1-baseline.md)。后续全境界网页、存档切换与正式美术保持未完成。

T02在`codex/goal-1-full-rules`接续`a49c0b4`全境界规则，增加配置审计、24组正常纯引擎路线、功法法宝效果及逐境恢复验证；正式网页与数据库仍用Adventure。当前进度与待修责任见 [T02记录](../implementation/goal-1-full-rules.md)。后续T03先明确契约与共享查询，再进行正式存档/网页切换。

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
| QA-01 | 自动化 | 83 规则测试 + 17 Chromium 测试通过；Safari/Firefox、真人测试待执行 |
| BUILD-01 | 构建与交付 | 已生成静态运行包和测试附件，无公开部署 |
| BUILD-02 / #4 | 前端传递依赖锁定 | 已入 Git 且采用前端 npm ci；同 SHA CI 已通过，PR 评审待完成 |
| M2 / #5—#6 | 后续境界、法宝、人物回响、渡劫飞升 | 另有 `src/full` 引擎规则但未接入网页，不能视为完整 Demo |

运行入口：[web/README.md](../../web/README.md)。测试证据与明确边界：[可玩版记录](../implementation/M1-playable-web.md)。

G1 锁定提交 `d6b1f75aefee3ea1ecb75138385bb318538ef75d` 的 [core CI](https://github.com/GOD-OF-PPT/chenyuan-wendao/actions/runs/38367640840) 与 [web CI](https://github.com/GOD-OF-PPT/chenyuan-wendao/actions/runs/38367640849) 已成功。后续新提交的 CI 应单独核对。不要把通过自动测试写成完整数值、艺术或用户体验验收通过。
