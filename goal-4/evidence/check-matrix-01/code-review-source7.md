# CHECK-MATRIX-01 source7 代码／C端／杠精独立终审

本审查以实际source7 `1451a50fd963676adba12396c67985f81ae74bb71d648f1841443182d39e5815`、236运行源、62构建文件/7,814,366B为准。仅只读源码、最小diff、既有报告/审阅，写本新evidence；未改675冻结输入、生产、测试、合同、AGENTS、守卫或配置，未运行浏览器/测试/构建。source5历史审查、原411通过/3异常及GJ时点结论保持原件。

**未发现source7两处窄修与已保留焦点/skip边界中新增的明确必须再改问题。此为当前代码部分意见，整个工程任务尚不能结束。** 当前K14＋原B1两例实际通过，MF1＋K9＋K13三例实际通过，各675输入前后相同；完整415尚未启动/未判绿（依根代理本审查时状态）。原A9总60秒偶发超时原因UNKNOWN，后来独立49.6秒通过不叫根因修复或性能验收。

## 实际受审身份与精确差异

| 文件 | bytes | SHA256 |
| --- | ---: | --- |
| web/src/App.vue | 148548 | `007bfc19736edcc707371abc918a61aca8d95d4664bc97cd0c4eadd14b52278d` |
| web/src/GoalPanel.vue | 18259 | `7a99f25c92348175866ef8ef6f0ff02f0b0ebddcb944f89d1d7774e1716a4c77` |
| web/src/ActionFeedbackStage.vue | 10874 | `e8a88b7b193c19eaa648a5d7ee0a31060757cdc73f77a3de7771a63b27137bad` |
| web/src/FeedbackSkip.vue | 2263 | `4a6ff806b165a34558574ee71139769e1c2ab0abe9d762fe48b5e3010e88ba20` |
| web/src/action-feedback.ts | 11195 | `e947bb62b1de54e51f172a2d412110ea662a01b599f0b97061e8c238f31a3606` |
| web/src/action-motion.css | 11930 | `fb7d717829fdca981c9fd94050285bca0b23a9aff434f663dd3317d0c20b69d9` |
| web/src/narrative-objects.css | 13157 | `b55fa5de92a6ad82600864c5ef648c4a0e489841688f089a2a5f2c8c4ec7ab9a` |
| web/src/store.ts | 30246 | `cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7` |
| web/src/use-tracking.ts | 1485 | `ef1ff1a6edd1f441441dfe6743696d8c7239e6b9f0be1c22e649049038501c86` |
| web/src/focus.ts | 5410 | `8ae91e78a4db7a854c293fc4b1bc28f02dd0d542b3119cff383f9245b4944eea` |

source5→source7仅两个文件的两处表达式：Stage10874B的存在性门槛收窄、GoalPanel18259/19000B的summary同步开合。将两个表达式分别反向替换后，完整文件sha精确回到source5构建记录（不是只看git改动行数）。App007bfc19、FeedbackSkip4a6ff806及所有正式Game/Store/DB/Clock/费用/周期/CAS未改。相对M03整项现在是五个旧UI生产文件加一个新FeedbackSkip；不能沿用source5“四旧＋一新”的范围标签。

全局反馈三文件33999/34000B、FeedbackSkip2263/4000B、GoalPanel18259/19000B，原cap未抬高，无新依赖/位图/权限/网络端点/DB/schema。仅1B全局余量仍是真预算边界，不允许为未来修缮搬旧实现或缩格式逃避。

## 非战斗反馈门槛复原，同时保战斗演员存在性

原source5 `!!target`被加在全部family前，误压掉正式ANSWER_TRIAL已保存后的trial反馈；trace重建显示真实可见trial-progress/book-canvas不在原generic selector内，其hub-stage只有隐藏祖先。原MF1六秒Game/Activity/唯一receipt/CP-owner已经正确，160ms绘制也未到1600ms，不是测试该涨时限。该真实回归及source5静态全family推断的局限，见mf1-source5-regression；未重写原静态审查来抹失败。

当前精确条件：

`showMotion.value=!reduced.value&&!blocked&&fresh&&(next.family!=='battle'||!!target&&!next.terminal);`

非battle与原条件相同；BATTLE仅实际target且非terminal才演。reduced/dialog/fresh原门槛继续共同生效，不松proof，不改数字、回合、actor归属或旧回执。K13战策页无hero仍禁止motion/number/actor/skip，正式三秒与完整战报不丢，回来不补演；K9有当前演员仍能护体，完整外缘/双方状态/七招/HUD/nav/真实交锋Range原强约束保留。MF1同一原测试现在实际过，第一敌round0/logempty仍不自动开战。

## 迟到真实toggle不覆盖待提交目标数量

唯一GoalPanel改动为真实summary的 `@click.prevent="managerOpen=!managerOpen"`，原`:open`、native toggle、quantityChange、parseTrackingTarget及父select/useTracking都保留。点击或键盘激活同步更新managerOpen，使summary/DOM在玩家开始编辑前一致；其后同一个native toggle即使晚交付，也只把当前open同值写回，不触发旧开合状态重渲染将输入3回填为props1。

此处不直接设目标数量、不代替用户change/blur提交、不改默认物品数量或活动参数。父useTracking仍独立parse有效正整数，拒绝无效target，偏好按runId存入localStorage；不调用Game/Store命令、不清错误或重试。关闭编辑时仍走原输入blur/change，正式Game/Activity/全库在查看和偏好操作前后保持。

K14不是任意合成toggle：它在独立上下文持有原生监听交付，记录`isTrusted=true`、同一个Event/target，填3后释放，再恢复原监听方法；×3、偏好、刷新、全部Game/DB原断言均在。原B1自然流程一字未松并同源实际通过。此为一个新时序分支，不拿它代正常路线或增加旧行动计数；未用等待summary掩盖玩家丢草案。

## 既有焦点和短提示所有权没有退回

App未变：精确START返回见证只arm私有UI token，绑定本页run/id/generation/owner/command/revision/nav/sync；真实非replay v7完整保存且rev+1才ready，busy读后saved/available、无错误/暂停并在nextTick前后再核。新输入/新可见焦点/设置/导航/人生切换先撤旧请求；原retry从不重arm或变新授权。已有可见命卷原位focus，无可见命卷才showLife，保旧closure反馈消费者。四dialog已open时忽略晚close，真正closed仍原discardRetryFor/清review；原native取消重开红与untrusted人工晚close反控分开保留。

FeedbackSkip未变：真实footer按钮可键盘到达，持有仅暂停本次表现timer/画面，不延长Game或预算。Enter/blur清本次短效、动画数字和actor marks，alive guard隔离旧销毁click；恢复焦点仅在原按钮拥有焦点且没有新有效目标时。系统/设置降低动效撤当前held短效/class，未来结果仍保静态与原1600ms，不留下空skip。无演员时没有可跳过的假光效，真实持久摘要和回执继续可读。

## 证据层级与杠精结论

当前两份实际报告：

- `artifacts/goal-4/check-matrix-01/k14-b1-source7-report.json`，sha `ff1a148cb79e1858f937d149d8b58403759913c26fc5039bfc97f9864fff8510`，2 passed、0skip/retry，675前后相同。
- `artifacts/goal-4/check-matrix-01/target-source7-report.json`，sha `ccfc99e903471aa789391e91edf93048def1e49061ed35aa33f03ff69aa3913b`，3 passed、0skip/retry，675前后相同。

source7当前802规则和root类型已由根实际终态0；281资产守卫及native34仍由根运行/收尾，不能把source5的同名绿转贴source7。native首次CLI选择错误为0测试、保原selection-error日志，既不是产品失败也不是通过；正确命令的当前34终态尚未交付。298声明的83未变仓库闭包仍可按原M03来源精确继承，待当前34真过再组成332，而非同轮332。

本代理本轮没有新看图。既有visual-final-independent的source5四代表帧/PNG同源链只证明其实际审阅范围；source7两窄改的整页布局/完整415仍须实际终态，不能用代码或几张代表图替所有像素。Game/存档正确、代码、视觉和真实玩家满意分层；用户各页仍像工作台/TA不足的负面反馈有效。

[GJ] 代码部分暂未发现新增明确打回项；最终工程验收继续等待当前完整415/冻结输入、native与资源、原失败/精确声明、实现提交/同源归档重建/HTTP/用户进度只读和tasks。TA07/08/09、综合八页、M04完整路线恢复、性能、兼容最后、干净候选/最大评审/长期平衡与真人均未完成。未扩大目标、未另建Goal、未动56884用户Game、未推送/合并/公开部署/改权限。
