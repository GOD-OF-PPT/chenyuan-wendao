# 原生精确依赖继承草案

M03 source11原报告真实332/26全过，0skip/retry；原356输入before/after逐hash一致。当前26选中文件及逐file/title/project声明与原332一致，spec、公共配置、锁文件、开发启动链未变。本文只读审计，未运行测试。

AST追踪202个仓库依赖，内部未解析0。24文件298声明的全部83份仓库闭包逐hash一致，故可引用原实际结果；另须当前实际跑local-startup30＋online-recovery4。两者沿fault-app挂App；startup即使服务断言也保守计入共享beforeEach的30。history-ui只挂ActivityHistory，其全部递归依赖未到App/Stage/新组件/改动CSS，不凭文件名判定。

发现并补实一个原356缺采依赖：idle-progression-support实际导入scripts/economy/idle-scenarios.mjs。M03 full-source11前03:21:09及后03:54:18的全输入快照均同hash，覆盖native03:21:43—03:30:03完整窗口，原件与当前亦相同。JSON明确保留这个补充来源，不说原356已采。

实际运行改动为四个旧文件App、ActionFeedbackStage、action-motion、narrative-objects，外加FeedbackSkip；不是五个旧文件加一新件。App现含晚close guard，sha 74ca78abf0b8f34f942430b4ce8dc1a3825df42497441a5a84bbfcf4cf11c778，最终源digest由根代理新构建绑定。web/.generated/demo-meta.ts属于派生身份，只有已排除的App闭包触达。

原报告sha 44b0a2df0a5243723cbb1d6974762c347ddc393fcf96ee39136d00f1b221741a。全部332具名声明、298/34归属及逐依赖hash见JSON。历史未采node_modules二进制hash，故仅证锁文件/版本/启动链一致，不虚构旧安装树字节证明。

根代理当前34实际通过后，准确表述应为“当前34＋M03 source11精确依赖继承298＝332唯一声明”，不写当前332全重跑。原失败/中断报告不改；无兼容、环境性能或用户存档测试。

当前draft已绑定根实际source3构建 0183655fe7530f8afe09536209802bd9b3ecefefec212af931b65f5943a2a9f8，236运行文件与现场逐hash一致；Game/Store/DB/Clock关键30文件均与M03原冻结相同。当前34原生仍待实际运行，未写通过。
