# 协作约定

当前完整实施清单见 [质量评审目标](docs/quality-20261112/plan.md)，冲突合同按 [0149](docs/decisions/0149-quality-review-implementation.md) 衔接。

本地验证使用 Node ≥22.16、npm、Python 与 art/requirements.txt 锁定的 Pillow。
根测试同时包含 Vue 集成模型；干净检出先运行 `npm run test:setup` 安装根与 web 两份锁，随后 `npm test`。完整核心检查用 `npm run validate:core`，会先安装两份依赖，不与构建/浏览器测试并发运行。历史测试输入由 fixtures 自动生成到忽略的 goal-* 路径，勿将其当作新过程文档编辑。

Windows 可使用独立的 Node/Python 环境，无需全局升级。UTF-8 仓库在旧版 Python 的本地编码模式下运行资源守卫时，使用 `python -X utf8 scripts/check_docs.py`；Windows 过长 PATH 可在当前 shell 去重，勿覆盖系统配置。Git 按 .gitattributes 检出 LF，原稿图片与fixture包保二进制字节。

以 docs/v0.3 和已确认 ADR 为基线。每项工作分为计划、本地实现、测试通过、远端提交，不混淆状态。新增内容保持有限 Demo 范围。

开发分支采用 feat/*、fix/* 或 Codex 的 codex/*，资料采用 docs/*。提交说明使用 docs / feat / fix / test / chore 前缀。功能通过 PR 说明规则、测试和未完成边界；不自动合并未验证实现。

资源规则须有测试：不得负数、重复领奖、绕过突破成本；现实时间不参与成长。数据变更注明 balanceVersion，已发布存档不能静默损坏。

不提交 node_modules、个人存档、缓存、凭据、字体或未核许可素材。尊重仓库现有提交，不强推，不擅自更改可见性、权限或上线服务。
