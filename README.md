# Mihomo Global Override

English | [简体中文](./README.zh-CN.md)

A data-driven global override script for Clash Party and Clash Verge Rev, both powered by the Mihomo core. It preserves the proxy sources from your active profile while consistently generating DNS settings, proxy groups, remote rule providers, and routing rules.

## Features

- Contains no subscription URLs, proxy nodes, or access credentials
- Preserves `proxies` and `proxy-providers` from the active profile
- Combines `select` and `url-test` groups for service- and region-based routing
- Generates repetitive configuration from reusable factory functions and data tables
- Uses fake-IP DNS mode with common LAN and sign-in compatibility exclusions
- Evaluates specific inline rules first, remote rule sets next, and `MATCH` as the final fallback

## File

- `mihomo-global-override.js` — the production override script to import into your client

Local backups, test helpers, and private variants containing subscription details are intentionally excluded from this repository.

## Usage

1. Download `mihomo-global-override.js`.
2. Import it through the override feature in Clash Party or the global extension script feature in Clash Verge Rev.
3. Make sure the active profile already contains at least one proxy or one `proxy-provider`.
4. Enable the script and refresh the profile.

The client invokes the script through its `main` entry point:

```js
function main(config) {
  // Modify the parsed profile configuration.
  return config;
}
```

If the incoming profile has no proxy source, the script throws a descriptive error instead of producing an unusable configuration.

## How It Works

The client parses the active profile into a JavaScript object and passes it to `main(config)`. The script applies two update strategies:

- `proxy-providers` is merged with object spread syntax, preserving providers from the active profile.
- `dns`, `proxy-groups`, `rule-providers`, and `rules` are replaced to make routing behavior deterministic.

Proxy groups are organized into two layers:

- Service groups such as `OpenAI`, `YouTube`, and `Netflix` decide which policy handles a category of traffic.
- Region groups such as `HK`, `JP`, and `US` filter proxies by name and use latency testing to select a node.

Rules are evaluated from top to bottom. For example:

```text
RULE-SET,OpenAI,OpenAI
```

This applies the rule provider named `OpenAI` and routes matches through the proxy group with the same name. The final `MATCH,Proxy` rule handles anything not matched earlier.

## Code Tour

The source is easiest to understand in this order:

1. `main(config)` — entry point and merge strategy
2. `dnsConfig` — fake-IP, nameservers, and compatibility exclusions
3. `createSelectGroup()` and `createRegionGroup()` — reusable configuration factories
4. `serviceGroupDefinitions` and `regionGroupDefinitions` — data-driven group definitions
5. `createRuleProvider()` — remote rule provider generation
6. `rules` — ordered routing rules and the final fallback

## Adding a Service Group

Add a definition to `serviceGroupDefinitions` instead of copying an entire group object:

```js
[
  "MyService",
  ["Proxy", "HK", "JP", "US", "DIRECT"],
  `${ICON_BASE}/Proxy.png`
]
```

Then add the corresponding rule provider and reference it in `rules`:

```js
"RULE-SET,MyService,MyService"
```

The service group name, rule provider name, and `RULE-SET` reference must remain consistent.

## Security

Never commit a proxy subscription URL to Git. These URLs often contain bearer-like tokens that grant access to account-specific proxy nodes. If one is exposed, rotate it through the provider immediately.

For private multi-subscription setups, keep a `*.local.js` variant that is not tracked by Git, or manage the subscriptions in the client profile. `additionalProxyProviders` is deliberately empty in the public script.

## Local Validation

With Node.js installed, run a syntax check:

```powershell
node --check .\mihomo-global-override.js
```

A syntax check only proves that the JavaScript can be parsed. After changing groups or providers, also verify that group names are unique, every `RULE-SET` reference exists, and the final fallback rule remains in place.

## Disclaimer

Remote rule sets are maintained by the third-party projects referenced in the source. Their availability and licensing remain the responsibility of their respective maintainers. Review DNS, IPv6, listening-port, and routing settings for your own environment before use.
