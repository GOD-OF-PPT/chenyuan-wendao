# Q12：样式层与语义调色（进行中）

依据先发布main的[0159合同](../decisions/0159-css-cascade-and-palette.md)，承接Q11/PR55。完整报告项已递交11/20；Q12尚未交付。工作区chenyuan-quality-q12，分支codex/quality-q12-css-convergence。

## 两阶段与已发生证据

样式盘点口径为直属web/src CSS及Vue style块，排除SVG绘画与JS style。原有828 important/1021 #app出现/2277种hex-rgb字面量；数量不能与原报告其它口径直接相减。

第一阶段把相互竞争的全局/组件作者样式放在同一game层，97块/16,097条源声明顺序、选择器、值和重要性核同；Vue/Vite实际编译后，去掉层容器的16,606条声明序列与冻结0b3f6c4无层对照完全相同。src-stage的前置import保合法普通import，ta08自身进入game层，不建立game.game意外子层。当前CSSOM实际无层外作者selector，原未分层的真实红保。

实跑12表面，正式分层9/9、冻结无层对照8/8（不运行仅“已分层”断言）。最初两次动画/transition的宿主时点细差保留，后用真实游戏内及系统减动效、原page.clock并等300ms原生过渡重取，未pause/seek动画或改奖励时钟。所有节点/几何/计算样式相同，仅图片URL为4197/4196同路径origin；9张PNG逐字相同，战斗/战策/运行修炼分别7/10/46像素边缘差。纯无层重复运行也有战斗7与修炼124像素差，因此不把12张冒精确PNG相同。原比较与宿主波动证据保于artifacts/q12-css，不放宽旧断言。

第二阶段将界面声明映射到12个语义角色及其透明/渐变派生，保主题既有别名；新增palette.css，画内SVG不改。第一候选4b19d5b生产10/10通过，12表面节点/几何/完整文本逐项与分层原色相同，四张当前PNG已实际打开（欢迎/运行修炼/战斗/保存失败），颜色变化明确是本阶段设计，不能冒第一阶段零色差。

palette-first实际不透明文字对比探针发现未填剑印把line当文字，仅4.165:1；已候选改用muted，填充时用raised背景、ink文字，保真实剑/符印数值与边界，尚待新构建复核。探针只覆盖已知不透明背景，不冒全部场景合成对比通过。

## 当前后续

新样式检查按声明/选择器/语义role而非整文件hash/逆变换/字节帽，当前纯检查2/2过；12种字面量只在palette角色定义，既有important828/#app1021未增长。还须把依赖与检查接入可复现门禁、实际当前对比/焦点/危险状态、完整受影响UI与独立双轴审查、PR。

本工作区依赖目前是指向Q11的junction，不能直接npm ci；先核link并仅移除link后再独立安装。全部20项目标active；兼容/环境性能仍暂停，真人/长期/整体美术未被本阶段验证替代。

## 6c6d5eb冻结结果与审查修复中

上述依赖链接已核后只移除junction，Q12已独立安装。清洁6c6d5eb同源112文件/11,596,428字节构建、10核心门禁/977根、完整194生产UI（381.590秒）、两条正常完整路线及3原生UI全部通过，0skip/retry/flaky。它是独立审查修复之前的冻结候选，不能代表接下来的源码。

独立Spec指出两项P2：颜色检查漏named color，所有文件共用总specificity帽可挪用旧额度；调色误改ScenePanel/SourceMaterials实际SVG绘画着色。Standards另指出palette只由main导入，实际独立fault App不挂main而变量未定义，以及工具依赖应明确而非内部传递路径。原审查与其已测边界保，Q12未递交。

当前已补真实red：新增red/rebeccapurple与跨selector/新文件挪重要性负例，旧检查3项中2红；修后按Git77a8a39仅解析同文件/选择器/属性的旧specificity多重集、不钉字节/色值，named-color按显式工具依赖识别，3/3通过。新增真实fault App变量断言先红，再把palette合法前置import放shared style.css后同例绿。新工具显式依赖PostCSS8.5.30、Vue compiler3.5.44、color-name2.0.0已锁并安装，公开入口由web/style-tools.mjs转出；锁整体审查与原check_lock更新仍待。

实际SVG声明审计已从3443283前调色AST收集，待恢复绘画色并让检查明确区分画与界面，不能为凑12种把画色也抹平。当前这些修复尚未提交/最终验证，不借原194绿关闭审查；执行状态和原件在artifacts/q12-css。

后续候选已按真实SVG消费范围明确file/selector/property画色清单，恢复ScenePanel、SourceMaterials、RelicInscription及ta08/ta09物件的97条原绘画声明（含继承color与纯绘画shadow），界面文字/按钮/焦点与通用图标不获豁免。五项样式行为检查通过，额外逐画色声明与3443283原AST相同；不钉整文件或其它代码/样式。生产CSSOM调色检查同步只排明确绘画属性，不能把全部stroke当画。

新增工具依赖已明确为reviewed版本并由公共包入口导出。逐项核旧lock全部包记录不变，仅增color-name2与三项显式devDependency，完整registry/integrity检查保；check_lock更新为实际审过新摘要6be5d36f…并通过113条，不随意删除锁核。当前类型检查通过，下一仍须修后清洁生产构建/完整回归与独立复核。
