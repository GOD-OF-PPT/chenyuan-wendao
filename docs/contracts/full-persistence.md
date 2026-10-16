# Full IndexedDB适配器

日期：2026-10-16。Goal 1 / T04实现基础事务，T05补齐幂等与恢复，T06正式Store与最小页面已接入本模块。

## 数据库与原件保留

`web/src/full-persistence.ts`使用原数据库名`chenyuan-playable-v1`，当前数据库版本3。T04的v2新增full-state、full-receipts、full-backups三个store，T05的v3增加检查点归属协议；原state/receipts保留且不改写。名称中的v1是历史来源名，不是当前数据库版本。

v1可直接升级v3：在同一个versionchange事务中读取最新旧记录，调用已知格式解析，验证当前档、上一成功档与突破前检查点，保留原件和迁移身份，再写full数据。任何转换/写入失败均abort，数据库版本仍1，原旧store仍可读取。拒绝过的blocked请求在阻塞解除后也会abort，不会偷偷迁移。

v2→v3只处理已经权威的full记录，绝不再把保留的v1旧进度套回来。归属补齐和内容转换在升级事务中完成，失败时版本仍2；成功升级触发旧连接versionchange关闭，避免旧适配器继续写入而破坏新归属协议。已知版本缺少应有stores或full为空但旧记录仍在时拒绝，不自动补成新空档。

已存在v2数据库时，open会检查full内容版本。已知full-demo.1按运行契约转换：当前、previous与检查点一起校验、备份并写入；未知版本或不一致检查点拒绝，原记录不变。已是当前版本的档不重复迁移或更换身份。

主档缺失但仍有上一档/检查点或不可用记录时明确拒绝，保留原件并提示恢复/导出；不能把这类异常当作新空档。

迁移当前档产生新runId/revision=0，使旧连接/指令失效；角色、物品、游戏时间、未决事件与战斗保持。旧事件实例按真实event.id重建，不硬编码temple。previous和检查点保留其源快照身份，恢复前必须再次验证。迁移备份包含原始current/previous/checkpoint与内部MIGRATE身份，不上传、不提交Git。

已知旧格式在替换人生时会清除检查点，因此迁移时旧检查点必须属于原current的run；不把另一人生的准备快照混入当前档。迁移后的新current身份与归档源身份分开保留。

## API与写入身份

| API | 语义 |
| --- | --- |
| FullSaveRepository.open(name?) | 默认使用上述数据库；可指定测试命名空间。完成升级/内容迁移后才交回连接，存储不可用不建立临时游戏 |
| load / loadPrevious / loadCheckpoint | 原生readonly事务读取并验证；不存在返回null，坏记录或归属不一致拒绝，不清空重开 |
| archives | readonly读取迁移原件，便于后续备份界面导出；不是云存储 |
| create(name, mutation) | 显式创建新局或替换当前局；无自动赠境界，等待事务complete |
| importText(raw, mutation) | 先限体积/解析/验证，再在事务内CAS替换；同时保存上一好档，清理旧回执/活动检查点 |
| execute(command) | 读取最新状态、检查回执、resolve，再原子写状态/previous/回执/必要准备检查点 |
| restoreCheckpoint(mutation) | 在同一事务检查当前身份和准备快照，替换完整状态、刷新runId、保存previous、清理旧回执并保留检查点 |
| FullSaveRepository.exportRaw(name?) | 先只读枚举数据库，不存在返回null而不open；已存在库不指定版本、不迁移地读取；不支持枚举时明确拒绝，避免留下空库 |
| rawBackupText(backup) | 将当前JSON原件编码为独立备份格式；undefined记录有显式标记，不能无损编码的结构化值明确拒绝 |
| close | 关闭连接；versionchange自动关闭，旧连接再用明确拒绝 |

普通动作使用T03的Command，校验commandId/runId/expectedRevision。create/import使用`SaveMutation {commandId, runId, expectedRunId, expectedRevision}`：runId是新目标人生，expectedRunId/revision指明被替换的当前档；空库只接受expectedRunId=null、expectedRevision=0。新目标不得等于当前或被导入的原人生。一次意图重试保留相同身份和内容。

所有输入在异步写入前复制，页面随后改动原对象不会改变已提交的意图。自动迁移在独占/读写事务中生成内部MIGRATE身份，绑定原run/revision并归档。数据读写的CAS在事务内完成，不靠按钮禁用或BroadcastChannel作为最终约束。

## 原子提交与回执

事务回调不等待网络或其他外部Promise。只有transaction.complete才返回成功；请求put成功仍可能整次abort。当前状态、上一成功档、回执和必要检查点任一失败都回滚，调用者必须保留“本次未保存”的错误，不能用重读旧档冒充成功。

已提交普通指令的重试返回原ActionResult与最新Game，避免重复奖励和界面倒退；同编号不同请求拒绝。回执先于过期revision判断，但必须验证自身命令/指纹、版本、身份、前后revision、步数/停止原因、阶段、毛成本、净变化及已提交历史界限。null/undefined等坏记录不当作“无回执”重新执行。

create/import/restore控制回执也校验格式、原意图和参数。重复请求只返回最新状态，不再次创建/导入/回退。所有异步写入入口用Promise拒绝；存储访问被拒绝、连接关闭、配额不足与事务abort明确失败，不转入内存游戏。重读上一好档不是本次写入成功。

BREAKTHROUGH/START_TRIAL使用T03返回的检查点用途，在同一事务保存完整行动前快照。检查点验证格式、源身份、版本及该用途的准备动作确实可执行。checkpoint-owner独立记录当前人生与源快照的关系；T04旧格式缺归属时只接受同run或可由归档原件证明的迁移关系，不能未经证明接入另一人生的检查点。

恢复替换完整Game而不单独返还物品，新的runId/revision=0隔离旧标签页；同事务保留完整准备快照、更新其归属并清理旧回执。恢复后的正常行动可以继续，重复旧恢复意图返回最新进度；新的恢复意图仍可再次使用同一个检查点，直到它被新准备检查点替换。多次渡劫失败不会失去准备恢复路径。

原始备份不是可玩存档，不能通过普通importText误导入。导出不升级数据库、改写记录或解释未知格式；不支持无损JSON表示的数据明确报错，原件仍在。T06接入下载、通用恢复按钮与失败提示；渡劫专用准备/恢复交互继续在T13—T15完善。

## 测试边界

`npm --prefix web run test:persistence`启动独立本机Vite测试页，在Chromium/Firefox/WebKit真实IndexedDB中执行，没有fake-indexeddb。测试使用隔离浏览器上下文/测试数据库名和明确的故障注入；正常网页路线验收不调用这些测试操作。

测试页、动态测试模块和原始存档不进入生产dist；正常生产入口仅使用full Store。测试涵盖真实旧引擎9阶段×6组合、实际旧Repository连接、M1原始快照、full内容升级、非temple事件、未决战斗、坏档/未来版本、blocked/配额/abort及准备检查点。各阶段实际结果见T04—T06实施记录；三引擎存储通过不等于网页飞升、真人或永久落盘保障。


## T10数值版本迁移

DB继续v3，Game schema继续2。已知full-demo.2 / full-unbalanced.1和更早已知full v1按运行契约升为full-unbalanced.2；current、previous、checkpoint、owner在同一readwrite事务内验证并备份原件。原回执逐条保留原值和原键（包括顶层undefined），再清空活跃回执并写入MIGRATE；current换runId/revision0，使旧指令不能重放。checkpoint仍可重复恢复完整准备状态。没有差额补收、物品补发或游戏年月补算。

归档游标、状态、检查点、owner、新回执任一步失败都回滚，包括归档配额错误；重开当前版本不再迁移。未知数值版本保留原档并拒绝。DB未增版的理由是T09旧full客户端每次写入都读取并validateGame/resolve校验数值版本；它会拒绝balance2，不能把旧缓存写回。T10以精确旧引擎做只读兼容核验，并在三个真实IDB引擎上验证迁移/失败/旧指令与两次恢复，不声称执行了旧版整站跨标签自动化。
