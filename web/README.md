# 尘缘问道 · 当前放置版运行与校验

当前承接Goal1/Goal3/Goal4，玩法定位为长期积累、低频决定和阶段筹备。25类行动已逐项接入有限安排与实际周期；核心规则、界面和存档均持续验证。**整体美术、长期平衡和真人复验尚未通过，不能把历史通关回放或局部工程绿灯当整体完成。** 当前状态以[Goal4任务顶部](../goal-4/tasks.md)和各版本证据为准，v0.3正文与历史记录保留。

## 从源码运行

要求Node.js≥22.16.0、npm、Python及系统Git/tar；源码校验需完整历史。已实际使用的本地工具为Node24.22.1/npm8.11.0，CI工具以实际日志为准。资源检查的Pillow版本锁在[art/requirements.txt](../art/requirements.txt)，属于构建校验工具，不是网页游戏依赖。在仓库根目录执行：

```sh
python3 -m venv ../chenyuan-build-venv
. ../chenyuan-build-venv/bin/activate
python3 -m pip install -r art/requirements.txt
npm ci --ignore-scripts --no-audit --no-fund
node scripts/check_lock.mjs
npm --prefix web ci --ignore-scripts --no-audit --no-fund
npm --prefix web run dev
```

打开http://127.0.0.1:5173/，只监听本机，不需要账号、API Key或数据库服务器。不要在系统Python或仓库中安装临时包。正式构建用`npm --prefix web run build`，包含类型检查、正式回放演示节点、Vite及构建来源记录。源码、公开素材、运行输入和输出逐文件绑定，不用旧dist冒新构建。

从仓库根目录运行构建网页：

```sh
python3 scripts/candidate/serve.py --directory web/dist --port 8000
```

打开http://127.0.0.1:8000/。网页运行只需标准库HTTP服务，不需要Pillow或npm，不通过file://双击HTML。不同端口、浏览器和站点的存档独立；换入口不会自动迁移原进度。清理站点数据会丢档，先用游戏的完整存档导出明确备份。无公开部署。

## 当前允许的验证与暂停边界

在上述隔离Python环境及锁定npm依赖下，可运行原核心规则/文档校验与构建：

```sh
npm run validate:core
npm --prefix web run build
```

`validate:core`保留锁、根安装、类型、内容、全部根源码测试、M1/full回放、当前经济审计、资源/文档及设计文档十步。它不代表浏览器矩阵、长期成长或真人体验。经济即时报告为docs/economy/current-engine-report.json，历史current-report.json保持原件；即时120路线也不冒在线Activity路线或真人节奏。

当前只对实际改动进行固定1440×900/font1单Chromium玩法/交互与规则、读秒、原子保存验证；新档、失败、恢复、有限授权和完整Game/Activity/回执应按任务范围检查。定向首环例命令（不能代表整体矩阵）：

```sh
cd web
npx playwright install chromium
npx playwright test --config playwright.idle.config.ts --project=chromium idle-cultivation.spec.ts ux19-first-loop.spec.ts
```

**全部页面兼容及环境性能开发/测试暂停**：不运行跨浏览器、移动/响应式、分辨率、字号或环境性能矩阵。不要直接执行默认test:e2e、test:persistence、test:journeys、test:performance或test:candidate来绕过暂停；这些旧默认合同仍保留更大范围。idle配置中的恢复/原生范围也须按当前任务选择，完整清单的存在不等于已执行。

旧CI仍含三浏览器、布局/字号、性能和三浏览器解包门槛，当前不得push或dispatch触发。CBASE-DOC-02只补真实core消费者的隔离Pillow前置，不改变触发器/权限/矩阵/时限，也未运行远端CI。原core5分钟与旧矩阵规模的适用性仍待后续有授权的真实验证，安装成功不等于CI绿色。

## 首轮操作与放置循环

输入道号开始正常人生，阅读开场并明确选择。主目标指向当前阶段的“缺口—可达来源—下一步”；查看/追踪不执行旅行、采购、炼制或开战，实际行动须在原入口确认。

- 修炼：安排方式与有限边界，观察当前单周期读秒、修为和实际停止原因；修为圆满后进入筹备，突破仍需物资与玩家确认。
- 历练：先辨当前地点/资源点或敌方，选择取材/委托目标及实际预算、保留量和次数；旅行只抵达，不自动接下一行动。危险停手、手动补给与撤退的代价分别显示。
- 丹炉与法宝：从丹方、药匣、炉体或器物及槽位安排；完整材料/预算按需看，未持有绘画不冒实际物品。实际扣费/成果保存后才入匣或认主。
- 功法与剑简：从当前经卷看作用、成本与门槛，选择有限卷串或一次参悟；已掌握后比较装配，不自动装备或重复研习收费。
- 行囊、疗养与交易：按当前物资、真实缺口与单次/整段预算决定；两恢复丹与突破物保原用途限制。默认有限授权不是无限挂机。
- 仙缘与生平：完整阅读和预选即时，明确代价后才安排一次回应/拜访/问心/收卷；未知关键分支保持待决定，结尾不自动开启新人生。

周期性放置行动先受理，再按保存的实际单周期递减；到期保存中不提前发奖，原子完成后才显示真实成本/成果。择法与功法/法宝配装采用即时原子确认，不加假倒计时。暂停、恢复、接管与同意图重试保原身份和累计预算；旧回执/刷新不重发。阅读、预览、离线不消耗寿元，不凭停留时间补物或直接授境界。约30分钟只观察基本理解和继续目标，不是筑基、飞升或通关时间要求。周期和数值均未平衡。

## 存档、演示与记录

当前full Game外层2/schema2、content full-demo.3、balance full-unbalanced.3，数据库DB9。已知旧档按正式迁移合同保原件，未知/未来版本拒绝；回滚不降级新DB或强开旧读取器。Game、活动、费用/成果、检查点和回执按正式事务提交，commandId/runId/expectedRevision与活动CAS阻止旧意图扩大授权。

欢迎页的9个演示节点由正式指令回放生成，带标记并按运行版本/节点隔离；不是正常新档可达或长期趣味证明。演示封装只在匹配节点内导入，普通入口拒绝；返回正常进度不把演示奖品搬入原档。生成存档和个人数据不提交Git。

设置、目标追踪与本地试玩记录使用各自边界，不冒Game保存成功。默认只在本机；记录可关闭/预览/导出/明确清空，最多1000条约1MB载荷，故障或截断须明确。导出记录不含道号/完整存档/自由输入，不是Game备份；没有上传接口，由玩家自行决定是否分享。设置读取失败可降级，Game读取/CAS/原子成功不能降级为空档。

## 候选交付与真实验收

正式package-candidate.py仍要求当前完整原始证据、干净源码/锁/构建与全部原门槛；完整三浏览器/布局/正常路线/恢复/性能/解包均没有因暂停而删除。当前原门槛含暂停项，故局部可运行包或可复现基线不能称正式ready候选，不要运行装配/receipt来凑最终交付。

原[Goal1候选合同](../docs/implementation/goal-1-candidate-delivery.md)与[历史T24评审](../docs/implementation/goal-1-final-review.md)只保各自来源；随包ENGINEERING_REVIEW.md不是当前放置版最大评审。最终完整同源矩阵、正式候选、最大C端/代码/安全review和真实用户/整体艺术/长期平衡仍须逐项完成。所有历史红例、unknown和负面用户反馈保留，以[当前任务和证据](../goal-4/tasks.md)核对继续条件，不自动合并、公开部署、改权限或发Release。
