# AI 接手与维护手册

> 面向后续 AI、自动化代理和项目维护者。阅读完本文件后，应当能够在不重新猜测项目意图的情况下继续维护规则、运行生成流程、验证结果并发布订阅。

## 1. 项目一句话说明

`surge-rule` 是一个统一维护代理分流规则集的仓库：人工只维护 `candidates/`，脚本生成通用规则 `rules/`、证据报告 `reports/` 和 Surge、Clash、Shadowrocket、Quantumult X 四套订阅文件 `dist/`。

它不提供代理节点，不保存机场订阅，也不维护任何客户端的完整配置。

## 2. 必须遵守的设计要求

### 2.1 项目边界

项目只回答两个问题：

1. 哪些域名、域名关键字或固定 IP 应当归入某个规则分类。
2. 如何把同一份规则转换成多个客户端可以订阅的格式。

项目不决定命中规则后使用 `AI`、`PROXY`、`DIRECT`、`CN2` 或其他哪个策略。策略组名称和节点选择属于客户端配置，不属于本仓库。

### 2.2 唯一手工来源

`candidates/*.list` 是规则的唯一手工来源。

禁止直接编辑：

- `rules/*.list`
- `reports/*.report.txt`
- `dist/<client>/*.list`

这些目录由脚本生成，下一次执行生成命令时会被覆盖。任何只写进生成目录的修改都会丢失。

### 2.3 最小匹配与低流量原则

新增规则时应优先选择能满足功能的最小范围：

1. 精确业务主机优先使用 `DOMAIN`。
2. 厂商明确使用一组第一方子域名时使用 `DOMAIN-SUFFIX`。
3. 只有主机名具有稳定模式、无法用后缀表达时才使用 `DOMAIN-KEYWORD`。
4. 只有厂商官方明确发布固定服务入站 IP 时才考虑 `IP-CIDR` 或 `IP-CIDR6`。
5. 不根据某次 DNS 解析结果写 IP。CDN、Anycast 和共享云地址会变化，也可能承载大量无关流量。
6. 对低流量代理，避免整个平台 CDN、视频、语音、模型文件、附件、用户上传内容、遥测和共享云 IP 段，除非用户明确要求。

“全面”不等于把厂商所有资产都代理。这里的目标是完整覆盖所需功能，同时避免把大流量或无关业务带入代理。

### 2.4 安全边界

不得提交：

- 节点、机场订阅、代理服务器地址或端口
- 用户名、密码、Cookie、Token、API Key
- 个人服务器 IP、家庭公网 IP、NAS 地址
- 私有域名、内网地址和账号资产信息

通用厂商固定服务 IP 可以提交，但必须能引用官方来源并确认它是客户端访问的入站地址，而不是厂商爬虫、Agent、Webhook 或工具调用的出站地址。

## 3. 目录与数据流

```text
candidates/*.list                 人工维护的候选规则
        │
        │ npm run generate:rules
        ▼
rules/*.list                      通用客户端源规则
reports/*.report.txt              每条规则的证据说明
        │
        │ npm run lint
        │ npm run build
        ▼
dist/surge/*.list                 原样复制
dist/clash/*.list                 原样复制
dist/shadowrocket/*.list          原样复制
dist/quantumultx/*.list           转为 HOST/HOST-SUFFIX/HOST-KEYWORD
```

辅助数据：

```text
data/gfwlist.txt                  GFWList 的 Base64 快照，仅作为报告证据
data/manual-include.list          用户明确确认的规则，仅作为报告证据
```

GFWList 和 `manual-include.list` 都不决定规则是否进入输出。只要规则存在于 `candidates/` 且类型受支持，就会进入 `rules/`。

## 4. 支持的统一规则格式

```text
DOMAIN,api.example.com
DOMAIN-SUFFIX,example.com
DOMAIN-KEYWORD,example
IP-CIDR,192.0.2.0/24,no-resolve
IP-CIDR6,2001:db8::/32,no-resolve
GEOIP,CN
```

语义：

- `DOMAIN`：只匹配一个完整主机名。
- `DOMAIN-SUFFIX`：匹配根域名及其所有子域名。
- `DOMAIN-KEYWORD`：主机名只要包含关键字就命中，范围最宽，最容易误伤。
- `IP-CIDR` / `IP-CIDR6`：匹配固定网络段。
- `GEOIP`：按 IP 地理数据库匹配。
- `no-resolve`：支持它的客户端不为 IP 规则额外触发 DNS 解析。

当前不支持 `FINAL`、`MATCH`、`RULE-SET`、`PROCESS-NAME`、`USER-AGENT`、`URL-REGEX`、`SCRIPT`、`MITM` 和 `REWRITE`。这些能力客户端差异较大，不应混入通用规则集。

## 5. 代码逻辑

### 5.1 `scripts/generate-rules.js`

此文件只有一行：

```js
require("./filter-blocked");
```

加载 `filter-blocked.js` 时会直接执行其中的 `main()`。因此：

```bash
npm run generate:rules
npm run filter:blocked
```

目前实际执行的是同一套生成逻辑。

### 5.2 `scripts/filter-blocked.js`

生成过程如下：

1. 找到项目根目录、`candidates/`、`rules/`、`reports/` 和辅助数据文件。
2. 读取 `data/gfwlist.txt`，移除空白后按 Base64 解码。
3. 从 GFWList 中跳过注释、例外规则、正则规则和带选项的复杂规则。
4. 从剩余规则提取并规范化域名，形成证据集合。
5. 读取 `data/manual-include.list`，忽略空行和注释，并按小写精确保存整条规则。
6. 清空 `rules/` 下所有 `.list` 文件。
7. 按文件名排序遍历 `candidates/*.list`。
8. 对每条受支持的规则原样写入同名 `rules/*.list`。
9. 为每条规则在 `reports/*.report.txt` 写入证据：
   - 完整规则命中 `manual-include.list`：`manual-include`
   - `DOMAIN-KEYWORD`：`candidate-keyword`
   - IP 或 GEOIP：`candidate`
   - 域名与 GFWList 存在同域或父子域关系：记录对应 GFWList 域名
   - 其他情况：`candidate`

可以用环境变量替换辅助数据路径：

```bash
GFWLIST_PATH=/path/to/gfwlist.txt \
MANUAL_INCLUDE_PATH=/path/to/manual-include.list \
npm run generate:rules
```

#### 注释处理细节

生成器只记住规则前“最近的一行注释”。如果连续写多行注释：

```text
# 分类标题
# 补充说明
DOMAIN-SUFFIX,example.com
```

输出中只会保留 `# 补充说明`。如需在生成文件中保留分类名，应把重要信息合并为一行：

```text
# 分类标题（补充说明）
DOMAIN-SUFFIX,example.com
```

#### 清理行为

- `rules/` 中所有 `.list` 会在生成前删除并重建。
- `reports/` 不会整体清空，只会覆盖仍存在的同名报告。
- 如果删除一个候选分类，旧的同名报告可能残留，需要人工确认后删除。

### 5.3 `scripts/lint.js`

lint 遍历全部 `rules/*.list`，检查：

- 非空规则没有首尾空白
- 规则类型在支持集合中
- 逗号后存在值
- 所有规则文件中不存在完全相同的重复行，比较时忽略大小写

lint 的能力有限，它不会检查：

- 域名或 CIDR 格式是否合法
- IP 段是否确实属于对应厂商
- `DOMAIN-SUFFIX,example.com` 与 `DOMAIN,api.example.com` 的语义覆盖
- `DOMAIN-KEYWORD,foo` 与其他规则的宽泛重叠
- 同一服务是否被多个不同分类以不同写法覆盖
- 规则是否会产生高流量

因此通过 lint 只代表格式基本可接受，不代表规则设计正确。

### 5.4 `scripts/build.js`

构建过程：

1. 清空四个客户端输出目录中的所有 `.list`。
2. 按名称读取 `rules/*.list`。
3. Surge、Clash、Shadowrocket 直接复制源规则。
4. Quantumult X 进行以下转换，并在末尾加入规则文件名作为策略名：

```text
DOMAIN            -> HOST
DOMAIN-SUFFIX     -> HOST-SUFFIX
DOMAIN-KEYWORD    -> HOST-KEYWORD
IP-CIDR           -> IP-CIDR
IP-CIDR6          -> IP6-CIDR
GEOIP             -> GEOIP
```

例如 `rules/ai.list` 中：

```text
DOMAIN-SUFFIX,openai.com
```

会转换为：

```text
HOST-SUFFIX,openai.com,ai
```

#### Quantumult X 的重要限制

转换器只取源规则的第二段值，再追加策略名。因此：

```text
IP-CIDR,160.79.104.0/23,no-resolve
```

会变成：

```text
IP-CIDR,160.79.104.0/23,ai
```

`no-resolve` 会丢失。这是当前已知行为；在修改转换器前，不要假设 Quantumult X 输出保留了源规则的额外参数。

## 6. 当前规则分类快照

截至 2026-07-24，仓库有 5 个分类。数量按 `candidates/` 中非注释规则统计：

| 分类 | 规则数 | 用途 |
|---|---:|---|
| `ai.list` | 15 | 精简后的五家核心 AI 服务与 Anthropic 固定入站 IP |
| `crypto.list` | 45 | 交易所、钱包、行情和预测市场 |
| `custom.list` | 329 | 用户手工规则及原 adult、developer、google、mail、social、steam 分类 |
| `EU.list` | 12 | Backpack / ATAS 相关域名、关键字和固定 IP |
| `US.list` | 12 | CN2 优选线路与 Interactive Brokers 相关域名 |

数量是维护提示，不是稳定 API。每次规则变动后都可能变化。

## 7. 已执行的 AI 规则方案

### 7.1 背景与目标

原 `ai.list` 包含较多 AI 平台以及 OpenAI 静态资源、用户内容等域名。用户要求：

- 只保留 OpenAI、Anthropic、Google Gemini、xAI 和 Microsoft Copilot
- 尽量完整覆盖核心网页、登录和 API
- 调研域名与 IP
- 不引入高流量地址，因为代理节点流量有限

方案已于 2026-07-20 通过 PR `#1` 合并到 `main`，合并提交为 `065ada01b9066286b30f3b91537fce89b8052678`。

Surge 订阅地址：

```text
https://raw.githubusercontent.com/Xuan-666-cn/surge-rule/main/dist/surge/ai.list
```

### 7.2 当前 AI 规则

```text
# OpenAI / ChatGPT / Codex (core web, authentication, and API only)
DOMAIN-SUFFIX,openai.com
DOMAIN-SUFFIX,chatgpt.com

# Anthropic / Claude (official API and Console inbound CIDRs included)
DOMAIN-SUFFIX,anthropic.com
DOMAIN-SUFFIX,claude.ai
DOMAIN-SUFFIX,claude.com
IP-CIDR,160.79.104.0/23,no-resolve
IP-CIDR6,2607:6bc0::/48,no-resolve

# Google Gemini / AI Studio / Vertex AI (including regional aiplatform endpoints)
DOMAIN,gemini.google.com
DOMAIN,aistudio.google.com
DOMAIN,ai.google.dev
DOMAIN,generativelanguage.googleapis.com
DOMAIN-KEYWORD,aiplatform

# xAI / Grok
DOMAIN-SUFFIX,x.ai
DOMAIN-SUFFIX,grok.com

# Microsoft Copilot (consumer web only; shared Bing and Microsoft 365 excluded)
DOMAIN,copilot.microsoft.com
```

### 7.3 取舍说明

#### OpenAI

保留 `openai.com` 和 `chatgpt.com` 的第一方后缀，以覆盖官网、API、认证、ChatGPT 和 Codex 的核心入口。

明确移除独立的大流量域名：

- `oaistatic.com`
- `oaiusercontent.com`
- `openaiusercontent.com`

未加入 ChatGPT Voice 的专用 IP 段，因为语音是高流量场景，而且官方会持续更新该列表。

官方网络参考：

- <https://help.openai.com/en/articles/9247338-network-recommendations-for-chatgpt-errors-on-web-and-apps>

#### Anthropic

保留 Anthropic、Claude 旧域名和新域名。加入官方发布的 API/Console 固定入站地址：

- IPv4：`160.79.104.0/23`
- IPv6：`2607:6bc0::/48`

没有加入 `160.79.104.0/21`，因为官方将它说明为 Anthropic 发起 MCP、Web Search、Web Fetch 等外部请求时使用的出站范围，不是客户端访问 Claude 的入站范围。

官方来源：

- <https://platform.claude.com/docs/en/api/ip-addresses>
- <https://platform.claude.com/docs/en/api/overview>

#### Google Gemini

覆盖：

- Gemini Web：`gemini.google.com`
- Google AI Studio：`aistudio.google.com`
- 开发文档：`ai.google.dev`
- Gemini API：`generativelanguage.googleapis.com`
- Vertex AI 全局及 `REGION-aiplatform.googleapis.com` 区域端点

区域 Vertex 主机无法用普通 `DOMAIN-SUFFIX,aiplatform.googleapis.com` 覆盖，因此当前使用 `DOMAIN-KEYWORD,aiplatform`。它比精确规则宽，后续若脚本支持通配主机或收集到稳定区域集合，应考虑收窄。

没有加入整个 `googleapis.com`、`googleusercontent.com`、`gstatic.com` 或 Google 公布的共享云 IP 段，以免代理非 AI 流量。

官方来源：

- <https://ai.google.dev/api/generate-content>
- <https://cloud.google.com/vertex-ai/generative-ai/docs/reference/rest>

#### xAI

`x.ai` 后缀覆盖官网、文档、Console 和官方 API `api.x.ai`；`grok.com` 覆盖 Grok Web。

没有加入 `x.com`，否则会把整个 X/Twitter 社交流量带入 AI 规则。

官方来源：

- <https://docs.x.ai/developers/rest-api-reference/inference>

#### Microsoft Copilot

只保留消费者 Web 入口 `copilot.microsoft.com`。

没有加入：

- `edgeservices.bing.com`
- `*.cloud.microsoft`
- `*.office.com`
- `graph.microsoft.com`
- Microsoft 365 的 URL/IP 全集

原因是 Edge 与 Microsoft 365 Copilot 深度依赖 Bing、Office、Graph 和共享 Microsoft 云服务，无法在保持低流量的同时完整隔离。若未来用户明确要求 Microsoft 365 Copilot，应建立独立分类，而不是扩张当前消费者 Copilot 规则。

官方参考：

- <https://learn.microsoft.com/en-us/microsoft-365/copilot/microsoft-365-copilot-requirements>

## 8. FL 与 ATAS 当前状态

### 8.1 `EU.list`

```text
# FL routes (Backpack / ATAS)

# Backpack
DOMAIN-KEYWORD,backpack
DOMAIN-SUFFIX,backpack.exchange
DOMAIN-SUFFIX,backpack.app

# ATAS
DOMAIN-SUFFIX,amplitude.com
DOMAIN-SUFFIX,orderflowtrading.net
IP-CIDR,142.132.201.231/32,no-resolve
IP-CIDR,51.178.130.10/32,no-resolve
IP-CIDR,65.21.32.251/32,no-resolve
IP-CIDR,135.181.115.236/32,no-resolve
DOMAIN-KEYWORD,atas
DOMAIN-KEYWORD,wanfa998
DOMAIN-KEYWORD,dianjin998
```

该规则集合并了 Backpack 交易平台与 ATAS / FL 相关规则。`DOMAIN-KEYWORD,backpack` 已能匹配后两条 Backpack 域名，存在语义冗余，同时可能匹配任何包含 `backpack` 的无关域名。

如果后续要优化低流量：

1. 先抓取或查阅 Backpack 官方网络请求/文档。
2. 将稳定第一方域名写成 `DOMAIN-SUFFIX`。
3. 确认没有动态主机依赖后移除 `DOMAIN-KEYWORD,backpack`。

已知风险：

- `amplitude.com` 是许多应用共用的分析/遥测平台，可能代理大量与 ATAS 无关的流量。
- `DOMAIN-KEYWORD,atas` 很宽，会命中任何主机名中含 `atas` 的地址。
- 四个 `/32` 是精确单 IP，但仓库目前没有记录其来源和复核日期。
- `wanfa998` 与 `dianjin998` 是用户特定关键字，归属和必要性需要实际流量或用户确认。

不要在没有证据的情况下删除这些规则；但下一次维护应优先补齐来源、用途和最近验证日期。

## 9. 标准维护流程

### 9.1 修改现有规则

```bash
# 1. 确保从最新 main 开始
git switch main
git pull --ff-only origin main

# 2. 只编辑候选文件
$EDITOR candidates/ai.list

# 3. 生成通用规则和报告
npm run generate:rules

# 4. 检查规则
npm run lint

# 5. 生成四种客户端订阅
npm run build

# 6. 检查输出
git diff --check
git status --short
git diff -- candidates/ai.list rules/ai.list reports/ai.report.txt
git diff -- dist/surge/ai.list dist/quantumultx/ai.list
```

检查完成后，确认改动范围只包含：

- 被编辑的 `candidates/<name>.list`
- 对应的 `rules/<name>.list`
- 对应的 `reports/<name>.report.txt`
- 四个 `dist/*/<name>.list`

如果其他分类也发生变化，先找原因，不要直接提交。

### 9.2 新增分类

1. 新建 `candidates/<name>.list`。
2. 文件名默认使用小写英文和 `.list` 后缀；缩写分类可按约定使用大写，例如 `EU.list`。
3. 按服务分组写单行注释。
4. 运行完整生成流程。
5. 确认自动产生同名 `rules`、`report` 和四个 `dist` 文件。
6. 在 README 和本手册的分类表中补充说明。

### 9.3 删除分类

1. 删除 `candidates/<name>.list`。
2. 运行 `npm run generate:rules`，它会删除旧 `rules/<name>.list`。
3. 运行 `npm run build`，它会删除四个客户端目录中的旧文件。
4. 人工删除可能残留的 `reports/<name>.report.txt`。
5. 更新文档和订阅引用。

### 9.4 更新 GFWList

```bash
curl -L \
  https://raw.githubusercontent.com/gfwlist/gfwlist/master/gfwlist.txt \
  -o data/gfwlist.txt
npm run generate:rules
npm run lint
npm run build
```

GFWList 更新只应改变报告证据。若规则集合发生意外变化，应暂停并调查。

## 10. 发布到 GitHub

默认采用分支和 PR，不直接向 `main` 推送：

```bash
git switch -c codex/<short-description>
git add <明确列出的文件>
git commit -m "<简短说明>"
git push -u origin codex/<short-description>
gh pr create --draft --base main --head codex/<short-description>
```

发布前必须：

- `git status -sb` 确认没有用户的无关改动
- 明确列出 `git add` 的文件，不在混合工作区使用 `git add -A`
- 运行生成、lint、build 和 `git diff --check`
- 检查 Quantumult X 输出
- PR 描述说明变更、原因、影响和验证命令

合并后：

1. 确认 PR 状态为 `MERGED`。
2. 直接读取 Raw 订阅 URL，确认返回新内容。
3. 告知用户客户端更新后才会拉取新规则。

Raw URL 格式：

```text
https://raw.githubusercontent.com/Xuan-666-cn/surge-rule/main/dist/<client>/<name>.list
```

例如：

```text
https://raw.githubusercontent.com/Xuan-666-cn/surge-rule/main/dist/surge/ai.list
```

功能分支 URL 可以临时验证，但长期订阅必须指向 `main`。

## 11. 后续 AI 的工作协议

接到维护请求后按以下顺序执行：

1. 明确用户要“查看、诊断、修改、发布”中的哪一种；查看或诊断不自动授权修改和推送。
2. 检查 `git status -sb`，保护用户已有改动。
3. 切到并更新 `main`，除非用户指定其他分支。
4. 阅读本手册、目标分类的 `candidates` 文件和相关脚本。
5. 涉及当前域名、IP 或厂商网络要求时，优先搜索官方文档。
6. 区分服务入站 IP 与厂商出站 IP；不要把出站列表用作客户端路由。
7. 评估共享 CDN、云平台、视频、语音、附件和遥测的流量影响。
8. 只编辑 `candidates/`，必要时同步更新文档。
9. 运行生成、lint、build、diff 检查。
10. 向用户解释规则覆盖范围、明确排除项和已知风险。
11. 只有用户明确要求同步 GitHub 时才提交、推送或合并。

## 12. 已知技术债与建议

按优先级排列：

1. **增强 lint**：验证域名、IPv4、IPv6、CIDR 和可选参数语法。
2. **检测语义覆盖**：发现 `DOMAIN-KEYWORD` 覆盖 `DOMAIN-SUFFIX`、父后缀覆盖子域等冗余。
3. **修复 Quantumult X 参数转换**：明确保留或正确映射 `no-resolve` 等选项。
4. **清理过期报告**：生成时让 `reports/` 与 `candidates/` 保持一一对应。
5. **增加自动测试**：为 GFWList 解析、证据匹配、注释保留和客户端转换增加单元测试。
6. **增加 CI**：PR 上自动执行 `generate:rules`、lint、build，并检查生成文件无未提交差异。
7. **记录规则来源**：尤其是固定 IP 和用户关键字，应记录官方来源、用途和复核日期。
8. **审计宽规则**：优先检查 `DOMAIN-KEYWORD,atas`、`DOMAIN-KEYWORD,backpack` 和共享遥测域名 `amplitude.com`。
9. **更新旧设计文档**：`docs/design.md` 中的 AI 分类描述仍是精简前的历史内容，应以后续实际规则和本手册为准，或单独修订。

## 13. 完成定义

一次规则维护只有同时满足以下条件才算完成：

- 需求范围明确
- 官方来源或用户确认已记录
- 只修改源文件和必要文档
- 生成文件与源文件同步
- lint 通过
- build 通过
- `git diff --check` 通过
- 没有混入无关改动
- 高流量与共享地址风险已评估
- 若用户要求发布，PR 已合并且 Raw URL 已验证
