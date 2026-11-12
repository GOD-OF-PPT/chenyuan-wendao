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

本项不改变Game/费用/时间/活动规则或UI；后续八个UI问题、文案、数值、离线等19项均未因此完成。
