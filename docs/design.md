# 项目方案

## 项目定位

本项目是一个统一分流规则集仓库。它不负责代理节点配置，也不负责完整客户端配置，只负责维护可复用、可订阅、可转换的规则集合。

核心思想：

```text
候选规则 candidates/
    ↓
GFWList 筛选 scripts/filter-blocked.js
    ↓
被墙规则 rules/
    ↓
构建脚本 scripts/
    ↓
客户端订阅规则 dist/
```

## 为什么只写规则集

Surge、Clash、Quantumult X、Shadowrocket 的完整配置格式不同，但它们都支持基于域名、IP、关键字等条件进行分流。

因此本项目把规则拆成两部分：

- 候选规则：维护匹配条件，例如 `DOMAIN-SUFFIX,openai.com`
- 被墙规则：只保留 GFWList 命中的候选域名
- 客户端配置：决定命中规则后使用哪个策略

这样可以最大程度复用同一批规则。

## 阻断证据策略

`candidates/` 保存服务域名候选全集，`rules/` 不再手动编辑，而是由 `scripts/filter-blocked.js` 根据 `data/gfwlist.txt` 生成。

筛选逻辑：

- 命中 GFWList 的域名进入 `rules/`。
- 命中 `data/manual-include.list` 的用户手动确认规则也会进入 `rules/`，并在报告中标记为 `manual-include`。
- 未命中的域名保留在 `candidates/`，并记录到 `reports/*.report.txt`。
- `dist/` 只从 `rules/` 生成。
- IP 不从 DNS 当前解析结果生成。只有官方明确发布固定 IP 段，才考虑写入规则。

这套逻辑表示“公开阻断证据命中”，不是一次性的 DNS 解析结果，也不是仅按服务归属整理。

## 统一规则格式

候选规则和被墙规则都采用接近 Surge、Clash classical、Shadowrocket 的通用写法。

优先使用：

```text
DOMAIN,example.com
DOMAIN-SUFFIX,example.com
DOMAIN-KEYWORD,example
IP-CIDR,1.1.1.0/24
IP-CIDR6,2606:4700::/32
GEOIP,CN
```

暂不在候选规则和被墙规则中使用：

```text
FINAL
MATCH
RULE-SET
PROCESS-NAME
USER-AGENT
URL-REGEX
SCRIPT
MITM
REWRITE
```

这些能力客户端差异较大，后续如果需要，可以单独建立扩展规则。

## Quantumult X 兼容策略

Quantumult X 常见写法是：

```text
HOST,example.com
HOST-SUFFIX,example.com
HOST-KEYWORD,example
```

如果实测 Quantumult X 可以直接订阅 `DOMAIN-*` 写法，则 `dist/quantumultx/` 可以直接复用筛选后的规则。

如果不能兼容，则构建脚本只做轻量转换：

```text
DOMAIN -> HOST
DOMAIN-SUFFIX -> HOST-SUFFIX
DOMAIN-KEYWORD -> HOST-KEYWORD
```

这仍然属于规则集转换，不涉及完整客户端配置。

## 当前规则分类

### developer.list

开发工具和代码服务，包括 GitHub、GitLab、Bitbucket、Homebrew、Docker、Python/PyPI、Node/npm、Go、Rust/Cargo、RubyGems、Maven、Gradle、JetBrains、Visual Studio Code、HashiCorp/Terraform、Anaconda/Conda。

### google.list

Google 服务，包括 Google 搜索、账号、Gmail、Google APIs、YouTube、Google Video、gstatic、googleusercontent 等。

### social.list

通讯和社交服务，包括 Telegram、LINE、X/Twitter、WhatsApp、Signal、Discord、Facebook、Instagram、Threads、Reddit、Pinterest、Tumblr、Snapchat、Viber、KakaoTalk、Mastodon、Medium、Quora。

### crypto.list

加密货币交易所、行情工具、预测市场和钱包服务，包括 HTX、Binance、Bybit、Backpack、CoinGlass、Bitget、Polymarket、Kraken、MetaMask、SafePal、OKX、Coinbase、KuCoin、MEXC、Gate、Crypto.com、Bitfinex、Deribit、Gemini、Bitstamp。

### custom.list

用户手动确认需要纳入的常用规则。

### ibkr.list

Interactive Brokers / IBKR 相关规则，包括 IBKR Web API、Interactive Brokers 登录/动态页面域名，以及用户确认由 IBKR 页面加载的 Akamai mPulse 域名。

### mail.list

国外邮件服务和访问较慢的邮箱相关域名，包括 Gmail、Outlook/Hotmail、Yahoo Mail、Proton Mail、Zoho Mail、Fastmail、Tuta/Tutanota 等。

### steam.list

Steam 平台、商店、社区、登录、客户端更新、创意工坊和 Steam 内容分发相关域名。不包含具体游戏厂商或游戏服务器域名。

### adult.list

成人内容、成人直播和成人视频站点，包括用户指定站点以及常见热门成人内容平台。

### ai.list

主流 AI 服务和大模型平台，包括 OpenAI/ChatGPT/Codex、Anthropic/Claude、Google Gemini、xAI/Grok、Microsoft Copilot、GitHub Copilot、Perplexity、Mistral、DeepSeek、Cohere、Meta AI/Llama、Hugging Face、Poe，以及常见代码、图像、视频、音频、写作和国内大模型平台。

## 待整理分类

以下分类暂不放入仓库，等实际整理完成后再新增：

```text
apple.list
direct.list
lan.list
microsoft.list
proxy.list
reject.list
streaming.list
```

## 命名约定

- 规则文件使用小写英文。
- 文件后缀使用 `.list`。
- 候选规则放在 `candidates/`。
- GFWList 命中的规则放在 `rules/`。
- 生成结果放在 `dist/<client>/`。
- 一行只写一条规则。
- 注释使用 `#`。

## 安全边界

本项目可以放通用域名规则，但不应放任何会暴露个人网络环境或账号资产的信息。

尤其不要提交：

- 机场订阅
- 节点信息
- 个人服务器 IP
- 私有域名
- 内网服务地址
- Token、Cookie、Key
