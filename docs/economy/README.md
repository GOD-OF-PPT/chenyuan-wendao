# 经济回放报告

`current-report.json` 是既有即时120条回放的历史原件，固定SHA-256为 `cf3b130845be41b02b332f1436399a5edc8f5ae9d5093e8124f4b0df032e596c`，不随当前来源变化重写。

`npm run audit:economy` 核对 `current-engine-report.json` 的当前引擎来源和完整即时120条结果。来源改变后，先执行 `npm run audit:economy -- --write` 生成、逐字段审阅，再核对；该命令保留历史报告，并拒绝历史文件被修改。两个原始 `.1` baseline、全部120成功与来源支配检查保持。

放置 Activity 的160条回放继续使用独立 `--idle --report <路径>`，不会替代即时120校验。以上是正式规则的回放账本，均不是浏览器/原子持久化、真实成长时长、平衡或真人验收。CANDIDATE-BASE-01只修来源记录边界，不改变数值。
