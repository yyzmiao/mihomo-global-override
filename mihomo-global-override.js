/**
 * Clash Party / Clash Verge Rev 全局覆写脚本
 */

const ONE_DAY = 86400;
const HEALTH_CHECK_URL = "https://www.gstatic.com/generate_204";

// ==================== 节点 / 订阅入口 ====================
// 后续增删订阅，只修改这个对象。真实订阅链接属于敏感凭据，请勿公开分享。
const proxyProviders = {
  p1: {
    type: "http",
    url: "https://111.com",
    interval: ONE_DAY,
    "health-check": {
      enable: true,
      url: HEALTH_CHECK_URL,
      interval: 300,
      lazy: true,
      timeout: 5000
    },
    override: {
      "additional-prefix": "p1 | ",
      "client-fingerprint": "chrome"
    }
  },
  p2: {
    type: "http",
    url: "https://222.com",
    interval: ONE_DAY,
    "health-check": {
      enable: true,
      url: HEALTH_CHECK_URL,
      interval: 300,
      lazy: true,
      timeout: 5000
    },
    override: {
      "additional-prefix": "p2 | ",
      "client-fingerprint": "chrome"
    }
  }
};

const generalConfig = {
  mode: "rule",
  "mixed-port": 7890,
  ipv6: true,
  "log-level": "warning",
  "unified-delay": true,
  "tcp-concurrent": true,
  "find-process-mode": "strict"
};

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// ==================== 程序入口 ====================
function main(config) {
  if (!isPlainObject(config)) {
    throw new TypeError("main(config) 需要接收一个配置对象");
  }

  const originalProviders = isPlainObject(config["proxy-providers"])
    ? config["proxy-providers"]
    : {};
  const mergedProviders = { ...originalProviders, ...proxyProviders };
  const proxyCount = Array.isArray(config.proxies) ? config.proxies.length : 0;

  if (proxyCount === 0 && Object.keys(mergedProviders).length === 0) {
    throw new Error("没有可用代理：请在 proxyProviders 中添加订阅，或让原配置提供节点");
  }

  config["proxy-providers"] = mergedProviders;
  config.dns = dnsConfig;
  config.sniffer = snifferConfig;
  config["proxy-groups"] = createProxyGroups();
  config["rule-providers"] = ruleProviders;
  config.rules = rules;
  config.profile = {
    ...(isPlainObject(config.profile) ? config.profile : {}),
    "store-selected": true,
    "store-fake-ip": true
  };
  config.hosts = {
    ...(isPlainObject(config.hosts) ? config.hosts : {}),
    "services.googleapis.cn": "services.googleapis.com"
  };

  Object.assign(config, generalConfig);
  return config;
}

// ==================== DNS ====================
// fake-ip 适合桌面端透明代理；rule 模式只让私网、国内域名和兼容域名返回真实 IP。
const dnsConfig = {
  enable: true,
  ipv6: true,
  listen: "0.0.0.0:1053",
  "cache-algorithm": "arc",
  "prefer-h3": false,
  "use-hosts": true,
  "use-system-hosts": true,
  "respect-rules": true,
  "enhanced-mode": "fake-ip",
  "fake-ip-range": "198.18.0.1/16",
  "fake-ip-range6": "fdfe:dcba:9876::/64",
  "fake-ip-filter-mode": "rule",
  "fake-ip-filter": [
    "RULE-SET,private-domain,real-ip",
    "RULE-SET,cn-domain,real-ip",
    "DOMAIN-SUFFIX,msftconnecttest.com,real-ip",
    "DOMAIN-SUFFIX,msftncsi.com,real-ip",
    "DOMAIN,localhost.ptlogin2.qq.com,real-ip",
    "DOMAIN,localhost.sec.qq.com,real-ip",
    "DOMAIN,localhost.work.weixin.qq.com,real-ip",
    "MATCH,fake-ip"
  ],
  "default-nameserver": ["223.5.5.5", "119.29.29.29"],
  nameserver: [
    "https://1.1.1.1/dns-query",
    "https://8.8.8.8/dns-query"
  ],
  "nameserver-policy": {
    "rule-set:private-domain,cn-domain": [
      "https://223.5.5.5/dns-query",
      "https://1.12.12.12/dns-query"
    ]
  },
  "proxy-server-nameserver": [
    "https://223.5.5.5/dns-query",
    "https://1.12.12.12/dns-query"
  ],
  "direct-nameserver": [
    "https://223.5.5.5/dns-query",
    "https://1.12.12.12/dns-query"
  ],
  "direct-nameserver-follow-policy": true
};

// ==================== 域名嗅探 ====================
const snifferConfig = {
  enable: true,
  "force-dns-mapping": true,
  "parse-pure-ip": true,
  "override-destination": true,
  sniff: {
    HTTP: {
      ports: [80, "8080-8880"],
      "override-destination": true
    },
    TLS: { ports: [443, 5228, 8443] },
    QUIC: { ports: [443, 8443] }
  },
  "skip-domain": ["+.push.apple.com", "+.io.mi.com"]
};

// ==================== 代理组 ====================
const NODE_EXCLUDE_BODY =
  "套餐|重置|剩余|到期|订阅|群组|官网|流量|有效期|客服|Traffic|Expire|GB\\b";
const NODE_EXCLUDE = `(?i)(${NODE_EXCLUDE_BODY})`;

const REGION_DEFINITIONS = [
  ["香港节点", "(?i)(🇭🇰|香港|Hong ?Kong|\\bHK(G)?\\b)"],
  ["台湾节点", "(?i)(🇹🇼|台湾|台北|Taiwan|Taipei|\\bTW(N)?\\b)"],
  ["日本节点", "(?i)(🇯🇵|日本|东京|大阪|Japan|Tokyo|Osaka|\\bJP(N)?\\b)"],
  ["新加坡节点", "(?i)(🇸🇬|新加坡|狮城|Singapore|\\bSG(P)?\\b)"],
  ["美国节点", "(?i)(🇺🇸|美国|洛杉矶|圣何塞|西雅图|芝加哥|United ?States|America|\\bUS(A)?\\b)"]
];

const REGION_GROUPS = REGION_DEFINITIONS.map(([name]) => name);
const REGION_PATTERN = REGION_DEFINITIONS.map(([, pattern]) => pattern.replace(/^\(\?i\)/, ""))
  .join("|");
const COMMON_SELECTORS = [
  "总模式",
  "自动选择",
  "故障转移",
  ...REGION_GROUPS,
  "其他节点",
  "全部节点",
  "DIRECT"
];

const SERVICE_DEFINITIONS = [
  ["小红书", ["DIRECT", ...COMMON_SELECTORS]],
  ["抖音", ["DIRECT", ...COMMON_SELECTORS]],
  ["BiliBili", ["DIRECT", "台湾节点", "香港节点", ...COMMON_SELECTORS]],
  ["Apple", ["DIRECT", ...COMMON_SELECTORS]],
  ["Microsoft", ["DIRECT", ...COMMON_SELECTORS]],
  ["OneDrive", ["DIRECT", ...COMMON_SELECTORS]],
  ["Steam", ["总模式", "DIRECT", ...COMMON_SELECTORS]],
  ["OpenAI", ["美国节点", "总模式", "日本节点", "新加坡节点", ...COMMON_SELECTORS]],
  ["Claude", ["美国节点", "总模式", "日本节点", ...COMMON_SELECTORS]],
  ["Gemini", ["新加坡节点", "美国节点", "总模式", ...COMMON_SELECTORS]],
  ["GoogleFCM", COMMON_SELECTORS],
  ["YouTube", COMMON_SELECTORS],
  ["Google", COMMON_SELECTORS],
  ["GitHub", COMMON_SELECTORS],
  ["Telegram", COMMON_SELECTORS],
  ["Discord", COMMON_SELECTORS],
  ["Twitter(X)", COMMON_SELECTORS],
  ["WhatsApp", COMMON_SELECTORS],
  ["Facebook", COMMON_SELECTORS],
  ["Spotify", COMMON_SELECTORS],
  ["TikTok", ["台湾节点", "总模式", ...COMMON_SELECTORS]],
  ["Netflix", COMMON_SELECTORS],
  ["Disney", COMMON_SELECTORS],
  ["Emby", COMMON_SELECTORS]
];

function unique(items) {
  return [...new Set(items)];
}

function createProxyGroups() {
  const automaticBase = {
    url: HEALTH_CHECK_URL,
    interval: 300,
    timeout: 5000,
    lazy: true,
    "max-failed-times": 3,
    "expected-status": "204",
    "include-all": true,
    "exclude-filter": NODE_EXCLUDE,
    "exclude-type": "Direct|Reject|Compatible"
  };

  const primaryGroups = [
    {
      name: "总模式",
      type: "select",
      proxies: [
        "自动选择",
        "故障转移",
        ...REGION_GROUPS,
        "其他节点",
        "负载均衡",
        "全部节点",
        "DIRECT"
      ]
    },
    {
      ...automaticBase,
      name: "自动选择",
      type: "url-test",
      tolerance: 50
    },
    {
      ...automaticBase,
      name: "故障转移",
      type: "fallback"
    },
    {
      ...automaticBase,
      name: "负载均衡",
      type: "load-balance",
      strategy: "consistent-hashing"
    },
    {
      name: "全部节点",
      type: "select",
      "include-all": true,
      "exclude-filter": NODE_EXCLUDE,
      "exclude-type": "Direct|Reject|Compatible"
    }
  ];

  const regionGroups = REGION_DEFINITIONS.map(([name, filter]) => ({
    ...automaticBase,
    name,
    type: "url-test",
    filter,
    tolerance: 50,
    "empty-fallback": "COMPATIBLE"
  }));

  const otherRegionGroup = {
    ...automaticBase,
    name: "其他节点",
    type: "url-test",
    filter: ".+",
    "exclude-filter": `(?i)(?:${NODE_EXCLUDE_BODY}|${REGION_PATTERN})`,
    tolerance: 50,
    "empty-fallback": "COMPATIBLE"
  };

  const serviceGroups = SERVICE_DEFINITIONS.map(([name, proxies]) => ({
    name,
    type: "select",
    proxies: unique(proxies)
  }));

  return [
    ...primaryGroups,
    ...serviceGroups,
    {
      name: "广告拦截",
      type: "select",
      proxies: ["REJECT", "DIRECT"]
    },
    {
      name: "漏网之鱼",
      type: "select",
      proxies: ["总模式", "DIRECT"]
    },
    ...regionGroups,
    otherRegionGroup
  ];
}

// ==================== 规则集 ====================
const META_RULE_BASE =
  "https://fastly.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta";

function createMrsProvider(behavior, file, collection = "geo") {
  return {
    type: "http",
    behavior,
    format: "mrs",
    interval: ONE_DAY,
    url: `${META_RULE_BASE}/${collection}/${behavior === "domain" ? "geosite" : "geoip"}/${file}.mrs`,
    path: `./rulesets/${file}-${behavior}.mrs`
  };
}

const DOMAIN_RULESETS = {
  "private-domain": "private",
  "cn-domain": "cn",
  "xiaohongshu-domain": "xiaohongshu",
  "douyin-domain": "douyin",
  "bilibili-domain": "bilibili",
  "steam-domain": "steam",
  "apple-domain": "apple",
  "microsoft-domain": "microsoft",
  "onedrive-domain": "onedrive",
  "openai-domain": "openai",
  "claude-domain": "anthropic",
  "gemini-domain": "google-gemini",
  "googlefcm-domain": "googlefcm",
  "youtube-domain": "youtube",
  "google-domain": "google",
  "github-domain": "github",
  "telegram-domain": "telegram",
  "discord-domain": "discord",
  "twitter-domain": "twitter",
  "whatsapp-domain": "whatsapp",
  "facebook-domain": "facebook",
  "spotify-domain": "spotify",
  "tiktok-domain": "tiktok",
  "netflix-domain": "netflix",
  "disney-domain": "disney",
  "emby-domain": "category-emby"
};

const IP_RULESETS = {
  "private-ip": ["private", "geo"],
  "cn-ip": ["cn", "geo"],
  "bilibili-ip": ["bilibili", "geo-lite"],
  "apple-ip": ["apple", "geo-lite"],
  "google-ip": ["google", "geo"],
  "telegram-ip": ["telegram", "geo"],
  "twitter-ip": ["twitter", "geo"],
  "facebook-ip": ["facebook", "geo"],
  "netflix-ip": ["netflix", "geo"]
};

const ruleProviders = {
  ...Object.fromEntries(
    Object.entries(DOMAIN_RULESETS).map(([name, file]) => [
      name,
      createMrsProvider("domain", file)
    ])
  ),
  ...Object.fromEntries(
    Object.entries(IP_RULESETS).map(([name, [file, collection]]) => [
      name,
      createMrsProvider("ipcidr", file, collection)
    ])
  ),
  "ads-domain": {
    type: "http",
    behavior: "domain",
    format: "mrs",
    interval: ONE_DAY,
    url: "https://fastly.jsdelivr.net/gh/TG-Twilight/AWAvenue-Ads-Rule@main/Filters/AWAvenue-Ads-Rule-Clash.mrs",
    path: "./rulesets/ads-domain.mrs"
  }
};

// 顺序就是优先级：私网 > 系统兼容 > 广告 > 细分服务 > 国内 > 兜底。
const rules = [
  "RULE-SET,private-domain,DIRECT",
  "RULE-SET,private-ip,DIRECT,no-resolve",
  "DOMAIN-SUFFIX,msftconnecttest.com,DIRECT",
  "DOMAIN-SUFFIX,msftncsi.com,DIRECT",
  "DST-PORT,123,DIRECT",

  "RULE-SET,ads-domain,广告拦截",

  // Google 细分规则必须位于宽泛的 Google 规则之前。
  "RULE-SET,googlefcm-domain,GoogleFCM",
  "RULE-SET,youtube-domain,YouTube",
  "RULE-SET,gemini-domain,Gemini",
  "RULE-SET,google-domain,Google",
  "RULE-SET,google-ip,Google,no-resolve",

  // Microsoft 细分规则必须位于宽泛的 Microsoft 规则之前。
  "RULE-SET,github-domain,GitHub",
  "RULE-SET,onedrive-domain,OneDrive",
  "RULE-SET,microsoft-domain,Microsoft",

  "RULE-SET,apple-domain,Apple",
  "RULE-SET,apple-ip,Apple,no-resolve",
  "RULE-SET,openai-domain,OpenAI",
  "RULE-SET,claude-domain,Claude",

  "RULE-SET,telegram-domain,Telegram",
  "RULE-SET,telegram-ip,Telegram,no-resolve",
  "RULE-SET,discord-domain,Discord",
  "RULE-SET,twitter-domain,Twitter(X)",
  "RULE-SET,twitter-ip,Twitter(X),no-resolve",
  "RULE-SET,whatsapp-domain,WhatsApp",
  "RULE-SET,facebook-domain,Facebook",
  "RULE-SET,facebook-ip,Facebook,no-resolve",

  "RULE-SET,spotify-domain,Spotify",
  "RULE-SET,tiktok-domain,TikTok",
  "RULE-SET,netflix-domain,Netflix",
  "RULE-SET,netflix-ip,Netflix,no-resolve",
  "RULE-SET,disney-domain,Disney",
  "RULE-SET,emby-domain,Emby",
  "RULE-SET,steam-domain,Steam",

  // 国内服务先进入可切换的专组，再由 cn 规则处理其余国内流量。
  "RULE-SET,xiaohongshu-domain,小红书",
  "RULE-SET,douyin-domain,抖音",
  "RULE-SET,bilibili-domain,BiliBili",
  "RULE-SET,bilibili-ip,BiliBili,no-resolve",
  "RULE-SET,cn-domain,DIRECT",
  "RULE-SET,cn-ip,DIRECT,no-resolve",

  "MATCH,漏网之鱼"
];
