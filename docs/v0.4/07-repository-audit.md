# 仓库差距审计与优先问题

审计时间：2026-10-13；固定提交`a49c0b4d0671a75f25c7781e4613de109c232899`，分支`feat/full-demo-g1-g5`。通过GitHub插件实读；不是从对话历史推测代码。证据来源见[R01](sources.md#r01)。本地直接克隆因DNS不可用，本轮未重新运行该提交的游戏构建/端到端测试。

## 1. 当前状态不是“全没做”，也不是“全部完成”

| 阶段 | 实际发现 | 尚不能宣称 |
| --- | --- | --- |
| G1 | 已有标准前端锁文件、check_lock脚本，工作流用npm ci | 不应继续写“锁未入库”；完整交付仍核对同SHA CI与PR依赖 |
| G2 | src/full已有凡人至飞升表、6地点、14物品、12功法、4法宝 | 网页已能使用这些功能 |
| G3 | src/full已有人物事件、问心/三关/END与生平状态 | 浏览器渡劫、持久化迁移与条件回响都已验收 |
| G4 | 正式网页仍使用单幅预览与印记头像 | 已达到认可概念图的实装品质 |
| G5 | 可见既有检查工作流；最新core运行38371541500为success | 新全流程、三浏览器和真人反馈全部完成 |

`main`仍是设计基线`2fd249b6c6d5be88aa4609950f943e6cce119570`，PR #1/#2保持开放。本轮文档分支从main建立，以免文档PR暗中携带未审阅的功能代码。

## 2. 文件证据与风险

以下均为指定提交的静态阅读结果；标“风险”者不是已经复现的故障，不把修复设计当作实现。

### A01 / P0：正式入口尚未使用full引擎

[App.vue](https://github.com/GOD-OF-PPT/chenyuan-wendao/blob/a49c0b4d0671a75f25c7781e4613de109c232899/web/src/App.vue)导入`src/content/m1.ts`和`src/game/adventure.ts`；[store.ts](https://github.com/GOD-OF-PPT/chenyuan-wendao/blob/a49c0b4d0671a75f25c7781e4613de109c232899/web/src/store.ts)仍使用Adventure；[persistence.ts](https://github.com/GOD-OF-PPT/chenyuan-wendao/blob/a49c0b4d0671a75f25c7781e4613de109c232899/web/src/persistence.ts)亦使用旧校验器。

因此后续境界规则存在不等于网页可玩。优先接通三处，再谈新增系统。对应G2-01至03。

### A02 / P0：迁移事件实例硬编码

旧`replace()`将所有activeEvent.instanceId改成新runId加`:temple`。目前旧版只有破庙，不能直接把此逻辑复用到full的人物/问心事件。应按真实event.id重建，并验证非temple导入。对应G2-02。

### A03 / P0：渡劫检查点尚未进入旧适配器

旧execute仅在BREAKTHROUGH保存checkpoint，未处理START_TRIAL；restoreCheckpoint调用replace后删除checkpoint。风险是新终局直接接入后无渡劫准备快照或恢复一次后不再可用。应做独立可复用检查点策略；不是认定当前旧筑基功能已损坏。对应G3-02。

### A04 / P1：三浏览器安装不等于三浏览器测试

[playable.yml](https://github.com/GOD-OF-PPT/chenyuan-wendao/blob/a49c0b4d0671a75f25c7781e4613de109c232899/.github/workflows/playable.yml)安装chromium/firefox/webkit；[playwright.config.ts](https://github.com/GOD-OF-PPT/chenyuan-wendao/blob/a49c0b4d0671a75f25c7781e4613de109c232899/web/playwright.config.ts)只有browserName:chromium且无多项目配置。不能写三引擎覆盖完成。对应G5-01。

### A05 / P1：因果前置只要求发生，不要求具体选择

[events.ts](https://github.com/GOD-OF-PPT/chenyuan-wendao/blob/a49c0b4d0671a75f25c7781e4613de109c232899/src/full/events.ts)的requires是事件ID；[engine.ts](https://github.com/GOD-OF-PPT/chenyuan-wendao/blob/a49c0b4d0671a75f25c7781e4613de109c232899/src/full/engine.ts)availableEvents主要检查choices是否存在。重逢/盟约大多不区分之前是帮助还是拒绝。它证明链能串联，不证明选择有独特后果。对应G3-01。

### A06 / P1：数值初值可能收敛成机械最优操作

辅助固定20灵石，但同境委托收入提高；见闻模板大多8灵石换1材料；不少高阶配方继续索要低阶基础材料。详见[经济审计](03-economy.md)。这是需真实回放验证的平衡与重复风险，不凭静态表宣称玩家一定无聊。对应G2-05。

### A07 / P1：结束原因与存档成功的语义

full RETIRE将ending写为lifespan，即使并未寿尽；旧Store失败后refresh会重新设saved=true，需区分“上次好档可读”与“本次行动已保存”。均应补UI语义和回归用例。对应G3-03及G2-02。

### A08 / P1：美术原件可用，但不是生产资产

本轮已在会话核实两份认可图和hash，见[美术规格](05-art-ux.md)。不要再把原件不可访问作为默认阻塞，也不要将含示例文字的概念图直接用作动态界面。对应G4-01/02。

## 3. 本轮实际验证范围

已完成：公开竞品机制资料核验；上述源文件静态阅读；会话原件元信息核实；新增文档链接与样例检查；经济配置子集算术。未完成：重新运行游戏引擎、npm安装、生产构建、浏览器全流程、真人平衡、原图生产拆分。

代码中的`full-demo.1`与`full-unbalanced.1`是版本标记，不表示已经可公开展示。后续必须使用当前提交证据更新Issue，不将本文快照长期当作实时状态。
