# Q14 当前CI实际终态

2026-11-13。PR58当前验收源`666787985bf3bf148338b593515770b8e8a3a469`，tree `23ff83039d1c8ae2c1f78b0f685196e6e71e65ad`，runtime `93dbc20a3dc9301c8d1cbbdbcef16f2cc4f1078e345416f9b300279ed780b4c8`。本记录先进入main，保功能PR已验收头不因补记改身份；未自动合并。

| 实际范围 | 结果 | 原运行 |
| --- | --- | --- |
| 十核心门禁 | 988/988，全部命令过 | [43428428102](https://github.com/GOD-OF-PPT/chenyuan-wendao/actions/runs/43428428102) |
| 当前完整UI | 198/198，原完整声明逐成员对应 | [43428427727](https://github.com/GOD-OF-PPT/chenyuan-wendao/actions/runs/43428427727)，job131895535152 |
| 完整Native | 471/471，0skip/retry/flaky | 同run，job131895534782 |
| 完整正常路线 | 四片各8/8，精确并集32 | 同run，末端job131901456594 |

六个执行job、正常并集验收与独立core共八作业全部success。原完整声明32、四片编号/来源/实际首跑、无重叠/缺失/替代/跳过/重试均核对；不是将四份摘要相加。下载core/Native/四正常片/合并证明的完整ZIP，逐GitHub SHA256及全成员CRC验证；本地重跑原合并器结果与远端current-normal-coverage逐深完全相同，source均为本源。Core十份日志各长度/hash与验证清单核同；Native原声明/执行再次核471；UI真实controller输出绑定本源198，原始大ZIP仍在artifact14039216083。

逐回合刷新两例仍为原内容/240秒/独立Context/全部每轮Game、CP、原1ms和全库断言；项目两worker保持。实际sword115196ms、talisman177085ms，同worker0顺序且时间不重叠。只证明新调度在本轮完成，不称原一次读取停顿已证DB根因，也不记环境性能认可。

本地原d213的988根/198UI/首片8、079完整471/32与各160/联合报告各保生产身份。首轮193过3红、40分钟取消、Ubuntu26安装失败与9b第4片7过1红保原run/报告；没有重贴绿。图像/规则/成长数值未因CI修复变化。固定1440×900单Chromium范围闭合；原三浏览器、兼容/环境性能、长期/真人/整体美术义务仍开放。

Q14为新组三项第1项；Q15仅合同与红灯，Q16–Q20待实施，完整20目标active。
