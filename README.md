# surge-rule

统一分流规则集项目。

这个仓库只维护代理工具可订阅的分流规则，不维护节点、不维护机场订阅、不维护完整客户端配置。

## 目标

- 用一套候选规则维护多个代理客户端需要的分流规则。
- 订阅规则只发布 GFWList 命中的高置信被墙域名。
- 支持 Surge、Clash、Quantumult X、Shadowrocket 等客户端订阅。
- 把规则按用途拆分，便于维护、审查和回滚。
- 避免把任何敏感信息提交到仓库。

## 目录

```text
candidates/            # 候选规则，手动维护这里
rules/                 # GFWList 命中后的规则，由脚本生成
dist/                  # 客户端订阅规则，由脚本生成
reports/               # 筛选报告，记录保留和丢弃原因
data/                  # GFWList 等阻断证据快照
data/manual-include.list # 用户手动确认需要纳入的规则
docs/                  # 项目设计和规则规范
scripts/               # 构建、检查脚本
```

## 规则原则

候选规则只描述“匹配什么”，不描述“走哪个策略”。

例如 `candidates/ai.list` 只写：

```text
DOMAIN-SUFFIX,openai.com
DOMAIN-SUFFIX,chatgpt.com
DOMAIN-SUFFIX,anthropic.com
```

具体走 `AI`、`PROXY`、`DIRECT` 或其他策略，由各客户端在自己的配置里绑定。

`rules/` 和 `dist/` 只保留 GFWList 命中的域名。未命中的候选域名会记录在 `reports/`，不直接进入订阅规则。

## 当前规则

```text
rules/ai.list
rules/adult.list
rules/crypto.list
rules/custom.list
rules/developer.list
rules/google.list
rules/ibkr.list
rules/mail.list
rules/social.list
rules/steam.list
```

其他分类会在实际整理完成后再加入仓库。

## 推荐工作流

1. 在 `candidates/` 中维护候选规则。
2. 如需强制纳入规则，写入 `data/manual-include.list`。
3. 运行 `npm run filter:blocked`，按 GFWList 和手动纳入清单生成 `rules/`。
4. 运行 `npm run lint` 检查规则。
5. 运行 `npm run build` 生成 `dist/` 下的客户端规则。
6. 提交并推送到 GitHub 私有仓库。
7. 各代理工具订阅 `dist/` 中对应规则集。

## 不应提交的内容

- 节点订阅地址
- 代理服务器地址、端口、密码
- API Key、Token、Cookie
- 个人内网域名
- 家庭公网 IP
- NAS、路由器、家庭服务地址
