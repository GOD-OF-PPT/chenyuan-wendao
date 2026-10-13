# 尘缘问道

古风文字修仙网页 Demo。**约 30 分钟了解基本玩法，不限定通关时长；境界由物品、修为与选择控制，不按现实分钟发放。**

## 当前可运行版本

本分支 `feat/m1-playable-web` 已实现 **凡人 → 炼气 → 筑基** 的网页测试版本。包含开场选择、修行、四地点历练、采集与委托、交易、三种丹药、剑修/符修意图战斗和 IndexedDB 存档。

这不是完整飞升 Demo。后续境界、完整功法/法宝系统、人物回响与渡劫仍待实现，数值为未平衡初值。美术暂用已认可风格的低分辨率预览与 HTML/CSS；头像是印记占位，不冒充最终美术。

[PR #2：可玩网页](https://github.com/GOD-OF-PPT/chenyuan-wendao/pull/2) 依赖 [PR #1：经济规则](https://github.com/GOD-OF-PPT/chenyuan-wendao/pull/1)，均未自动合并。直接查看 main 仍是设计资料，请切换到可玩分支。

## 启动网页

已验证的构建环境为 Node.js 22.16.0、npm 10.9.2。

```sh
git clone --branch feat/m1-playable-web --single-branch https://github.com/GOD-OF-PPT/chenyuan-wendao.git
cd chenyuan-wendao
npm ci
npm --prefix web install
npm --prefix web run dev
```

打开 `http://127.0.0.1:5173`。默认仅监听本机，不需要配置模型 API、账号或后端。

无需自行编译的方式：从下方已通过测试的 Actions 下载 `chenyuan-playable-dist`，解压到一个目录，在含 `index.html` 的目录运行 `python -m http.server 8080 --bind 127.0.0.1`，再打开 `http://127.0.0.1:8080`。不要以 `file://` 双击 HTML。下载 Actions 附件通常需要登录 GitHub；附件保留 14 天，不是已部署的在线试玩站点。

## 已执行的测试

代码提交：`1bfdf41cf0e94aede71ee8a5ad4438154dd5109e`。

| 检查 | 实际结果 |
| --- | --- |
| 原有经济 + 新增战斗规则测试 | 83/83 通过，0 跳过 |
| 原有确定经济路线回放 | 3 种开场 × 2 条取丹路线通过 |
| TypeScript / Vue 类型检查 | 通过 |
| Vite 生产构建 | 通过 |
| Chromium 浏览器集成测试 | 17/17 通过，0 重试 |
| 资料子集校验 | 5 份核心文档、2 个 JSON、2 个预览校验通过 |

[完整运行记录](https://github.com/GOD-OF-PPT/chenyuan-wendao/actions/runs/38349966408) · [已构建网页](https://github.com/GOD-OF-PPT/chenyuan-wendao/actions/runs/38349966408/artifacts/11790312227) · [测试报告、截图和依赖锁定记录](https://github.com/GOD-OF-PPT/chenyuan-wendao/actions/runs/38349966408/artifacts/11790033037)

浏览器测试通过真实界面完成三种开场 × 两种修法的战斗、炼丹、筑基；另测无战斗采购路线、事件/战斗刷新恢复、写入失败回滚、双击、多标签页冲突、坏档导入、导出再导入、检查点恢复、1440×1000 与 390×844 布局和场景加载失败。不是真人趣味测试或所有浏览器的兼容性认证。

本地运行规则测试与新增模块类型检查；完整依赖安装、生产构建和 Chromium 测试实际运行于 GitHub Actions，并非本地浏览器。前端直接依赖固定版本，本轮解析的 `web/package-lock.json` 在测试附件中；尚未提交前端锁文件，复现同一次构建请使用附件锁文件或下载已构建包，不宣称后续 npm install 能逐字节复现。

## 执行测试

```sh
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
