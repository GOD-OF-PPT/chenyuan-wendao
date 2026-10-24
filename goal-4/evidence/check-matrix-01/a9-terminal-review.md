# ART03-A9 同source5终态证据复核

原full与唯一原例叶子的4份before/after快照675个输入逐项完全相同，运行摘要均 `2ef1fcd1532f6815bdd5402cff363d9a8f24dedd6da115c65dbdd3c348c4b05d`。原A9、公共helper、36张截图调用、四context、全部断言和60秒总限都未修改；没有实施此前0.288秒分页绕路建议。

原 `full-source5-report.json` 的A9明确为 **timedOut，60713ms，timeout60000，retry0**；原错误先是总60秒超时，再是第四newPage的Test ended。其3份host JSON与我从原trace提取的资源逐字节完全相同。前三段已验证33张（15+15+3）及原retry/回执，第三清理60.464秒后第四业务未到；原失败与缺失第四汇总不能抹去。完整full报告为411通过/3异常，不是414单轮全绿。

独立原例 `a9-source5-report.json` 明确为 **passed，49606ms，timeout60000，retry0**，无error。全四上下文实际具备context-created、fault-verified、retry-outcome-observed、receipt-verified、case-verified与cleanup-after，没有cleanup-error。两个learning上下文均12次read-skill-before/after。4份累积host附件前缀一致，最终four-native-error-contexts确有learn/forge × acceptance/cycle四行、4个独立原command、pageErrors均为空；原最终rows.length4断言也已到达。

| 原上下文 | 叶子case-verified | cleanup-after | 原截图 |
|---|---:|---:|---:|
| learn acceptance | 17.314秒 | 19.527秒 | 15 |
| learn cycle | 35.625秒 | 37.520秒 | 15 |
| forge acceptance | 42.669秒 | 43.692秒 | 3 |
| forge cycle | 48.221秒 | 49.158秒 | 3 |

36个frame-before/captured/verified名称及顺序完全相同。对应36个原PNG均实际存在并逐hash保留，完整清单及原host/four-row附件在 `artifacts/goal-4/check-matrix-01/a9-terminal-source5/`。只核文件/附件完整性，没有把36张hash检查当作36张像素亲审。

这次叶子提供原A9的当前同源工程证明；它与原full失败是两个实际执行身份，只对应同一业务声明，不能增加覆盖数或重写full结果。耗时变化的根因仍unknown，随后通过不证明原超时已修复，也不将其归咎产品、DB或环境。B1与MF1两项另由其他审查处理，本记录不代签。仅新增证据，未运行测试/浏览器/构建或改675输入。
