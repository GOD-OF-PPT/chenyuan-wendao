# Q14：守卫归档与可维护源码（实施后验证中）

承接PR47前置和Q13/PR57，合同[0161](../decisions/0161-maintainable-source-and-current-ci.md)已先进入main（3804228）。当前仍13/20项递交，Q14未递交；完整目标active。

## 当前实现

- 删除无当前import/CLI调用者的`idle-matrix-evidence.mjs`（v1–55）。当前package-candidate→candidate-evidence、reproduce-candidate、candidate-receipt均不导入它；原实现/166验证及所需旧输入继续由`test:historical`在691648a冻结检出运行，原签名和失败保Git。图像来源、导出hash和预算门禁继续由current_assets负责，CSS语义纪律保留。
- 当前Action分派改为穷尽类型边界，删除原不可达Store.act/prepareAction/actPrepared；原生测试同时验证这些短写入口缺席和原安排失败/重试/全库。仓库execute有明确旧回执重放/迁移/恢复消费者，保留原协议接口，未冒称死代码删除。
- 删除无静态import、动态glob或组件注册消费的CultivationPanel.vue。旧M1 persistence.ts退出生产src，但作为明确测试fixture保留原类与协议，实际Native旧连接迁移测试改导入fixture；只有相对导入路径与说明调整。旧M1引擎、冻结旧规则、正式FullSaveRepository迁移与execute活接口保留。TrainingPlanner实际入口不变，删除旧组件专属`.cultivation-catalogue`/`.cultivation-budget`样式；同名data-testid属于TrainingPlanner，未删除。
- 另外核对报告明确的battle-actions/equipment-card/equipment-options/loadout-summary：当前全部Vue/TS/MJS无class消费，相关动态拼接实际仅testid、loadout-node及战斗电量，不生成这四类。删除六CSS文件60个必须匹配这些已不存在class的顶层selector；混合`:is`列表仍有活分支的原规则保留，未为清理扩张旧specificity额度。其它动态或未覆盖CSS不凭coverage猜删。
- 当前301份TS/Vue/CSS可读化，排除冻结src/legacy和图像/数据/历史。锁定Prettier3.6.2，提供format:source/format:check。迁移按TS语法、Vue编译render、完整CSS规则顺序/选择器/条件/值核对；括号、等值对象键、同运算符逻辑结合只做语义等值。格式化原工具把SourceFile.text误当语义、CSS原始空白误当不同，保原诊断后修正；不把工具误报记为业务红。
- Vue保留空白的差异实际阻止直接套格式器：CultivationFallback仅先移除原编译器已丢弃的换行间隙，仍核render等值；LifeCatalogue/MarketPlanner/RecoveryPlanner保所有原文字间隙，仅重排标签内部，编译render代码逐字相同，SFC外的prettier-ignore仅保护template，脚本/样式可格式化。最终301份格式检查通过，末轮迁移303记录（含两死CSS记录）无语义差异、无新改动。
- CSS债务按选择器和值语法token比较，格式化不能借其它选择器/属性/条件/文件额度。新增双解析器仅开发工具使用：postcss-selector-parser7.2.1、postcss-value-parser4.2.0和util-deprecate1.0.2，旧锁包完全不变；npm registry/integrity保，锁摘要bba1e5f25f900c116dde302a988012c35db320f051cddd0e3ee0b12391dcc546。新格式等值测试先红后完整六项绿，保字面量内部空白和组合符变更拒绝；绘画值依原逐声明比较，无新全文钉。
- 原候选说明测试中的函数AST hash/工作流全文hash改为真实notes渲染、实际packager控制流到notes的等值bundle与已验证输入，以及变更输入/不同bundle拒绝。合成输入仅工具验证，不是候选包或真人证据。原归档/完整性/重放测试保，旧源hash可由Git查回。
- 自动CI改为十核心门禁和固定1440×900 Chromium的q13完整UI联合、Native、正常32三组；显式检出PR头，逐组即时声明/执行核同并上传实际报告，Node24.22.1。原三浏览器/环境性能/全候选矩阵工作流逐字保存到historical-workflows，当前不自动触发，义务保延期；旧候选包装仍要求原完整矩阵，不能拿三组报告伪造其认证。

## 已有定向结果与剩余验证

11项工具/只读返回/样式与候选说明测试通过；Python候选说明10项通过。fixture最初漏version字段的真工具红与补齐后绿保。首次直接vue-tsc因新检出尚未生成demo-meta失败，随后正式build生成metadata并类型/构建成功，112文件/11,624,925字节；这是dirty阶段诊断构建，不作为最终冻结证据。

1179完整根测试985例为983过2红：扩展性测试依旧minified声明字符串注入；当前instant120报告绑定的源码hash过期。前者改为唯一变量声明的静态对象AST位置注入，原COW/业务/成本/查询断言全保；后者实际重跑120，所有非sourceHashes字段与旧报告逐深完全相同，83个输入成员相同且46个真实hash更新。定向3/3与002c8fc完整985根/十核心通过，原红保。之后追加有据旧M1/60selector清理，最终同源完整检查仍待，不把002c旧生产身份重贴最后源。

独立两轴对1179/002c均无剩余实质问题；规格轴独立直接核284个非计划行为变动文件的语法/编译/CSS等值，没有只复用迁移日志。785清理追加审查发现旧M1仍被原repository.spec动态导入，主控同点实跑1红，保原JSON/trace并恢复为上述测试fixture，不删/跳过原例。首个CLI参数错误未执行报告另保。785根测试另984过1红为仍消费旧dirty build.runtimeSources含已移除源文件的过期构建，须正式同源重建，未松sourceRecord一致性检查。

历史命令本轮实际166/166和旧source/art正向通过，仍691648a身份；785当前idle160实际160/160，联合数值首次缺--report只出调用错误未执行，后续正确新轮另列。仍须最终冻结源后完整十核心、Native、Q13联合UI和正常32、当前表面实看/比较，以及联合数值新身份和审查修复复核，再递交Q13分支的独立PR。远端CI尚未运行，不称绿。旧历史红、暂停专项、真人/长期/整体美术义务不变。
