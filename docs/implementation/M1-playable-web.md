# M1 可玩网页实施与测试记录

## 实现边界

本次将上一阶段经济规则接入可运行网页，开放凡人、炼气、筑基。新增剑修/符修意图战斗与原生 IndexedDB。没有按现实分钟赋予境界，不改变 v0.3 的成长约束。两种修法是固定技能组合，尚非完整功法装备系统。

## 架构

- 保留 src/game/engine.ts、types.ts、content/m1.ts 的既有经济规则。
- src/game/adventure.ts：版本化 Adventure 信封，在原 State 外增加修法、战斗、经历；经济行动继续使用原 resolver。
- web/src/persistence.ts：读当前状态、查回执、结算、写 current/receipt/checkpoint 在同一个 readwrite 事务内。事务中不等待外部异步任务。
- web/src/store.ts：Pinia + shallowRef，仅在事务完成后发布状态；BroadcastChannel 只负责同步提示，runId/revision 检查负责防止覆盖。
- web/src/App.vue：事件、修行、资源、战斗与人物记录是真实网页控件，不以整张 UI 图片叠热区。

## 实际验证结果

代码提交：1bfdf41cf0e94aede71ee8a5ad4438154dd5109e。

GitHub Actions：[run 38349966408](https://github.com/GOD-OF-PPT/chenyuan-wendao/actions/runs/38349966408)，job 115139879108，结论 success。

环境：Ubuntu、Node.js 22.16.0、npm 10.9.2、TypeScript 5.8.3、Vite 7.1.9、Playwright 1.56.1、Chromium 141.0.7390.37。

- 干净安装根目录依赖与前端依赖：通过。
- 规则 TypeScript 与 Vue 类型检查：通过。
- 原有 65 条 + 新增 18 条规则测试：83/83 通过，0 失败、0 跳过。
- 三种开场 × 炼制/购买两条经济路线回放：通过。
- Vite 生产构建：通过。
- Chromium 浏览器集成测试：17/17 通过，重试设置为 0。
- 资料子集校验：通过。不包含完整高清美术归档。

本地额外执行新增 18 条规则测试及新规则/存档模块类型检查；本地无法下载前端依赖，完整安装、构建与浏览器测试是在 GitHub Actions 上实际执行，不宣称本地完成。

## 浏览器用例

三种开场 × 两种修法共六条路线，通过真实点击完成入道、战斗、取材、炼丹、积累修为和筑基；断言丹药被消耗并刷新后保留境界。另验证：

- 不战斗也能通过杂务与采购准备筑基。
- 开场事件和进行中的战斗刷新后状态不变。
- 注入真实 IDB put 失败后事务回滚，不发布错误成功结果。
- 同时双击只执行一次；过期标签页不能覆盖新状态。
- 坏 JSON 不覆盖存档，导出再导入保留进度并重置 runId。
- 突破前检查点恢复。
- 1440×1000 与 390×844 页面无横向溢出，放大正文后仍无溢出。
- 场景资源加载失败不阻断开场与入道。

自动测试不代表玩家体验好玩，也不代表 Safari、Firefox 和真实移动设备都已验证。

## 构建与证据

[运行包](https://github.com/GOD-OF-PPT/chenyuan-wendao/actions/runs/38349966408/artifacts/11790312227)：chenyuan-playable-dist，包含 index.html、CSS、JS、背景 WebP，不包含字体。该次 ZIP 的 SHA256：30128cf3129365a1620329b26caedee82d565f72e619221dfa65d7210c43aee8。

[测试证据](https://github.com/GOD-OF-PPT/chenyuan-wendao/actions/runs/38349966408/artifacts/11790033037)：报告、桌面/移动布局截图、该次解析的 web/package-lock.json。附件保留期 14 天。截图是浏览器输出，不是生成的概念图；本轮未取得附件在本地逐图审美复核，不宣称最终视觉验收完成。

前端直接依赖固定版本，传递依赖锁文件尚在上述附件，未纳入 Git。完全复现应使用该锁文件或已构建包；未来合并前应补充常规锁文件，改用 npm ci 并重新验证。

## 存档限制

本地浏览器存档，无服务端同步、反作弊或永久保留承诺。结构验证防损坏，不阻止玩家编辑符合结构的合法数值。新导入或检查点恢复改变 runId、清理旧回执，原子保留上一份状态。清理浏览器会影响进度，应主动导出备份。

## 协作

通过 GitHub 插件创建提交并正常推进 feat/m1-playable-web，未强推。PR #2 以 feat/m1-economy-core 为基线，依赖 PR #1。未合并、未部署、未更改仓库可见性。

## 后续工作

高清场景和人物素材、界面组件拆分、更多功法组合、后续境界、人物回响与飞升、真人测试和数值校准仍未完成。M1 可运行不等于完整 Demo 交付。
