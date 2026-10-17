# 素材来源与当前可回读状态

当前盘点：2026-10-17，T16，基于`7d3d2d8976523ef6d7b068834b49935f6daad141`。机器事实见[asset-manifest.json](asset-manifest.json)，制作合同见[PRODUCTION_BRIEF](PRODUCTION_BRIEF.md)。保留原历史元数据，不把历史曾核验提升为今天可回读。

来源记录：本项目会话中生成、用户选择第三风格并认可三栏主界面的概念参照，依据[ADR-0001](../docs/decisions/0001-approved-baseline.md)与[原资料边界](../docs/decisions/0002-github-onboarding.md)。未引入参考仓库素材。参照认可不是新增开源/发行许可，正式资产拆分与逐项来源/使用证据仍需T18完成；本仓库不据此授予新的许可。

## 当前实际文件（已回读与视觉审阅）

| 路径 | 像素 / 字节 | SHA-256 | 状态 |
| --- | --- | --- | --- |
| approved/style-preview.webp | 320×240 / 6,438 | `8faa981152143910a591dc5d33ed08e90ebd634417eac8db4d0c4df1b701fbfc` | reference，有损、无alpha；含标题/画内文字与已开启天门 |
| ../docs/v0.3/reference/approved_main_ui.webp | 320×180 / 5,900 | `8569f0463d3bdd3a5605e41059630bb0d5540c3a8c08effe48e176d0b7f7e030` | reference，有损、无alpha；整张三栏概念UI，非生产组件 |
| ../web/public/art/scene.webp | 320×240 / 6,438 | `8faa981152143910a591dc5d33ed08e90ebd634417eac8db4d0c4df1b701fbfc` | placeholder，与风格预览字节相同；T17起不再加载，保留来源核对 |

两张认可预览的像素内容不得改变来伪造高清来源。运行副本是占位，不因网页可加载就成为production；不能从带字缩略图切场景/头像。所有游戏文字/数字/按钮仍由DOM/CSS实现。

## 历史高清报告（当前未取得文件）

以下来自原会话`chenyuan-docs-v0.3.bundle`与既有资料记录，**不是当前文件或远端存在证明**：

| 历史别名 | 报告像素 / 字节 | 报告SHA-256 |
| --- | --- | --- |
| 03-new-guofeng.png / 云海问道_青云登仙.png | 1448×1086 / 3,065,190 | `94d3fec4115b35556a4f80abc69c07dd5c5eb928839c030afe16a99d8bab38bf` |
| approved_main_ui.png / 尘缘问道_青云宗试炼.png | 1672×941 / 3,059,902 | `09009d24789b499114f1733bfae0533784d462121c3d57bf19166fff71cea670` |

既有[v0.4原件记录](../docs/v0.4/05-art-ux.md)称当时曾读原图。本轮在当前仓库、所有Git引用的图片/资料包路径中未找到PNG/bundle；已知旧本地commit eb0678268706e5063f3c1c93b60f23be90719c3a在此对象库不可读。五个已知原件/资料包名字的Spotlight精确索引及`/Users/gordon/Documents/Codex`、`/Users/gordon/Downloads`精确文件查找未命中；当前项目已保存附件只有PR，无可回读原图/资料包引用。

查找不覆盖未知云端会话资料包，也不证明原件在所有机器/目录均不存在。未读取无关个人文件内容。原件若可回取，须再次读尺寸/字节/hash后归档；否则在已认可方向内独立新制，保留新的来源与审阅，不能改称旧原件。

## 使用与后续责任

- reference/placeholder只提供当前方向/占位；历史原件缺失、生产槽位planned和已核验文件分别登记。所有规划规格是目标，不是完成或性能通过。
- 无字体文件、音乐或新增未知第三方素材入库。CSS当前系统字体族只记录现状，不据名称宣布发行许可；不复制运行环境字体。
- T17已接地点/阶段/动态DOM，并停止加载带字预览；原生云山/门势由本仓库独立编写，属于呈现降级而非半写实生产图。T18补无字4母版、5肖像、原生套件与真实来源/使用证据。天门opened只在真实trial-ending/ascended，不在早期世界提前表现。
- T19/T20分别验证可访问性/性能；T23打包来源与许可清单；T25保留用户最终展示认可。技术reviewed不等于用户认可，不自动新增开源或发行授权。
