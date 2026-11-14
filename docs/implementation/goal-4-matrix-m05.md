# M05 当前放置版性能测量

2026-10-28，实现 `cbb9f92`。固定1440×900/font1/单Chromium、10Mbps/150ms冷缓存、CPU1/4倍各三次的12样本完整通过原预算；原30中的另外18保兼容最后M06，原候选验证器未放宽。

| 项目 | 本轮最慢/最大 | 原预算 |
| --- | ---: | ---: |
| 首次真实受理 | 2994.7ms | 3000ms |
| 三个真实面板反馈 | 121.6ms | 200ms |
| 首批实际传输含头 | 2253995B | 2500000B |
| 全包未压缩 | 9155833B | 15000000B |

后期完整DB从真正新档经当前可见有限动作准备，含278回执/47备份。新建沿原创建保存；行旅分清三秒内真实START受理与完整六秒之后原子成果，两者分别核全Game/Activity/回执/native截止。测量context全部真实时钟，准备的虚拟周期不证明长期节奏。三个原面板是修行、行囊和仙缘，既测两帧实际表面可见与选中，也核所有Game存储只读。

原工作目录、手动撤退helper、欢迎箭头/备份/面板映射等测量前提错误及每轮raw/trace保留。更早三条部分时序3140—3558.4ms和原M04总240秒超时原因仍unknown，本轮同一产品通过不冒称根因修复。当前后期样本仅5.3ms余量，下一综合检查继续保留此风险。运行代码/美术资源、费用/周期/DB9均未变。

本报告数字只对应Vite生产预览的实际gzip条件；原56884 Python试玩返回identity JS，资源hash相同不等服务性能相同。最终候选需核其实际运行服务，当前不作该服务或公网保证。原试玩不重启/不重载，用户10修为/40石/60HP/20MP/吐纳结束2/50只读保持；无用户Game或档测试。

当前14预算测试、根TS/资产positive及Vue类型构建实际过；未变823规则/415 native/171相关UI/438资产按原M04依赖继承，不称当前全轮。284运行源、295 Gitblob及89载荷与受测/提交后重建/冻结/HTTP同，dirty工程版非最终干净候选。完整[验证](https://github.com/GOD-OF-PPT/chenyuan-wendao/blob/c7190e67a265fe7c8bff63a1db222a434d7dcffd/goal-4/evidence/matrix-m05/verification.json)、[原始测量](https://github.com/GOD-OF-PPT/chenyuan-wendao/blob/c7190e67a265fe7c8bff63a1db222a434d7dcffd/goal-4/evidence/matrix-m05/measurements.json)、[审查](https://github.com/GOD-OF-PPT/chenyuan-wendao/blob/c7190e67a265fe7c8bff63a1db222a434d7dcffd/goal-4/evidence/matrix-m05/review.md)。

复现时使用仓库支持的Node版本，在web目录先`npm run build`，再`node node_modules/@playwright/test/cli.js test --config playwright.idle-performance.config.ts --project=chromium`；4177须空闲。实际JSON在web/idle-performance-report，不提交生成存档。下一唯一CHECK-ART16-M45，再M06兼容最后/原综合/干净包/最大评审/整体美术长期与真人；Goal未完成，不push、合并、公开部署或改权限。
