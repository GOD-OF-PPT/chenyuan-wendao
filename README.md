# 尘缘问道

古风文字修仙网页 Demo。**约30分钟了解基本玩法，不限定通关时长；成长由物品、修为、功法与选择控制，不按现实分钟发放境界。**

## 当前实施与可运行范围

当前实施分支为 `codex/goal-1-recovery-matrix`，正式页面使用full规则与数据库v3，事务完成后才显示成功。T08验证四条正常新档至金丹及12功法/4法宝操作；T09已用四条正常新档路线验证双修法/双筹备至化神，并完成本境筹备信息与CHECK-03；完整结果见独立记录。T10建立120组真实经济回放并保护旧档；T11接通沈/裴选项因果、可补救护阵、四人物事实记录和后学剑简，T12补上真实生平、查看/文本导出、归隐/寿尽确认与恢复入口；T13接入渡劫准备清单、固定身份确认与原子入场检查点，两条正常新档路线已到问心；T14接入问心事实回响、三关进度、中断说明和失败耗物/完整恢复确认，结果见独立记录。T15接入两结尾固定确认与飞升封卷，正常24路线×三浏览器与CHECK-05已通过，详见T15记录。数值仍未平衡。T16资产清单已核验；T17三栏/角色/场景/导航和移动阅读顺序已实现并交PR #26；T18已交4场景/5肖像、统一符号与回执表现；T19全界面缩放/键盘/四尺寸与最终同HEAD CI/包校验已交PR #28；CHECK-06已通过。T20已交PR #29与最终四CI/性能/包证据；T21/CHECK-07已交PR #30，最终同HEAD四CI/34检查、354规则/471页面/267 IDB/正常72/30性能与运行包已核对。T22补齐提交后结果交付中断、替换写入失败、清站点再导入，新增20项恢复要求与实际报告门禁；本轮完整结果见独立记录。真实玩家反馈仍未执行。六条三开场×两修法至筑基旧路线保留。目标/来源引导、批量反馈、战斗、旧档迁移与完整检查点恢复均保留。

完整目标和顺序见 [Goal 1 计划](goal-1/plan.md)，逐任务证据见 [任务记录](goal-1/tasks.md)。T01交付 [PR #10](https://github.com/GOD-OF-PPT/chenyuan-wendao/pull/10)，T02交付 [PR #11](https://github.com/GOD-OF-PPT/chenyuan-wendao/pull/11)；当前契约与CHECK-01见 [T03记录](docs/implementation/goal-1-contracts-queries.md)。full已含各境界、功法法宝与终局规则，页面接通共用地点/物品/事件操作；T08功法/法宝与至金丹网页结果见下方记录；T09的元婴/化神成长闭环见独立记录；问心/三关结果见T14独立记录；两结尾与24路线验收见T15记录；正式美术与性能结果见T18/T20记录，真人验证仍为T25；数值为未平衡初值。

`main` 仍是设计资料基线。当前分支继承 [PR #1：经济规则](https://github.com/GOD-OF-PPT/chenyuan-wendao/pull/1)、[PR #2：首境界网页](https://github.com/GOD-OF-PPT/chenyuan-wendao/pull/2)、[PR #9：研究与实施修订](https://github.com/GOD-OF-PPT/chenyuan-wendao/pull/9)及PR #10，并以普通merge接续`feat/full-demo-g1-g5@a49c0b4`。旧PR均保留，未自动合并或关闭。正常新档至飞升的网页证据见T15及本提交CI，纯引擎回放与网页证据分别记录。

## 设计资料

[v0.4 研究与实施细化](docs/v0.4/README.md)包含竞品、目标筹备、构筑、因果、交互和验收建议；[仓库差距审计](docs/v0.4/07-repository-audit.md)是2026-10-13固定提交的历史快照。v0.3原文保留；用户已确认约束优先，研究假设不等同于已实施或已验收。

## 从源码启动

工程声明 Node.js ≥22.16.0；历史 G1 CI 使用 Node.js 22.16.0 / npm 10.9.2。当前任务的实际环境和检查结果单独记录于 [T01实施记录](docs/implementation/goal-1-baseline.md)。不顺带升级依赖，根与前端均从已提交锁文件安装。

```sh
git clone --branch codex/goal-1-recovery-matrix --single-branch https://github.com/GOD-OF-PPT/chenyuan-wendao.git
cd chenyuan-wendao
npm ci --ignore-scripts
node scripts/check_lock.mjs
npm --prefix web ci --ignore-scripts
npm --prefix web run dev
```

打开 `http://127.0.0.1:5173`。默认仅监听本机，不需要模型API、账号或服务端。构建包通过本地HTTP服务运行，不使用 `file://` 双击，也不将 Vite preview 当作生产托管服务。

## 验证

```sh
npm run typecheck
npm run check:content
npm test
npm run replay
npm run replay:full
npm run audit:economy
python3 scripts/check_docs.py
python3 docs/v0.4/tools/check_documents.py
npm --prefix web run build
cd web
npx playwright install chromium firefox webkit
npm run test:e2e
npm run test:persistence
npm run test:journeys
cd ..
node scripts/check-recovery-coverage.mjs web/recovery-report
node scripts/check-journey-coverage.mjs web/journey-report --complete
```

测试自动启动本机4173端口的生产预览服务器，存储模块使用独立4174端口；先构建再测试，正常长路线另用4175，三端口均须空闲。Linux缺系统库时使用 `npx playwright install --with-deps chromium firefox webkit`。三份Playwright配置均实际执行Chromium/Firefox/WebKit；WebKit自动化不等于Safari真机验收，T15已跑正常24路线×三浏览器，T22在最终视觉/偏好版本复验，实际结果见下方记录。

历史 G1 提交 `738d8e985ca468d08cb5fd877e6cf09164b074cd` 的 [网页CI](https://github.com/GOD-OF-PPT/chenyuan-wendao/actions/runs/38492172390) 和 [规则CI](https://github.com/GOD-OF-PPT/chenyuan-wendao/actions/runs/38492172375)通过83条规则、6条经济路线、构建及17条Chromium测试。这是源基线证据；本整合版本的实际结果以T01实施记录和本提交CI为准。

本次整合实现提交 `4907e1d67f03ca9603b32f6cbf575c96ee6be03e` 已重新通过本地83规则/6经济路线/17 Chromium及构建；同SHA的[规则CI](https://github.com/GOD-OF-PPT/chenyuan-wendao/actions/runs/38882455654)与[网页CI](https://github.com/GOD-OF-PPT/chenyuan-wendao/actions/runs/38882455542)也通过。首轮浏览器launch失败与安装超时、启动预检和完整重跑均保留记录。

生产网页用例覆盖三开场×两修法至筑基、采购替代路线、事件/战斗刷新、事务回滚、双击、多标签页、坏档、导入导出、旧档迁移、原件备份、失败重试、重复检查点、两尺寸和图片失败。三浏览器首阶段结果见T06记录；飞升网页结果见T15及本提交CI，真人平衡与最终视觉尚未验收。T07新增目标→配方→材料→来源→返回的真实流程、按目标取材、部分批次扣费、追踪偏好/坏偏好与移动端专项，结果见[T07记录](docs/implementation/goal-1-goal-guidance.md)。

T02新增的`check:content`校验实际来源与引用、当前境界炼制/采购路径及连锁交易获利；`replay:full`执行24组正常纯引擎指令，输出版本与行动序列摘要。规则测试补充12功法/4法宝效果、逐境缺口/恢复和真实旧档转换；这些均不替代正式网页/数据库全流程验收。

T03的[运行契约](docs/contracts/full-runtime.md)规定full-demo.2 / full-unbalanced.1、已知旧档纯转换、退休/寿尽、结构化结果、检查点用途与共享成本/来源查询。CHECK-01本地202规则、24 full回放、17首境界浏览器及构建通过；正常路线账本与T02完全相同，网页产物与T01相同。该阶段的纯转换不代替下述T04真实数据库验证。

T04建立[事务适配与迁移](docs/implementation/goal-1-full-persistence.md)，T05进一步完成[幂等与可重复恢复](docs/implementation/goal-1-recovery-idempotency.md)。T06的[正式接线与CHECK-02](docs/implementation/goal-1-full-ui-cutover.md)切换Store/页面：失败重读保持“本次未保存”，原意图可重试，未知新版本只读导出原件；检查点重复恢复完整快照。详细结果绑定本阶段提交，不沿用父PR绿灯。

## 已认可美术

第三方案：新国风半写实、青黛旧金、暖纸面板。以下是低分辨率参考预览，T17将三栏、角色、场景与导航落实为真实组件，正文与动作保持DOM；T18已接入独立生成的无字场景与透明肖像，配合真实阶段门势、原生图标与可跳过表现；坏图回退到原生场景/印记。T18/CHECK-06本地通过，T25最终视觉认可仍待实际反馈。机器清单区分9原稿、9运行派生与2套原生资产（20个生产文件条目），另保留3份预览/副本、1份编辑输入与2组缺失历史原件，详见[生产素材清单](art/PRODUCTION_BRIEF.md)和[机器清单](art/asset-manifest.json)。

![第三方案预览](art/approved/style-preview.webp)

![主界面预览](docs/v0.3/reference/approved_main_ui.webp)

原件的历史核验见 [美术规格](docs/v0.4/05-art-ux.md)，当前仓库尚未归档高清PNG，不能据历史记录推断原件当前可访问。来源见 [PROVENANCE](art/PROVENANCE.md)。

## 文档入口

| 文档 | 用途 |
| --- | --- |
| [Goal 1计划](goal-1/plan.md) / [任务记录](goal-1/tasks.md) | 当前执行顺序、检查门槛和实际进度 |
| [T01基线实施记录](docs/implementation/goal-1-baseline.md) | 来源、冲突取舍、验证和剩余边界 |
| [T02全境界规则核验](docs/implementation/goal-1-full-rules.md) | 实际配置/行为检查、纯引擎回放与待接线缺口 |
| [正式运行契约](docs/contracts/full-runtime.md) / [T03与CHECK-01](docs/implementation/goal-1-contracts-queries.md) | 状态/版本、提交结果、查询和首组三任务全面验证 |
| [full数据库契约](docs/contracts/full-persistence.md) / [T04记录](docs/implementation/goal-1-full-persistence.md) | 原子事务、旧档/内容迁移与真实IDB模块验证 |
| [T05幂等与恢复](docs/implementation/goal-1-recovery-idempotency.md) | 并发、坏回执、重复恢复、v3升级与只读备份 |
| [T06正式接线与CHECK-02](docs/implementation/goal-1-full-ui-cutover.md) | full Store/最小页面、旧档、失败显示、三浏览器与阶段检查 |
| [T07目标/来源与批量反馈](docs/implementation/goal-1-goal-guidance.md) | 显示偏好、共享缺口、导航不采购、按目标收集与实际回执 |
| [T08功法、法宝与至金丹流程](docs/implementation/goal-1-build-equipment.md) | 双修法/双筹备、学习与配装、真实效果/刷新及失败回滚 |
| [T09至化神与CHECK-03](docs/implementation/goal-1-growth-to-spirit.md) | 本境材料、确定/替代路线、分境刷新/恢复与综合回归 |
| [T10经济账本与版本迁移](docs/implementation/goal-1-economy-ledger.md) | 真实毛收支、120策略路线、修炼取舍、套利/战斗/恢复与未平衡边界 |
| [T11选择因果与人物事实](docs/implementation/goal-1-choice-causality.md) | 三开场回响、同行/竞争/修复、真实护阵、后学剑简与旧档兼容 |
| [T12生平与CHECK-04](docs/implementation/goal-1-life-record.md) | 只列已存事实、精确余寿、预览身份、收卷/重试/恢复及阶段全面检查 |
| [T13渡劫准备与入场](docs/implementation/goal-1-trial-preparation.md) | 必需/可选清单、固定入场意图、完整准备检查点与失败/重复/恢复 |
| [T14问心与三关续行](docs/implementation/goal-1-trial-journey.md) | 真实选择回响、逐关保存、失败耗物、固定完整恢复与重复挑战 |
| [T15飞升结尾与CHECK-05](docs/implementation/goal-1-ascension-endings.md) | 两结尾原子确认、真实封卷、24正常路线和终局全面检查 |
| [T16原件与资产盘点](docs/implementation/goal-1-art-inventory.md) | 现物hash/规格、历史原件缺口、来源许可状态与生产制作约定 |
| [T17真实界面组件](docs/implementation/goal-1-interface-components.md) | 三栏/手机顺序、动态场景/角色/导航、截图与功能回归 |
| [T18生产资产与CHECK-06](docs/implementation/goal-1-production-art.md) | 独立原稿/来源/导出、实际加载降级、40符号/四表现及完整回归 |
| [T19文字/键盘/焦点](docs/implementation/goal-1-accessibility.md) | 四尺寸和完整缩放、模态/文件控件/导航遮挡与同源验证 |
| [T20生产性能](docs/implementation/goal-1-performance.md) | 固定网络/CPU/冷缓存、真实后期档、预算与查询性能修复 |
| [T21本地记录与CHECK-07](docs/implementation/goal-1-local-playtest.md) | 本地记录/脱敏/显示设置、导出快照与阶段综合检查 |
| [T22最终路线与恢复矩阵](docs/implementation/goal-1-recovery-matrix.md) | 20项恢复要求、真实JSON覆盖门禁与正常24路线×三浏览器复验 |
| [试玩与运行说明](web/README.md) | 当前玩法、战斗、存档与本地试玩记录 |
| [工程任务](docs/project/BACKLOG.md) | 已有实现与未完成范围 |
| [资料目录](docs/README.md) | v0.3与v0.4关系 |
| [成长与数值修订](docs/v0.3/05_成长与数值系统修订.md) | 用户认可的成长约束和控制表 |
| [设计规格](docs/v0.3/01_设计规格.md) / [原实施计划](docs/v0.3/02_实施计划.md) | 历史设计基线与阶段 |
| [数据契约](docs/v0.3/03_数据与状态契约.md) / [完整验收](docs/v0.3/04_验收清单.md) | 原子结算、存档和完整Demo要求 |
| [M1可玩记录](docs/implementation/M1-playable-web.md) / [经济原型记录](docs/implementation/M1-economy-core.md) | 历史实现和当时验证范围 |

## 开发与交付约定

所有资源变更经commandId/runId/expectedRevision校验，先原子保存再展示成功。普通突破真实检查修为和消耗物，关键物有当前境界可达的确定来源和替代路线。阅读和离线不耗寿元。规则、内容、持久化与UI分层，动态文字与按钮保持网页元素。

本地存档不等于云档，应导出备份；清理浏览器数据可能丢失进度。新功能通过独立分支与PR，不强推、不自动合并、不公开部署、不修改仓库可见性，不提交凭据、个人存档、字体或未授权素材，不复制参考仓库代码。未擅自增加开源许可证。


开发回归需要Git和系统tar及完整仓库历史：历史兼容夹具会在临时目录执行固定旧提交源码，测试后清理，不提交存档。CI测试作业已采用fetch-depth:0；浅克隆可先执行`git fetch --unshallow`。静态网页运行包不依赖Git。数值版本更新的经济报告按实际BALANCE命名，旧.1基线与.2报告保留，当前审计写入独立current-report.json，已交付.3报告同样保留。
