# U5：研习、配装与补给安排合同

2026-10-21，Asia/Shanghai。依据[本次原始输入](https://github.com/GOD-OF-PPT/chenyuan-wendao/blob/c7190e67a265fe7c8bff63a1db222a434d7dcffd/goal-3/amendments/2026-10-21-heartbeat-u5.md)、[全25类准则](0006-idle-gameplay-interaction-rules.md)与[本轮一手来源](https://github.com/GOD-OF-PPT/chenyuan-wendao/blob/c7190e67a265fe7c8bff63a1db222a434d7dcffd/goal-3/research/u5-preparation-sources.json)。本文是实施前合同，不是九类已交付或整体游戏已验收。兼容开发/测试继续暂停。

## 研究与本项目取舍

Melvor官方[v1.2更新](https://news.melvoridle.com/major-update-v1-2/)提到累计且紧凑的通知、可直接看见的恢复阈值和装备信息；本项目据此就近显示药匣目标、器槽和持久成果。官方[v1.3说明](https://news.melvoridle.com/free-content-quality-of-life-updates-coming-in-v1-3/)介绍部分属性来源与选择前可见的技能收益/周期；本项目据此在玉简/器槽/货架上预览真实作用与成本。均为历史发行说明，不是完整竞品试玩或采用其数值。社区/wiki片段和404页不作为事实。

U5覆盖 BUY、SELL、USE、REST、STUDY、LEARN 六种周期活动，以及 SCHOOL、EQUIP、EQUIP_RELIC 三种即时限次配置。前者完成玩家明确安排后逐周期执行，后者预选→比较实际变化→确认后原子应用一次，没有假长读秒。与当前唯一成长活动冲突时先明确暂停；不增加后台独立监视器或无限守候。常驻战斗阈值服丹和战中策略留U6，仍须BATTLE heal/restore占回合。

## 参数与纯模型接口

正式价格/地点/境界/收益/恢复公式不变，以下在线周期为未平衡初值：BUY/SELL每件15秒，USE每丹6秒，REST30秒一次，LEARN每卷30秒，STUDY惊鸿剑简60秒一次。所有周期复用完整单调时间＋存档dueAt双门与可取消同周期续等，不补离线、不追赶。每次交易Command.quantity固定1，命令数与成交单位因此一致，不把任意quantity当executedSteps。

新增严格PreparationPlan联合分支（公开从activity.ts导出），版本5的PreparationActivity覆盖六类；旧v1—v4形状及历史回执保持。名字与字段如下：

- LearnPlan：kind learn，skills为1—12个去重的已选功法id，maxCycles等于skills.length，stoneBudget、stoneReserve。按选择顺序每周期一卷；默认仅当前选中一卷、预算等于所选总价、保留0。已学不能再次安排/收费，不自动换派或装备；正式引擎允许跨流派研习，不能加限制。
- StudyPlan：kind study，manual jinghong，maxCycles固定1，stoneBudget、stoneReserve；默认80灵石/保留0。青云宗、筑基门槛，已研读停止；符修当前无该剑法收益，必须直说。
- BuyPlan：kind buy，item、maxCycles（1—50）、until cycles/target、targetQuantity（次数模式null）、stoneBudget、stoneReserve。默认1件/相应单价预算/保留0；可改本段总量或库存目标。每次只买1，完成库存目标、次数、累计预算/保留/资金、容量、地点/状态边界即停。收入不重置支出。
- SellPlan：kind sell，item、maxCycles（1—50）、itemReserve（0—库存上限）；默认1件、保留0，完整明示。每次只卖1，累计耗物与灵石收入分开；保留线/次数/缺物/货币容量/资格边界停止。突破物禁售；两种恢复丹原规则可售，不能用USE else SELL隐藏这一能力。
- UsePlan：kind use，item仅合法恢复丹、maxCycles（1—50）、targetPercent（1—100）、itemReserve；默认恢复至100%、最多3丹、保留0，预览实际可用量。仅当前属性低于目标时逐丹恢复，达到阈值/圆满/药物保留/用量或无变化就停，不占活动槽空等以后受伤。战斗不能调用USE。
- RestPlan：kind rest，maxCycles固定1，remainingMonthsReserve（至少1）；默认保留1游戏月。正式一次花1游戏月恢复气血灵力至满，不伪造分段恢复；已满不可空耗。

新活动明晰记录spentItems/gainedItems、gainedStones、restoredHp/restoredMp、learnedSkills/studiedManuals；保存必要的起始/上限体魄以验证真实封顶恢复。累计量、下一动作、预算/保留与无变化停止由纯规则复用previewActivity/createActivity/completeActivity，不把零资源delta误判为研习无效果。对USE/REST允许正式HP/MP恢复，但不能删除旧四类HP/MP不变保护。ActivityPreview新增真实恢复/掌握字段，旧类型零值；旧消费/UI字节预算保持。

## 即时配置与原子保存

纯configuration.ts定义ConfigurationAction（三种封闭Action）、ConfigurationIntent={command,expectedActivityId,expectedActivityRevision}以及正式before/after配置预览；不接受任意脚本。Store提供prepareConfiguration/applyConfiguration，准备只复制稳定commandId/runId/expectedRevision及活动CAS，确认可撤销。SCHOOL必须显示三基础功法槽将替换、研习记录/法宝保留；EQUIP比较当前/目标槽与实际作用；EQUIP_RELIC比较两器实际效果。已装备、未学/未拥有、门派不符、战斗/待决和存档/活动忙均有真实禁用原因。

Repository新增专门configure(intent)原子入口，活动CAS防Game revision未变化却已换安排的旧预览覆盖；重放先验证完整意图fingerprint，回传最新Game/activity和原结果，不重新换装。新专用配置回执严格形状，保留原配置变化证明及历史可读性，后续合法再次换装不损坏旧回执。收益/Game/previous/回执/旧暂停活动STATE_CHANGED同事务；配置结果来源是玩家配置，不能因instant=true误标普通活动周期而压掉专属反馈。真实失败同意图重试，禁止自动刷新意图扩大授权。

DB升7隔离旧6客户端，Game/内容/数值格式不变；旧档、检查点、活动与回执原件保留。普通execute/actPrepared拒六类新周期旧短写旁路与三类配置旁路，已有合法旧回执可严格重放但不能重执行。原四活动/双时钟/并发/归档合同保留，回滚须保留DB7读取与原件，不直接退旧DB6程序。

## C端与验收

传法玉简显示流派/真实作用、已掌握与有限研习清单；功法/本命槽比较后一次确认；药匣以当前气血灵力、实药、目标和洞府恢复取舍组织；坊市以货架物品、价格、数量/库存目标和保留线组织。复用既有主题画与DOM图标，不套同一通用表单或隐藏入口。新U5原生组件/CSS/表现helper预算60000B，旧共享22000/来源24000/生产26000及所有旧预算不放宽。低频限额按需展开、全部条目分页、一屏入口与返回、正文18/辅助14/控件44保持。

所有入口（含旧模板、筹备、渡劫准备）统一路由：查看装备不得暗中旅行到宗门，需要研习/采购/疗养才明确前往对应地点并保留草拟安排；不自动开始下一活动。当前活动、周期/累计真实效果、暂停/停止与完整回执跨页保持；恢复/交易/研习不逐次弹窗领奖。

验证覆盖全部技能/可交易物/两丹/疗养、选择三槽与法宝、默认/自定义限制、预算/保留/阈值/已学/已满/禁售/容量/余寿/缺资源、零价跨派研习、费用和完整Game、无自动装备/旅行/战中USE、配置CAS/原回执后续合法配置、失败/回滚/丢回复/暂停竞态/刷新/接管及DB6保留。固定1440×900单Chromium实拍/命中与当前33UI/51IDB回归按新交互合同接续，不删原业务断言；新增至少一条真实新周期，长流程虚拟时钟只验规则。当前四项候选隔离与全部兼容/性能矩阵仍未执行，不推送触发旧CI。
