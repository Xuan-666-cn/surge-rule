# 项目方案

## 项目定位

本项目是一个统一分流规则集仓库。它不负责代理节点配置，也不负责完整客户端配置，只负责维护可复用、可订阅、可转换的规则集合。

核心思想：

```text
源规则 rules/
    ↓
构建脚本 scripts/
    ↓
客户端订阅规则 dist/
```

## 为什么只写规则集

Surge、Clash、Quantumult X、Shadowrocket 的完整配置格式不同，但它们都支持基于域名、IP、关键字等条件进行分流。

因此本项目把规则拆成两部分：

- 源规则：维护匹配条件，例如 `DOMAIN-SUFFIX,openai.com`
- 客户端配置：决定命中规则后使用哪个策略

这样可以最大程度复用同一批规则。

## 统一源规则格式

源规则采用接近 Surge、Clash classical、Shadowrocket 的通用写法。

优先使用：

```text
DOMAIN,example.com
DOMAIN-SUFFIX,example.com
DOMAIN-KEYWORD,example
IP-CIDR,1.1.1.0/24
IP-CIDR6,2606:4700::/32
GEOIP,CN
```

暂不在源规则中使用：

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

如果实测 Quantumult X 可以直接订阅 `DOMAIN-*` 写法，则 `dist/quantumultx/` 可以直接复用源规则。

如果不能兼容，则构建脚本只做轻量转换：

```text
DOMAIN -> HOST
DOMAIN-SUFFIX -> HOST-SUFFIX
DOMAIN-KEYWORD -> HOST-KEYWORD
```

这仍然属于规则集转换，不涉及完整客户端配置。

## 当前规则分类

### github.list

GitHub 服务，包括 github.com、GitHub Pages、GitHub Assets、GitHub user content、GitHub Packages、GitHub Container Registry、GitHub Actions 相关域名。

### google.list

Google 服务，包括 Google 搜索、账号、Gmail、Google APIs、YouTube、Google Video、gstatic、googleusercontent 等。

## 待整理分类

以下分类暂不放入仓库，等实际整理完成后再新增：

```text
ai.list
apple.list
direct.list
lan.list
microsoft.list
proxy.list
reject.list
streaming.list
telegram.list
```

## 命名约定

- 规则文件使用小写英文。
- 文件后缀使用 `.list`。
- 源规则放在 `rules/`。
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
