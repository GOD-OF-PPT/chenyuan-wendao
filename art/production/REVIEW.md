# T18 生产资产技术审阅

2026-10-17。本记录绑定下面文件hash；为Codex实际生成/解码/页面截图审阅，不代表用户T25最终认可或法律许可结论。9份选中原稿（4场景/5肖像）和1份保留编辑输入逐字节匹配内置image_gen默认原件；完整解码与alpha分布见[verification.json](verification.json)，提示词/工具回执见[receipts](receipts)。没有使用低清参照放大或复制字体。

## 实际检查

- 四场景原稿逐张查看：山野雨后/聚落/古境/登仙台，未发现烘焙文字、数值、按钮或水印。云台前版保留为编辑输入；选中版是闭合双门的中式牌坊，取代形制不一致的三角顶原生主表现。活动母版仍为4。
- 五肖像原稿和暖纸实际页面已查看：主角中性修法、沈药修、陆引路、裴同辈、砚守碑；没有把画面提案写作身世/年龄/盟友事实。头肩/发缘清楚，主体软蒙版alpha主要252—253，运行版0—254，不强行归一为255；透明和近不透明区域均有实际像素检查。1280/1440/1920与390页面留白/裁切、事件/NPC/战斗/行囊的本轮截图已查看。
- 40原生符号的实际外链渲染汇总图已查看，笔触/边角一致，无字体/嵌入位图/脚本/烘焙正文。名称与费用继续DOM。保存/帮助/关闭/返回/恢复/导出有真实用途；关闭/帮助保留可见文字，图标失败不留下必要空操作。
- 新版牌坊的closed/storm/opened三态移动截图与WebKit开启截图已查看：关闭门身来自原图，光面/雷光只出现于真实阶段；门洞sourceHash/坐标与cover裁切绑定。失败加载的原生中式门也有实际截图和真实问心/第一关操作。
- 斗法剑/符、普通突破及入道/渡劫表现已有实际页面与截图检查；只在已提交、当前身份且非重放回执后显示。保存/校验失败取消成功演出，跳过与降低动效不改Game。技术测试结果另见[实施记录](../../docs/implementation/goal-1-production-art.md)，不以截图代替业务回归。

## 本次审阅文件

| ID | 路径 | 字节 | SHA-256 |
| --- | --- | ---: | --- |
| scene-wilderness | `web/public/art/scenes/wilderness.webp` | 254774 | `3d07a4455e766b67c0eeae6b54b8373a3a64242e6ab952f16f6234bbfc0aae35` |
| scene-settlement | `web/public/art/scenes/settlement.webp` | 253904 | `f317b1cee05a456eaf5c19d779aa446a9489cc90b78a937f5bbefa6c638328b2` |
| scene-secret | `web/public/art/scenes/secret.webp` | 279296 | `375d61a2b3701de62085ad8d8697c813bfcb5038420d5a864a65f3dc1fb550b9` |
| scene-terrace | `web/public/art/scenes/terrace-v2.webp` | 182204 | `76bbc4ecff4469cfa5e01f7ba182074e6fc70836d9fc9c0b4545afc7208ef45d` |
| portrait-player | `web/public/art/portraits/player.webp` | 62438 | `0c2faca3fd95f303cc4ed0e22169f13be1806066a22f56880cc7bbd3e009f1e6` |
| portrait-shen | `web/public/art/portraits/shen.webp` | 63360 | `7fb1e08bec233fa3ba11f8f56dd645e3772738e80946990ddb0eb8f97b08ba52` |
| portrait-lu | `web/public/art/portraits/lu.webp` | 60432 | `f3205ef5fc424896898efe8dca19e8871762636c7bb82c7136eea44fd638dff4` |
| portrait-pei | `web/public/art/portraits/pei.webp` | 65460 | `0a1b64def5cd7200a291af8b98790d07048c190318bd4efbee1081bd6c284ad8` |
| portrait-yan | `web/public/art/portraits/yan.webp` | 62270 | `0f68e57915cfa22ef10a88699171ab5aca3889d9e66f1d6d0c8d087f7a04bc52` |
| native-ui-kit | `web/public/art/ui-kit.svg` | 9046 | `327d1cdc5a214653ce3146e129a660fc8c985d8a36c07b8e16e999528a6e39ee` |
| native-fx-kit | `web/src/ActionEffects.vue` | 3588 | `c7f3b0020e33d1e7966c82d7bc68d3dc9f0ae80b8bae9081e50a0e55743486a6` |
| scene-wilderness-master | `art/production/scenes/wilderness.png` | 3095096 | `b0334ce39ae5aa0b922908d182ce85e2c3b09097b4407d90de1542d7546de5f9` |
| scene-settlement-master | `art/production/scenes/settlement.png` | 3048163 | `5c3e4d9f1e713f7c22e7fddb66ba788737d7e75b53c521f182354caf0a866bc7` |
| scene-secret-master | `art/production/scenes/secret.png` | 3210139 | `c3921f48e2d87a9b3a6c1db7c1ccbee5aeb337f11a8ce030985786378be0c934` |
| scene-terrace-master | `art/production/scenes/terrace-v2.png` | 2548246 | `7404105d35ece7a45ee080a1b37385d712c4066cd78729d907ae513e591d184d` |
| portrait-player-master | `art/production/portraits/player.png` | 2366521 | `daec5e6347a757ca9a52077bb1fb96b32c03eb4abebc6bb549176b78f3f83cf2` |
| portrait-shen-master | `art/production/portraits/shen.png` | 2048820 | `d6a236262a00a2f2656a425a1b9aed7f36cf8cf9f11478ba7574f3c65795a641` |
| portrait-lu-master | `art/production/portraits/lu.png` | 2175758 | `5e570cd3748273864263e52b01ee11144972cff7874c9ff845d7b81d94ae5a6a` |
| portrait-pei-master | `art/production/portraits/pei.png` | 2255206 | `22583181d159d49dded331cf3af296b956172bdc9c89c28d96516c0892f2d98f` |
| portrait-yan-master | `art/production/portraits/yan.png` | 2488063 | `1a62092be290d65e9b5faa1c674d90d7e50e92f1829a3a848e41f98689813dca` |

原生套件的专用代码hash另列在机器清单codeComponents，页面接线由同提交CI与截图制品核对。当前不据包体宣布T20实测达标，四尺寸/150%/键盘专项仍按T19执行。
