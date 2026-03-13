# OpenClaw 养虾指南

> 一站式 OpenClaw 部署、配置与运维完整指南

---

## 目录

1. [一键式安装部署](#1-一键式安装部署)
2. [技能配置](#2-技能配置)
3. [模型供应商配置](#3-模型供应商配置)
4. [多智能体配置](#4-多智能体配置)
5. [工具类配置](#5-工具类配置)
6. [渠道对接配置](#6-渠道对接配置)
7. [运维监控](#7-运维监控)
8. [常见问题排查](#8-常见问题排查)

---

## 1. 一键式安装部署

### 1.1 ClawPanel 管理面板（推荐）

ClawPanel 是 OpenClaw 的智能管理面板，提供可视化的配置管理、进程监控、通道管理、运维监控等功能。

#### Lite 版（开箱即用）

**适用场景**：新手用户，希望快速上手

```bash
# Linux 一键安装
curl -fsSL http://39.102.53.188:16198/clawpanel/scripts/install-lite.sh -o install-lite.sh && sudo bash install-lite.sh
```

**特点**：
- 内置 OpenClaw `2026.2.26` 版本
- 预置常用通道插件（Telegram、QQ、飞书、钉钉、企业微信）
- 安装后直接可用，无需额外配置 OpenClaw

#### Pro 版（高级用户）

**适用场景**：已有 OpenClaw 环境，需要灵活管理

```bash
# Linux / macOS
curl -fsSL http://39.102.53.188:16198/clawpanel/scripts/install.sh -o install.sh && sudo bash install.sh

# Windows (PowerShell 管理员)
irm http://39.102.53.188:16198/clawpanel/scripts/install.ps1 | iex
```

**特点**：
- 支持一键安装或外部接管现有 OpenClaw
- 自定义插件和环境配置
- 支持多智能体管理

#### 访问面板

安装完成后访问 `http://localhost:19527`，默认密码 `clawpanel`。

### 1.2 手动安装 OpenClaw

#### 通过 npm 安装（推荐）

```bash
# 全局安装
npm install -g openclaw@latest

# 或使用 pnpm
pnpm add -g openclaw@latest
```

#### 运行时要求

- **Node.js**: 22+ 版本
- **操作系统**: Linux / macOS / Windows

#### 验证安装

```bash
openclaw --version
openclaw doctor
```

### 1.3 初始化配置

```bash
# 运行配置向导
openclaw onboard

# 或手动配置
openclaw config set agents.defaults.model.primary "anthropic/claude-opus-4-6"
```

### 1.4 启动网关

```bash
# 前台运行
openclaw gateway

# 后台服务模式
openclaw gateway install  # 安装为系统服务
openclaw gateway start    # 启动服务
openclaw gateway status    # 查看状态
```

---

## 2. 技能配置

技能（Skills）是 OpenClaw 的核心能力扩展机制，每个技能是一个包含 `SKILL.md` 的目录。

### 2.1 技能位置与优先级

技能从三个位置加载，优先级从高到低：

| 位置 | 路径 | 说明 |
|------|------|------|
| 工作区技能 | `<workspace>/skills` | 每个智能体独有，最高优先级 |
| 管理技能 | `~/.openclaw/skills` | 所有智能体共享 |
| 内置技能 | npm 包内置 | 随安装提供，最低优先级 |

### 2.2 技能市场（ClawHub）

浏览和安装技能：[https://clawhub.com](https://clawhub.com)

```bash
# 安装技能到工作区
clawhub install <skill-slug>

# 更新所有已安装技能
clawhub update --all

# 同步技能
clawhub sync --all
```

### 2.3 技能格式

每个技能目录需包含 `SKILL.md`：

```markdown
---
name: nano-banana-pro
description: 通过 Gemini 3 Pro Image 生成或编辑图片
---

# 使用说明

这里是技能的具体使用指导...
```

### 2.4 技能门控配置

通过 `metadata.openclaw` 设置加载条件：

```markdown
---
name: nano-banana-pro
description: 通过 Gemini 生成图片
metadata:
  {
    "openclaw":
      {
        "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] },
        "primaryEnv": "GEMINI_API_KEY",
      },
  }
---
```

**门控字段说明**：

- `always: true` — 始终加载（跳过其他门控）
- `os` — 平台限制 (`darwin`, `linux`, `win32`)
- `requires.bins` — 需要的命令行工具
- `requires.env` — 需要的环境变量
- `requires.config` — 需要的配置项

### 2.5 技能配置覆盖

在 `~/.openclaw/openclaw.json` 中配置：

```json5
{
  skills: {
    entries: {
      "nano-banana-pro": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" },
        env: {
          GEMINI_API_KEY: "YOUR_API_KEY",
        },
        config: {
          endpoint: "https://example.com",
          model: "nano-pro",
        },
      },
    },
  },
}
```

### 2.6 常用技能示例

| 技能 | 功能 | 依赖 |
|------|------|------|
| `github` | GitHub 操作 | `GH_TOKEN` |
| `gemini` | Gemini CLI 辅助 | `gemini` 命令 |
| `openai-image-gen` | 图像生成 | `OPENAI_API_KEY` |
| `weather` | 天气查询 | 无 |
| `summarize` | 文本摘要 | `summarize` CLI |
| `notion` | Notion 集成 | `NOTION_API_KEY` |

---

## 3. 模型供应商配置

### 3.1 快速配置

```bash
# 使用配置向导
openclaw onboard

# 直接设置模型
openclaw models set anthropic/claude-opus-4-6

# 查看可用模型
openclaw models list
```

### 3.2 内置供应商

OpenClaw 内置以下供应商，只需设置 API Key：

| 供应商 | Provider ID | 环境变量 | 示例模型 |
|--------|-------------|----------|----------|
| OpenAI | `openai` | `OPENAI_API_KEY` | `openai/gpt-5.4` |
| Anthropic | `anthropic` | `ANTHROPIC_API_KEY` | `anthropic/claude-opus-4-6` |
| Google Gemini | `google` | `GEMINI_API_KEY` | `google/gemini-3.1-pro-preview` |
| OpenCode | `opencode` | `OPENCODE_API_KEY` | `opencode/claude-opus-4-6` |
| OpenRouter | `openrouter` | `OPENROUTER_API_KEY` | `openrouter/anthropic/claude-sonnet-4-5` |
| Mistral | `mistral` | `MISTRAL_API_KEY` | `mistral/mistral-large-latest` |
| xAI Grok | `xai` | `XAI_API_KEY` | `xai/grok-beta` |
| Groq | `groq` | `GROQ_API_KEY` | - |
| Ollama | `ollama` | 本地服务 | `ollama/llama3.3` |

### 3.3 国内供应商

#### 火山引擎（Doubao）

```json5
{
  agents: {
    defaults: { model: { primary: "volcengine/doubao-seed-1-8-251228" } },
  },
}
```

环境变量：`VOLCANO_ENGINE_API_KEY`

#### Kimi / Moonshot

```json5
{
  agents: {
    defaults: { model: { primary: "moonshot/kimi-k2.5" } },
  },
  models: {
    providers: {
      moonshot: {
        baseUrl: "https://api.moonshot.ai/v1",
        apiKey: "${MOONSHOT_API_KEY}",
        api: "openai-completions",
        models: [{ id: "kimi-k2.5", name: "Kimi K2.5" }],
      },
    },
  },
}
```

#### 智谱 GLM

```json5
{
  agents: {
    defaults: { model: { primary: "zai/glm-5" } },
  },
}
```

环境变量：`ZAI_API_KEY`

#### MiniMax

```json5
{
  models: {
    providers: {
      minimax: {
        baseUrl: "https://api.minimaxi.com/anthropic/v1",
        apiKey: "${MINIMAX_API_KEY}",
        api: "anthropic-messages",
        models: [{ id: "MiniMax-M2.5", name: "MiniMax M2.5" }],
      },
    },
  },
}
```

### 3.4 本地模型

#### Ollama

```bash
# 安装 Ollama
# https://ollama.com/download

# 拉取模型
ollama pull llama3.3

# 配置 OpenClaw
export OLLAMA_API_KEY="ollama-local"
```

```json5
{
  agents: {
    defaults: { model: { primary: "ollama/llama3.3" } },
  },
}
```

#### vLLM

```json5
{
  agents: {
    defaults: { model: { primary: "vllm/your-model-id" } },
  },
}
```

环境变量：`VLLM_API_KEY=vllm-local`

### 3.5 API Key 轮换

支持多 Key 轮换，避免速率限制：

```bash
# 方式一：逗号分隔列表
export OPENAI_API_KEYS="sk-key1,sk-key2,sk-key3"

# 方式二：编号列表
export OPENAI_API_KEY_1="sk-key1"
export OPENAI_API_KEY_2="sk-key2"

# 方式三：实时覆盖（最高优先级）
export OPENCLAW_LIVE_OPENAI_KEY="sk-live-key"
```

---

## 4. 多智能体配置

多智能体允许在同一个网关中运行多个隔离的 AI 实例，每个实例有独立的工作区、身份和会话。

### 4.1 核心概念

| 概念 | 说明 |
|------|------|
| `agentId` | 智能体标识，一个独立的"大脑" |
| `accountId` | 通道账号实例（如两个 WhatsApp 号码） |
| `binding` | 路由规则，将消息分发到智能体 |
| `workspace` | 工作区目录，存放技能和配置文件 |

### 4.2 创建智能体

```bash
# 使用向导创建
openclaw agents add coding
openclaw agents add social

# 查看智能体列表
openclaw agents list --bindings
```

### 4.3 配置示例

#### 多智能体 + 多通道账号

```json5
{
  agents: {
    list: [
      {
        id: "home",
        default: true,
        name: "家庭助手",
        workspace: "~/.openclaw/workspace-home",
        agentDir: "~/.openclaw/agents/home/agent",
      },
      {
        id: "work",
        name: "工作助手",
        workspace: "~/.openclaw/workspace-work",
        agentDir: "~/.openclaw/agents/work/agent",
      },
    ],
  },

  // 路由规则
  bindings: [
    { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
    { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },
  ],

  channels: {
    whatsapp: {
      accounts: {
        personal: {},
        biz: {},
      },
    },
  },
}
```

#### 同一通道不同智能体

```json5
{
  agents: {
    list: [
      { id: "chat", name: "日常聊天", model: "anthropic/claude-sonnet-4-5" },
      { id: "opus", name: "深度工作", model: "anthropic/claude-opus-4-6" },
    ],
  },
  bindings: [
    { agentId: "chat", match: { channel: "whatsapp" } },
    { agentId: "opus", match: { channel: "telegram" } },
  ],
}
```

#### 按用户路由

```json5
{
  agents: {
    list: [
      { id: "alex", workspace: "~/.openclaw/workspace-alex" },
      { id: "mia", workspace: "~/.openclaw/workspace-mia" },
    ],
  },
  bindings: [
    {
      agentId: "alex",
      match: { channel: "whatsapp", peer: { kind: "direct", id: "+15551230001" } },
    },
    {
      agentId: "mia",
      match: { channel: "whatsapp", peer: { kind: "direct", id: "+15551230002" } },
    },
  ],
}
```

### 4.4 路由优先级

路由规则按以下顺序匹配（最具体优先）：

1. `peer` 匹配（精确 DM/群组/频道 ID）
2. `parentPeer` 匹配（线程继承）
3. `guildId + roles`（Discord 角色路由）
4. `guildId`（Discord 服务器）
5. `teamId`（Slack 团队）
6. `accountId` 匹配
7. 通道级别匹配 (`accountId: "*"`)
8. 默认智能体

### 4.5 智能体身份配置

每个智能体可配置独立的身份文件：

```
<workspace>/
├── AGENTS.md      # 行为准则
├── SOUL.md        # 核心人格
├── USER.md        # 用户偏好
└── skills/        # 专属技能
```

### 4.6 智能体沙箱配置

```json5
{
  agents: {
    list: [
      {
        id: "personal",
        sandbox: { mode: "off" },  // 无沙箱
      },
      {
        id: "family",
        sandbox: {
          mode: "all",     // 始终沙箱化
          scope: "agent",  // 每智能体一个容器
          docker: {
            setupCommand: "apt-get update && apt-get install -y git curl",
          },
        },
        tools: {
          allow: ["read", "exec"],
          deny: ["write", "edit", "browser"],
        },
      },
    ],
  },
}
```

---

## 5. 工具类配置

### 5.1 网络搜索工具

OpenClaw 提供 `web_search` 和 `web_fetch` 两个轻量级网络工具。

#### 搜索供应商选择

| 供应商 | 结果类型 | 环境变量 | 特点 |
|--------|----------|----------|------|
| Brave Search | 结构化结果 | `BRAVE_API_KEY` | 支持 LLM Context 模式 |
| Gemini | AI 综合 + 引用 | `GEMINI_API_KEY` | Google Search 地面化 |
| Grok | AI 综合 + 引用 | `XAI_API_KEY` | xAI 网络地面化 |
| Kimi | AI 综合 + 引用 | `KIMI_API_KEY` | Moonshot 网络搜索 |
| Perplexity | 结构化结果 | `PERPLEXITY_API_KEY` | 支持域名过滤 |

#### 配置示例

**Brave Search**：

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "brave",
        apiKey: "YOUR_BRAVE_API_KEY",
        maxResults: 5,
        cacheTtlMinutes: 15,
      },
    },
  },
}
```

**Gemini 搜索**：

```json5
{
  tools: {
    web: {
      search: {
        provider: "gemini",
        gemini: {
          apiKey: "AIza...",
          model: "gemini-2.5-flash",
        },
      },
    },
  },
}
```

#### 获取 API Key

- **Brave**: [brave.com/search/api](https://brave.com/search/api/) — 每月 $5 免费额度
- **Perplexity**: [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api)
- **Gemini**: [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

### 5.2 浏览器工具

OpenClaw 可管理专用的 Chromium 浏览器配置文件，用于自动化浏览。

#### 快速启动

```bash
openclaw browser --browser-profile openclaw status
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

#### 配置

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "openclaw",  // 或 "chrome" 使用扩展中继
    color: "#FF4500",
    headless: false,
    profiles: {
      openclaw: { cdpPort: 18800, color: "#FF4500" },
      work: { cdpPort: 18801, color: "#0066CC" },
    },
  },
}
```

#### 配置文件类型

| Profile | 说明 |
|---------|------|
| `openclaw` | OpenClaw 管理的独立浏览器 |
| `chrome` | Chrome 扩展中继到现有浏览器 |
| 自定义 | 远程 CDP URL |

#### 浏览器选择

自动检测顺序：Chrome → Brave → Edge → Chromium → Chrome Canary

手动指定：

```json5
{
  browser: {
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  },
}
```

#### 安全配置

```json5
{
  browser: {
    ssrfPolicy: {
      dangerouslyAllowPrivateNetwork: false,  // 禁止访问私有网络
      hostnameAllowlist: ["*.example.com"],
    },
  },
}
```

### 5.3 其他工具

| 工具 | 功能 | 配置路径 |
|------|------|----------|
| `exec` | 执行命令 | `tools.exec` |
| `read/write/edit` | 文件操作 | 默认启用 |
| `canvas` | Canvas 操作 | `tools.canvas` |
| `nodes` | 远程节点 | `tools.nodes` |
| `cron` | 定时任务 | `tools.cron` |

---

## 6. 渠道对接配置

### 6.1 支持的渠道

#### 内置渠道

| 渠道 | 协议 | 特点 |
|------|------|------|
| Telegram | Bot API | 配置最简单，推荐入门 |
| Discord | Bot API | 支持服务器和频道 |
| WhatsApp | Web (Baileys) | 需 QR 配对 |
| Slack | Bolt SDK | 工作区应用 |
| Signal | signal-cli | 注重隐私 |
| iMessage | BlueBubbles | 推荐 macOS 用户 |

#### 插件渠道

| 渠道 | 安装命令 |
|------|----------|
| 飞书 | 内置 `@openclaw/feishu` |
| 钉钉 | `openclaw plugins install @openclaw/dingtalk` |
| 企业微信 | `openclaw plugins install @openclaw/wecom` |
| QQ (NapCat) | `openclaw plugins install @openclaw/qq` |
| Matrix | `openclaw plugins install @openclaw/matrix` |
| Microsoft Teams | `openclaw plugins install @openclaw/msteams` |
| LINE | `openclaw plugins install @openclaw/line` |

### 6.2 Telegram 配置

**最简单的入门选择**。

#### 步骤

1. 在 Telegram 中找到 **@BotFather**
2. 发送 `/newbot` 创建机器人
3. 保存返回的 Token

#### 配置

```json5
{
  channels: {
    telegram: {
      enabled: true,
      botToken: "123456:ABC...",
      dmPolicy: "pairing",  // 或 "allowlist"
      groups: { "*": { requireMention: true } },
    },
  },
}
```

#### 环境变量方式

```bash
export TELEGRAM_BOT_TOKEN="123456:ABC..."
```

#### 配对审批

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

### 6.3 飞书配置

#### 步骤

1. 访问 [飞书开放平台](https://open.feishu.cn/app)
2. 创建企业应用
3. 复制 App ID 和 App Secret
4. 配置权限（批量导入）
5. 启用机器人能力
6. 配置事件订阅（WebSocket 长连接）

#### 权限配置

```json
{
  "scopes": {
    "tenant": [
      "im:message",
      "im:message.group_at_msg:readonly",
      "im:message.p2p_msg:readonly",
      "im:message:send_as_bot",
      "im:resource"
    ]
  }
}
```

#### OpenClaw 配置

```json5
{
  channels: {
    feishu: {
      enabled: true,
      dmPolicy: "pairing",
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
          botName: "AI 助手",
        },
      },
    },
  },
}
```

#### Lark 国际版

```json5
{
  channels: {
    feishu: {
      domain: "lark",  // 使用国际版域名
    },
  },
}
```

### 6.4 钉钉配置

```bash
# 安装插件
openclaw plugins install @openclaw/dingtalk
```

```json5
{
  channels: {
    dingtalk: {
      enabled: true,
      accounts: {
        main: {
          clientId: "dingxxx",
          clientSecret: "xxx",
        },
      },
    },
  },
}
```

### 6.5 企业微信配置

```bash
# 安装插件
openclaw plugins install @openclaw/wecom
```

支持两种模式：
- 智能机器人
- 自建应用

### 6.6 QQ 配置 (NapCat)

```bash
# 安装插件
openclaw plugins install @openclaw/qq
```

**注意**：使用第三方客户端登录 QQ 存在封号风险，建议使用小号测试。

### 6.7 WhatsApp 配置

#### 步骤

```bash
# 配置访问策略
openclaw config set channels.whatsapp.dmPolicy "allowlist"
openclaw config set channels.whatsapp.allowFrom '["+15551234567"]'

# 链接 WhatsApp
openclaw channels login --channel whatsapp

# 启动网关
openclaw gateway

# 审批配对
openclaw pairing approve whatsapp <CODE>
```

#### 多账号

```bash
openclaw channels login --channel whatsapp --account personal
openclaw channels login --channel whatsapp --account biz
```

### 6.8 Discord 配置

1. 访问 [Discord Developer Portal](https://discord.com/developers/applications)
2. 创建应用并创建 Bot
3. 启用 Message Content Intent
4. 复制 Token

```json5
{
  channels: {
    discord: {
      enabled: true,
      accounts: {
        default: {
          token: "DISCORD_BOT_TOKEN",
          guilds: {
            "123456789012345678": {
              channels: {
                "222222222222222222": { allow: true, requireMention: false },
              },
            },
          },
        },
      },
    },
  },
}
```

### 6.9 访问控制策略

#### DM 策略 (`dmPolicy`)

| 值 | 行为 |
|----|------|
| `pairing` | 默认，未知用户收到配对码，需审批 |
| `allowlist` | 仅 `allowFrom` 列表中的用户可聊天 |
| `open` | 允许所有用户（需 `allowFrom: ["*"]`） |
| `disabled` | 禁用私聊 |

#### 群组策略 (`groupPolicy`)

| 值 | 行为 |
|----|------|
| `open` | 允许所有群成员 |
| `allowlist` | 仅 `groupAllowFrom` 中的用户 |
| `disabled` | 禁用群聊 |

---

## 7. 运维监控

### 7.1 ClawPanel 运维功能

- **仪表盘**: OpenClaw 进程状态、通道概览、内存占用
- **一键重启**: OpenClaw / 网关 / ClawPanel / NapCat
- **配置中心**: 可视化模型配置、Agent 配置
- **配置检测**: 自动检测常见错误，一键修复
- **事件日志**: 实时消息流，SQLite 持久化
- **自动更新**: 检查更新 → 下载 → 校验 → 替换 → 重启

### 7.2 命令行运维

```bash
# 网关管理
openclaw gateway status
openclaw gateway restart
openclaw gateway stop

# 通道状态
openclaw channels status --probe

# 日志查看
openclaw logs --follow

# 配对管理
openclaw pairing list <channel>
openclaw pairing approve <channel> <CODE>

# 诊断
openclaw doctor
openclaw doctor --fix
```

### 7.3 服务管理 (Linux)

```bash
# systemd 服务
systemctl start clawpanel
systemctl stop clawpanel
systemctl restart clawpanel
systemctl status clawpanel
journalctl -u clawpanel -f
```

### 7.4 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `CLAWPANEL_PORT` | `19527` | Web 服务端口 |
| `CLAWPANEL_DATA` | `./data` | 数据目录 |
| `OPENCLAW_DIR` | `~/.openclaw` | OpenClaw 配置目录 |
| `CLAWPANEL_SECRET` | 随机 | JWT 签名密钥 |
| `ADMIN_TOKEN` | `clawpanel` | 管理密码 |

---

## 8. 常见问题排查

### 8.1 安装问题

| 问题 | 解决方案 |
|------|----------|
| macOS 安装报错"无法验证开发者" | `sudo xattr -d com.apple.quarantine /opt/clawpanel/clawpanel` |
| 面板显示空白/无法连接 | 检查服务状态、防火墙放行 19527 端口 |
| OpenClaw 版本显示 unknown | 通过 npm 安装：`npm i -g openclaw@latest` |

### 8.2 通道问题

| 问题 | 解决方案 |
|------|----------|
| 机器人不响应群消息 | 检查 `groupPolicy`、确保 @mention 机器人、检查权限 |
| WhatsApp 无法链接 | 确保 QR 码扫描成功、检查 `dmPolicy` 配置 |
| 飞书不接收消息 | 确保应用已发布、事件订阅已配置、长连接已启用 |

### 8.3 模型问题

| 问题 | 解决方案 |
|------|----------|
| API Key 无效 | 检查环境变量或配置文件中的 Key 格式 |
| 速率限制 | 配置多 Key 轮换、降低请求频率 |
| 模型不存在 | 使用 `openclaw models list` 查看可用模型 |

### 8.4 性能问题

| 问题 | 解决方案 |
|------|----------|
| 内存占用高 | 减少并发会话、启用沙箱隔离 |
| 响应慢 | 检查模型延迟、优化提示词长度 |
| 测试内存压力 | `OPENCLAW_TEST_PROFILE=low OPENCLAW_TEST_SERIAL_GATEWAY=1 pnpm test` |

### 8.5 卸载

```bash
# ClawPanel Lite (Linux)
curl -fsSL http://39.102.53.188:16198/clawpanel/scripts/uninstall-lite.sh -o uninstall-lite.sh && sudo bash uninstall-lite.sh

# ClawPanel Pro (Linux)
sudo systemctl stop clawpanel && sudo rm -rf /opt/clawpanel

# OpenClaw
npm uninstall -g openclaw
rm -rf ~/.openclaw
```

---

## 附录：配置文件参考

### 完整配置示例

```json5
{
  // 智能体配置
  agents: {
    defaults: {
      model: { primary: "anthropic/claude-opus-4-6" },
    },
    list: [
      { id: "main", default: true, workspace: "~/.openclaw/workspace" },
    ],
  },

  // 模型供应商
  models: {
    mode: "merge",
    providers: {},
  },

  // 技能配置
  skills: {
    entries: {},
  },

  // 工具配置
  tools: {
    web: {
      search: { enabled: true, provider: "brave" },
      fetch: { enabled: true },
    },
    browser: { enabled: true },
  },

  // 通道配置
  channels: {
    telegram: {
      enabled: true,
      botToken: "${TELEGRAM_BOT_TOKEN}",
      dmPolicy: "pairing",
    },
    whatsapp: {
      enabled: false,
      dmPolicy: "allowlist",
      allowFrom: ["+15551234567"],
    },
    feishu: {
      enabled: false,
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
        },
      },
    },
  },

  // 网关配置
  gateway: {
    port: 18789,
    bind: "loopback",
  },
}
```

---

## 参考链接

- **OpenClaw 官网**: [https://openclaw.ai](https://openclaw.ai)
- **文档**: [https://docs.openclaw.ai](https://docs.openclaw.ai)
- **ClawPanel**: [https://github.com/zhaoxinyi02/ClawPanel](https://github.com/zhaoxinyi02/ClawPanel)
- **ClawHub 技能市场**: [https://clawhub.com](https://clawhub.com)
- **Discord 社区**: [https://discord.gg/openclaw](https://discord.gg/openclaw)

---

*本指南基于 OpenClaw 2026.x 版本编写，最后更新：2026年3月*
