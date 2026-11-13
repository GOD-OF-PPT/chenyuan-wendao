# 质量评审完整实施目标

2026-11-12，用户要求依据四份质量评审设置目标并完整实施。原生目标为 active，实施起点为 `97c10d195bd99ea734ddea46a1edeac7b461fe79`。本文件为本轮唯一进度入口；历史 Goal1–4 与失败记录保留在 Git，不复活已删除的过程目录。

## 范围与依据

- [综合结论](review/00-synthesis.md)为主清单；[体验](review/01-player-experience.md)、[设计](review/02-game-design.md)、[工程](review/03-engineering.md)为证据，原图在 review/ux-shots。
- 报告结论先核实再修改。虚拟时间路线不等于真人节奏；估算不记为实际完整路线；旧红与未执行项不改标签。
- 用户本次授权包含离线收益、默认持续目标、数值与结构改革。[0149 决策](../decisions/0149-quality-review-implementation.md)明确与历史合同的衔接。
- 固定1440×900、单Chromium；跨浏览器、移动/响应式、字号/分辨率与环境性能专项仍暂停。
- 资料先进入 main；实施使用从现有开发头继承的独立 codex 分支，PR 对开发基线提交。每轮一个独立任务，每三项综合检查-debug，最终做 C端、代码、安全审查。

## 全部20项与验收

状态：待实施 / 进行中 / 本地通过 / 已递交；禁止以文档或局部绿灯标整体完成。

| 顺序 | 报告项 | 交付与完成条件 | 状态 |
| --- | --- | --- | --- |
| Q01 | 11 工程止血 | 删除目录后仍可用的最小历史测试输入；LF；alternates、跨盘生成、路径、symlink错误分类；核心/构建实际结果。根测试显式依赖和干净检出验证一并核对 | 已递交：[PR46](https://github.com/GOD-OF-PPT/chenyuan-wendao/pull/46)，本地门禁通过；远端矩阵未重跑 |
| Q02 | 6 八个UI bug | 逐一重现报告8项，真实当前入口与固定桌面验证；保成本/暂停语义 | 已递交：[PR48](https://github.com/GOD-OF-PPT/chenyuan-wendao/pull/48)，90定向UI、937根、415native；[记录](q02-ui-corrections.md) |
| Q03 | 5 游戏文案 | 玩家流程词汇映射；技术身份留诊断；原数据/费用/失败恢复完整可查 | 已递交：[PR49](https://github.com/GOD-OF-PPT/chenyuan-wendao/pull/49)，940根/117UI＋末次命中10例；[记录](q03-game-language.md) |
| Q04 | 7 默认持续目标 | 重复活动目标/手动停止；费用/库存/寿元/危险仍有限；已完成项目不循环 | 已递交：[PR50](https://github.com/GOD-OF-PPT/chenyuan-wendao/pull/50)，945根/40UI/416native有据合成/160规则；[记录](q04-continuing-plans.md) |
| Q05 | 9 操作路径 | NPC选项并排且一次确认；行囊直接服丹/出售；轻量动作去假等待；实际写入一次 | 已递交：[PR51](https://github.com/GOD-OF-PPT/chenyuan-wendao/pull/51)，947根/419native/19UI；[记录](q05-direct-actions.md) |
| Q06 | 10 导航 | 读秒/暂停去重，入口按真实解锁条件，菜单收拢，无效分页器撤除；完整能力与返回保留 | 已递交：[PR52](https://github.com/GOD-OF-PPT/chenyuan-wendao/pull/52)，完整168UI/947根/6基础引导；[记录](q06-navigation.md) |
| Q07 | 3 斗法数值 | 与Q08/Q09一个联合数值任务：修为主线归吐纳，材料/灵石/风险保战斗取舍 | 已递交：[PR53](https://github.com/GOD-OF-PPT/chenyuan-wendao/pull/53)，[联合记录](q07-joint-balance.md) |
| Q08 | 4 寿元 | 正常路线有余量、月成本有取舍、寿尽合法可达；恢复路径与旧存档兼容 | 已递交：[PR53](https://github.com/GOD-OF-PPT/chenyuan-wendao/pull/53)，[联合记录](q07-joint-balance.md) |
| Q09 | 8 经济 | 自采炼制、委托双产出、溢价购买各有价值；完整160路线与专项对照实跑 | 已递交：[PR53](https://github.com/GOD-OF-PPT/chenyuan-wendao/pull/53)，[联合记录](q07-joint-balance.md) |
| Q10 | 1 离线收益 | 持久截止/有界追赶/同意图幂等；预算/危险/寿元先到先停；跨页/刷新/失败重试/导入隔离；返场汇总与160路线复核 | 已递交：[PR54](https://github.com/GOD-OF-PPT/chenyuan-wendao/pull/54)，973根/461Native/完整174综合UI/正常32/160规则，原红和生产身份保；[记录](q10-away-progress.md) |
| Q11 | 2 六类结果反馈 | 抉择、轮收获、突破、胜利、成丹、结局均绑定真实已提交结果；无重放领奖、无遮挡、减动效静态反馈 | 已递交：[PR55](https://github.com/GOD-OF-PPT/chenyuan-wendao/pull/55)，975根/184完整生产UI/两完整正常路线/3原生UI；[记录](q11-result-moments.md) |
| Q12 | 12 CSS收敛 | 显式层级且基线图无意外变化；禁新增important/#app；主题色token收敛并实看 | 已递交：[PR56](https://github.com/GOD-OF-PPT/chenyuan-wendao/pull/56)，980根/195生产UI/两完整路线/3原生UI；[记录](q12-css-convergence.md) |
| Q13 | 13 App拆分 | 先里程碑与四tab再按职责拆分；焦点/返回/时钟归属与存档流程行为相同；目标约30KB而非新字节守卫 | 已递交：[PR57](https://github.com/GOD-OF-PPT/chenyuan-wendao/pull/57)，984根/471Native/196完整UI/正常32，App36,656字节；[记录](q13-app-responsibilities.md)与[审查](q13-review.md) |
| Q14 | 14 守卫改革 | 先补关键行为覆盖再归档台账/逆变换/整文件钉；格式化可审查源码；删已证不可达路径/死样式 | 已递交：[PR58](https://github.com/GOD-OF-PPT/chenyuan-wendao/pull/58)。最终6667879远端8作业全绿：988根/198完整UI/471完整Native/四片精确正常32，[终态与实物核验](q14-ci-acceptance.md)；旧红保原身份 |
| Q15 | 15 回执备份 | 有界保留/索引分页；活动与重试所需原意图不裁；长期合成负载与真实IDB恢复 | 进行中：schema11/送达保护/256明细分页/3整组备份已实现；原23与后续定向各保身份；三审查问题已独立关闭，正在新源完整矩阵；[实施记录](q15-bounded-history.md) |
| Q16 | 16 构筑战斗 | 功法互斥分支、法宝转换取舍、符修补正、至少2–3种敌方机制；剑符/危险/撤退与160路线回归 | 待实施 |
| Q17 | 17 重玩 | 此生账本、两结尾独占回响、明确选择的NG+传承与有种子的部分事件变体；重开不改旧人生 | 待实施 |
| Q18 | 18 文档 | AGENTS常青规则+当前状态，历史归档；README面向贡献者；失效链接有归宿且实查 | 待实施 |
| Q19 | 19 新手 | 引导性首战与委托→灵石→辅助修炼前置；30分钟仅玩法理解观察，不设突破时限 | 待实施 |
| Q20 | 20 仓库体积 | 新增大原稿用LFS/外部可核来源策略，保提示词/hash/导出与消费；不改写已发布Git历史 | 待实施 |

Q07–Q09联合调参、联合回归，作为一个独立数值交付；其余顺序项独立递交。结构任务可在实际受阻点提前一个必要小步骤，不借机改无关玩法。每完成三个独立交付做一次综合检查，覆盖该组三项与跨项存储/导航。

Q01实查确认当前UI源仍被整文件/逆变换守卫钉死；Q02前先做Q14的必要行为接管步骤，保旧检查为明确历史验证并建立当前行为门禁，不再为新UI追加逆变换。该步骤计入Q14进度和三任务检查计数，不能因此把整个Q14或其余19项标完成。

当前完整报告项递交14/20，Q14已递交PR58且远端完整终态已核；Q15实施中，Q16–Q20继续。前两组[综合检查](check-three-01.md)、[第二组三任务综合](check-three-02.md)原源/原红保留；[Q06/Q07/Q10综合](q10-three-task-check.md)按64689f5完整174UI、461Native、正常32及973根/160规则闭合。[Q11/Q12/Q13综合](q13-three-task-check.md)按4b0eba2完整196UI、471Native、正常32及984根/十核心闭合，旧生产身份保。当前Q14为新组1/3，Q15/Q16后强制综合；全部20项目标继续active。

## 验证与交付门槛

- 每项有实际问题红灯与有意义的规则/集成/固定桌面证据，记录命令、版本、结果和剩余风险。修复基础设施不要求重新跑全部暂停的旧CI矩阵。
- 保存协议仍为 commandId/runId/expectedRevision、活动CAS、单事务与原意图重放；离线新增规则由正式引擎/仓库负责。
- 数值变更先处理 content/proof版本与旧档迁移；联合160路线、新手/零资源/两修法/寿尽/三结局与失败恢复分项记录。
- 不强推、不删用户历史/玩家档/旧失败、不改仓库可见性、不迁移已发布历史到LFS。
- Q14之前的远端工作流会启动暂停的兼容/性能矩阵，之前递交使用 `[skip ci]`。Q14已实现当前固定范围的CI，收尾提交允许实际运行并观察终态；旧专项原件归档保延期，不把未运行的远端检查说成绿。
- 实施日志置于本目录，原始本轮工具产物在 artifacts/quality-20261112，不提交存档。最终逐项核20项，无未完成项才关闭目标。
