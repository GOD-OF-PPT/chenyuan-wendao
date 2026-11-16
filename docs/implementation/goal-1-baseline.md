# Goal 1 / T01：可复现整合基线

日期：2026-10-16。状态：T01已完成，已提交PR #10；未合并，不代表完整Demo。

## 来源与提交关系

- main资料基线：`2fd249b6c6d5be88aa4609950f943e6cce119570`。
- 工程父线：`feat/g1-locked-playable@738d8e985ca468d08cb5fd877e6cf09164b074cd`，已继承PR #1的经济规则、PR #2的网页/存档和标准锁文件。
- 研究父线：`docs/competitive-research-v0.4@5158d082d5d270cc1ae6207ed6f1374b0dd5ddbb`，即PR #9。
- 当前分支：`codex/goal-1-reproducible-baseline`。以普通merge保留两边历史，未覆盖main或改写既有分支；旧PR保持开放。
- 尚未移植：`feat/full-demo-g1-g5@a49c0b4d0671a75f25c7781e4613de109c232899`的全境界规则，由T02接续。

本任务只归拢基线与可复现交付，不修改现有游戏规则、网页交互或存档格式。当前仍只能正常玩到筑基。全境界接线、存档迁移修复、正式美术和真人验收分别在后续任务。

## README冲突取舍

工程分支提供可玩范围、锁定安装、历史CI与试玩入口；研究分支提供新设计目录、full未接线事实及认可预览。整合README保留双方信息，明确分支与历史证据，链接Goal任务和本次验证。不保留旧分支名作为当前启动命令，不把研究提案写成验收完成。

v0.3正文、历史实施记录和已认可预览不修改；研究目录保留历史审计日期和源SHA。新增CI触发覆盖codex/**分支，并实际运行已存在的v0.4文档检查。直接依赖和两个锁文件保持原值。

## 本次验证

实际本地环境：macOS 26.6.2 / x86_64，Node.js 24.19.0，npm 8.11.0，锁定TypeScript 5.8.3、Vite 7.1.9、Playwright 1.56.1。Node版本满足工程>=22.16.0声明；与历史G1的22.16.0/10.9.2环境分开记录。

| 实际命令 | 结果 |
| --- | --- |
| npm ci --ignore-scripts --no-audit --no-fund | 通过，根依赖从锁安装 |
| npm --prefix web ci --ignore-scripts --no-audit --no-fund | 通过，前端依赖从锁安装 |
| node scripts/check_lock.mjs | 通过，112项，规范化摘要保持aba4e4e…cffcd9 |
| npm run typecheck | 通过 |
| npm test | 83/83通过，0失败/跳过 |
| npm run replay | 3开场×炼制/采购共6条路线通过 |
| python3 scripts/check_docs.py | 5份核心文档、2样例、2预览校验通过 |
| python3 docs/v0.4/tools/check_documents.py | 9文档、47内部链接、30静态算例通过；未重新核验外链 |
| npm --prefix web run build | Vue类型与Vite构建通过；4个输出文件共143263字节，仅为当前预览版 |
| npm --prefix web run test:e2e | Chromium141.0.7390.37下17/17通过，0重试，31.6秒；CI=true，不复用现有服务器 |

首次浏览器尝试提前于安装完成，17项均在launch阶段因缺少chromium_headless_shell-1194而失败；未进入游戏断言。完整Chromium下载完成后安装任务达180秒超时；补装同版本Headless Shell，保留共享缓存。保留首次失败日志，安装完成后先验证可执行文件、实际启动及版本，再完整重跑17项全部通过；没有修改或跳过用例。

已核对相对G1：src、web、package.json、两个锁、tsconfig和scripts均无差异；相对main的整个docs/v0.3无差异。冲突标记、当前新增文档的本地链接与git diff --check通过。

## 固定提交与远端证据

计划文件先行提交：`f21b2c4c2ea27f0180673ad7c50275e5c3507614`。整合实现提交：`4907e1d67f03ca9603b32f6cbf575c96ee6be03e`；其祖先包含完整G1与研究父线。其后的证据记录只修改文档，不改变被测试的游戏或工作流代码。

[PR #10](https://github.com/GOD-OF-PPT/chenyuan-wendao/pull/10)以main为base，覆盖已有PR #1/#2/#9的来源，保留其开放状态。`4907e1d`的[规则CI](https://github.com/GOD-OF-PPT/chenyuan-wendao/actions/runs/38882455654)与[网页CI](https://github.com/GOD-OF-PPT/chenyuan-wendao/actions/runs/38882455542)均success，实际日志核对83/83规则、17/17 Chromium、锁校验、生产构建及文档检查。网页job为`116912188593`，Node22.16.0，与本地环境分开记录；安装三个浏览器不表示执行了三个项目。

- [该提交运行包](https://github.com/GOD-OF-PPT/chenyuan-wendao/actions/runs/38882455542/artifacts/12038520112)：ZIP 57954字节，平台提供的SHA-256为`d7dc87a2152ae0212419527d4574ab81000631ca93b8156dee3f383a544dfaae`。
- [该提交测试证据](https://github.com/GOD-OF-PPT/chenyuan-wendao/actions/runs/38882455542/artifacts/12038007901)：ZIP 1709707字节，平台提供的SHA-256为`ccb894a10728fb570affbfce05dc2671f239785f25ba6912da36e5e90615ed46`。

上述digest来自GitHub元数据，未冒充本地下载重算。附件配置保留90天，属于阶段证据；最终长期交付由T23处理，不把临时附件当作永久发行。

## 剩余边界

- 当前网页仍使用M1/Adventure，src/full接线未实施。
- 已知存档和检查点语义风险在T04—T06处理，不由基线绿灯消除。
- 三浏览器工程与全路线由后续任务交付；当前测试项目只有Chromium。
- 数值为未平衡初值；没有本轮真人反馈或最终视觉确认。
- 只交PR，不自动合并、关闭旧PR、公开部署或发布Release。
