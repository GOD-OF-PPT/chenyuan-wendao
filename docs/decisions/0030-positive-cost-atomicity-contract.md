# MATRIX-M02：正消耗周期的原子性与交付归属

2026-10-24。承接0021/0028、ART06与当前Goal4任务；只做这一独立单元，保留整体艺术/长期平衡/完整矩阵/真人责任。

## 范围与参数

复用正式Activity/Store、setupPersistence/setupMilestones、规则路线与activity-store-harness。18个明确阳性：辅助修炼；回春丹炼制；青霜剑炼器；付费功法研习、剑简、买回春丹、卖回春丹、使用回春丹、使用回灵丹；斗法术法、战中回春丹、战中回灵丹；开场help/trade、沈清禾bargain/assist、筑基突破、渡劫入场。每格先验证正式resolve合法及指定灵石/材料/丹药/MP确实有正消耗；costs与完整净变化分开，不以采集收入或单纯月份冒称耗材。伤血/缺灵边界可以合法校验后的独立测试夹具构造，必须明说并非正常赚取路线或真人节奏。

每行验证五边界：Q回执put抛QuotaExceededError；A真实put成功但transaction complete前abort；L真实settle已提交后丢回复；T未提交原tick在别页resume接管后拒绝且全库不变；R已提交tick在明确接管/暂停并替换活动后重放，只返原回执及当前snapshot、全库不变。Q/A恢复后只执行原tick；Q/A/L再重放一次均只得同一回执。记录实际注入命中数/DB/store/key/command，并保完整Game/Activity/全部object stores/previous/checkpoint-owner/receipt原始payload，不只存布尔通过。

Store消费者另验18行L原命令重试与完整库不变；至少辅助、炼器和突破三个不同活动的H边界：提交后hold真实回复→别页明确接管/替换→本Store只读刷新接受新Game+Activity→释放旧回复，不能覆盖已接受的新活动或重启旧时钟/重播旧成果。活动ID/revision/owner/generation与Game run/revision共同判定，不能只看Game revision相等。再补跨人生旧回复/重试的隔离控制。重复活动与有限里程碑同样保先保存后成功。

替换活动是测试中明确选择、受理新START的安排，不是产品自动续行：普通境况安排另一个合法行旅，战中安排单次招式，问心明确选定合法回答但不结算。未知分支不能在真实游戏代选。未完成原活动先由当前owner暂停或明确接管后暂停；不放宽ACTIVITY_RUNNING/OWNER/STALE/RUN_MISMATCH守卫。

## 研究依据与风险

本轮实际回读MDN [transaction complete](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction/complete_event) 与 [abort](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction/abort)：成功交付以事务complete为界，事务提交前abort须回滚，提交后丢回复是另一边界。18行及具体注入/归属策略为项目推导，并非MDN规定的游戏矩阵或认证。

重点风险：测试用免费动作冒充耗材；只核余额漏Game因果/持有/阶段与检查点；丢回复后重新授予命令；仅Game revision防旧回复却漏同revision的新活动；旧回复覆盖较新读取/其他人生；重放结果演成新奖励；测试替换真实用户档。先有真实红例再最小修复Store交付层，不能预设存在bug改事务/规则；无红时补证据也如实记录，不强造产品红。

历史300是旧100声明×三引擎，当前211不是差89。旧10文件中local-experience18已覆盖，另9文件82留逐语义映射；旧execute定时动作现应ACTIVITY_REQUIRED，不批量放宽守卫恢复旧绿灯。控制写/迁移/全路线/恢复继续M04等独立责任，M02新数不替代旧矩阵。

## 验收、边界与回滚

先保存本合同/原话/计划/任务和13在途保护，再写代码测试。测试固定1440×900单Chromium，仅隔离新DB/浏览器context，虚拟钟只验证完整单周期/原子行为，不称真实成长。所有当前输入在执行前冻结哈希，执行后复核；原失败保留。新增两个spec登记idle-persistence配置，全部现有211真实IDB相关回归、规则与类型构建；若Store改动影响UI，则定向当前活动/接管/错误/原重试UI及真实周期复核。资产无改动以精确hash继承、全源配置实际重跑，不开展兼容/环境性能。

每个用例时限沿现配置/expect默认，不用sleep或拉大超时掩盖初始化；等待公开就绪/实际IDB信号后再推进原周期。未提交旧意图拒绝的具体正式错误按检查顺序核对；新人生RUN_MISMATCH，不允许旧人生回执新授奖。

独立本地实现提交、测试原始记录与简明覆盖表、同源构建/归档和tasks/杠精为工程交付；如运行源变化再冻结/更新原试玩，前后只读核对进度，不用用户档测试。无运行源变化保留原试玩并证明payload同源。原13/v0.3/存档/输入/全部失败与旧冻结保留，无push/合并/公开部署/改权限。回滚只revert本项Store/测试，不降DB9或改变旧proof、价格、周期及成长。

[杠精审查] 开工通过：有18个真实消耗与五事务边界、Store交付组合及原始payload责任；不以旧计数、免费样例、纯字段断言或机器绿灯代整体艺术/真人。具体夹具消耗值由正式内容核对后记录在case表，未落实前不运行该行。

## 已落实的18行与复核补充

辅助20石/60s；炼丹2石+2草/30s；青霜剑140石+3玉1核/60s；研习100石/30s；剑简80石/60s；买丹18石/15s；卖丹1枚/15s；两种服丹各1枚/6s；斗法术法8MP/3s、两种战中丹药各1枚/3s；开场help/trade各耗回春丹1/6s；bargain18石/6s、assist2草/6s（另获回春丹1，不抵消成本）；筑基丹1/30s；渡劫引1/15s。战斗药物的不足由真实术法+格挡形成；普通服丹两行使用明确校验的伤血/缺灵边界，其他资源由正式规则路线取得。

原源已实证H同revision新活动被旧回复覆盖；最小修正的117项初轮通过后，独立对照又实证普通重读恰为同份成果时首次破境结果被过宽抑制。故再读后按完整Game+Activity相等判当前回复，不凭readEpoch变化直接把首次成果当历史。H同时记录同步状态watch和公开observe，不仅最终值；新增跨人生原pending重试、已丢回复原forge回执接续外页新进度、确认再读交付失败后同步三控制。当前计划新121格（90原生+18丢回复Store+9H+4控制），不是拿总数替旧语义。

原trial-entry“已有好检查点→失败仍保留”尚未由本18行覆盖：本行import后起始CP为空。明确保留M04真实入场/完整恢复/第二次失败组合，不称M02关闭全部旧trial-entry；不手put假检查点补绿。
