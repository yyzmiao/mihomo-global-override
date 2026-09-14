# Mihomo 全局覆写脚本

[English](./README.md) | 简体中文

一个面向 Clash Party 和 Clash Verge Rev 的数据驱动型全局覆写脚本，两者均使用 Mihomo 内核。它在保留当前订阅节点的基础上，统一生成 DNS、代理组、远程规则集和分流规则。

## 特性

- 只包含 `p1` / `p2` 占位地址，不包含任何真实订阅凭据
- 保留当前配置中的 `proxies` 与 `proxy-providers`
- 使用 `select` 和 `url-test` 组合服务策略与地区策略
- 使用工厂函数和数据表生成重复配置，便于维护
- 使用 fake-IP DNS 模式，并保留常见局域网与登录兼容项
- 按“本地例外与拦截、服务规则、中国规则、旧规则、最终兜底”的顺序匹配

## 文件

- `mihomo-global-override.js`：可以导入客户端的正式覆写脚本

本仓库不会提交本地备份、测试文件或带订阅地址的私人版本。

## 使用方法

1. 下载 `mihomo-global-override.js`。
2. 在 Clash Party 的覆写功能，或 Clash Verge Rev 的全局扩展脚本功能中导入文件。
3. 替换 `p1` / `p2` 占位地址；如果当前配置已经提供节点，就删除这两个条目。
4. 确保当前配置与 `additionalProxyProviders` 合计至少保留一个代理来源。
5. 启用脚本并更新配置。

脚本由客户端调用：

```js
function main(config) {
  // 修改订阅解析得到的配置对象
  return config;
}
```

如果删除了两个占位 provider，并且传入配置也不包含代理来源，脚本会抛出明确错误，避免生成无法工作的配置。

## 工作原理

客户端首先把订阅解析为 JavaScript 对象，然后将它传入 `main(config)`。脚本对不同字段采用两种策略：

- `proxy-providers` 使用对象展开语法合并，因此已有 provider 会被保留。
- `dns`、`proxy-groups`、`rule-providers` 和 `rules` 被统一替换，确保分流结果稳定。

代理组分为两层：

- 服务组，例如 `OpenAI`、`YouTube`、`Netflix`，负责决定某类流量采用什么策略。
- 地区组，例如 `HK`、`JP`、`US`，通过节点名称过滤和延迟测试选择节点。

规则按从上到下的顺序匹配。例如：

```text
RULE-SET,OpenAI,OpenAI
```

表示使用名为 `OpenAI` 的规则集，命中后交给同名代理组。最后的 `MATCH,Proxy` 负责接住所有未命中流量。

## 代码结构

建议按照下面的顺序阅读源码：

1. `main(config)`：了解覆写脚本的入口和合并策略
2. `dnsConfig`：了解 fake-IP、nameserver 和过滤项
3. `createSelectGroup()`、`createRegionGroup()`：了解如何抽取重复结构
4. `serviceGroupDefinitions`、`regionGroupDefinitions`：了解数据驱动配置
5. `createRuleProvider()`：了解远程规则集如何生成
6. `rules`：了解规则顺序和最终兜底

## 自定义代理组

新增服务组时，优先在 `serviceGroupDefinitions` 中添加定义，而不是复制一整个对象：

```js
[
  "MyService",
  ["Proxy", "HK", "JP", "US", "DIRECT"],
  `${ICON_BASE}/Proxy.png`
]
```

随后添加对应的 rule provider，并在 `rules` 中加入：

```js
"RULE-SET,MyService,MyService"
```

服务组名称、规则提供器名称和 `RULE-SET` 引用必须保持一致。

## 安全说明

不要把机场订阅 URL 直接提交到 Git。订阅 URL 通常带有能够访问账户节点的令牌，泄露后应立即在服务商后台重置。

公开脚本中的 `https://www.1.com` 和 `https://www.2.com` 只是 `p1` / `p2` 的位置占位。请在不受 Git 跟踪的 `*.local.js` 副本中替换，或让客户端管理订阅；不要提交替换后的真实地址。

## 本地检查

安装 Node.js 后，可以执行语法检查：

```powershell
node --check .\mihomo-global-override.js
```

语法检查只能证明 JavaScript 可以解析。修改代理组或规则集后，还应确认组名没有重复、`RULE-SET` 引用存在，并且最后保留兜底规则。

## 说明

远程规则集来自脚本中声明的第三方项目，其可用性和许可由对应项目维护者负责。使用前请根据自己的网络环境检查 DNS、IPv6、监听端口和分流策略。
