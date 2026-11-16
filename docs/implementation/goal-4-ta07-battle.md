# Goal4 TA07：战斗操作与七招演员

2026-10-24。实施依据为[0033合同](../decisions/0033-battle-actors-ta07-contract.md)，承接 CHECK-MATRIX-01 的 `920edd2`。用户对各页仍像工作台、交互与TA不足的负面复验保持有效。本记录只说明TA07当前工程进展，不关闭整体目标或代替用户认可。

## 当前状态与身份

本记录写入时，source5 运行摘要为 `4640894ed2590fb1c34f7911af238ac09dc2ba6437f1fae3cbe846cb7fd3f5c8`：242份运行源码、63份构建载荷、7,902,851B，原始身份见 `artifacts/goal-4/ta07/build-source5.json`。实现`7f0feacf1e67feaeed64a69aef68c282d97b91d4`已本地提交，原56884试玩已更新。242运行源码与提交Git archive、63份载荷与受测/提交后重建/冻结/HTTP逐hash完全相同；原用户可见进度只读保持。它是保留13在途的dirty工程交付，不是最终干净候选。

当前仅固定1440×900、font1、单一Chromium。没有执行兼容或环境性能专项，没有使用用户档作测试、导入、恢复或重置。原13份无关在途、原始输入、v0.3、旧资产与全部失败证据继续保留。

## 正式操作与游戏对象

原 `BattleDeck` 保留props/emit桥接，接入 `BattleCommandConsole`：四个出招符位区分普通攻击、护体、起手和终结；两丹进入药匣；撤退是独立退路。剑与符的起手/终结轮廓不同。七个原按钮、testid、当前库存、正式成本、3秒单回合和全部禁用原因保留，点击仍直接安排原单步，不增加预选后提交或逐回合领奖。

自动斗法仍是默认放置方式。原回合数、累计MP、药物总预算/保留量/阈值、危险暂停或撤退、原安排草案与完整回执保持；“战策拟用”只读，不覆盖玩家战策或授予新预算。运行中的“暂停并手动接管”与未运行时的“手动操作”明确区分；只读看战策或返回战局不执行暂停、旅行或出招。

全局主题曾把禁用和短成功状态填成大灰矩形。当前限定本场景的级联，将交互反馈落到符位物件，键盘焦点保留；药瓶与名称在顶行，完整成本和原因跨列，保18px正文、14px辅助与44px操作。没有通过删条件、裁文字或内滚解决密度。

## 冷态立绘、蓄势与真实成果

新资源是内置imagegen生成的一张透明冷态完整站姿，正式消费路径为 `art/v2/actors/player-standing-cold-v1.webp`，512×512、63,634B。它不包含画死的武器、护盾、药息或运行光。原PNG、提示词、工具回执、alpha/尺寸/hash、确定导出与绑定记录见[TA07资产账本](../../art/redesign/ta07.json)及其引用；旧半身和全部敌图保留。单幅立绘加DOM/CSS姿态不冒称七套逐帧、骨骼或3D动画，图片失败仍有角色替代与全部操作。

`BattlePresence` 的预备层只读取真实本地running周期，并冻结本招command、修法、人生、活动id/generation/owner、敌人与关卡。真实进度驱动聚拢、展开和轻移；保存中收势，不先命中、扣药、掉血或完成撤退。已前移的nextDecision不能冒充刚完成的招式。

| 动作 | 本次专属表现 |
| --- | --- |
| 普通攻击 | 短直击与回势，区别于终结长弧 |
| 凝神护体 | 自身盾面与收势，净受伤时仍保持自身arrival语义 |
| 起手术法 | 剑势汇聚或符纸结印 |
| 终结术法 | 剑锋长弧或向敌展开的符印 |
| 回春丹 | 自身药盏与收拢药息，真实净HP可能仍为负 |
| 回灵丹 | 自身灵流与回气形态，保正式单枚成本 |
| 撤退 | 运行期向己方退路收势；保存后正式离场与终态摘要，不在新场景补旧演员 |

`battle-choreography` 复用既有完整原Game→正式resolve→完整ActionResult→completeActivity证明与非重放观察。它在原observer内同步捕获已保存事实；稍后的绘制只按同一notice key/variant取冻结见证，不能借下一周期、新敌人或下一劫关。共享准入、公共脱敏、Game/Store/DB9/DB1、费用、3秒周期、CAS和原意图重试均未改变。

`BattleCast` 只在原 `ActionFeedbackStage` 的action-motion容器表达成果，不再另开成果时钟。原1600ms自然暂态、显式收起、键盘持有/离焦、数字和完整事实保留；演员姿态沿原650ms mark/unmark撤下。暂停请求、隐藏、换对象/人生、接管、错误和销毁清暂态，历史、外页、刷新与重放不补演。无场内演员的战策视图不向视口中心回退打光，非BATTLE及ANSWER_TRIAL原反馈继续保留。

已确认的负净HP还驱动同敌人的定向短反击：敌方未受伤时只作反击arrival；双方都受伤时组合受击回摆与反击。`data-cast-response` 与原move/school/role一起由既有清理链撤下。零净损但可能已格挡或回复的情况不从敌意推定命中；本项不声称覆盖所有引擎反击事件。终态、撤退和换关不演旧敌动作。

## 已保留的真实红例与修缮

首版护体外缘压到己方状态/保守头带，起手外缘越过敌方状态，原PNG、完整几何与报告均保留。当前定位读取实际contain绘画、场景、双方状态和交锋文字Range，在同演员与场景交集内寻找有限留白；包含12px光晕外带，常规最大128px，空间不足时撤装饰而保留真实事实。不是用视口clamp、取消外带或裁演员规避断言。

A4曾把“手动接管”误当只读返回：原trace证明查看战策前后全部库相同，随后接管确实触发原暂停，不能再要求已经放弃的周期仍可原命令重试。测试前提改走只读战局返回，保原完整Game/全库/命令/费用/首次成功与幂等断言；旧失败不改标签。随后真正的错误态授权文字越到主导航，被独立锁红并实际看图确认。仅manual且failed场景将艺术区最小300→220px、解除两演员旧240px最小容器，原contain与完整文字保留，正常战场不变。

减动效图中还曾出现未聚焦的快捷定位链接覆盖头像。当前仅恢复该控件原未聚焦隐藏与聚焦可用性，不改键盘动作或其它页面。原真实命中失败及修后两种减效模式的只读/真实操作证据分别保留。

## 当前检查与明确未验项

- source5新增14项UI已在同一轮实际通过，740项输入pre/post逐hash相同，0skip/retry。覆盖七招2999+1ms、完整Game/Activity/全部库与唯一原回执、真实正MP三秒、持有原生保存/配额失败及原retry、暂停/隐藏/战策、接管/刷新/旧回执、终态换敌/败退、两种减效与图片失败。原始报告与声明见 `artifacts/goal-4/ta07/ui-current-source5-report.json` 和[14项声明](https://github.com/GOD-OF-PPT/chenyuan-wendao/blob/c7190e67a265fe7c8bff63a1db222a434d7dcffd/goal-4/evidence/ta07/new14-current-source5-declarations.json)。
- [时序与正式成果记录](https://github.com/GOD-OF-PPT/chenyuan-wendao/blob/c7190e67a265fe7c8bff63a1db222a434d7dcffd/goal-4/evidence/ta07/timing-current-source5.json)区分A3真实三秒和虚拟钟。19次保存执行不是19类新覆盖，更不证明长期节奏、平衡或性能。
- 当前815项规则、61文件及34项相关native已实际通过。34项当前原生与其它未变依赖的继承分别见[原生证明](https://github.com/GOD-OF-PPT/chenyuan-wendao/blob/c7190e67a265fe7c8bff63a1db222a434d7dcffd/goal-4/evidence/ta07/native-verification-source5.json)，不写成当前同轮332项全跑。
- 资源守卫首轮309过/1个新负例前提失败：generic字符串出现两处，仅删首处没有真正删除binding。根已加强为唯一常量匹配与声明/负例并定向通过；完整310项第二轮实际全部通过，186.253秒，744项输入前后相同；当前正向也另行通过。
- [已声明的33项旧受影响UI](https://github.com/GOD-OF-PPT/chenyuan-wendao/blob/c7190e67a265fe7c8bff63a1db222a434d7dcffd/goal-4/evidence/ta07/old-related-source5-selection.json)原轮30过/3红；仅修被替换盾面和双方实际受击的旧视觉前提后，原3叶子实际通过，758项输入前后相同。相关47＝新14＋原未变30＋叶子3，非单轮47；旧415中382本轮未执行，不冒429整体通过。根/Vue类型构建、资产终态及提交/归档/HTTP身份均已核对，详见[最终验证](https://github.com/GOD-OF-PPT/chenyuan-wendao/blob/c7190e67a265fe7c8bff63a1db222a434d7dcffd/goal-4/evidence/ta07/verification.json)。
- 新五文件31,083/36,000B，其中操作组10,745/12,000B、演员组三文件20,338/24,000B；旧全局反馈33,973/34,000B、ART02 41,602/45,000B、idle-adventure 43,962/45,000B，cap未上调。当前[独立代码审查](https://github.com/GOD-OF-PPT/chenyuan-wendao/blob/c7190e67a265fe7c8bff63a1db222a434d7dcffd/goal-4/evidence/ta07/source5-code-review.json)没有发现合同范围内剩余代码/安全阻断，不等于最终整体验收。

## 实际像素审阅边界

[source5逐图记录](https://github.com/GOD-OF-PPT/chenyuan-wendao/blob/c7190e67a265fe7c8bff63a1db222a434d7dcffd/goal-4/evidence/ta07/visual-review-source5.json)登记了root实际逐张审阅的8张原PNG：手动操作、护体、真实起手、存档错误、符修缺图/减效、原意图重试、终结和回春。各图保留原PNG/hash与原尺寸JPEG68轻量副本及hash；本实施记录引用该审阅归属，没有重新打开图或新增像素验收。

这些代表图确认当前操作层级、完整错误授权、身侧/自身下部反馈、实际成本和导航留白；共20张生成PNG中的另12张没有被该审阅覆盖。八张图、局部几何与代码审查均不能代替所有动画帧、八页整体游戏感或真实用户认可。

## 交付后续与回滚

TA07当前工程单元已提交并完成同源试玩闭环。后续TA08采集/委托实体、TA09玉简/器纹、CHECK-TA-03八页复核，以及M04正常路线/恢复、M05性能、M06兼容最后、干净同版本包、最大C端/代码/安全评审与真人复验继续开放。整体美术、长期平衡和用户负面复验不由本项机器绿灯关闭。

回滚只独立revert本项UI/资产/守卫，保DB9/DB1可读、原档、原件、旧冻结/红例、原始输入和13份在途；不降数据库、不删历史。本记录不授权push、合并、公开部署或权限变更。完整check、提交、归档/HTTP及用户只读证明见[最终验证](https://github.com/GOD-OF-PPT/chenyuan-wendao/blob/c7190e67a265fe7c8bff63a1db222a434d7dcffd/goal-4/evidence/ta07/verification.json)与[杠精审查](https://github.com/GOD-OF-PPT/chenyuan-wendao/blob/c7190e67a265fe7c8bff63a1db222a434d7dcffd/goal-4/evidence/ta07/review.md)，整体目标继续active。
