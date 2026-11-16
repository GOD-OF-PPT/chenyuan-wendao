# CEND06-F02B 主舞台行旅执行表现

承接57666d9/1e02337，当前第2个独立任务。核心问题是主舞台在TRAVEL执行只给通用已保存提示，目的地/当前状态只在HUD；地图既有选路/查看维持原样。Goal4及完整Goal1/原矩阵/候选/最终真人义务不缩，下一当前C端审查为第3项后综合。

## 实现与参数

复用ScenePanel的世界场景职责，新增只读TravelPassage与CSS（合计≤8500B），主舞台才启用。实际背景、HUD地点保持当前已保存Game，前景给出发地→明确目的地、单程/实际成本/原6秒、真实运行时读秒和沿示意路线行路的人物；示意不冒地理距离。未保存时人物最多走到94%，保存中/失败/暂停/他页无自行计时或抵达宣告；仅正式原子提交后原Game地点/既有结果反馈自然更新，不再重复新奖励演出或自动接采集/采购。

只匹配同人生/同Game revision未停止的v6 travel活动，本地读秒还须owner/id/generation/runtime全对应。暂停仍按原6秒完整重启，后台/刷新/接管/换人生与原引擎一致。新模块无timer/IO/命令/奖励；只有inspect事件，沿ScenePanel到原App viewActivityPlan，不能程序点击隐藏入口。单屏八入口、完整地图与原安排/回执、暂停/恢复/原意图重试保持。

为保原game-content焦点与阅读上下文，使用已锁Vue3.5.44的Teleport defer，将只读行旅表面放入同一渲染tick的既有hub-current；ScenePanel逻辑父仍保原事件归属。只在有此表面时替换旧通用显示，容器仍可聚焦，隐藏的原内容能力由当前HUD/新回看/原地图完整保留；离开主舞台立即卸下，返回不重建时钟/不补旧抵达。

ScenePanel新增纯显示导入/事件/条件消费，净增≤400B，原景物/阶段/天门/绘画fallback保。App只给主ScenePanel传passage=immersive与原inspect回调，并移除确实零引用、无顶层副作用的actionSeconds导入；不改其它正文/控制器、不压缩代码或抽控制器凑预算。预计App净增1B，实际≤原159635/ART33父增≤2400；修行45000、ART33原两文件12000、反馈34000及所有旧cap不涨。0新绘画/字体/依赖，不改原World/Activity/费用/6秒/DB9/CAS/proof/原子写权。

## 来源与检查

本轮实读Riot Clarity（https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/）强调行动方向、层级与克制噪声；XAG114（https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/114）用于查看/执行及上下文。Vue Teleport官方（https://vuejs.org/guide/built-ins/teleport.html#deferred-teleport）说明defer的同tick目标和逻辑事件/注入不变。具体旅人/路线/94%/布局均项目推导，不是认证或来源数值。沿game-ui-frontend/game-playtest，Vue/DOM引擎不迁移。

新增5个固定1440×900/font1单Chromium组合：正常新档真实在线6秒回洞府、出发/地图只读回看与完整一次抵达、START/TICK native配额及阻塞保存/原意图重试、暂停刷新与原完整重启、他页接管/明确换人生清旧路线。逐全Game/Activity/回执/previous/其它库和截止前1ms，原6秒与Game变化分别证明。新视图不得遮场景题牌/问道/导航，正文18/辅助14/目标44；图逐张≤2，PNG保/同尺寸JPEG68双hash，仅实看标true。

先旧56918实际红例，再原玩法/新5/局部像素预检，完善后冻结依赖安装终态再类型构建/名单/UI。完整当前资源/相关规则与整文件UI，原媒体/兼容混合例事前延期不删断言；本轮不恢复兼容/环境性能。精确全源逆回与实际原cap保护，老守卫层的拒绝错误上下文保留而非宽松hash别名。实际受测/提交/冻结/解包/HTTP同源，前轮失败原件保留；虚拟/局部机器绿不代长期/整体艺术/真人或完整1419+新增。

原13/玩家档/56884/56918/旧图/原输入/v0.3不动，rawGame只忽略artifacts。仅本地独立提交，不push/合并/部署/改权限。回滚只revert本项显示与测试/守卫/记录，DB9不降级且旧包/原档保；若有具体问题先保失败修缮，不放宽Game/时长/几何断言。

[杠精计划审查] 通过：确实补主舞台行旅主体而非复用开场表单，使用场景职责与原父回调，不用预算挪控制器；新景物只有示意，真实当前地点/完整周期和停止权由原引擎所有。必须真检查后再完成。

预检所得：既有纸底background带!important，行旅宿主须明确透明以保当前实景；新增真实计算样式断言，不能只看盒子在viewport内。旅人用同一Bézier曲线的点随原runtime移动、影子留在路面，尺寸只随当前错误/提示占用的局部舞台约束，不改变字号或执行兼容矩阵。App实际净增2B，ScenePanel增194B；移除unused actionSeconds整条纯导入，没有改其它正文。

提交前语义复核：保存丢回复不证明未提交，图示固定说明改为中性“本程路线示意”，状态继续说明尚未确认抵达。30f阶段200规则工具/构建/正向通过，全资源被主动取消而非通过；新源重冻后完整检查，不重贴旧绿。
