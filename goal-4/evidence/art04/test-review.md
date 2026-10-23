# ART04 三处旧视觉前提适配审查

2026-10-24。承接主控58317旧74实跑71通过/3失败；该轮原报告未改、不把静态适配视作当前绿灯。本次只改以下三个既有spec中的三个旧视觉前提，未改生产、其他测试、保护13或用户档，未运行UI/build、未提交。

1. `idle-preparation-drafts.spec.ts`的middle shelf例仍完整执行来源定位、月华莲选中、开始、已保存计划回看、第二页、暂停和完整Game/计划不变。原h3精确“月华莲”已不符合真实标题含门槛；现在精确核正式物名+“需”+正式境界整段，并另toHaveText核`.counter-realm`完整门槛，不改成包含或任意正则。
2. `stage-check.spec.ts`的closing future例对未来道蕴与取消未来后凝气草同样严格核物名+完整境界，保留未来开关、当前实架选中、原Game/Activity、frame完整可见/44px/命中/主导航不交叠/无页面滚动等全部断言。其它例及真实交易/服丹/疗养费用、时长未动。
3. `stage-r3-layout.spec.ts`的missing catalogue paintings例保留原native玉简、学习画零请求、已装配状态、另一玉简全文、真实frame和最终完整Game/null Activity。行囊旧supplies画已被InventoryStage替换，因此不伪造data-art-state=failed token：改为该旧画零节点与零请求，核当前herb、实际持有状态、真实选中、目录与大物体两处完整库存、正式说明全文、出售/来源入口enabled和原frame命中。该例证明原生行囊不依赖已退役插画，不证明真实SVG失败；后者仍由新A12实际验证。其它凡人真实学习画失败、四器、全12/14目录、费用与真实30/60秒例均未改。

物名与门槛来源是正式content，要求仍为`toHaveText`精确整段；没有隐藏旧token、补sleep、提升timeout或移除Game/成本/周期断言。AST对比确认三个文件各仅一个原标题的测试正文变化，字面调用标题与数目保持；其余正文逐字相同。字面AST调用数不代表循环展开后的业务数，未据此增加任何覆盖计数。

静态TypeScript语法解析、`git diff --check`及AST范围核对通过。当前UI尚未在本子任务运行；主控将配合“预计单次”生产文案与新A5实际/预估断言后冻结source8，由QA统一当前86实跑。原3失败、A9预期纠正及未执行部分均须保留，不冒称已通过整轮、整体美术、长期或真人验收。

## 原件与路径纠正

主控临时消息把raw路径写为`artifacts/goal4/art04/test-premise-legacy/`；已按原话先保存before/after/hash/minimal.patch/说明。后来明确该路径为笔误，故保留原件并逐字节复制至canonical `artifacts/goal-4/art04/test-premise-legacy/`，不删除或覆盖原件、没有新建goal4目标。项目审查仍写现有`goal-4/evidence/art04/test-review.md`。

| 文件 | 改前SHA-256 | 改后SHA-256 |
| --- | --- | --- |
| idle-preparation-drafts.spec.ts | 2b81d6c050fdd393660ae5e826c7d59939ef9e28205c2257398607f5fd8dd77c | 665a9ce859e93afd1684bcd14451cc16a8966ceb2bb253142eec996af8acf8d2 |
| stage-check.spec.ts | 620210ebeda774a15f27584ff66453eb09446a575af2d72eed639de6a6227889 | eecc293534c806f483fd62e39d3d86feb50a7be86b597405b7ef0900e4605866 |
| stage-r3-layout.spec.ts | 51c00e93d006b91cf032b4f80f6d94223e33836a03d0a73217efca12318f7cf7 | 2538eaacb69df8ec68f59000ae7b0633ab91256690f01b0e65d99c2882ed0407 |


Root交付补记（2026-10-24）：以上为审查当时原记录，保留原输入hash/未执行边界；最终source8 e5560974同一独立86/86通过，声明逐项相等/0skip-retry-flaky，三旧前提与实际59/预计37、两宿主及错误态均当前实测。8当前代表图root已逐张实际审，217/220同源继承与当前9配置/供应7另记；实现92aa57c/实际HTTP与用户只读进度见verification.json和review.md。不代作者新增像素判断或整体艺术/真人验收。
