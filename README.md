# surge-rule

统一分流规则集项目。

这个仓库只维护代理工具可订阅的分流规则，不维护节点、不维护机场订阅、不维护完整客户端配置。

## 目标

- 用一套源规则维护多个代理客户端需要的分流规则。
- 支持 Surge、Clash、Quantumult X、Shadowrocket 等客户端订阅。
- 把规则按用途拆分，便于维护、审查和回滚。
- 避免把任何敏感信息提交到仓库。

## 目录

```text
rules/                 # 源规则，只手动维护这里
dist/                  # 生成后的客户端规则，后续由脚本生成
docs/                  # 项目设计和规则规范
scripts/               # 构建、检查脚本
```

## 规则原则

源规则只描述“匹配什么”，不描述“走哪个策略”。

例如 `rules/ai.list` 只写：

```text
DOMAIN-SUFFIX,openai.com
DOMAIN-SUFFIX,chatgpt.com
DOMAIN-SUFFIX,anthropic.com
```

具体走 `AI`、`PROXY`、`DIRECT` 或其他策略，由各客户端在自己的配置里绑定。

## 源规则分类

```text
rules/ai.list
rules/direct.list
rules/proxy.list
rules/reject.list
rules/apple.list
rules/google.list
rules/microsoft.list
rules/github.list
rules/telegram.list
rules/streaming.list
rules/lan.list
```

## 推荐工作流

1. 在 `rules/` 中维护源规则。
2. 提交到 GitHub 私有仓库。
3. 后续用脚本生成 `dist/` 下的客户端规则。
4. 各代理工具订阅 `dist/` 中对应规则集。

## 不应提交的内容

- 节点订阅地址
- 代理服务器地址、端口、密码
- API Key、Token、Cookie
- 个人内网域名
- 家庭公网 IP
- NAS、路由器、家庭服务地址

