# CHECK-ART-02 对象与跨页接线只读调查

2026-10-24。基线HEAD实际为dc0dc97，沿ART05运行源67ed71b9。已读根AGENTS与0025/0026/0027，并检查当前Equipment/Learning/Relic、Inventory/Market/Recovery、三Story对象、共享表现hook与App的普通详情/生平返回。只读代码及原证据，没有运行新UI、修改代码/测试或使用56884用户档；0028尚未保存。本文只有一项具体源码可达风险，另外两项是有意义的组合验收缺口，不冒称已复现产品红。

## 1. 外页普通配置的A→B→A可能复亮本页旧配置短效

`equipment-effects.ts/useConfigurationEcho`对key、可见/hidden/active、活动id/generation/owner与暂停清短效，Game watcher仅更新before；未在收到外页sync时撤销已经展示的effect。`store.refresh('sync')`读取成功不先置available=false，因此eligible不一定经历失效。App虽收到BroadcastChannel就增加syncEpoch并取消查看意图，配置echo本身不观察它。

`JadeStudyScene.attuned`只再核实际当前槽等于当前经卷；`RelicAtelier.boundEcho`只再核当前本命等于当前器物。故可达路径为：本页正式配装A成功、仍保留1400ms本地echo；另一可见窗口正式配B再配回A（同run普通revision递增、活动身份不变）。本页旧effect在B时不显示，在A回来时条件重新为真，可以把原sequence的“已配/本命已定”再次插入DOM。并非外页的第二次新结果获得本页完整配置proof，也不是只因普通revision变化就应该把已保存成果重演。

前提须真实核对：本页document.hidden=false，原effect仍在有效时间内，原活动为null或配置不会更换其身份；不能以后台页隐藏已经清效的绿灯代此路径。可用虚拟表现钟保留1400ms观察窗，但两次配置仍必须经原比较/即时确认与真实原子仓库，不能直接改Store或Game。该风险目前是静态条件推导，未在新UI复现。

建议先锁同组合红：初始builder=sword_guard且两卷已掌握，本页玉简明确比较并配sword_build，观察一次本地echo；外页依次比较配sword_guard、sword_build。本页实际四槽/画像/数值始终跟随正式最新Game，但旧sequence应在失效后保持撤下，不因A回来复亮。法宝可同法验证A/B/A。原全局ActionFeedbackStage也只有run变化、view/活动归属等清理，旧短印章可能继续覆盖外页更新后的对象；同例同时核它，不能把全局与对象局部混算两份新奖励。

修复取向由0028确定：可以按明确外页同步/真实配置归属失效清理，而非对每个正常revision或completedCycles粗暴全清。后者会吞掉研习完成后nextCommand已前移、v7结束后真实接收页的合法成果。原Game/命令/CAS/receipt不需改变。

## 2. 器物材料→普通坊市详情→生平→返回，需在新库存下核预算和父布局

真实入口：法宝材料`production-source-*`只追踪→目标/来源→原采购安排；App普通market属于detailViews，具有独立detailParent，1180px专属宿主；历练内embedded市场是另一父，不应继承同一几何结果。`showLife`保存有限readingReturn及原detailParent，closeHub按父关系回到原查看；它没有把新收益当成新授权。

组合路线：在未拥有器物页保留非默认预算/材料保留，查看缺料来源并进入同物采购，设非默认目标/保留；确认一次原15秒BUY后经设置进入生平，阅读一篇非首页，完成采购时保持在生平。核完整Game/成本/唯一receipt及当前生平实际库存；生平不演交易或器物短效。再按普通返回回到market，实际库存/灵石/预计采购余量须重算，原草案和有限授权须完整，不能写成新一次已保存或自动采购。关闭普通详情回到其既定原父器物（不是新造无限返回栈），原未拥有/本命槽/材料数量均来自最新Game，不能因持有材料就伪装炼成。

此链若插入真实保存失败/同步待核对，错误横幅会压缩与重建实际父空间；全部价格、成本、来源、分页、原retry仍须在祖先内可读/44px可命中。ART04原A8/A9修过普通与embedded不同宽度，但没有仅凭该单页证据证明上述跨ART生平返回和新revision组合。此处是组合验收缺口，尚未发现确定错误。

## 3. 两卷研习在人物/手记阅读时结算，不应把掌握/草案/槽位混为一件事

真实入口：ART03研习清单两卷→原30秒逐卷运行→ART05人物事实或近期手记→活动条“原安排”→返回经架/配装。当前helper以原running命令冻结器物，LEARN匹配plan包含所选卷，再以具体cycleCommand.skill及notice.icon过滤；这条窄归属应保留。父useReadingMemory以row.key+part在post更新后核对，正常同run周期不该清所有阅读位置。

建议组合：安排剑/符两卷、非默认累计预算/保留；在第一卷保存时读人物事实的非首页。核Game.learned新增但loadout完全未变，原阅读锚点和已记/未发生预览不跳，不出现人物拜访/抉择墨迹。通过原活动安排返回仍应读到全部已保存参数；选已完成卷A时，下一卷B运行不能让A借光，A已掌握为持久文字。暂停后仅比较装配原允许的一卷，取消与原确认/丢回复重试分别核对；即时配置后最新槽位必须正确，研习预估、已完成量和停止不能冒称为自动装备或另一次研习。

本链直接覆盖“同run正常revision推进”与“配置造成槽位变化”两个不同边界；不能每revision清缓存/短效来假修，也不能沿用旧learned/原图/旧槽。ART03两卷和ART05读页各自已有证据，尚不能替代这条跨项链的完整Game、读秒、成本、返回及实际像素验证。此处亦为组合验收缺口，不是宣称当前已坏。

## 既有证据与边界

ART03原跨卷saving/空槽错对象、ART04旧market正文/祖先裁切、ART05正文flex外溢/签架位移/两确认16px均已交付修正，不能在本轮把它们重新列作未修。当前图片消费仍经AssetImage的当前节点/path/decode检查，静态未见可直接指认的A→B→A旧图片回包缺口；不要为了凑问题将旧hash资源或未失效场景泛称“旧图”。

原短效/原全局印章与当前对象、持久Game事实必须分层核；默认有限预算、全12卷/4器/14物、两丹双用途/5突破物禁售、四人物/100手记/全四篇/原导出恢复入口均保留。当前只固定1440×900单Chromium与当前规则/原子保存组合，不恢复兼容或环境性能，也不把局部工程/机器绿灯代整体美术、长期平衡或真人认可。
