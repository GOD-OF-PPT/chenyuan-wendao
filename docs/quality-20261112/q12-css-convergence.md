# Q12：样式层与语义调色（本地通过，待递交）

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

9332f12修复阶段实际完成112文件/11,593,151字节构建、10核心/980根通过，未将6c6d5eb原194贴到该阶段。进一步独立复核发现颜色函数color()/hwb()/oklab()/lch()与条件祖先挪用specificity仍可漏过；补实际红后已加强全部CSS颜色函数与media/supports/container等条件上下文（仅忽略统一layer），五项纯行为检查通过。原review-functions-condition-red/green保，新完整构建/浏览器仍待。

## 最终当前结果

冻结清洁`050cf1d05cb8c852305fd5aa1d542cd5c1ebdb4d`：10核心门禁/980根通过；同提交112文件/11,593,151字节构建，运行来源digest `ee089c403158500536e20d153434dc4c78a054f47cbc63bc7333b5ddbc99acb4`。核心首试误在样式浏览器服务仍运行时安装，esbuild.exe出现真实EPERM，原日志保；服务终态后同源码完整重试通过，未清理玩家文件或绕过安装门禁。

| 范围 | 实际终态 |
| --- | --- |
| 当前完整受影响UI | `impacted-ui-050cf1d`195/195，374.711秒，包含原174、Q11的10和Q12的11 |
| 完整正常路线子集 | `normal-two-050cf1d`2/2，130.758秒；原help/sword/craft/transmit及leave/talisman/purchase/depart，不称完整32 |
| 原生回访/丢回复UI | `scheduled-ui-050cf1d`3/3，9.016秒，实际fault入口也核共享palette与计算正文颜色 |
| 当前独立样式文件 | `style-file-050cf1d`11/11，是195子集，不累计增覆盖 |
| 实际合成底色定向检查 | `contrast-current`3/3：场景题注、设置/禁用恢复、真实quota错误/原重试文本，前后整库同；另核键盘焦点与真实SVG回退原色 |

三组有预声明的最终报告逐成员与实际执行相同，0skip/retry/flaky，实际worker0/1；同版loader另读完整use/expect/RegExp/testMatch/timeout/retries。来源/当前构建核同，`*-observation.json`保。Q10的160/联合数值报告各83输入仍同，保64689f5/eab42b8原生产身份，未宣称样式改动后重跑数值。规则、保存、活动周期及新授权没有改动。

e123dc4首轮195为194过1红，只在浏览器序列化selector增加空格/属性引号导致原画分类未匹配；调整测试的等值selector归一化后同点绿，原失败不覆盖，050cf1d再完整195全过。未把真实绘画色重新改成UI token来迁就测试。

最终CSS声明口径98块：UI固定12个角色，另保原SVG画色；连画色总计107种字面量，不能冒全源只剩12。828 important/1021 #app债务未增加，按同文件/选择器/属性及原条件基线只能减少，新增不能挪用。界面颜色由2277口径中的散色归拢，画的95种另列。第一层叠阶段16,606编译声明全同与9PNG精确同/3微差仍保持其阶段身份，未将后续有意调色冒零视觉变化。

最终12既有表面节点/几何/文本与分层原色基线全同；9张050cf1d原尺寸1440×900图实际打开：欢迎、显示设置、NPC、战斗、SVG绘画回退、运行修炼、配方、真实保存失败与封卷主场面。完整所有页面/状态的像素或无障碍认证仍不宣称。两轴最终只读复核未见剩余实质问题，见[审查](q12-review.md)。

本项可递交，完整20目标active；Q14部分未完，兼容/环境性能仍暂停，真人/长期/整体美术未被本轮替代。Q12之后应继续Q13，随后强制Q11/Q12/Q13三任务综合。
