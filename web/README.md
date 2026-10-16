# 尘缘问道 · 可运行测试版本

T06已把正式Store、页面和存储切换到full规则。当前正常网页已验证凡人 → 炼气 → 筑基，覆盖三开场与两修法。高级构筑、完整飞升网页路线和正式美术依照[Goal 1任务](../goal-1/tasks.md)继续，不因已有引擎规则或共用按钮而提前完成。

约30分钟仅是基本玩法理解目标，不固定筑基或通关时间。所有数值为未平衡初值；游戏内年月随行动立即结算，阅读与离线不耗寿元。

## 从源码启动与构建

工程要求Node.js ≥22.16.0；T06本地使用Node24.19.0/npm8.11.0，远端CI环境以实际运行记录为准。根目录执行：

```sh
npm ci --ignore-scripts
node scripts/check_lock.mjs
npm --prefix web ci --ignore-scripts
npm --prefix web run dev
```

打开 `http://127.0.0.1:5173`，默认仅监听本机，不需要API Key、数据库服务器或账号。生产构建使用 `npm --prefix web run build`。在web/dist目录运行 `python3 -m http.server 8080 --bind 127.0.0.1` 后打开本机8080端口，不通过file协议双击HTML。

同提交的成功网页CI提供chenyuan-playable-dist与测试证据附件，入口见当前PR检查。历史G1附件只代表旧版，不能作为本次接线产物。没有公开部署。

## 执行测试

从根目录执行：

```sh
npm run typecheck
npm run check:content
npm test
npm run replay
npm run replay:full
python3 scripts/check_docs.py
python3 docs/v0.4/tools/check_documents.py
npm --prefix web run build
cd web
npx playwright install chromium firefox webkit
npm run test:e2e
npm run test:persistence
```

Linux缺系统库时使用 `npx playwright install --with-deps chromium firefox webkit`。网页测试自动启动生产预览4173，原生IndexedDB模块测试另用开发服务器4174；两端口须空闲，不复用已有服务。两个配置均有三个实际浏览器project，0重试。单引擎排查可追加 `-- --project=chromium`，不把单引擎结果算作全矩阵。

本阶段206项规则、六条M1与24条完整纯引擎回放，以及实际三浏览器结果见[T06/CHECK-02实施记录](../docs/implementation/goal-1-full-ui-cutover.md)。完整24组飞升网页路线属于T22；纯引擎24组不能替代它。

## 首轮试玩路径

1. 输入道号，选择赠丹、交易或离开，每条都能继续。
2. 返回洞府，自然吐纳至修为满，确认引气入体。
3. 选择剑修或符修，进入历练页前往山野。
4. 采药、凝露；妖核通过战斗、宗门护送或采购取得。
5. 在洞府行囊页炼制筑基丹，或在坊市采购成丹。
6. 修为圆满后确认突破，实际消耗筑基丹；缺材料或修为时不能突破。

也可先做宗门杂务挣灵石，完全不战斗地购买成丹。这是测试路线示例，不是强制顺序。按钮成本和禁用理由来自同一规则预览；批次只结算实际执行的行动。

## 战斗与事件

观察敌方意图，选择攻击、护体、术法、终结术法、补给或撤退。剑修积累剑意，符修积累符印；具体效果和费用以当前规则与装备为准。失败后保留已有功法与物品，可返回洞府疗养。

当前页面展示所选修法及装备名称；完整学习/换装/法宝交互留在T08。开场和普通人物事件分别显示实际选项；导入非破庙事件也可刷新、选择并继续。

## 存档与恢复

每条游戏指令经过commandId/runId/expectedRevision校验，IndexedDB事务完成后才发布角色状态和“已保存”。存储失败会显示“本次未保存”，重读旧进度不会假装成功；可重试错误使用同一原意图，避免重复结算。

设置中可导入、导出、恢复完整准备检查点或重新开始。恢复会产生新runId、同步回退资源/历史，检查点仍可再次使用。旧M1/Adventure与已知full旧版经过校验转换，保留数据库原记录；坏档或未来版本不会覆盖好档。不明数据库可通过“导出原件备份”保存原始资料，该格式用于恢复调查，不是直接可玩的Game存档。

多标签页通过已提交进度提示同步，实际写入仍依靠事务校验。不同地址、端口和浏览器不共享存档，可导出/导入迁移。清理浏览器数据可能丢档，建议自行备份；没有云同步或反作弊承诺。

## 美术和测试边界

界面为真实HTML/CSS，沿用暖纸、青黛、旧金及低分辨率预览背景，头像为文字印记。桌面和移动宽度已截图检查；当前是引擎切换后的最小可用页面，正式美术、四尺寸/150%文字完整验收、真实手机、真人趣味和数值平衡仍待后续任务。Playwright WebKit不等于Safari真机。
