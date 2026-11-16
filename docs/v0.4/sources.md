# 证据目录与研究方法

统一访问日期：2026-10-13。公开页面可能带缓存，本研究不使用动态价格、评分、在线人数、营收估计或“最新版本排名”。方法是官方介绍/开发者说明/源代码的桌面研究，**没有购买并亲玩全部竞品，也没有真人访谈**。因此“是否好玩、玩家会否留下”均是待验证假设。

## 证据分层

F：来源明确描述的机制；I：本项目对机制的设计推断；H：需原型或真人测试的假设。平台标签和用户评价不等同开发者规格；新闻中的别款游戏推广不当作本作特性。材料引用采用简短转述，不归档整篇网页。

## S01
[想不想修真 · TapTap官方入驻页](https://www.taptap.cn/app/70215)。一手产品介绍支持：修炼境界、门派绝学、炼丹炼器、洞府与寻宝。可检索到2026-06-01更新日志提到一键采摘，但不据此推断所有界面的便利程度。适用：文字修仙成长认知；不证明留存率或难度曲线。

## S02
[修仙立志传 / Xiuzhen Idle · Steam开发者商店页](https://store.steampowered.com/app/1649730/_/)。支持：放置属性成长、境界推进中解锁生活技艺、宗门经营和更后期玩法；开发者将其定位为进度条式修仙模拟。仅分析玩法扩展方式，不把商店描述当作逐帧体验验证，也不复制其全部系统规模。

## S03
[觅长生 · Steam开发者商店页](https://store.steampowered.com/app/1189490/?l=schinese)。支持：修炼行为消耗世界内时间、寿元约束、五行灵气与功法/神通/法宝组合、事件和人物互动。适用：资源准备、构筑与叙事连接；不把它的复杂五行体系或2000年世界规模当作本Demo需求。

## S04
[一念逍遥 · 官方2025-01-06儒修介绍](https://xian.leiting.com/news/626.html)，交叉参考[2025-01-16更新公告](https://xian.leiting.com/news/632.html)。本次正文直读失败，检索返回官方摘录，可确认“文气积累—阈值强化—专属神通”及笔砚机制。**仅作该机制的有限参照，不声称已审计2026完整版本或新手流程。**

## S05
[Melvor Idle · Steam开发者商店页](https://store.steampowered.com/app/1267910/Melvor_Idle/)。支持：生活技能彼此关联，资源服务战斗与装备，银行/物品系统、离线成长。采用资源互相支撑的思想，不采用20余技能、海量物品与现实离线收益的规模。官方Wiki入口读取失败，细节未以Wiki推断。

## S06
[A Dark Room · 原作者浏览器工程README](https://github.com/doublespeakgames/adarkroom/blob/main/README.md)，[room.js](https://github.com/doublespeakgames/adarkroom/blob/main/script/room.js)（本次读取blob `49802b4a9b70cda977f29819147438669fdbb4dd` 的前100行）。支持极简文字形式、现实冷却与资源制作的存在；不把冷却机制借入本项目。

## S07
[A Dark Room · Steam版本开发者介绍](https://store.steampowered.com/app/2460660/A_Dark_Room/)。支持从有限选项逐步展开故事和资源管理、以环境线索叙事。**这是移植版本介绍，不与开源浏览器版逐项等同**；据此提出渐进引导，而不是声称测量了其开场时长。

## S08
[修仙世界模拟器README](https://github.com/4thfever/cultivation-world-simulator/blob/main/README.md)（blob `ed82f199c59c168f8da07a39dff9c02fbc1ed840`）。支持天道视角、规则与LLM共同驱动、角色关系和涌现叙事。它是工程/世界表现参照，不是同等单人短内容产品。

## S09
[参考仓库LICENSE](https://github.com/4thfever/cultivation-world-simulator/blob/main/LICENSE)（blob `91ba33ca7cd4d867cda30b5dbce30409dc14d1f3`），[CC BY-NC-SA 4.0官方说明](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans)。参考仓库许可不是默认宽松商用许可；本项目只借鉴概念，复制代码/素材前另行核实授权。此处是工程风险提示，不作具体用途法律结论。

## S10
[npm 10 · npm ci](https://docs.npmjs.com/cli/v10/commands/npm-ci/)。锁文件必须与package.json匹配；不匹配时失败，不自动改写锁。依赖固定不等于跨操作系统构建字节完全相同，验收必须记录运行环境。

## S11
[MDN · Using IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB)，[IDBTransaction](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction)。事务生命周期与成功/中止事件支持原子写入设计；complete不等于在所有浏览器/断电情形下永久落盘。

## S12
[MDN · Storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)。支持本地配额、数据回收和存储失败风险；必须提供导出备份，不把浏览器存档承诺成云备份。

## S13
[Playwright · Browsers](https://playwright.dev/docs/browsers)，[Web server](https://playwright.dev/docs/test-webserver)。支持配置实际浏览器项目及测试服务器。安装浏览器二进制不等于运行了该浏览器；WebKit引擎测试不等于全部Safari真机验收。

## S14
[Vite · 静态构建与部署](https://vite.dev/guide/static-deploy.html)。支持dist、base路径与本地preview用途；本轮不进行公开部署。

## S15
[W3C · 文字对比度](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)，[目标尺寸2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)。普通文本4.5:1、大文本3:1；目标尺寸最低标准有24×24 CSS像素及例外，本项目另取主要按钮44×44的设计目标，不把44误称该条AA标准。

## S16
[用户提供的桌游数值讨论](https://www.reddit.com/r/tabletopgamedesign/comments/v75py8/comment/ibjdalh/)。作为行动/物品价值预算的非规范性思路保留，不从论坛观点推导本游戏已平衡。商业竞品结论不依赖该评论。

## S17
[用户提供的知乎文章](https://zhuanlan.zhihu.com/p/611828099)。本次全文访问失败，未用其未读取公式支持任何设计或数值结论。

## R01
[本仓库审计快照](https://github.com/GOD-OF-PPT/chenyuan-wendao/tree/a49c0b4d0671a75f25c7781e4613de109c232899)。通过GitHub插件读取分支、PR、Issue、源文件与工作流。具体文件和观察在[差距审计](07-repository-audit.md)列出。本地直接克隆因DNS失败；本轮没有重跑该提交游戏构建或浏览器测试。

## 研究限制与下一轮

不使用转载下载站、第三方营收估计或少数评论概括玩家总体。当前结论是可执行设计假设，不是市场成功证明。下一轮先对我们自己的同一版本做真人观察，记录目标理解、无决策重复、两种修法差异及因果记忆；再决定是否增加内容。
