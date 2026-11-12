# 工程评审报告：代码质量 / 架构 / 测试与构建健康 / 安全 / 性能 / 流程

**一句话结论：游戏核心规则引擎（`src/full/`）本身干净、分层清楚、写协议设计严密、有真实行为测试保护；但围绕它生长出来的"证据/守卫机器"（139 个源文件被整文件 sha256 钉死、组字节帽、68 条逆变换链、v1…v55 测试台账）已经失控——65% 的提交在维护测试与守卫而非游戏，源码被字节帽逼成单行数千字符的压缩体；界面则是 160 KB 的 App.vue 加 54 份互相用 `!important` 压制的全局 CSS（828 处）与 2,274 个一次性颜色值，这正是"每个界面都凌乱、且怎么改都改不好"的结构性根因；最新一次 `goal-4` 目录删除一次性弄红 156 个本地测试与远端全部 16 个 CI 任务，暴露出这套守卫保护的是"证据簿记"而不是游戏行为。**

评审范围：代码质量、架构、测试/构建健康、安全、性能、开发流程。只读评审，未修改任何受 Git 跟踪的文件（全程 `git status` 干净）。

---

## 0. 实际运行过的检查与结果

| 检查 | 命令 | 结果 | 耗时 |
|---|---|---|---|
| 根依赖安装 | `npm ci` | 通过（1 个包：typescript 5.8.3） | 9s |
| 根类型检查 | `npm run typecheck`（tsc --noEmit，覆盖 `src/**`） | 通过，0 错误 | 1.4s |
| 根测试全套 | `npm test`（80 文件，node --test） | **923 过 / 162 失败 / 1085 例**（归因见 §1） | 56s |
| 删除前基线 | 克隆 HEAD~1（goal-4 尚在，LF 检出）跑 `npm test` | 1012 过 / 12 失败（均为平台/环境项，见 §1.3） | 64s |
| 内容校验 | `npm run check:content` | 通过 | 0.6s |
| M1 回放 | `npm run replay` | 通过 | 0.3s |
| full 回放 | `npm run replay:full` | 通过 | 0.9s |
| 经济审计 | `npm run audit:economy` | **失败**（CRLF 行尾 vs 硬编码 LF 哈希，见 §1.3） | — |
| 文档/资源门禁 | `python scripts/check_docs.py` | **失败**（art 守卫读已删除的 goal-4 文件，见 §1.1） | 8s |
| v0.4 文档校验 | `python docs/v0.4/tools/check_documents.py` | 通过 | — |
| 依赖漏洞 | `npm audit`（根 + web） | 0 / 0 漏洞 | — |
| web 类型检查 | `web/` 下 `vue-tsc --noEmit`（依赖就绪标记出现后补跑） | **通过，0 错误**（8.4s）。注：首次运行时 `web/.generated/demo-meta.ts` 尚未生成，报 2 个错误（`src/demo-loader.ts` 找不到 `../.generated/demo-meta`）；该文件由 `scripts/dev-web.mjs`/`build-web.mjs` 的 `writeNodes()` 生成且不入库，所以**干净检出直接跑 `vue-tsc` 必报这 2 个错**，必须先经 dev/build 包装脚本 | 8.4s |
| F1 复现脚本 | `artifacts/review-2026-11-11/eng/f1/run.mjs`（未修改的 `web/src/store.ts` + 桩仓库，57 个时序组合） | TICK 被丢弃 0/57；结论见 §2.2.1 | 90s |
| 远端 CI 状态 | GitHub check-runs API（goal-4 删除推送 `97c10d1`） | **16/16 任务全部失败**（core、browser×3、journey×12） | — |
| 完整 `validate:core` | 未跑：其 install 步骤会动 web/node_modules（归试玩代理）；且已实测证明 10 步中 3 步必红 | — | — |

本机环境注记（如实记录，未改动环境）：
- 本机 Node v22.12.0 低于 `engines >=22.16.0`：`tests/ui-forecast-context.test.mjs` 使用 22.15 才有的 `module.registerHooks`，整文件无法加载（1 个失败）。CI 用 22.16.0，无此问题。
- 本机 PATH 有 208 项（去重后 48 项），展开超 cmd.exe 的 8191 字符上限，导致 npm 脚本派生的 cmd 找不到 `tsc`/`node`（`npm run typecheck` 首次失败即此因）。已通过命令内去重 PATH 绕过；这是本机环境问题，与仓库无关，但值得在 README 提醒 Windows 贡献者。

---

## 1. 最严重：goal-4 删除同时打红本地测试与远端 CI

### 1.1 事实

提交 `97c10d1 "delete goal folder"` 删除 `goal-1`…`goal-4` 共 4,390 个文件（其中 goal-4 实测 240 MB）。该提交**已推送到 origin**，GitHub Actions 上 16 个任务（core、browser×3、journey×12，2026-11-11 10:15Z 触发）**全部失败**。

本地实测 162 个失败中 **156 个直接由删除造成**：
- `tests/idle-matrix-evidence.test.mjs:39` 在 154 个测试共用的 `declarations()` 里读 `goal-4/evidence/candidate-base-01/current-inventory.json` → ENOENT，153 例全灭。
- `tests/idle-trial-ui-replacements.test.mjs`（3 例）经 `scripts/idle-matrix-evidence.mjs:591` 读 `goal-4/evidence/cend13c/second-scope-review.json` → ENOENT。
- CI `validate:core` 的 `documents` 步同样必败：`scripts/check_docs.py` → `art/tools/check_inventory.py` → `art/tools/cend13c_gap_inventory.py:421` 读 `art/redesign/cend13c-gap.json` 中指向 `goal-4/evidence/cend13c/before/...` 的"原始快照"。`art/tools/*.py` 共有 **389 处 `goal-N/` 引用**；`art/tools/test_inventory.py` 的 setUp 会因此连带全灭（824 个 unittest 方法）。
- UI 侧：`web/e2e/art27-relic-workshop.spec.ts:13` 与 `web/e2e/art29-inventory-scene.spec.ts:13` 在模块顶层 `readFileSync('../../goal-4/evidence/...bounds.json')`，两个 spec 均在 `playwright.idle.config.ts` 的 testMatch 内——**idle UI 套件在收集阶段即失败**。
- 文档死链：README.md 113 处 `goal-4/` 链接；AGENTS.md、docs/（218 个文件）、web/README.md 亦大量引用。

### 1.2 性质

删除者大概率以为 goal-4 只是"过程文档"。实际上守卫机制把大量**运行时输入**（逆变换基线快照、测试清单、像素边界 JSON）放在 goal-4 下并被代码在运行时读取——删目录 = 删测试与校验器的输入数据。这本身就是守卫体系的设计缺陷症状（§4）：源码基线应存在于 Git 历史，而不是工作区里的 evidence 文件。

### 1.3 删除前就存在的 12 个失败（HEAD~1 基线实测）——全部是平台/环境脆弱性

| 失败 | 根因 | 性质 |
|---|---|---|
| `audit:economy` + `economy-report-current`（2 例） | `scripts/replay-economy.mjs:58` 把 `docs/economy/current-report.json` 的 sha256 硬编码为 LF 摘要 `cf3b…`；本机 `core.autocrlf=true` 且仓库**无 .gitattributes**，检出为 CRLF → 摘要变 `d48ed…` 不匹配（实测两个摘要均复核）。同文件 `tests/economy-report-current.test.mjs:22` 断言路径以 `/docs/...` 结尾，Windows 反斜杠必败 | 跨平台 bug（脚本与测试） |
| `candidate-evidence` | `scripts/package-candidate.py:40` 写 git alternates 用 `str(Path.resolve())`（Windows 反斜杠），git 报"object directory ... does not exist" | 跨平台 bug（应 `.as_posix()`） |
| `candidate-server.test.mjs:5` | `fs.symlinkSync`，Windows 无开发者模式/管理员权限 → EPERM，整文件流产 | 环境限制（应 skip 而非 abort） |
| `demo-nodes.test.mjs` | `scripts/demo-nodes.mjs:34-38` 在 `web/`（E: 盘）暂存后 `renameSync` 到 `os.tmpdir()`（C: 盘）→ EXDEV 跨盘改名 | 跨平台 bug（暂存应与输出同目录） |
| `ui-forecast-context.test.mjs` | 需要 Node ≥22.15 的 `registerHooks`，本机 22.12；engines 声明 ≥22.16 | 本机 Node 偏旧 |
| 7 个 `*-effects.test.mjs` | 从 `web/src/*.ts` import 并进而 import `vue`——**根测试隐含依赖 `web/node_modules`**；干净检出只跑根 `npm ci` 时这 7 个文件全部流产（基线克隆实测复现） | 套件耦合问题 |

---

## 2. 架构：规则/界面边界、Store、活动调度、IndexedDB

### 2.1 健康面（值得保留的设计）

- **边界干净**：`src/` 全部模块 grep `document|window|indexedDB|localStorage` 命中 0；`src/full/engine.ts:197` 的 `resolve()` 是 `structuredClone` 后的纯函数结算。`web/src` 有 117 处从 `src/full/` 导入，未发现 UI 重新实现成本公式或门槛检查；预估全部走规则侧 `queries.ts:25 previewAction()` → `engine.ts:202 previewResolution()`。
- **写协议严密**：commandId/runId 用 `crypto.randomUUID()`（`web/src/store.ts:57`）；CAS 在 IndexedDB 事务内核对（`full-persistence.ts:576,728,767`）；current/previous/activity/checkpoint/receipt 全部写在**单个 readwrite 事务**内，事务内没有任何 `await` 非 IDB Promise（全部挂在 `onsuccess` 回调链上），**无 auto-commit 风险**；以 `tx.oncomplete` 作提交点；`onabort` 统一映射为 QUOTA/DENIED/ABORTED。
- **丢回复处理正确**：重试沿原 commandId 重放，事务内发现同 fingerprint 回执即返回 `replayed:true` 不再执行（`full-persistence.ts:562-574`）；提交后读取失败只标"同步待核对"，不重扣成本（`store.ts:266-268`）。跨页用 BroadcastChannel + CAS + 活动 ownerId/generation 双重认领。
- 存档迁移有 `onupgradeneeded`、`onblocked → STORAGE_BLOCKED` 拒绝、`db.onversionchange → close()`。
- 观察者无 `deep:true` watcher；`structuredClone(game)` 主要在写路径，频率可控。

### 2.2 正确性问题（按严重度）

| # | 严重度 | 问题 | 证据 | 建议 |
|---|---|---|---|---|
| F1 | 低（初稿误判为中，已复核降级） | **`write()` 用静默返回表示"未受理"，是潜伏的脆弱契约**：`store.ts:206-207` 在 `busy` 时直接 `return Promise.resolve()`；`submitActivityWhenDue`（`store.ts:81-85`）无法区分"被丢弃"与"成功"。若该分支被命中，周期不结算并重等完整 `cycleMs`。**经调用链复核与脚本验证，当前没有命中它的可达路径**，详见 §2.2.1 | `web/src/store.ts:206-207, 81-85`；57 个时序组合 0 次丢弃，人工强置 busy 才出现 | `write()` 返回受理/未受理判别结果，周期路径对"未受理"续等余量 |
| F1b | 低 | TICK 保存中调用导入/重开/恢复：先停运行时、后被 `write()` 静默丢弃，操作无声失效且放置循环停摆；仅 store 层可复现，界面层已同步检查 busy 挡住 | `store.ts:332, 340, 348`；`App.vue:212, 519, 607` | 先确认会受理再 `stopActivityRuntime()` |
| F2 | 中 | **receipts/backups 两个 object store 无界增长**：每次 START/PAUSE/RESUME/TICK 都 `receipts.put`（`full-persistence.ts:603,612`），v5/v6/v7 活动的 TICK 回执还带 `proof.stateAfter`（完整 Game 快照）；只有 replace/restoreCheckpoint/迁移才 clear。一段 50 周期活动产生 52+ 条回执，整局游戏可到数千条 × 数十 KB | `full-persistence.ts:602-603, 734, 783`；`activity-persistence.ts:18` | 按 runId 保留最近 N 条或按活动归档滚动裁剪 |
| F3 | 低 | 每次写后附带多次全量读+全量校验：非活动写后再读 activity 快照、`checkpointInfo` 内部用 `resolve()` 完整模拟一次引擎、`canonicalFingerprint` 比较整个 Game | `store.ts:252-259, 239`；`full-persistence.ts:216-220` | 写频率 ≥6s 一次尚可接受；长期可省重复校验 |
| F4 | 低 | `loadActivityHistory` 游标全扫回执库再内存分页，每条 v2 回执还要 `completeActivity`+fingerprint 复核；与 F2 叠加会线性变慢 | `full-persistence.ts:509-528` | 用索引按 runId 过滤 |

### 2.2.1 F1 验证结论：**不成立**（原表述的触发场景不存在；分支本身是潜伏的脆弱契约）

初稿把 F1 列为"中：TICK 撞上另一写入会被静默丢弃并重等整周期"，并举例"保存中的配装确认"。复核后撤回这一判断：

- **读调用链**（`web/src/store.ts`）：`busy` 只在 `init()`（173-174 行）与 `performWrite()`（216 行）置真。周期运行时存活期间，其余所有写入口要么在活动运行中被直接拒绝（`prepareAction` 299、`actPrepared` 306、`prepareConfiguration` 316、`applyConfiguration` 322、`startPlannedActivity` 376、`prepareMilestone` 384），要么在调用 `write()` 之前先 `stopActivityRuntime()` 让周期循环退出（`importPrepared` 332、`restart` 340、`restorePrepared` 348、`startPreparedMilestone` 390、`pauseCultivation` 401、`resumeCultivation` 409、`retry` 358、`init` 173）。`beginActivityRuntime()` 只在 `await write()` 返回之后调用，且调用方入口都先查 `busy`。因此"周期到期时 busy 为真而运行时仍存活"没有可达路径；初稿举的配装确认例子在 322 行就被拒绝。
- **最小复现脚本**（`artifacts/review-2026-11-11/eng/f1/run.mjs`，未改任何受跟踪文件）：用 Node 加载**未修改的** `web/src/store.ts`，仅把 IndexedDB 仓库层换成桩（周期 300ms）。对 19 种公开入口（配装、行动、导入、重开、恢复检查点、新活动、里程碑、暂停、继续、重试、重新读取、跨页广播等）各在三个时点触发：周期中段、写入跨越到期瞬间、TICK 保存进行中。**57 个组合中 TICK 被丢弃 0 次。**
- **人工对照**（同一脚本）：从外部强行把 `store.busy` 在到期瞬间置真，分支行为与初稿描述一致——该周期不结算、无任何错误或提示、重新等待整周期（首次结算从约 346ms 推迟到 650ms）。即：**分支一旦被命中后果属实，但现有代码没有命中它的路径。**

结论与建议：这不是当前的玩法缺陷，降级为"低：潜伏契约"。`write()` 用"静默返回已完成的 Promise"表示"未受理"，安全性完全依赖十余个调用方各自的上游守卫；以后任何新增写入口忘了先停运行时或先查活动状态，就会把它变成真缺陷。加固很便宜：让 `write()` 返回受理/未受理的判别结果，周期路径对"未受理"按 `ACTIVITY_NOT_DUE` 同样续等余量。

复现脚本顺带发现一个同源的反向问题（F1b，低）：TICK 保存进行中若调用 `importPrepared`/`restart`/`restorePrepared`，它们先 `stopActivityRuntime()` 再 `write()`，而 `write()` 因 busy 静默丢弃——结果是用户操作无声失效，同时放置循环被停掉且无错误提示（活动仍为运行中，但本页不再计时）。脚本在 store 层已复现；界面层目前挡住了它（`App.vue:212 confirmationBlocked()`、`App.vue:519 unchanged()`、`App.vue:607` 均在调用前同步检查 `store.busy`），所以玩家实际触发不到。修法与上面相同：先确认 `write()` 会受理，再停运行时。

局限：桩仓库只替换了存储层，结论限于 `store.ts` 的控制流；未在真实浏览器与真实 IndexedDB 下跑。
### 2.3 复杂度与死代码（对单机本地游戏明显过度设计）

- **版本矩阵**：Activity format v1–v7 共 7 种（`src/full/activity.ts:60-70`）、回执 4 种格式、checkpoint v1、存档 format v2/schema v2、DB v9，外加 legacy v1 与 previous-content 两条迁移链。`validateActivity` 约 109 行、`validateActivityReceipt` 约 92 行（内嵌 v1–v7 每版重推导期望指令）、`migrateTransaction` 约 88 行。
- **死代码**：`web/src/persistence.ts`（旧 M1 `SaveRepository`，全仓 0 个 importer）；`store.act/actPrepared/prepareAction`（`store.ts:297-313`）与 `FullSaveRepository.execute`（`full-persistence.ts:798-844`）在 UI 不可达——`App.vue:349` 的 `act()` 把全部 25 种 Action 路由到活动/配装/里程碑路径，`execute()` 对 25 种类型一律抛 `ACTIVITY_REQUIRED/CONFIGURATION_REQUIRED`，永远不可能提交；`canonicalFingerprint` 有两份实现（`src/full/receipts.ts:9` 与死文件 `web/src/persistence.ts:8`）；`src/game/*`（M1 旧引擎）仅被 tests/scripts 使用，属保留遗产。
- **回执类型判别五处近乎重复**：`replace`/`restoreCheckpoint`/`execute`/`configure`/`writeActivity` 各自重复"异类回执 → COMMAND_ID_REUSED"的 3–4 分支（`full-persistence.ts:563-571, 633-641, 719-722, 758-761, 812-815`），应提取共享 `assertForeignReceipt()`。
- **动作时长有三个事实源**：`src/full/activity.ts:94 CULTIVATION_CYCLE_MS`（真实周期）、`MILESTONE_CYCLE_MS`/`ADVENTURE_CYCLE_MS`、`web/src/action-timing.ts:3 ACTION_SECONDS`（表现读秒 0.6–2.4s 共 25 项），规则改动需手工同步。
- `web/src/local-experience.ts` + `use-local-experience.ts` 是又一套完整迷你持久层（自有 epoch/CAS/clear/export/eviction），用于本地试玩记录；有 1000 条/1MB 上限，但同样是复杂度负担。
- 定时器卫生整体良好（均未见脱离 owner/generation 守卫的失控定时器，`activityClock` 每 tick 用 `performance.now()` 重算余量自动纠偏）；唯 `setTimeout(fn, min(100, remaining))` 以约 10Hz 刷新 `remainingMs` 驱动重渲染，240 秒周期约 2,400 次刷新，有界但偏密，显示用 1Hz + 到期精算即可。

---

## 3. 组件与样式：界面"改不好"的结构性根因

### 3.1 App.vue 是 god component（严重度高）

`web/src/App.vue`：160,600 字节 / 965 行（script 74 KB + template 85 KB）。实测：103 个 import（60 个组件）、48 ref + 16 shallowRef、74 computed、15 watch、103 个函数、26 次 nextTick、46 次 `document.` 访问、236 处 `store.` 引用（触及 store 全部 48 个公开成员）；模板含 ≈245 个条件分支（190 v-if + 34 v-else-if + 21 v-else）、61 个不同子组件、8 个 `<dialog>`、11 个 `<KeepAlive>`。混合 8 类职责：里程碑确认意图、活动分发、存档导入导出、导航、焦点管理、帮助/设置、持久化错误呈现、只读查看器。过去 ~100 轮 UI 迭代每轮都改这个文件——它同时是变更热点与回归放大器。可拆缝隙（按建议顺序）：S1 里程碑对话框组（`App.vue:546-637` + 4 个 dialog）、S5 四个 tab 内容组件（`App.vue:814-854`）、S2 存档传输、S3 活动分发（`act()`，`App.vue:349`）、S4 舞台导航、S6 焦点并入 `focus.ts`、S7 查看器。

### 3.2 CSS 级联考古（严重度高）

- `web/src/main.ts:7-49` 依次导入 29 份全局样式；另有 ≈25 份全局 CSS 从组件内部 import（级联顺序取决于组件加载顺序，隐式且脆弱）。**全仓 0 处 `@layer`**。
- 级联武器实测：**828 个 `!important`**（immersive-theme.css 113、cultivation-objects.css 69、narrative-objects.css 44）、**1,019 个 `#app` 选择器**、52 个 `:deep(`、18 个 `:global(`；至少 5 个组件用非 scoped style，`SourcePlanner.vue:58` 在 scoped 块里写 `#app .source-start…!important` 穿透全局。
- 同元素被 3–4 层反复覆盖的实证 10 组。例：`.error-banner` = `style.css:64` → `immersive-theme.css:30`（4×!important）→ `stage-r1.css:12`（改盒模型）→ `art18-ui.css:33`（第 4 次配色）；`.primary` = `style.css:77` → `immersive-theme.css:15`（!important）→ `art37-dialog-actions.css:14`（`body .art-theme button.primary`）。
- **颜色碎片化是"凌乱感"的直接机械成因**：2,582 处 hex 颜色、**2,274 个不同值（88% 只用一次）**；三套并行 token（`--teal/--gold`、`--ui14…--ui30`、`--game-ink/--game-jade/--game-gold`），56 个自定义属性被定义、100 个被引用（44 个引用了从未定义的值，如 `--font-scale` 被引用 191 次无 CSS 定义）；1,236 处 font-size、86 个不同值（尽管文档规定"正文 18px、辅助 14px"）；99 处 z-index、22 个不同值。每轮 UI 迭代都手挑了略不同的颜色与字号。
- 死样式：抽查 6 份旧 CSS 的 486 个类，**42 个类已无模板使用**；`battle-actions`、`equipment-card`、`equipment-options`、`loadout-summary` 等死类被 3–4 层文件反复重定义。`web/src/CultivationPanel.vue` 全仓零引用（可删）。
- 7 个 Planner 组件复制同一骨架：各自 inject 整个 store（`LearningPlanner.vue:18` 等 6 处）、各自手写 `savedPlan` 恢复与"限额+保留量"表单，无共享抽象——应抽 `usePlannerDraft()` + 共享 `PlannerLimits` 组件。
- 可访问性：全应用仅 3 个 `aria-live` 区域（对一款以"保存中/已保存"异步反馈为核心的游戏偏少）；`role=status` 50 处、`role=alert` 18 处。

### 3.3 字节帽把源码逼成压缩体（流程根因，严重度中）

为通过守卫字节帽，源码被手工压成长行：`App.vue:119` 一行 1,626 字符（含 10 条语句的 store observer）、`App.vue:698` 一行 3,302 字符的模板；`stage-r4.css` 整个文件是一行 8,804 字符；`opening-offering.css` 2 行 9,078 字节；`shell.css:61` 一行 3,007 字符（第 4 次重定义 `.save-state`）。全仓 261 个源码文件中 **1,930 行超 200 字符、85 行超 1,000 字符**。这些文件无法有效 diff/review/blame——字节帽在事实上奖励压缩格式，直接损害代码质量与协作。

---

## 4. 测试与守卫体系：65% 的提交在维护"证据簿记"

### 4.1 分层实测

| 层 | 规模 | 价值判断 |
|---|---|---|
| 规则/引擎行为测试（根） | ~55 文件 / ~480 例 | **真正的回归保护**：直接驱动 `newGame/advance/resolve` 断言真实 Game 状态；56s 跑完，无浏览器 |
| persistence-tests（IndexedDB 原子/恢复） | 40 文件 / 230 例 | 有价值，保留 |
| journey-tests（24 条正常路线） | 循环生成 ~60+ 例 | 有价值，保留 |
| web/e2e 行为驱动主流程 | 194 文件 / 985 例中的子集 | 部分有价值；但 201 个文件断言精确中文文案、181 个含几何/像素断言、155 个用 `page.clock` 虚拟钟，脆性高；短样板（viewport/pageerror/setTimeout 三件套）在 ART/UX/UIR 家族几十份 spec 逐字重复 |
| 构建/打包/证据工具测试 | ~17 文件 / ~105 例 | 部分是工程自证，应随打包流程精简 |
| 源码/资产"钉死"测试 | ~8 文件 / ~170 例 | 主要保护字节形态，非行为 |
| **idle-matrix-evidence 台账** | 脚本 84 KB + 测试 100 KB / **161 例（占根套件 21%）** + 54 个 `*-additions.json` + v1…v55 版本链 | **纯簿记**：验证"哪些浏览器测试跑过、属于哪一版证据"，对玩法零覆盖；任何 UI 测试改名都要同步改清单、升版本、补保留断言 |
| Python 守卫 | `check_inventory.py` 88 KB + `test_inventory.py` 242 KB（529 例，测守卫的守卫）+ ~140 个 `*_inventory.py` | 资产事实校验（存在/尺寸/alpha/禁字体）有价值；其余是钉死机制 |

### 4.2 钉死机制规模（全仓实测）

- **139 个 `web/src`/`src` 源文件被整文件 sha256 钉死**；`art/tools/*.py` 中 sha256 出现 1,219 次、cap/budget 类关键词 539 处；组字节帽如 `App.vue ≤ 159,635 B`、`idle-preparation ≤ 60,000 B`、`ART35 组 ≤ 7,200 B`。
- **68 条"逆变换回原全文"链**：以 `ux30_inventory.py:203-215` 为典型——先要求当前文件 sha == after，再按 offset 逆序把每处 `afterText` 换回 `beforeText`，最终要求逆变换结果 sha == before 且**逐字节等于磁盘上的 baseline 全文**（baseline 就存在 goal-4/evidence 下，已删）。链条 UX27→…→UX31→UX30 串行嵌套。任何一次合法文案修改都要：维护多层 prior 函数 + 补 baseline 全文 + 重签两层哈希。
- 维护成本信号：592 个总提交中 **65% 触碰 `web/e2e`、`art/tools` 或 `tests/`**；`test_inventory.py` 单文件 120 个提交、长到 242 KB；`idle-matrix-evidence` 测试+脚本各 54 个提交。

### 4.3 结论

这套机制的初衷（防止 AI 代理做未经授权的改动）可以理解，但现状是它在保护"源码的逐字节形态"与"测试曾运行的证据"，而不是游戏行为。直接后果：
1. 改 UI 必须同步更新 N 个守卫文件 → 迭代被拖慢，且诱使作者压缩源码躲字节帽（§3.3）；
2. 守卫输入散放在 goal-4 工作区目录 → 一次目录删除打红全部 CI（§1）；
3. 1,219 个 sha 钉在 CRLF 检出下全灭（无 .gitattributes）；
4. 制造"质量很高"的假象——161 例台账测试全绿也不能说明游戏无回归。

**建议方向**：行为断言替代字节钉（关键文案用语义断言；历史基线查 Git 历史而非 evidence 文件）；台账用 Playwright 自带 tag/grep + CI 计数替代；字节帽改为 Prettier 格式化后的预算，让格式化不再是惩罚；保留引擎行为测试、persistence/journey 套件与资产事实校验。

---

## 5. 构建、发布与 CI

- CI 定义（`.github/workflows/playable.yml`）相当完备：三浏览器矩阵、journey 12 分片、性能预算、候选包复现（源码 bundle → 重装 → 重建 → 解包冒烟 → 回执）。**但远端当前全红（§1.1）**；且仓库自述"旧 CI 仍包含三浏览器…当前不得 push 触发"（`scripts/package-candidate.py:125` 生成的 KNOWN_ISSUES.md），与实际行为矛盾——推送照样触发、照样全红。另：main 分支停在 2026-10-13（仅 2 个提交），全部 590 个开发提交在 codex 分支上，"资料先入 main、功能走 PR"的约定实际未执行。
- `core.yml` 唯一门禁 `validate:core` 共 10 步，当前 **3 步必红**：tests（goal-4）、documents（goal-4）、economy（CRLF 机器）。
- 构建可复现性设计认真：`scripts/record-web-build.mjs`/`assert-web-build.mjs` 把 dist 逐文件 sha 与全部运行时源码 sha 绑定，候选包固定 ZIP 元数据并校验 git bundle 对象集。但 `package-candidate.py:40` 的 alternates 反斜杠 bug 使候选打包在 Windows 直接失败。
- 本地复现 CI 的障碍：`python3` 硬编码（Windows 只有 `py`/`python`，至少 6 处：validate-core、candidate-receipt、candidate-server、candidate-documents、playwright.candidate/idle-performance 的 webServer）、symlink 权限、跨盘 rename、LF 假设。**开发者在本机无法完整复现 CI 门禁**——这解释了为什么 12 个平台失败能长期存在。

## 6. 安全

- 依赖：根 1 个（typescript）、web 少量（vue/pinia/vite/playwright），`npm audit` 双 0 漏洞；`scripts/check_lock.mjs` 把 web 锁文件整体 sha256 钉死并校验所有 resolved 来自 registry.npmjs.org、integrity 为 sha512——供应链卫生好。
- 密钥/存档扫描：无密钥、无私钥、无个人存档提交（`art/**/secret.png` 是游戏场景图，命名巧合）；`.gitignore` 覆盖 env/saves/artifacts；`.npmrc` 含一个 registry token 但在用户目录、未入库。
- **XSS 面干净**：`web/src` 全仓 grep `v-html|innerHTML|outerHTML|insertAdjacentHTML|document.write|eval(|new Function` **0 命中**；所有用户可控字符串只经 Vue 文本插值渲染。
- **存档导入校验严格**（静态判断）：1MB 大小双检（`App.vue:520`、`engine.ts:236`）、`shape()` 精确键集合（多一个键即拒，且全部走 `Object.hasOwn`，天然防 `__proto__` 原型污染）、所有数值 `Number.isSafeInteger`（拒 NaN/Infinity）、字符串限长、所有内容引用必须是内容表已知 id、境界/地点/年龄/因果链跨字段一致性校验。`localStorage` 仅 `use-tracking.ts` 一处（显示偏好，版本校验 + try/catch）。
- CI 工作流 `permissions: contents: read`、所有 Action 按 SHA 钉版本，做法正确。

## 7. 性能

- 产物静态资源：`web/public/art` 98 个 webp 共 9.2 MB（单张最大 357 KB）；首屏实际加载策略未做浏览器实测（试玩代理范围）。
- **仓库体积**：`art/` 233.5 MB PNG 直接入 Git，`.git` 530 MB，克隆成本持续增长——建议 Git LFS 或移出仓。
- 运行时（静态评审）：无失控定时器；唯一偏密的是读秒 10Hz 重渲染（§2.3）；每次写后有可省的重复全量校验（F3）；回执历史全扫分页（F4）与无界增长（F2）叠加是长期退化点。
- 工程反馈环很快（typecheck 1.4s、根测试 56s），问题不在速度而在有效性（§4）。

## 8. 流程与文档：累积式文档已成为净成本

- `AGENTS.md`：**178 KB / 695 行 / 287 段，178 个提交**。每轮任务追加一段"合同"，从不精简；段落间大量互相限定，历史暂停与最新决定交织，充斥"不冒称/保/实证非认证"式法律化措辞。对 AI 代理是每次会话数万 token 的固定成本，对人类几乎不可读；且因为太长，关键规则（如"不得 push 触发 CI"）实际未被遵守。
- `README.md`：前 ~200 行是倒序日报（每段一轮任务），含 113 处已删除目录的死链与大量 `http://127.0.0.1:569xx/` 短命试玩链接；真正的项目说明从第 200 行才开始。
- `docs/`：328 文件 11.6 MB（decisions 149 份 1.2 MB、implementation 144 份）；单份决策文档最长达 32 KB。
- 提交节奏：592 个提交 / 29 天（峰值 53/天），136 个以 `docs:` 开头——大量提交只动状态文档；65% 触碰测试/守卫（§4.2）。**这个项目的瓶颈已经不是"写游戏"，而是"维护关于游戏的记录"。**
- 建议：AGENTS.md 收敛为"常青规则 ≤5 KB + 当前迭代状态 ≤2 KB"两段式，历史合同归档进 docs/decisions 索引；README 日报删除或移 CHANGELOG（Git 历史已记录）；决策文档今后限 ~2 KB，只写决定与理由。

## 9. 最值得先做的 10 项改进（收益/风险/工作量）

| # | 改进 | 收益 | 风险 | 工作量 |
|---|---|---|---|---|
| 1 | **止血 goal-4 断链**：盘点 389 处守卫引用，对仍被运行时读取的少数文件（cend13c 基线、art27/29 bounds、candidate-base 清单）从 Git 历史恢复并迁入 `art/` 或 `tests/fixtures/` 改引用；其余随 #6 一并删除 | CI 由全红变可绿 | 低 | 中 |
| 2 | **加 `.gitattributes`（`* text=auto eol=lf`）并一次性重新规范化** | 消除全部 CRLF 哈希脆弱性，本地/CI 一致 | 低（一次性行尾 diff） | 小 |
| 3 | **回执/备份滚动裁剪（F2）**：receipts 按 runId 保留最近 N 条或按活动归档，TICK 回执不再长期保留完整 Game 快照 | 消除长期存档膨胀与回执历史变慢 | 低→中（需保住原意图重放窗口） | 中 |
| 4 | **修 4 个跨平台 bug**：alternates 用 `.as_posix()`；demo-nodes 暂存移到输出同目录；economy 路径断言改为 sep 无关写法；candidate-server 无权限时 skip | 本地可复现 CI | 低 | 小 |
| 5 | **解除根测试对 `web/node_modules` 的隐依赖**：7 个 `*-effects` 测试需要的 UI 纯函数移入 `src/` 或显式声明依赖 + 缺失时 skip | 干净检出可测 | 低 | 小 |
| 6 | **归档钉死机制**：161 例台账、68 条逆变换链、整文件 sha 钉 → 行为断言 + Git 历史基线；同步删死代码（`web/src/persistence.ts`、不可达的 `store.act`/`execute()` 路径、`CultivationPanel.vue`、42 个死 CSS 类） | 迭代提速一个数量级 | 中（先补关键行为断言） | 大 |
| 7 | **字节帽改为格式化后预算**：引入 Prettier 统一格式化（先 App.vue、stage-r4.css、opening-offering.css、shell.css 等 20 个最坏文件） | 恢复可 review 性 | 低 | 中 |
| 8 | **CSS 收敛第一步**：0 视觉变化地把全部全局 CSS 包进显式 `@layer`；stylelint 禁新 `!important`/`#app`；后续按功能拆解 immersive-theme.css（113 个 !important） | 界面整理解锁 | 低→中 | 中 |
| 9 | **拆 App.vue**：先抽里程碑对话框组（S1）与四个 tab 内容组件（S5），目标逐 seam 降到 ~30 KB | 降低回归放大器 | 中 | 大 |
| 10 | **文档减肥 + 颜色 token 化**：AGENTS.md 两段式、README 日报归档、修 113 处死链；2,274 个一次性 hex 先收敛纸色系/墨绿系两大族群到 ~12 个 token，z-index 定 4 级 | 降低上下文成本 + 直接改善视觉一致性 | 低→中 | 中 |

另有两项随日常维护顺带做：加固 `write()` 的"未受理"契约（F1/F1b，当前不是可触发缺陷，改动很小）；`web/src/local-experience.ts` 迷你持久层评估并入主 Store。

## 10. 未能验证的部分

- `web/` 构建与浏览器测试：按分工未跑 `vite build` 与任何 Playwright（e2e、persistence、journeys、performance 全部未执行）；`web/` 类型检查已补跑并通过（§0）。
- 运行时性能（首屏、定时器 CPU、IndexedDB 实际 IO）：未做浏览器实测。
- F1 已验证为不成立（§2.2.1），但验证用的是桩存储层，未在真实浏览器与真实 IndexedDB 下跑。
- CI 各 journey 失败的具体日志（远端 artifact 未下载；本地证据已足够归因）。
- 存档导入校验的负面用例未实际执行，"无法注入/崩溃"为静态推断。
- 真机/真人体验与玩法数值不在本评审范围（另由试玩代理与玩法代理覆盖）。
