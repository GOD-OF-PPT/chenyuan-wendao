# 尘缘问道

古风文字修仙网页 Demo。**约 30 分钟了解基本玩法，不限定通关时长；境界由物品、修为与选择控制，不按现实分钟发放。**

## 当前可运行版本

本 G1 分支 `feat/g1-locked-playable` 继承 PR #2 的可玩版，补齐可复现依赖安装。继承的玩法已实现 **凡人 → 炼气 → 筑基** 的网页测试版本。包含开场选择、修行、四地点历练、采集与委托、交易、三种丹药、剑修/符修意图战斗和 IndexedDB 存档。

这不是完整飞升 Demo。后续境界、完整功法/法宝系统、人物回响与渡劫仍待实现，数值为未平衡初值。美术暂用已认可风格的低分辨率预览与 HTML/CSS；头像是印记占位，不冒充最终美术。

本 G1 分支以 [PR #2：可玩网页](https://github.com/GOD-OF-PPT/chenyuan-wendao/pull/2) 为基底，PR #2 依赖 [PR #1：经济规则](https://github.com/GOD-OF-PPT/chenyuan-wendao/pull/1)，均未自动合并。直接查看 main 仍是设计资料，请切换到可玩分支。

## 启动网页

已验证的构建环境为 Node.js 22.16.0、npm 10.9.2。

```sh
git clone --branch feat/g1-locked-playable --single-branch https://github.com/GOD-OF-PPT/chenyuan-wendao.git
cd chenyuan-wendao
npm ci
node scripts/check_lock.mjs
npm --prefix web ci
npm --prefix web run dev
```

打开 `http://127.0.0.1:5173`。默认仅监听本机，不需要配置模型 API、账号或后端。

无需自行编译的方式：从下方已通过测试的 Actions 下载 `chenyuan-playable-dist`，解压到一个目录，在含 `index.html` 的目录运行 `python -m http.server 8080 --bind 127.0.0.1`，再打开 `http://127.0.0.1:8080`。不要以 `file://` 双击 HTML。下载 Actions 附件通常需要登录 GitHub；本 G1 流水线附件配置保留 90 天，不是已部署的在线试玩站点。

## 已执行的测试

G1 构建基线提交：`d6b1f75aefee3ea1ecb75138385bb318538ef75d`。该提交的两个工作流已成功；后续提交须使用自己的 CI 记录。

| 检查 | 实际结果 |
| --- | --- |
| 原有经济 + 新增战斗规则测试 | 83/83 通过，0 跳过 |
| 原有确定经济路线回放 | 3 种开场 × 2 条取丹路线通过 |
| TypeScript / Vue 类型检查 | 通过 |
| Vite 生产构建 | 通过 |
| Chromium 浏览器集成测试 | 17/17 通过，0 重试 |
| 资料子集校验 | 5 份核心文档、2 个 JSON、2 个预览校验通过 |

[G1 网页 CI 成功记录](https://github.com/GOD-OF-PPT/chenyuan-wendao/actions/runs/38367640849) · [G1 核心 CI 成功记录](https://github.com/GOD-OF-PPT/chenyuan-wendao/actions/runs/38367640840) · [G1 构建包](https://github.com/GOD-OF-PPT/chenyuan-wendao/actions/runs/38367640849/artifacts/11797581558) · [G1 测试证据](https://github.com/GOD-OF-PPT/chenyuan-wendao/actions/runs/38367640849/artifacts/11797627067)

浏览器测试通过真实界面完成三种开场 × 两种修法的战斗、炼丹、筑基；另测无战斗采购路线、事件/战斗刷新恢复、写入失败回滚、双击、多标签页冲突、坏档导入、导出再导入、检查点恢复、1440×1000 与 390×844 布局和场景加载失败。不是真人趣味测试或所有浏览器的兼容性认证。

本地运行规则测试与新增模块类型检查；完整依赖安装、生产构建和 Chromium 测试实际运行于 GitHub Actions，并非本地浏览器。`web/package-lock.json` 已入库，并通过 `scripts/check_lock.mjs` 检查 registry、integrity 和规范化锁摘要；CI 使用 `npm --prefix web ci`，不用旧附件取锁。G1 相关验证已在相同提交的 Actions 成功，但未执行 Safari、Firefox 或真人平衡测试，且 G1 仍需 PR 审阅。

## 执行测试

```sh
node scripts/check_lock.mjs
npm ci
npm --prefix web ci
npm run typecheck
npm test
npm run replay
npm --prefix web run build
cd web
npx playwright install chromium
npm run test:e2e
```

Linux 缺系统库时用 `npx playwright install --with-deps chromium`。浏览器测试自动启动 4173 端口的生产预览服务器。

## 文档入口

| 文档 | 用途 |
| --- | --- |
| [试玩与运行说明](web/README.md) | 安装、试玩路径、战斗、导入导出 |
| [可玩版实施与测试记录](docs/implementation/M1-playable-web.md) | 本次代码、证据和剩余边界 |
| [当前任务](docs/project/BACKLOG.md) | 已完成与待实现 |
| [成长与数值修订](docs/v0.3/05_成长与数值系统修订.md) | 成长约束和控制表 |
| [设计规格](docs/v0.3/01_设计规格.md) | 完整 Demo 目标 |
| [实施计划](docs/v0.3/02_实施计划.md) | 阶段与依赖 |
| [数据契约](docs/v0.3/03_数据与状态契约.md) | 最终状态与存档约定 |
| [完整验收清单](docs/v0.3/04_验收清单.md) | 全部 Demo 尚待验收 |
| [M1 经济原型记录](docs/implementation/M1-economy-core.md) | 上一阶段的历史记录 |
| [美术基准](art/README.md) | 已认可概念与预览 |

## 开发与资料边界

规则、内容、存储与 UI 分离；所有指令校验 commandId / runId / expectedRevision。保存事务完成后才发布新状态；失败显示错误。浏览器清理数据可能丢失本地进度，应导出备份。没有服务端同步或防作弊保证。

仓库保持项目负责人创建时的 public 可见性。通过 GitHub 插件提交和正常推进分支，不强推、不自动合并、不公开部署、不提交凭据、字体或个人存档，不复制参考项目代码。

高清美术与完整历史原件尚未入库。当前预览不等于原件归档完成；来源见 [art/PROVENANCE.md](art/PROVENANCE.md)。未擅自增加开源许可证。
