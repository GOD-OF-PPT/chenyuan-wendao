# web/ 依赖安装完成标记

- 完成时间：2026-11-11（本地）
- 结果：成功。`web/` 下执行 `npm ci --ignore-scripts --no-audit --no-fund`，安装 60 个包，退出码 0。
- 环境：Node v22.12.0 / npm 10.9.0。npm 只给出 EBADENGINE 警告（要求 >=22.16.0），未阻断安装。
- 后续：UX 评审代理将用 `npm run dev -- --port 5311 --strictPort` 启动开发服务器（127.0.0.1:5311）。dev 启动时会生成被忽略的 `web/public/demo-nodes/` 与 `web/.generated/`。
- 约束提醒：其他代理不要在 `web/` 下再次安装依赖或运行 dev/build。
