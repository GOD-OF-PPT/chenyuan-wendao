# 尘缘问道

古风文字修仙网页游戏。安排修行、筹集突破物、取舍功法与法宝，再决定何时破境、问心与收卷。定位是长期积累、低频决定和阶段筹备；约30分钟用于了解基本玩法，不限定突破或通关时间。数值仍未平衡。

质量评审20项正在实施，已递交功能仍在叠放PR，未自动合并main。当前接受源、验证与待办见[交付状态](docs/quality-20261112/delivery-status.md)；[完整计划](docs/quality-20261112/plan.md)和[原评审](docs/quality-20261112/review/00-synthesis.md)保留问题依据。工程验证与真人、长期体验、整体美术分别认定。

## 开始开发

使用Node 24.22.1（项目最低22.16）、npm、Python 3、Git及tar。资源校验的Pillow按[锁定要求](art/requirements.txt)装入独立虚拟环境；网页运行不需要Python、账号、模型API或数据库服务。不要把临时依赖装到系统Python。

```sh
git clone https://github.com/GOD-OF-PPT/chenyuan-wendao.git
cd chenyuan-wendao
# 按交付状态选择需要评审/运行的功能分支；main不是已合并全部功能的声明
npm run test:setup
npm --prefix web run dev
```

打开[本机开发入口](http://127.0.0.1:5173/)。依赖由根/web两份锁安装；不要只装根依赖后运行含Vue集成的根测试。构建运行：

```sh
npm --prefix web run build
npm --prefix web run preview -- --port 4200 --strictPort
```

用[HTTP预览](http://127.0.0.1:4200/)打开，不双击file://。构建包装脚本先生成演示输入、检查类型并记录源码/载荷身份；干净检出直接vue-tsc缺生成文件。Vite preview仅用于本机验证。

Windows可用独立工具环境。Python旧本地编码用`python -X utf8`；过长PATH仅在当前shell去重，不覆盖系统配置。源码按.gitattributes保持LF，图片/包保二进制字节。Python环境的跨平台步骤见[前端运行说明](web/README.md)。

## 当前玩法与存档

正式规则与UI覆盖凡人至飞升、剑/符两派、确定材料与购买路线、NPC/机缘、问心与两结局。重复活动默认到目标或手动停止，同时保累计支出、库存/余寿与危险边界。轻量服丹/回应和配置即时原子提交；突破、渡劫等重大安排保正式周期与确认。

离开累计只执行已保存的明确计划，最多8小时，预算/库存/寿元/危险及未知分支先到先停；不自动旅行、采购、接新活动或代选。返场展示真实已提交变化。新.6人生可读此生账本和两独占尾声，明确另选才携一份有限前缘；十条种子见闻同一世稳定，全18条图鉴仍可查。这些功能的接受状态按交付页，不以本段代验。

存档只在当前浏览器站点本地IndexedDB；端口变化意味着不同站点。导出后再换入口或清站点数据，勿提交存档到Git。正常档与9个合法回放演示节点隔离，演示物资不进入正常档。当前Game外层2/schema2，规则.6；已发布.3/.4/.5保独立规则，数据库11。未知版本拒绝且保原件；回滚不强开或降级新库。

## 验证与贡献

```sh
npm run validate:core
python3 scripts/check-doc-links.py
npm --prefix web run build
# 构建完成且检出干净后，逐项串行运行当前固定桌面范围
node scripts/check-current-browser.mjs q13 artifacts/current-ui
node scripts/check-current-browser.mjs native artifacts/current-native
node scripts/check-current-browser.mjs normal artifacts/current-normal
```

首次浏览器验证先在web执行`npx playwright install chromium`；Linux缺系统库时加`--with-deps`。完整核心会安装两份依赖，同一检出不得与构建/浏览器并发。每个输出目录须全新；浏览器门禁核实际完整声明、执行与来源。正常32也可按CI的四片各8运行并用原合并器核完整并集；具体命令见[CONTRIBUTING](CONTRIBUTING.md)。

当前仅1440×900单Chromium。跨浏览器、移动/响应式、分辨率/字号缩放和环境性能矩阵继续暂停；不要运行旧默认全部浏览器/性能配置。当前CI与历史矩阵分开，历史门槛保留为未执行义务。

规则在[src/full](src/full)，存储与Vue界面在[web/src](web/src)，当前行为门禁在[scripts](scripts)及[tests](tests)。新功能从独立codex/分支递交PR，规格先main；不自动合并或上线。完整约定见[AGENTS](AGENTS.md)及[CONTRIBUTING](CONTRIBUTING.md)。

## 资料

- [决策索引](docs/decisions/README.md)：现行决定与带日期的历史合同。
- [设计基线v0.3](docs/v0.3/01_设计规格.md)与[v0.4研究](docs/v0.4/README.md)：保原文，假设不等于实现。
- [美术来源与生产](art/README.md)：原稿、回执、确定导出和实际消费；不分享字体。
- [历史日报和旧代理约定](docs/history/README.md)：旧源身份、失败与当时范围保留，失效原件明确标注。
