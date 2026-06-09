# scripts

后续这里放规则检查和转换脚本。

计划能力：

- 检查重复规则
- 检查不支持的规则类型
- 生成 Surge / Clash / Quantumult X / Shadowrocket 订阅规则
- 将 Quantumult X 需要的 `DOMAIN-*` 规则转换为 `HOST-*`

## 当前工作流

```bash
npm run generate:rules
npm run lint
npm run build
```

`generate:rules` 会读取 `candidates/` 中的候选规则并写入 `rules/`。`data/gfwlist.txt` 和 `data/manual-include.list` 只用于在 `reports/*.report.txt` 中标注证据来源。
