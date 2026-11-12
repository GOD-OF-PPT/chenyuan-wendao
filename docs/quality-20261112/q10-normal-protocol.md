# Q10 正常路线观察器与回执快照接续

本项只在固定1440×900、单Chromium执行当前功能/恢复；兼容与环境性能专项没有恢复，240秒原门槛不提高。

## 原32与协议差异

`normal32-declaration-eab42b8`预收集完整32项，原24全程＋6基础引导＋两修法逐关刷新。`normal32-eab42b8`首轮6过26红，861.096秒；26项全在共享`assertSavedTrialEntry`的预期DB9/实际DB10处失败，不把已到入劫的局部路径称作飞升已过。全部原日志/JSON/截图保留。

观察器接当前协议：同一只读事务额外核唯一full-schedules/current，严格DB10和v3周期证明；logicalAt等于原dueAt，resolvedAt为实际观测且不早于逻辑截止。完整Game/previous/CP/owner、原command/result/proof及规则profile都保，完成Activity按logicalAt复演，CP版本来自实际Game。另一单周期consumer也同步，不能继续借观测时刻冒逻辑截止。

刷新另有明确授权边界：停止态仍要求整库逐项相同；运行态仅在原窗口为空、未到原截止且墙钟不变时受理一次零周期接管。要求真实唯一ADVANCE回执、cycles0/morefalse/resultnull、完整before/after Game相同、旧活动/时钟全量before一致，并经公开回执重演验证。整库精确差异只允许该活动/时钟替换和这一份新增回执；全部旧回执/CP/预算/周期/起止时间不改，未来周期commandId可随合法generation重建。普通查看的`checkArt03Read`与`recoveryReadonly`仍严格整库不变，不借刷新扩大权限。

同一reload helper覆盖24路线的reopenStages和两修法逐回合分支。新默认加载已授权时钟，不再点击已不存在的旧在线resume；没有新增或改动任何page.clock调用和原240秒。`normal-clock-call-lineage.json`只证明三个改动文件8处调用/参数及timeout AST相同，不冒称运行次数已相同。

## 实际超时与定向诊断

接线后`normal-reopen2-adapt-first`剑修144.173秒通过，符修在240秒超时，堆栈落在最终整库读取。不能据该落点冒称DB挂死。原周期、路线、资料和完整断言未删改。

加只读Host计时后`normal-reopen2-read-probe`再次1过1超时：剑修54次整库读取全部结束/共70.216秒，符修88次全部结束/共130.666秒，全部走structured传输。符修最终因总预算关闭页面，不是已证单次DB读取不返回。计时只诊断当前功能路径，不是环境/硬件性能认可。

按排序验证三种可能：新回执表示使原安全JSON通道失效、历史/摘要累计成本、底层读取变慢。最小正式开场START工厂和公开校验0.3秒可复现：原整体structuredClone保留proof.stateBefore/stateAfter为同一对象，导致有这一记录的完整观测退回structured。最小红`receipt-alias-minimal-red`与绿`receipt-alias-minimal-green`语义指纹均为`b8c5672e83712af425c361edb653ca93c1d29c0ea390753e97ff1667e10b0a66`，JSON均4681字节、字段形状完全相同；只改变跨证明字段的别名。

正式修正只把新回执input/各proof字段分别取独立快照；不删payload、不裁历史、不改指令/费用/周期/CAS/窗口/校验器，也不重写旧v1。旧存储别名回执实际重放后引用关系和全原库仍相同，新补native验证此义务。

单变量修正后`normal-reopen2-independent-first`实际2/2通过：剑修87.181秒，符修135.440秒；两者所有整库读取走原lossless JSON通道，分别54次/11.656秒与94次/23.246秒。符修多出的6次是完成原先未跑完的流程，不能当等量通用基准。原240秒、所有Clock参数、完整Game/CP/整库检查均不变；这是本项目功能恢复，不作普遍性能数值认证。

诊断fs/TRACE已从web源码全部移除；原诊断脚本/日志留artifacts/q10-away并标为非Native/非UI/非真实时长证据。未继续调整未证明有问题的DB或环境。

## 独立审查与当前状态

Standards定向只读复核无发现：逐字段clone不改字段值、校验或旧数据；reload精确边界不放宽纯查看。Spec独立核同样无新增发现，另核8处Clock参数与240秒AST完全相同，并实际读取两路线2/2报告；不代完整32。

`native-independent35`完整35/35定向通过，含旧v1别名回执不重写。完整Native459曾在表示修正前eab42b8通过；表示改变后不能冒其当前身份，需再按最终新提交执行。完整当前32、三任务综合与最终交付仍待，Q10继续进行中。
