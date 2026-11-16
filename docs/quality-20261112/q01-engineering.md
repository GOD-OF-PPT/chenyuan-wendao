# Q01：恢复可验证的工程基线

实施分支 `codex/quality-review-q01`，基线 `97c10d1`。本项对应综合报告11；全部20项仍按 plan.md 跟踪，目标保持 active。

## 已实施

- 必要历史输入的传递闭包为344文件/7,693,598原始字节；从删除前 `c7190e6` 提取，4,703,724字节ZIP与逐文件Git blob/字节/SHA清单归 tests/fixtures/legacy-goals。离线启动生成旧工具需要的忽略路径；不整目录恢复、不依赖远端、不改历史报告。完整内容先验证，冲突文件/链接拒绝覆盖。
- .gitattributes统一LF、二进制保字节。工作区1,521个CRLF文本还原Git中的原始LF，除本项明确改动外不产生内容diff。
- alternates改POSIX路径与明确LF；演示节点暂存改为输出同目录；经济报告用原生路径比较；HTTP/未知文件测试在Windows用目录junction保实际越界链接验证，不跳过整组测试。
- 额外实测发现并修正：打包资料UTF-8/LF；Windows直接执行npm.cmd失败，改运行真实npm-cli.js且保参数边界；核心Python选择已激活环境；资源测试临时目录与源同盘，文本夹具明确UTF-8/LF。原负例与断言不放宽。
- npm run test:setup显式准备根与web两份锁，CONTRIBUTING说明根测试含Vue集成模型、Python UTF-8模式与固定范围。没有隐藏跳过缺依赖的测试。

## 已有结果与原始失败

本轮日志在 artifacts/quality-20261112。原测试/报告全部保留，不能把中间失败改为通过：

- preflight-trial-red.log：原始缺second-scope-review.json的故障复现。
- fixture-after.log：完整两个缺历史输入的测试文件166/166通过。
- platform-before.log / platform-after.log：EPERM原红；路径/跨盘/HTTP三文件13/13通过，无skip。
- root-first.log：Node22.16实际1094测试，1091过/3红；原默认编码、alternates CRLF及新输入校验顺序问题。root-targeted*.log保留各次修复错误与末次8/8通过。
- documents-first.log：原824资源测试实际9失败/355错误，跨盘hardlink与默认文本行尾；原件保留。art15-targeted.log：修正47处文本夹具写法后7/7通过。
- Node22.16与Pillow12.3位于本轮artifacts独立工具目录，未全局升级或重装用户环境。

## 本项收尾门槛

尚需同一冻结源码的完整十项核心门禁、生产构建、固定Chromium测试收集/必要运行，以及规范/需求双轴审查。远端原16项兼容/性能矩阵仍暂停，不因本项递交自动触发；提交使用skip ci，远端“全绿”未经运行不能声明。

双轴首审提出并修复：夹具完整写入同目录临时文件后独占发布，增加并行启动实测；POSIX/有权限环境保原文件与悬空symlink，无权限Windows保junction且在独立HTTP服务仅模拟nested/index的路径解析结果。移除实际服务第二道index边界检查的临时副本确实得到200而使原404断言失败（index-boundary-mutant.log），不把目录junction冒文件链接实测。原样源12测试通过（review-fixes.log）。

首次冻结十门禁在install阶段被已有5311试玩服务器占用的esbuild.exe阻断（core-frozen-c66/validation.json），不是测试通过。当前工作区依赖已恢复、两份锁无变化；后续使用独立检出完整运行，不停止已有试玩服务。

冻结1137296在独立检出实际通过根1096（0 skip）、类型/内容/两回放/经济；824资源例完整806.125秒后为811过、13错误，原件保core-1137296/documents.log。其中11为无文件symlink权限，2组为动态拼出的4份UX27/UX29原输入缺失。补后输入闭包为348文件/7,874,816原始字节、4,752,957字节ZIP，未修改旧输入。首次13例定向包含新增helper且漏TA08，随后补完整定向15例（旧13＋新增2）通过；审查又发现父目录junction会使兄弟文件先拒绝，故这些结果仅保为该版本历史，不能冒原逐文件别名义务等价覆盖。

同一1137296另份干净检出已通过生产构建（112文件/11,273,473字节）、1080项当前UI声明收集（0错误）及9个实际Chromium用例24.381725秒（ART27 A1–A4、ART29 A1–A3、store-sync两例），0跳过/重试/失败。含减动效的ART27 A5、ART29 A4整例在执行前延期；声明收集不是1080实际运行。40个PNG实际解码均1440×900，尚未全部实看。构建有原有约1MB JS/494KB CSS大chunk警告，留Q12/Q13，不上调预算。1137296仍为上述产物的真实生产者；后续仅测试/fixture变化不得冒换生产身份。

本项不改变Game/费用/时间/活动规则或UI；后续八个UI问题、文案、数值、离线等19项均未因此完成。

最终修正：支持环境仍用原生文件symlink；受限环境仅为指定文件提供resolve/is_symlink文件系统替身，兄弟路径保持真实，验证器不改；目标未真正被检查即失败。取消junction命令壳和父目录移动，新helper另测含&/%路径、兄弟正常、错误先拒兄弟及越界根。最终完整定向16例＝旧13＋新增3通过（resource-targeted-single-file.log），根夹具并发/链接测试亦通过。Windows这11组文件链接不是原生OS链接实测，不能冒认证或跨平台矩阵；Linux/有权限环境保原生用例。最终827资源全套仍待实跑。

## 最终结果与交付

实现冻结 **691648a357e6ffb5cd431a029782cc366dd442b2**，树fe5ae8daa62def9e8a74e2b057a0d9348cc44369。以下均为该实现的干净独立检出，资料收尾提交不会改换生产身份：

- `node scripts/validate-core.mjs artifacts/quality-20261112/core-691648a`：lock/install/typecheck/content/tests/m1/full/economy/documents/design-documents十项全部exit0；根1096/1096，0失败/中止/跳过/todo；资源827/827（1634.924秒），无skip，v0.4文档通过。source.dirty=false。
- `node --experimental-strip-types scripts/build-web.mjs`：通过，112文件/11,273,473字节；完整build.json已另存唯一build-691648a目录。原1137296的默认build.json被新构建替换，其原stdout与UI报告仍在；不声称保有旧完整manifest。
- 当前固定桌面UI声明完整收集1080项、0错误，source=691648a；收集不充实际执行。实际ART27 A1–A4、ART29 A1–A3及store-sync两例9/9，38.923339秒，0跳过/失败/重试。ART27 A5/ART29 A4混合减动效整例事前延期。
- 当前40 PNG全部解码为1440×900，直接实看quota-keeps-cold-object-and-all-controls.png与stored-core.png两张，其余38本轮未逐张看。原图位于独立browser检出的artifacts/quality-20261112/ui-results-691648a，不冒整体艺术或真人评价。
- 规范轴与需求轴最终均无未解决实质问题；原并发、链接分支、父别名先拒兄弟与shell路径问题均保审查链并修复。有限C端/代码/安全审查仅覆盖本项工具/输入与九例实际流程。

核心与JSON/构建记录已汇入主工作区artifacts/quality-20261112；原失败、错误解释、16项定向记录均保留。bbf319f旧校验因其父别名方案已被判定不能满足逐文件义务，在核对原node命令/PID后终止（实际exit1），部分log保留为未完成，不计826通过、不冒纯自然失败。原5311试玩服务未停止。

交付：[PR46](https://github.com/GOD-OF-PPT/chenyuan-wendao/pull/46)，基线codex/goal-4-online-recovery/97c10d1，独立分支codex/quality-review-q01；远端原16项矩阵未重跑，兼容/环境性能仍暂停。构建原有大chunk警告留Q12/Q13。全部20项仅Q01达到本地验证与PR递交，三任务计数1/3；后续19项与整体真人/长期/美术仍开放，原生goal继续active。
