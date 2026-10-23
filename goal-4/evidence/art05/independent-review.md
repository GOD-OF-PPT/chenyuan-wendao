# ART05 表现证明与对象归属的独立审查

2026-10-24。只读审根新增helper/host与共享版本准入，并检查三对象的实际消费；未改这些运行源，未运行测试/UI/build或存档操作。本节对应首次proof-first输入的在途静态审查，不是最终源、像素或用户验收。

共享准入现显式排version0，再用[2,3,6,extra]集合；默认extra0对合法及恶意零的行为保持，显式4/5/7不使默认准入扩大。完整原Game/命令→resolve全部Game/result→completeActivity全部Activity、公共脱敏身份与重复/重放守卫均保留，未见因加7削弱证明。`artifacts/goal-4/art05/proof-first.log`末尾实际45通过/0失败/0skip，包含8新叙事与原15活动/15装备/7补给；本审查只读日志，没有重新执行，也不把它当Vue生命周期已通过。

稳定NarrativeStageHost在App包裹原三个KeepAlive且只返回slot，能跨DECIDE的Narrative退场与Life.status换key保留运行见证，未重建写确认/读页。三对象实际消费useNarrativeObject，各自import同一CSS，不能为守卫强加main的冗余import。读页/选项/表单仍应留原父。

首次静态审查提出以下归属缺口，已交主控锁定真实UI红与修正；本审查不直接改它们：

1. Response原id仅modelKey（事件/question/ending），未包含当前只读预选。安排A后预选B，仍可能在B的正文案面显示A的working/行墨。须核原witness.action与当前预选，不能把仅属于同一事件当作同一回应。
2. Fate的events曾为任意EVENT/DECIDE的通配id。提交改变事件列表后，当前拜帖可能已是另一事件/NPC，旧结果不能直接贴上新拜帖；需具体事件/人物或明确已保存会面的归属。
3. 子hook同时监听kind/id/valid，只有匹配才claim。如果成果到达时正在看另一人物，或storyView仍true但三个子页均隐藏，原effect尚未claimed；1400ms内切回匹配对象可能迟领旧短效。需要只允许结果到达时已登记的当前对象，或明确的DECIDE/END完成接收页；普通只读切对象/返回不能补演。
4. LifeScroll首次以game.status==='retired'区分归隐，而正式status应核实际类型及ending；需要作者核实，不能由静态主题图猜收卷原因。

这些是源码可达路径的静态发现，尚未在本子任务浏览器复现，不能直接冒称产品红已成立或已修。首次8纯例侧重完整证明与静态匹配，且曾直接认可events通配；它们不证明上述对象预选、post watcher、KeepAlive和完成接收页的生命周期。后续需保留主控真实红绿和输入身份，不为旧假设反改正式Game或宽放proof。

其余边界继续保留：真实6/12秒、未提交原意图首次重试可反馈一次、已提交回执/刷新/外页不补演，错误/暂停请求/接管撤短效，原global印章与局部克制墨迹分工、完整结果/正文/读取返回和八入口。当前没有像素审阅、兼容或环境性能结论，整体艺术/长期平衡/真人仍未验收。

## source1冻结后的复核

主控首版冻结28477b1d（226运行源/61文件），本轮独立重新读取helper、host、三对象/三父及App确认门槛。events现用具体`event:<id>`而不是通配；人物仍按真实NPC。host的delivery只在同一render可claim，nextTick后关闭，保留DECIDE退场/END换Life的同次接收机会，不能等下一次用户导航来迟领。Response增加当前完整Action与冻结Action的比较，另记abandoned短成果，减少把A行墨套给B。Life按真实ending区别归隐/寿尽。上述是源码修正复核，首期UI尚在执行，不把静态修正写作生命周期已验收。

新确认门槛在三父与App.storyAct/requestEnd/confirmEnd/reviewAscension/confirmAscension及MilestoneReview普通confirm可见；原retry分支保持不受新授权门槛阻断。显式cancel仍沿原discardRetryFor，未清error伪报Saved，也未更改Store/规则/周期/DB9。原正文/阅读缓存/返回逻辑仍留原父；未发现以对象wrapper迁移旧读取实现逃预算。

追加交主控定向检查的两项：Encounter同人物能显示DECIDE过程，但首次caption固定叫拜访/拜帖，回应过程应按实际action区分；Response的完整Action比较使用JSON.stringify，合法旧计划如字段顺序不同可能误判冷态，宜复用既有canonicalFingerprint作结构比较。这两项尚无本审查UI红，不直接改源、不代执行方裁定最终结果。

守卫元数据独立完成：六新文件26620/45000B，真实三父slots/App稳定host/三对象CSS实际import/helper显式7消费均记录；没有main伪冗余CSS入口或占位hash。旧ART02两共享44992/45000、story三父47808/48000、U7 MilestoneReview15780/30000均按真实字节刷新，旧cap与既有bindings不变。新20方法（1正/19负）加旧203+7预期230，当前仅语法/结构检查，实际正负例仍待最终稳定源运行；循环/subTest不另增业务数。

新narrative-objects.json的SHA-256为`1ef76c77932ded5a64cb46f092d58d57fad25905bdfd0553ad284c97462fbdff`。具体六源hash在该ledger，运行检查与最终像素/用户验收继续分别登记；research回读、AGENTS规则和资源守卫都不是验收结果。

## source2当前守卫实跑

source2冻结后仅EncounterTable/ResponseTable/CSS有三源变化，实际SHA前缀6d8dfe87/2223866b/c2f8b361。已重新只读核对：Encounter按实际冻结Action区分拜访/回应；Response的same及放弃监视改用正式canonicalFingerprint，不再由字段顺序误判；正文narrative-reading复位display:block/width100%等旧容器继承，仍保18px完整文字/14px辅助与44px操作。三项属于源码复核，像素与UI结果仍由QA/主控单独登记。

真实新ledger已按三冻结源刷新为26906/45000B，SHA-256 `44293fe76c0110bb5cef4efdd402b53915e0c2059a4670e563d96bdf31d67dff`。其它原预算不涨，正向实际输出ART0244992/45000、story47808/48000、U715780/30000。首正向实际exit1是旧ART03守卫仍绑定extra0/4/5与extra&&的旧源码字面；按0027改为真实0/4/5/7及显式version0防线集合，保resolve/complete完整证明，未改生产。原红log及guard.patch保留，没有把这次元数据前提错误写成运行缺陷。

适配后正向`assets-source2-positive-2.log`实际exit0；完整`art/tools/test_inventory.py`在同一冻结源实际230项、209.697秒、OK/0skip（旧203+7保留、新20为1正19负）。不是用subTest/循环增加计数。新负例包括严格整数排bool、固定预算/0位图/禁止验收声明、完整六文件/hash/真实bytes、外部路径与source/ledger symlink、重算hash后超cap或消费者脱落、实际三父/稳定host与CSS导入和六行动域不扩。相关工具最终SHA：narrative guard98f1cf25、check_inventory8f1cb355、test_inventory c1833829。

原始日志、前提补丁、六源/工具/日志hash及实际统计存`artifacts/goal-4/art05/assets-source2-verification.json`。此次资源验证只证明所记录身份/预算/引用/头信息与消费者守卫；原2missing/1placeholder状态仍如实保留，未以守卫通过宣称美术完成。没有运行本子任务浏览器、存档或兼容/环境性能；整体游戏感、当前UI/像素与真人认可保持各自责任。

## source3当前20与旧210继承

source3仅narrative-objects.css增加三目录右内距至13019B、SHA-256 `9e200282da7a2f04ff24a932b680ee2dbd2b130a4634b39e263faf623e4dfd0a`；其余225/226运行源与source2冻结指纹逐一相同。只刷新新ledger该CSS一行，现六文件26960/45000B，ledger `e1b5280ab0db5d56776c51265f1aa51f6718e542a854b72e2e46de45f9f97475`；旧cap/manifest内容与bindings未变。

当前正向`rtk proxy python3 art/tools/check_inventory.py`实际exit0；仅新类`rtk proxy python3 art/tools/test_inventory.py NarrativeObjectTests`实际20/20、0.868秒、OK/0skip，仍为1正19负。日志分别assets-source3-positive.log、assets-source3-narrative-tests.log；当前未重跑旧210，不称source3完整230同轮全绿。

旧210沿source2实际230/209.697秒原报告继承，原report/source与首正向红均不改。继承证明逐项确认3工具输入hash同source2，225运行源未变；215旧资源当前字节与HEAD一致，3旧manifest从HEAD仅按source2冻结运行路径的hash/bytes重建，和当前文件逐字节相同，无cap/reference/binding变化或其它意外。这里明确记录重建方法，不假称另有历史原始资源快照；唯一变化的新CSS及新ledger由当前正向和20直接覆盖。原source2新ledger原件按原hash另存，不覆盖原报告。

完整输入、当前命令/实际统计与原报告引用见`artifacts/goal-4/art05/assets-source3-verification.json`、assets-source3-inheritance.json。资源/依赖身份检查与本轮同源UI83/实际像素、整体美术及真人验收仍分开，不触及运行源、旧测试、用户存档或兼容/环境性能。

## source4当前守卫

source3的UI78通过/5失败原报告由主控保留，其中两个确认正文16px是真实缺口。source4仅在新CSS追加life-confirmation/ascension-confirmation两个命名确认中的p为18px；删除这一精确97B规则可还原source3 CSS的原SHA，未改行高、宽度、分页或其它确认。其它原UI前提适配仍由主控/QA另存最小差异，本子任务不改运行源或旧测试。

只刷新新ledger的CSS一行，CSS13116B/57d18fa3、新组27057/45000，ledger `68f9369c671f236b6337b83041c94e65e0e7289bcec973dc5d9f37f29ee47e30`。source4正向实际exit0，`rtk proxy python3 art/tools/test_inventory.py NarrativeObjectTests`实际20/20、0.371秒、OK/0skip。原工具3输入、215旧资源和3旧manifest逐hash复核未变，226运行源仍225相同/仅新CSS不同；变化的新ledger与CSS由当前正向/20直接覆盖，旧210继续引用source2全230原报告。

小继承证明及当前命令/结果见`artifacts/goal-4/art05/assets-source4-verification.json`，只引用source3的完整依赖证据，不重复输出215项列表；source3到4的单条CSS补丁另存。没有把旧报告重贴为source4完整230或将资源验证当作本轮83/UI像素、艺术/长期或真人通过。
