# 问心留白候选独立静态审查

只读ignored trial-candidate两文件与当前source7，未改675/生产/测试/合同、未跑UI。候选Stage be8136aa/10905B、CSS b14bcc27/11896B；加未改action-feedback11195B共33996/34000，未抬cap。**未见静态匹配/优先级阻断；不据此签实际留白或整体美术。**

| 原选择器 | 候选 | 每分支/新specificity |
| --- | --- | --- |
| `.motion-cultivation .motion-particles>i,.motion-recovery .motion-particles>i` | `:is(.motion-cultivation,.motion-recovery) .motion-particles>i` | 0,2,1 |
| `.motion-craft .motion-ring,.motion-forge .motion-ring` | `:is(.motion-craft,.motion-forge) .motion-ring` | 0,2,0 |
| `.motion-dialogue .motion-ring,.motion-closure .motion-ring` | `:is(.motion-dialogue,.motion-closure) .motion-ring` | 0,2,0 |
| `.motion-dialogue .motion-sigil,.motion-closure .motion-sigil` | `:is(.motion-dialogue,.motion-closure) .motion-sigil` | 0,2,0 |
| `.motion-battle[data-variant*=heal] .motion-particles>i,.motion-battle[data-variant*=restore] .motion-particles>i` | `.motion-battle:is([data-variant*=heal],[data-variant*=restore]) .motion-particles>i` | 0,3,1 |

五组仅把相同优先级的class/attribute并成:is，后代/子代组合符、声明正文和规则位置均不动。class分支max仍1、attribute分支max仍1，没有引入ID或更强分支。将五组和answer专属size反向替换后，整个CSS逐字节等于source7，故没有借去重改变其它旧样式。

intentional新增`.motion-trial[data-variant=answer]`为160×160、specificity0,2,0；START_TRIAL enter不匹配，仍280及原点位。逗号组没有把battle的specificity提高；release后续280override也保持。Stage的battle布尔别名/两相同头像selector去重等价；仅ANSWER_TRIAL找真实book并取75%/50%，dialogue/closure仍83%/40%，其余轨迹/时长/proof/新旧焦点边界不变。无book时旧非battle fallback没改，不声称新增了所有无book场景禁演出。

90外带把160框半径80扩成各轴170。粒子width2/height26、默认origin偏移(1,13)、translate≤120、scaleY≤2，给blur8预变换两倍16保守余量，各轴上界`13+hypot(137,58)`≈161.77<170；包含旋转全方向，不靠瞬时opacity0。内环120框、scale≤1.15，给blur15两倍30余量，旋转全方向上界`90×sqrt(2)×1.15`≈146.37<170，第二内环更小。这是保守CSS几何推导，不是光栅alpha/全部帧已看证明，更不证明该340外框必然装进真实画布。

仍须原source7实际geometry红→新候选actual motion+90/变换内环/完整画布及所有正文/题记/三tab/header/footer/pager/HUD/nav绿＋fresh像素。保MF1原6秒/fullGame/回执/第一敌不出招，以及K9、K13、START_TRIAL/BREAKTHROUGH/closure原强约束。source7机器绿、旧GJ及本静态审查不能代这条实际像素红的闭环，更不能代TA07或真人。
