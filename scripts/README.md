# scripts

后续这里放规则检查和转换脚本。

计划能力：

- 检查重复规则
- 检查不支持的规则类型
- 生成 Surge / Clash / Quantumult X / Shadowrocket 订阅规则
- 将 Quantumult X 需要的 `DOMAIN-*` 规则转换为 `HOST-*`

## 当前工作流

```bash
npm run filter:blocked
npm run lint
npm run build
```

`filter:blocked` 会读取 `candidates/` 中的候选规则，用 `data/gfwlist.txt` 快照筛选出 GFWList 命中的域名并写入 `rules/`。没有命中的候选域名会保留在 `reports/*.report.txt` 中作为待确认项。
