# Q10 当前存储矩阵与旧在线责任接续

固定1440×900、单Chromium，不是兼容/环境性能矩阵。Q10生产时钟合同为0157；旧在线Interface和旧数值不被新默认覆盖。

## 首轮完整声明与执行

`full-declaration-6de992b.json`在执行前收集完整456项（原425＋当时新31），声明无错误。`full-native-6de992b.json`实际436过20红，0skip/retry/flaky，429.093秒。全部原始日志、JSON和trace保留，不修改为后续绿。

20红按实际原因分别为：5个历史schema夹具把当前DB10空full-schedules也复制进自称DB4—8的旧库，正式迁移正确拒绝；5项严格DB当前/未来常量仍按9/10；3项旧规则库的whole-raw升级期望或旧9客户端的错误层级仍按原schema；7项旧在线故障注入没有命中新默认离开入口。不是20个已经证明的引擎/存储破坏。

## 明确的适配

- 历史DB4—8夹具继续用原正式活动产生Game/CP/回执，合成旧schema容器只包含对应原库；`legacyDatabaseFixture`只移除当前夹具的空钟库，非空则拒绝，不能剥掉真实离开活动来伪造旧档。这5项是历史schema夹具，不冒称运行过原已发布二进制。真正旧v3/DB9来源仍由冻结旧Repository实际写出。
- 升级目标严格为DB10；未知未来DB用严格11，原versionchange/关闭旧连接/未知库原件/完整数据断言保留。真正旧v3库的预期whole raw等于原对象全集，只改变版本10并增加唯一空full-schedules；原三库、Game、CP、回执和旧数值逐字保持。旧9客户端读10先按数据库版本拒绝，不能再要求绕过该拒绝才报Game版本。
- `fault-app`默认仍是生产scheduled。只有原`fault-matrix`和`online-recovery`显式选择online，转接真实公开`startOnlinePlannedActivity`、`startOnlinePreparedMilestone`、`resumeOnlineCultivation`，不替换Game、规则、存储或时钟。旧在线重放的原结果/全库/最后1ms/原生六秒与错误反馈断言保，不能把它们当新离开默认已过。
- 新默认另用真实App补突破与END：按完整原周期最后1ms不变，真实提交丢回复后保存待确认/原操作重试按钮可见，点击原批重试后全Game与原逐轮结果完整、全库不增写、无新奖励演出。另补真实pre10空钟库冲突拒绝，连空原件也保。

原测试题名/声明不删除、不改名或按失败扩大排除。`native-schema-adaptation.json`绑定原6de992b及逐文件改动来源。先前8份Store专用在线调用映射继续保其独立原件与555处expect AST证明，不借这次适配改变其身份，也不将重叠范围相加。

## 定向实际结果

`native-adapted-first`受影响11份测试88/88通过（50.9秒）；`native-production-fault34-first`新模式完整34/34通过（11.9秒）。后者含原31＋真实pre10钟库冲突＋真实App突破/END丢回复。两张当前故障截图已实际打开查看：原尺寸1440×900，当前真实新境界/封卷、保存待核对、原操作重试及导出原件可见，未额外发奖。不将88＋34称作完整当前矩阵已通过。

## Standards

独立只读评审无发现。按test作用域比对原881处matcher AST，867处完全相同，14处只调整10个严格DB版本值、3个完整升级raw期望和1个旧9对10的错误层级；新增27处，无原断言删减或放宽。原fault-matrix的61处和online-recovery的88处matcher均完全相同。评审没有运行服务，不代主控终态。

## Spec

独立只读评审无隐性削弱发现，符合0157“旧在线专属保在线模式与原断言，新离开另有实际行为”。helper只用于5个显式pre10夹具且拒删非空钟；新模式完整Game、原回执及全库不变另有实际行为。未触及生产运行时或旧UI8范围；88和34分别记录，完整矩阵仍待新轮执行。
