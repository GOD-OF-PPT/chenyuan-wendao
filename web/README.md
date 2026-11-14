# 前端运行与验证

当前交付、分支和未完成范围见[交付状态](../docs/quality-20261112/delivery-status.md)。Vue 3/Pinia界面消费独立规则引擎与IndexedDB仓库，不需要外部账号或服务。旧运行说明完整保存在[历史归档](../docs/history/web-readme-through-20261114.md)。

## 环境与启动

Node 24.22.1、npm、Python 3、Git/tar。Pillow仅供资源校验，版本见[art/requirements.txt](../art/requirements.txt)。从仓库根目录：

```sh
python3 -m venv ../chenyuan-build-venv
# macOS/Linux
. ../chenyuan-build-venv/bin/activate
# Windows PowerShell用 ../chenyuan-build-venv/Scripts/Activate.ps1
python3 -m pip install -r art/requirements.txt
npm run test:setup
npm --prefix web run dev
```

在Windows的虚拟环境内也可用`python`代替`python3`。打开[本机开发页](http://127.0.0.1:5173/)。不要把依赖安装到系统Python；根测试含Vue集成，根/web两锁都需安装。Windows长PATH只在当前shell去重；旧编码用`python -X utf8`运行Python检查。

```sh
npm --prefix web run build
npm --prefix web run preview -- --port 4200 --strictPort
```

通过[本机HTTP预览](http://127.0.0.1:4200/)运行，不用file://。build/dev包装脚本生成`.generated`和演示输入；干净检出不要绕过包装直接vue-tsc。构建报告绑定真实HEAD/tree/runtime，旧dist不能冒新构建。

## 当前检查

先按[根贡献说明](../CONTRIBUTING.md)准备完整历史和独立资源环境，再执行核心、构建及当前浏览器门禁。`q13`表示完整当前UI并集，`native`是真实IndexedDB完整套件，`normal`是正常32；名字保历史但实际清单随当前声明核对。浏览器只装/跑Chromium，固定1440×900。常用端口：UI4200/4177、Native4174、正常路线4173；每套配置自起服务且不复用玩家服务。端口以配置为准，不停无关进程抢占。

核心安装、构建与浏览器不要在同一检出并发；开发服务重写生成文件也会使页面重载。并行验证须独立检出/依赖/构建和不冲突端口。保全新输出目录、原错误、trace与来源；没有实际执行的清单不记通过。

当前CI仅核心和固定桌面UI/Native/正常32。跨浏览器、移动/响应式、分辨率/字号缩放及环境性能继续暂停；旧默认`test:e2e`/`test:persistence`/`test:journeys`/`test:performance`/`test:candidate`仍包含更大范围，勿直接启动。历史候选装配门槛含暂停项，局部运行包不能称正式ready候选。

## 存档与阅读

正常档按站点origin隔离；换端口/浏览器不迁移进度。导出完整存档后再清站点数据，导出本地试玩记录不等于备份Game。演示按节点/源版本隔离，原正常库不改；演示封装只能在匹配节点导入。

当前Game外层2/schema2，.6新规则，.3/.4/.5按所属冻结规则承接；数据库11。所有成本、成果、Game/活动/截止/检查点/回执同事务。失败沿原意图重试，丢回复不重复发奖；未知版本保原件，不降级或强开。离开累计有8小时上限及原授权/停止边界，阅读不执行或收取赠礼。详见[离开累计合同](../docs/decisions/0157-away-progress-contract.md)与[新人生合同](../docs/decisions/0165-life-echoes-and-seeded-encounters.md)。

数值未平衡，真人/长期/重玩趣味和整体美术须另有真实证据；自动化通关与虚拟钟不替代这些结论。当前二十项完成状态以交付页为准。
