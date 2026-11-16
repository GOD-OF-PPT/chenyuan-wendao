# 正常新档32路线与实际 UI 发现

2026-11-10，按[0143合同](../decisions/0143-normal-new-life-32-cend12-contract.md)完成现有完整正常3文件32例：24条凡人至飞升核心分支、6条筑基来源引导、剑修16回合/符修36回合的逐回合刷新恢复。原240秒、正式资源/费用、全部逐周期末1ms与完整Game/活动/原子断言保，0retry/skip/flaky，0生产或原测试/公共驱动改源。虚拟钟只验证合法性，不代真人成长节奏。

本轮实际发现的UI问题尚未实施：运行中修炼/入劫仍由预算或核对表主导；问心/收卷已安排时仍保预选提示；单项采购缺量重复。先完成强制CHECK-CEND10-12，再优先重排修炼运行舞台、按真实活动切换回应提示、归拢单项重复汇总，完整能力与原写权保。[实际发现](https://github.com/GOD-OF-PPT/chenyuan-wendao/blob/c7190e67a265fe7c8bff63a1db222a434d7dcffd/goal-4/evidence/cend12-normal32/normal-ui-observations.json)／[有界审查](https://github.com/GOD-OF-PPT/chenyuan-wendao/blob/c7190e67a265fe7c8bff63a1db222a434d7dcffd/goal-4/evidence/cend12-normal32/review.md)。流程通过不等于界面已经像游戏。

实际逐张查看24张1440×900原生PNG的JPEG68副本，原PNG/双hash保。首trace帧误把1440视口当实际像素，真实仅800×500且首帧仍加载，第1次打回与374497674字节原trace保；补拍复用原完整helper，同case18图前后全库相等，545次原时钟参数和74段原结果逐字相同，未seek/pause动画或改结算。观察子集不新增32之外的覆盖。[检查](https://github.com/GOD-OF-PPT/chenyuan-wendao/blob/c7190e67a265fe7c8bff63a1db222a434d7dcffd/goal-4/evidence/cend12-normal32/checks.json)／[原始证据](https://github.com/GOD-OF-PPT/chenyuan-wendao/blob/c7190e67a265fe7c8bff63a1db222a434d7dcffd/goal-4/evidence/cend12-normal32/raw-index.json)。

当前核心路径累计声明在线动作约7.21—7.58小时，不含阅读/决策；未平衡初值与长期内容体量仍待评审。当前v50全部1491未整轮执行，整体艺术、最终矩阵/正式候选/最大评审与真人仍待；兼容/环境性能继续暂停，Goal不标完成。

[原同版本地工程试玩](http://127.0.0.1:56945/)。复用包 `/Users/gordon/githome/chenyuan-wendao/artifacts/goal-4/cend11-mainline/verified/cend11-mainline-preview-411b51f.zip`，10123543字节，SHA256 `858a9788bf4bdbd100c325f63ca7778ce88ddb24d14c8b87d70e9a08d18c1a2d`；解压运行 `python3 serve.py`。受测消费者8f512bf、生产411b51f/运行6354e659，350运行/33闭包/1095规则资产/1981依赖/112载荷/336HTTP核同，旧1073/800保原生产身份，未重打包或部署。旧存档/13/v0.3/原input/图包及失败保，无push/PR/合并/权限/自动化改变。
