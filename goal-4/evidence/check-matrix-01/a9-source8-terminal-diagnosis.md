# source8 ART03-A9 原整轮终态核对

已离线核 `full-source8-report.json`：原A9精确状态为 **timedOut，duration61357ms，timeout60000ms，retry0**。第一错误是原总60秒超时；第二错误为 `equipment-objects.spec.ts:123:220` 清理restore的page.evaluate目标已关闭。4份host附件与先前从此run trace提取的资源逐字节相同，未用source5记录替换。full415原报告是413通过/2异常，并非整轮全绿。

运行摘要 `cd3f0d2437384d0fa6d4cef929e6ac963f9e6ef2c212fce5ed9021b4e6836c10`，675输入pre/post严格相同。前三case/retry/receipt已完成；第四fixtureload-ready到达，随后公开relic导航时发生主timeout。其后第四fault与第34张capture属于deadline后继续，第34张没有frame-verified；最终为frame Testended和finallyclosed错误。four-native-error-contexts汇总不存在，第四原retry/receipt/caseverification、其余两张原截图与cleanup-after尚未到。不能计作第四组合通过。

严格区分时钟：raw duration61357ms是Playwright结果记账；host最后62459.281ms是从testbody performance.now原点的相对序列。没有对两套原点/记账做实测校准，不相加，也不拿差值解释成额外产品耗时。判定第四fault/capture发生于timeout之后，依据原trace事件先后，而不是将rawduration换算到host时钟。

当前确认的是总deadline失败及后续清理错误，不是已证生产断言红，也不是超时已修。慢因仍unknown；source5叶子通过不代当前source8，未来source8叶子即使通过也保原失败。当前同源叶子尚待root执行后另核四context/36截图/4行汇总与完整输入身份。A6另由其他agent处理，本记录不代诊断。

原source8提前记录与source5历史保留；新终态原附件副本位于 `artifacts/goal-4/check-matrix-01/a9-source8-terminal/`。没有运行浏览器/测试/构建、看图或修改675输入。
