# CHECK-MATRIX-01 source3 生产代码与安全复核

本审查只读生产diff、实际源码与既有原件，唯一新增本文件。未修改生产、测试、合同、AGENTS或旧账本，未运行测试／构建／浏览器，未加载图片或用户存档。结论为代码范围，不是当前target、最终完整UI或HUMAN签字。

**本次未发现需要再改的明确代码／安全阻断。** 四dialog新guard与fresh CHOOSE焦点包装符合0032的窄范围；原source2运行红不能据本静态意见宣布已修好，仍须source3实际反控制和完整回归。主控告知当前target28含四个late-close控制正在运行；本审查未消费其终态。

## 精确输入与范围

实际build runtime `0183655fe7530f8afe09536209802bd9b3ecefefec212af931b65f5943a2a9f8`，App `74ca78ab…`，236运行源、62文件／7,814,167B；基线HEAD仍c98882c dirty。与前次ca3290 App静态复核相比，新增fresh CHOOSE包装及四个持久dialog的open-state门槛；此前焦点所有权逻辑仍保留。

| 当前生产文件 | bytes | SHA256 |
| --- | ---: | --- |
| `web/src/App.vue` | 148403 | `74ca78abf0b8f34f942430b4ce8dc1a3825df42497441a5a84bbfcf4cf11c778` |
| `web/src/ActionFeedbackStage.vue` | 10832 | `ead3d1d9b26112fe2bbdd952fe7d19787aae5c7546839e14b2dea2c8e67e79ae` |
| `web/src/action-motion.css` | 11930 | `fb7d717829fdca981c9fd94050285bca0b23a9aff434f663dd3317d0c20b69d9` |
| `web/src/narrative-objects.css` | 13157 | `b55fa5de92a6ad82600864c5ef648c4a0e489841688f089a2a5f2c8c4ec7ab9a` |
| `web/src/FeedbackSkip.vue` | 2263 | `4a6ff806b165a34558574ee71139769e1c2ab0abe9d762fe48b5e3010e88ba20` |

`git diff --name-only HEAD -- src web/src`只有App、ActionFeedbackStage、action-motion.css、narrative-objects.css四个既有文件；`git ls-files --others --exclude-standard web/src src`仅FeedbackSkip.vue。正式src、Store、focus.ts、milestone-view.ts、FullSaveRepository／DB规则未改。原无关13在途不被此声明冒称清理或提交。

全局action反馈原三文件实际33957／34000B，14族／12粒子／1600ms不涨；新FeedbackSkip为2263／4000B、无新位图。narrative CSS仅把真实trial-restore-confirmation的p纳入原18px规则；action-motion.css只改首行说明，不改任何动效值。正式Game／命令／CAS／费用／周期／存档版本与public projection均未因本项改变。

## 本页阶段焦点与fresh CHOOSE

- `App.vue:186–208`只在原prepared返回见证、当前v7 running、原run／Game revision／plan／owner一致后arm私有UI请求，再绑定精确Activity id／generation／owner及原nextCommand。观察成功需本页owned、非replay、原cycle command、revision+1、单次stopped；已保存事实未匹配时不授焦点，不以随机当前Activity当原成功。
- 自动selectTab前保存observedNavigation，仅承接该条自己的切页；`ownsStageFocus`在nextTick前后复核导航／sync／run／activity／generation／owner、error／replay／暂停、当前完整保存与available。任何新pointer／keydown／新导航撤授权，合法新焦点或已开dialog不被抢。请求不入Game、DB、公共记录或奖励。
- `confirmMilestone`保留原`useMilestoneReview.confirm`整个确认／取消／失败／重试链，只在`!retrying`、captured review为prepared CHOOSE且原review已关闭时尝试arm；arm仍有原返回见证和全部归属门槛。其它有限动作不因此获取新的焦点授权。retry分支绝不arm，旧receipt／重读不补交接，不刷新旧命令或代选未知剧情。
- 原`confirmEnd`、`confirmTrial`、`confirmAscension`仍先校验实际review身份与原门槛，再调用原Store事务。新增行为只是确认关闭后的私有焦点请求；同步失败保原error和原retry，不将读取失败说成未扣物，也不拿新意图覆盖旧授权。
- 新建请求仍依赖本次真实new_game command返回见证及run绑定，不把任意新run当CREATE。视图更新自己的run导航增量可承接；后来导航／另一人生不应触发旧opening-actions焦点。

这些是对所读具体谓词与调用链的静态核对；K11/12是本次受理后新设置／新历练的实际强反控制，生命周期其它组合只按各自原证据，不冒所有可能交错已运行。

## 四个持久dialog的迟到close边界

App `closeLifeReview`、`closeTrialReview`、`closeTrialRestore`、`closeAscension`均首先核对应真实dialog的`.open`：已经重新打开时，不把一个close通知当作当前review已关闭，从而不清新intent、不调用discardRetryFor。真正关闭后`.open===false`仍走原清理，且原Store.discardRetryFor只匹配同commandId，不能取消其它失败命令；cancelLife的busy防取消语义不改。

`.open`门槛只处理UI事件归属，**不授写权限、不改CAS、不执行Game、不伪造成功**。新确认仍由prepared/current Game与活动CAS及原可用条件核对。新窗口即使被旧close通知打到，保持真实标题与可见确认；真正关闭后仍可释放自己的未受理草案。原重试闭包、失败存档与检查点事务不受该门槛替代。

[source2完整轮](../../../artifacts/goal-4/check-matrix-01/full-source2-report.json)实际K1/K4是在原生键盘取消→立即重开时确认节点消失，新有限行动尚未受理；不是END完成后focus失败。原完整轮76pass／2fail／2interrupted／333未执行、675严格pre/post相同，target28绿不盖此红。

[显式late-close反控制原件](../../../artifacts/goal-4/check-matrix-01/late-close-red-report.json)在未改source2 runtime89449f29上又实际两红：重开可见窗口后向原dialog交付`new Event('close')`，明示`isTrusted=false/open=true`，完整GameDB未变，当前标题／确认被错误清理。它是**合成UI close交付控制**，不是另一次原生数据库abort／close故障，也不能冒称两份原生网络／事件时序遥测。普通原生取消／重开仍独立保留。该控制执行期间合同文档变过一项，summary如实记录，不能称那轮全部输入严格相同；runtime没有改变。

source3的四处guard针对这条确切清理路径；当前真实绿／红与最终完整轮必须由主控终态裁定，不以静态相符替代实际修复验证，也不扩M04完整恢复矩阵。

## 显式提示跳过与安全

ActionFeedbackStage保留原完整Game／Activity／observation tracker和generation清理，scoped-slot仅在可信`notice&&showMotion`、原notice.key下提供dismiss／hold／operation；App只消费BATTLE／BREAKTHROUGH／START_TRIAL。新FeedbackSkip不取Game／存储／command，不创建新钟／奖励／回执，也不重放旧成功。

Vue及compiler-sfc锁定3.5.44，reactive props destructure的watch仍通过getter读最新props；不是把Store复制成失去响应性的快照。原1600ms定时器复用同一clear清理，持有只暂停短提示消退，换页／对象／owner／暂停／error／隐藏／销毁仍撤；降低动效清当前held暂态，新活动可保原静态结果。

FeedbackSkip Teleport到现有HUD footer，保14px／44px；高优先级`outline-offset:-3px!important`把实际focus轮廓收于控件内，防原global正offset压邻入口。`alive=false`及当前是否持焦点、`focus.restore`的新焦点保护，防旧已销毁按钮的晚事件收起新提示或抢新目标；无主动autofocus。它只移除当前表现，原保存成果／完整回执沿原入口保留。静态高优先级正确不等于本审查已看像素。

新增源没有eval／v-html／任意HTML／远端请求／秘密／上传／Game写入；DOM目标为固定现有HUD选择器，事件仅控制局部表现和原focus服务。公共记录脱敏和原proof类型域均没有放宽；新provenance源稿在可提交art路径，非ignored artifacts依赖，仍不冒图像／用户认可。

## 当前结论与余项

本审查限source3上述五生产文件及既有规则未变的安全边界。target28和四late-close强反控制、当前资源／类型检查与最后完整UI尚由主控执行，不代签最终full或整体CHECK。旧source2失败、合成控制身份、输入边界、历史A9／native／CDP原因unknown均保留。

TA07／08／09、M04完整路线恢复、M05性能、M06兼容最后、干净同版本候选／最大review与真实用户整体游戏感／美术／长期放置验收仍开放；用户工作台感负面反馈不被本静态意见推翻。
