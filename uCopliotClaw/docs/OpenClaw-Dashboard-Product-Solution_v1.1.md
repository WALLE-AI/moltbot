# OpenClaw Dashboard 产品方案

## 一、产品概述

### 1.1 产品定位

OpenClaw Dashboard 是一个基于 OpenClaw AI 框架的**一站式智能管理平台**，以 `~/.openclaw` 状态目录为核心，提供：

- **一键式部署安装** - 支持 Linux/macOS/Windows 多平台镜像选择
- **可视化配置管理** - 模型、通道、多智能体、工具等全栈配置
- **进程监控** - Gateway/Channel 实时状态与健康监控
- **通道管理** - 20+ 消息通道统一接入与运维
- **运维监控** - 日志、事件、告警、诊断一体化

### 1.2 目标用户

| 用户类型 | 使用场景 | 核心需求 |
|---------|---------|---------|
| 个人开发者 | 本地 AI 助手部署 | 快速安装、简单配置 |
| 企业运维 | 内部机器人管理 | 多通道、多智能体、监控告警 |
| AI 创业者 | SaaS 服务运营 | 高可用、自动化、扩展性 |

### 1.3 核心价值

```
┌─────────────────────────────────────────────────────────────┐
│                   OpenClaw Dashboard                        │
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ 一键部署 │  │ 配置中心 │  │ 进程监控 │  │ 通道管理 │        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       │            │            │            │              │
│  ┌────┴────────────┴────────────┴────────────┴────┐        │
│  │              ~/.openclaw 状态目录               │        │
│  │  ┌──────────┬──────────┬──────────┬──────────┐ │        │
│  │  │ openclaw │ sessions │ skills   │ agents   │ │        │
│  │  │ .json    │          │          │          │ │        │
│  │  └──────────┴──────────┴──────────┴──────────┘ │        │
│  └───────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、技术架构

### 2.1 整体架构

```
┌──────────────────────────────────────────────────────────────────┐
│                        OpenClaw Dashboard                        │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    前端层 (React 18)                        │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │  │
│  │  │Dashboard│ │Config   │ │Monitor  │ │Channels │          │  │
│  │  │  Page   │ │ Center  │ │ Center  │ │ Center  │          │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │  │
│  │  技术栈: React + TypeScript + TailwindCSS + Vite          │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    后端层 (Go/Node.js)                      │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │  │
│  │  │ REST API │ │WebSocket │ │Process   │ │Plugin    │       │  │
│  │  │ Handler  │ │   Hub    │ │Manager   │ │Manager   │       │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │  │
│  │  认证: JWT | 存储: SQLite | 实时: WebSocket               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    OpenClaw 核心层                          │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │  │
│  │  │ Gateway  │ │ Channels │ │ Agents   │ │ Skills   │       │  │
│  │  │ Server   │ │ Registry │ │ Runner   │ │ Loader   │       │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │  │
│  │  CLI: openclaw | 配置: ~/.openclaw/openclaw.json           │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    ~/.openclaw 状态目录                     │  │
│  │  ├── openclaw.json      # 主配置文件                        │  │
│  │  ├── workspace/         # 工作目录                          │  │
│  │  ├── agents/            # 多智能体目录                      │  │
│  │  │   └── <agentId>/                                        │  │
│  │  │       ├── AGENTS.md   # Agent 行为规则                  │  │
│  │  │       ├── SOUL.md     # Agent 人格定义                   │  │
│  │  │       └── agent/      # Agent 私有配置                   │  │
│  │  ├── sessions/          # 会话存储                         │  │
│  │  ├── skills/            # 技能包                           │  │
│  │  ├── credentials/       # 凭证存储                         │  │
│  │  └── memory/            # 记忆索引                         │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 状态目录结构

基于 `~/.openclaw` 的完整目录结构：

```
~/.openclaw/
├── openclaw.json              # 主配置文件 (JSON5 格式)
│   ├── models                 # 模型提供商配置
│   │   ├── providers          # 提供商列表
│   │   │   ├── openai         # OpenAI 配置
│   │   │   ├── anthropic      # Anthropic 配置
│   │   │   ├── google         # Google Gemini 配置
│   │   │   └── custom         # 自定义提供商
│   │   └── fallbackOrder     # 故障转移顺序
│   ├── agents                 # 多智能体配置
│   │   ├── default            # 默认 Agent ID
│   │   ├── defaults           # 默认配置
│   │   └── list               # Agent 列表
│   ├── channels               # 通道配置
│   │   ├── telegram           # Telegram 通道
│   │   ├── discord            # Discord 通道
│   │   ├── whatsapp           # WhatsApp 通道
│   │   └── [plugin-channels]  # 插件通道
│   ├── bindings               # 路由绑定规则
│   ├── tools                  # 工具配置
│   │   ├── policy             # 工具策略
│   │   └── sandbox            # 沙箱配置
│   ├── session                # 会话配置
│   ├── cron                   # 定时任务
│   └── gateway                # 网关配置
│
├── workspace/                 # 默认工作目录
│   ├── AGENTS.md              # Agent 行为规则
│   ├── SOUL.md                # Agent 人格定义
│   ├── USER.md                # 用户信息
│   ├── TOOLS.md               # 工具说明
│   ├── MEMORY.md              # 记忆配置
│   ├── HEARTBEAT.md           # 心跳任务
│   └── memory/                # 记忆文件
│       └── YYYY-MM-DD.md
│
├── agents/                    # 多智能体目录
│   └── <agentId>/
│       ├── agent/             # Agent 私有配置
│       │   └── openclaw.json
│       ├── AGENTS.md
│       ├── SOUL.md
│       └── workspace/
│
├── sessions/                  # 会话存储
│   └── <session-id>.json
│
├── skills/                    # 技能包
│   └── <skill-slug>/
│       └── SKILL.md
│
├── credentials/               # OAuth 凭证
│   └── oauth.json
│
├── backups/                   # 配置备份
│   └── pre-edit-*.json
│
└── logs/                      # 日志目录
    └── openclaw-*.log
```

### 2.3 配置文件详解

#### 2.3.1 主配置文件 (openclaw.json)

```json5
{
  // 模型配置
  models: {
    providers: [
      {
        name: "openai",
        apiKey: "${OPENAI_API_KEY}",  // 支持环境变量引用
        models: [
          { id: "gpt-4o", label: "GPT-4o" },
          { id: "gpt-4o-mini", label: "GPT-4o Mini" }
        ]
      },
      {
        name: "anthropic",
        apiKey: "${ANTHROPIC_API_KEY}",
        models: [
          { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" }
        ]
      },
      {
        name: "google",
        apiKey: "${GEMINI_API_KEY}",
        models: [
          { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" }
        ]
      }
    ],
    fallbackOrder: ["openai", "anthropic", "google"]
  },

  // 多智能体配置
  agents: {
    default: "main",
    defaults: {
      model: { primary: "openai/gpt-4o" },
      tools: { policy: "standard" }
    },
    list: [
      {
        id: "main",
        workspace: "~/.openclaw/workspace",
        default: true
      },
      {
        id: "work",
        workspace: "/data/work",
        agentDir: "agents/work",
        model: { primary: "anthropic/claude-sonnet-4-5" }
      }
    ]
  },

  // 路由绑定
  bindings: [
    {
      comment: "work-group-routing",
      agentId: "work",
      match: {
        channel: "qq",
        peer: { kind: "group", id: "123456" }
      }
    }
  ],

  // 通道配置
  channels: {
    telegram: {
      enabled: true,
      accessToken: "${TELEGRAM_BOT_TOKEN}",
      dmPolicy: "pairing",
      groupPolicy: "pairing"
    },
    discord: {
      enabled: true,
      botToken: "${DISCORD_BOT_TOKEN}",
      appToken: "${SLACK_APP_TOKEN}"
    }
  },

  // 工具配置
  tools: {
    policy: {
      sandbox: { enabled: true },
      network: { allowedDomains: ["*.wikipedia.org"] }
    }
  },

  // 网关配置
  gateway: {
    mode: "local",
    port: 18789,
    token: "${OPENCLAW_GATEWAY_TOKEN}"
  }
}
```

#### 2.3.2 Agent 核心文件

**AGENTS.md** - Agent 行为规则：
```markdown
# Agent 行为规则

## 角色定义
你是一个 AI 助手，负责...

## 行为准则
- 始终保持专业和礼貌
- 在不确定时请求澄清
- 遵循安全最佳实践

## 工具使用
- 使用 `memory_search` 检索历史信息
- 使用 `web_search` 搜索网络信息
```

**SOUL.md** - Agent 人格定义：
```markdown
# Soul Configuration

## Core Truths
- 你是 OpenClaw AI 助手
- 你帮助用户解决问题

## Boundaries
- 不执行危险操作
- 不泄露敏感信息

## Vibe
- 友好、专业、高效
- 适当时使用表情符号

## Continuity
- 记住用户偏好
- 保持对话连贯性
```

---

## 三、核心功能模块

### 3.1 一键部署安装

#### 3.1.1 安装流程

```
┌─────────────────────────────────────────────────────────────┐
│                    一键部署安装流程                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 环境检测                                                 │
│     ├── 操作系统识别 (Linux/macOS/Windows)                   │
│     ├── CPU 架构检测 (x64/arm64)                            │
│     ├── 依赖检查 (Node.js 22+/Docker)                       │
│     └── 端口可用性检测                                       │
│                                                             │
│  2. 镜像选择                                                 │
│     ├── ClawPanel Lite (内置 OpenClaw，开箱即用)            │
│     ├── ClawPanel Pro (外部接管，支持自定义环境)            │
│     └── Docker 镜像 (容器化部署)                            │
│                                                             │
│  3. 安装执行                                                 │
│     ├── 下载二进制/镜像                                      │
│     ├── SHA256 校验                                         │
│     ├── 安装依赖                                            │
│     └── 初始化配置                                          │
│                                                             │
│  4. 服务启动                                                 │
│     ├── 启动 Dashboard 服务                                 │
│     ├── 启动 OpenClaw Gateway                               │
│     └── 健康检查                                            │
│                                                             │
│  5. 引导配置                                                 │
│     ├── 创建管理员账户                                       │
│     ├── 配置模型提供商                                       │
│     └── 连接消息通道                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 3.1.2 安装脚本

**Linux/macOS:**
```bash
# Lite 版本 (内置 OpenClaw)
curl -fsSL https://openclaw.ai/install-lite.sh | bash

# Pro 版本 (独立面板)
curl -fsSL https://openclaw.ai/install.sh | bash

# Docker 部署
docker run -d \
  --name openclaw-dashboard \
  -p 19527:19527 \
  -v ~/.openclaw:/root/.openclaw \
  openclaw/dashboard:latest
```

**Windows (PowerShell):**
```powershell
# 安装脚本
Invoke-WebRequest -Uri "https://openclaw.ai/install.ps1" -OutFile "install.ps1"
.\install.ps1
```

#### 3.1.3 OS 镜像支持

| 平台 | 架构 | 镜像类型 | 大小 |
|------|------|---------|------|
| Linux | x64 | .tar.gz | ~50MB |
| Linux | arm64 | .tar.gz | ~48MB |
| macOS | x64 | .dmg | ~65MB |
| macOS | arm64 | .dmg | ~60MB |
| Windows | x64 | .exe | ~55MB |
| Docker | multi-arch | Image | ~120MB |

### 3.2 可视化配置管理

#### 3.2.1 配置中心架构

```
┌─────────────────────────────────────────────────────────────┐
│                      配置中心                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   配置分类导航                       │   │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │   │
│  │  │ 模型 │ │ 通道 │ │智能体│ │ 工具 │ │ 系统 │     │   │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   配置编辑器                        │   │
│  │  ┌───────────────────┐ ┌───────────────────┐       │   │
│  │  │   表单模式        │ │   JSON 高级模式   │       │   │
│  │  │                   │ │                   │       │   │
│  │  │  [表单字段]       │ │  {                │       │   │
│  │  │  [下拉选择]       │ │    "key": "value" │       │   │
│  │  │  [开关切换]       │ │  }                │       │   │
│  │  │                   │ │                   │       │   │
│  │  └───────────────────┘ └───────────────────┘       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   配置操作                          │   │
│  │  [保存] [重置] [备份] [恢复] [导出] [导入]         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 3.2.2 配置类型

**1. 模型配置**

```typescript
interface ModelConfig {
  providers: Provider[];
  fallbackOrder: string[];
}

interface Provider {
  name: string;           // openai, anthropic, google, custom
  apiKey: string;         // 支持 ${ENV_VAR} 引用
  baseUrl?: string;       // 自定义 API 端点
  models: Model[];
  compat?: {              // 兼容性配置
    supportsDeveloperRole?: boolean;
  };
}

interface Model {
  id: string;
  label: string;
  contextWindow?: number;
  pricing?: { input: number; output: number };
}
```

**配置界面示例：**
```
┌─────────────────────────────────────────────────────────────┐
│ 模型提供商配置                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 提供商列表:                                                 │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ ○ OpenAI        [已配置] [编辑] [删除]                  ││
│ │ ○ Anthropic     [已配置] [编辑] [删除]                  ││
│ │ ○ Google Gemini [已配置] [编辑] [删除]                  ││
│ │ ○ 自定义提供商  [添加]                                  ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ 故障转移顺序:                                               │
│ [1] OpenAI → [2] Anthropic → [3] Google                    │
│                                                             │
│ [+ 添加提供商]                                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**2. 通道配置**

```typescript
interface ChannelConfig {
  [channelId: string]: {
    enabled: boolean;
    accessToken?: string;
    accounts?: AccountConfig[];
    dmPolicy: "pairing" | "open" | "none";
    groupPolicy: "pairing" | "open" | "none";
    allowFrom?: string[];
  };
}

interface AccountConfig {
  accountId: string;
  label?: string;
  enabled?: boolean;
}
```

**支持的通道类型：**

| 通道 | 类型 | 配置项 | 状态监控 |
|------|------|--------|---------|
| Telegram | 内置 | botToken | ✅ |
| Discord | 内置 | botToken, appToken | ✅ |
| WhatsApp | 内置 | (扫码登录) | ✅ |
| Slack | 内置 | botToken, appToken | ✅ |
| Signal | 内置 | (扫码登录) | ✅ |
| iMessage | 内置 | (Apple ID) | ✅ |
| QQ | 插件 | NapCat 配置 | ✅ |
| 微信 | 插件 | (扫码登录) | ✅ |
| 飞书 | 插件 | appId, appSecret | ✅ |
| 钉钉 | 插件 | clientId, clientSecret | ✅ |
| 企业微信 | 插件 | corpId, agentId | ✅ |
| Matrix | 插件 | homeserver, accessToken | ✅ |
| MS Teams | 插件 | appId, tenantId | ✅ |
| LINE | 插件 | channelId, channelSecret | ✅ |

**3. 多智能体配置**

```typescript
interface AgentsConfig {
  default: string;              // 默认 Agent ID
  defaults: AgentDefaults;      // 默认配置
  list: Agent[];               // Agent 列表
}

interface Agent {
  id: string;
  workspace: string;
  agentDir?: string;
  default?: boolean;
  model?: ModelOverride;
  tools?: ToolsOverride;
}

interface AgentDefaults {
  model: { primary: string };
  tools: { policy: string };
}
```

**配置界面：**
```
┌─────────────────────────────────────────────────────────────┐
│ 多智能体管理                                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Agent 列表:                                                 │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ ★ main (默认)                                           ││
│ │   工作目录: ~/.openclaw/workspace                       ││
│ │   模型: openai/gpt-4o                                   ││
│ │   [编辑] [核心文件] [会话] [设为默认]                    ││
│ ├─────────────────────────────────────────────────────────┤│
│ │ ○ work                                                  ││
│ │   工作目录: /data/work                                  ││
│ │   模型: anthropic/claude-sonnet-4-5                     ││
│ │   [编辑] [核心文件] [会话] [删除]                        ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ [+ 创建 Agent]                                              │
│                                                             │
│ 路由绑定规则:                                               │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ # | 匹配条件          | 目标 Agent | 操作               ││
│ │ 1 | QQ群:123456       | work       | [编辑] [删除]      ││
│ │ 2 | 发送者:alice      | main       | [编辑] [删除]      ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ [+ 添加绑定] [路由预览器]                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**4. 工具配置**

```typescript
interface ToolsConfig {
  policy: {
    sandbox: SandboxPolicy;
    network: NetworkPolicy;
    exec: ExecPolicy;
  };
  catalog: ToolDefinition[];
}

interface SandboxPolicy {
  enabled: boolean;
  allowedPaths?: string[];
  deniedPaths?: string[];
}

interface NetworkPolicy {
  allowedDomains?: string[];
  deniedDomains?: string[];
}
```

### 3.3 进程监控

#### 3.3.1 监控架构

```
┌─────────────────────────────────────────────────────────────┐
│                      进程监控中心                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   实时状态面板                        │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │  │
│  │  │ Dashboard   │ │ Gateway     │ │ Channels    │     │  │
│  │  │ ● 运行中    │ │ ● 运行中    │ │ 5/8 启用    │     │  │
│  │  │ PID: 12345  │ │ Port: 18789 │ │             │     │  │
│  │  │ 内存: 128MB │ │ 连接: 3     │ │             │     │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘     │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   进程控制                             │  │
│  │  [启动] [停止] [重启] [查看日志] [诊断]              │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   日志流                              │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │ [10:00:01] Gateway started on port 18789        │ │  │
│  │  │ [10:00:02] Channel telegram connected           │ │  │
│  │  │ [10:00:03] Channel discord connected            │ │  │
│  │  │ [10:00:05] Agent main initialized              │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 3.3.2 监控指标

| 指标类型 | 指标项 | 采集方式 | 告警阈值 |
|---------|--------|---------|---------|
| 进程状态 | 运行/停止/重启中 | 进程检测 | 停止 > 1min |
| 资源使用 | CPU/内存/磁盘 | 系统监控 | CPU > 80% |
| 网络状态 | 连接数/延迟 | WebSocket | 延迟 > 5s |
| 通道状态 | 在线/离线/重连 | 心跳检测 | 离线 > 30s |
| 错误率 | 错误日志数 | 日志分析 | > 10/min |

#### 3.3.3 告警配置

```typescript
interface AlertConfig {
  channels: AlertChannel[];
  rules: AlertRule[];
}

interface AlertChannel {
  type: "telegram" | "discord" | "webhook" | "email";
  config: Record<string, string>;
}

interface AlertRule {
  name: string;
  condition: string;      // 表达式
  severity: "info" | "warning" | "critical";
  actions: string[];
}
```

### 3.4 通道管理

#### 3.4.1 通道中心架构

```
┌─────────────────────────────────────────────────────────────┐
│                      通道管理中心                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   通道状态概览                         │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │  │
│  │  │Telegram │ │ Discord │ │WhatsApp │ │  飞书   │    │  │
│  │  │   ●     │ │   ●     │ │   ○     │ │   ●     │    │  │
│  │  │ 在线    │ │ 在线    │ │ 离线    │ │ 在线    │    │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘    │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   通道配置列表                        │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │ 通道      | 状态 | 账号      | 消息/日 | 操作   │ │  │
│  │  │ Telegram  | ●    | @mybot    | 1,234   | [配置] │ │  │
│  │  │ Discord   | ●    | Bot#1234  | 567     | [配置] │ │  │
│  │  │ WhatsApp  | ○    | -         | -       | [登录] │ │  │
│  │  │ 飞书      | ●    | 开发助手  | 890     | [配置] │ │  │
│  │  │ 钉钉      | ○    | -         | -       | [添加] │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  [+ 添加通道] [插件市场] [批量操作]                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 3.4.2 通道配置详解

**Telegram 配置：**
```json
{
  "telegram": {
    "enabled": true,
    "accessToken": "${TELEGRAM_BOT_TOKEN}",
    "dmPolicy": "pairing",
    "groupPolicy": "pairing",
    "allowFrom": ["*"],
    "accounts": [
      {
        "accountId": "bot:123456",
        "label": "Main Bot"
      }
    ]
  }
}
```

**飞书配置：**
```json
{
  "feishu": {
    "enabled": true,
    "appId": "cli_xxx",
    "appSecret": "${FEISHU_APP_SECRET}",
    "encryptKey": "${FEISHU_ENCRYPT_KEY}",
    "verificationToken": "${FEISHU_VERIFY_TOKEN}",
    "dmPolicy": "open",
    "groupPolicy": "open"
  }
}
```

**钉钉配置：**
```json
{
  "dingtalk": {
    "enabled": true,
    "clientId": "dingxxx",
    "clientSecret": "${DINGTALK_CLIENT_SECRET}",
    "agentId": "123456",
    "dmPolicy": "pairing",
    "groupPolicy": "open"
  }
}
```

#### 3.4.3 通道状态监控

```typescript
interface ChannelStatus {
  channelId: string;
  connected: boolean;
  reconnecting?: boolean;
  reconnectCount?: number;
  lastActivity?: Date;
  accountInfo?: {
    id: string;
    name: string;
    avatar?: string;
  };
  stats?: {
    messagesIn: number;
    messagesOut: number;
    errors: number;
  };
}
```

### 3.5 运维监控

#### 3.5.1 监控面板

```
┌─────────────────────────────────────────────────────────────┐
│                      运维监控中心                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   系统健康度                          │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │ ████████████████████░░░░  92% 健康            │ │  │
│  │  │                                                  │ │  │
│  │  │ ✅ Gateway 运行正常                             │ │  │
│  │  │ ✅ 5/6 通道在线                                 │ │  │
│  │  │ ⚠️ 1 个配置警告                                 │ │  │
│  │  │ ✅ 磁盘空间充足                                 │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   实时指标                            │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │  │
│  │  │ 消息吞吐量   │ │ 响应延迟     │ │ 错误率       │ │  │
│  │  │ 1,234/min   │ │ avg: 1.2s   │ │ 0.02%       │ │  │
│  │  │ ▲ +15%      │ │ ▼ -0.3s     │ │ ▼ -0.01%    │ │  │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   事件日志                            │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │ [时间]     [来源]    [类型]    [摘要]           │ │  │
│  │  │ 10:00:01  telegram  message   收到新消息       │ │  │
│  │  │ 10:00:02  openclaw  action    执行工具调用     │ │  │
│  │  │ 10:00:03  discord   message   发送回复         │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 3.5.2 诊断工具

**配置检测：**
```bash
# CLI 诊断命令
openclaw doctor

# 检测项
- 配置文件完整性
- API Key 有效性
- 通道连接状态
- 端口可用性
- 依赖完整性
```

**日志分析：**
```typescript
interface LogAnalysis {
  errors: LogEntry[];
  warnings: LogEntry[];
  patterns: LogPattern[];
  suggestions: string[];
}
```

---

## 四、API 接口设计

### 4.1 REST API

#### 4.1.1 认证接口

```
POST /api/auth/login
请求: { "token": "admin_password" }
响应: { "ok": true, "token": "jwt_token" }

POST /api/auth/change-password
请求: { "oldToken": "old", "newToken": "new" }
响应: { "ok": true }
```

#### 4.1.2 配置接口

```
GET /api/openclaw/config
响应: { "ok": true, "config": { ... } }

PUT /api/openclaw/config
请求: { "config": { ... } }
响应: { "ok": true }

GET /api/openclaw/models
响应: { "ok": true, "models": { ... } }

PUT /api/openclaw/models
请求: { "models": { ... } }
响应: { "ok": true }

GET /api/openclaw/channels
响应: { "ok": true, "channels": { ... } }

PUT /api/openclaw/channels/:id
请求: { "enabled": true, ... }
响应: { "ok": true }

POST /api/openclaw/toggle-channel
请求: { "channelId": "telegram", "enabled": false }
响应: { "ok": true }
```

#### 4.1.3 多智能体接口

```
GET /api/openclaw/agents
响应: { "ok": true, "list": [...], "bindings": [...] }

POST /api/openclaw/agents
请求: { "agent": { "id": "work", "workspace": "/data/work" } }
响应: { "ok": true }

PUT /api/openclaw/agents/:id
请求: { "model": { "primary": "anthropic/claude-sonnet-4-5" } }
响应: { "ok": true }

DELETE /api/openclaw/agents/:id?preserveSessions=true
响应: { "ok": true }

GET /api/openclaw/agents/:id/core-files
响应: { "ok": true, "files": { "AGENTS.md": "...", "SOUL.md": "..." } }

PUT /api/openclaw/agents/:id/core-files
请求: { "name": "AGENTS.md", "content": "..." }
响应: { "ok": true }

GET /api/openclaw/bindings
响应: { "ok": true, "bindings": [...] }

PUT /api/openclaw/bindings
请求: { "bindings": [...] }
响应: { "ok": true }

POST /api/openclaw/route/preview
请求: { "meta": { "channel": "qq", "peer": "group:123" } }
响应: { "ok": true, "agentId": "work", "matchedBy": "binding.peer" }
```

#### 4.1.4 进程接口

```
POST /api/process/start
响应: { "ok": true }

POST /api/process/stop
响应: { "ok": true }

POST /api/process/restart
响应: { "ok": true }

GET /api/process/status
响应: { "ok": true, "running": true, "pid": 12345, "uptime": 3600 }

POST /api/system/restart-gateway
响应: { "ok": true }
```

#### 4.1.5 技能接口

```
GET /api/system/skills?agentId=main
响应: { "ok": true, "skills": [...] }

PUT /api/system/skills/:id/toggle
请求: { "enabled": true }
响应: { "ok": true }

GET /api/system/clawhub/search?q=weather
响应: { "ok": true, "skills": [...] }

POST /api/system/clawhub/install
请求: { "skillId": "weather", "agentId": "main" }
响应: { "ok": true }
```

#### 4.1.6 插件接口

```
GET /api/plugins/list
响应: { "ok": true, "plugins": [...] }

POST /api/plugins/install
请求: { "id": "feishu", "source": "official" }
响应: { "ok": true }

DELETE /api/plugins/:id
响应: { "ok": true }

PUT /api/plugins/:id/toggle
请求: { "enabled": true }
响应: { "ok": true }

GET /api/plugins/:id/config
响应: { "ok": true, "config": {...} }

PUT /api/plugins/:id/config
请求: { "config": {...} }
响应: { "ok": true }
```

#### 4.1.7 监控接口

```
GET /api/status
响应: { "ok": true, "napcat": {...}, "openclaw": {...}, "admin": {...} }

GET /api/events?limit=100&source=qq
响应: { "ok": true, "events": [...], "total": 1000 }

POST /api/events/clear
响应: { "ok": true }

GET /api/sessions?agent=main
响应: { "ok": true, "sessions": [...] }

DELETE /api/sessions/:id?agent=main
响应: { "ok": true }
```

#### 4.1.8 系统接口

```
GET /api/system/env
响应: { "ok": true, "os": "linux", "arch": "amd64", ... }

GET /api/system/version
响应: { "ok": true, "version": "2026.2.26" }

POST /api/system/check-update
响应: { "ok": true, "hasUpdate": true, "latestVersion": "2026.3.1" }

POST /api/system/do-update
响应: { "ok": true }

GET /api/system/backups
响应: { "ok": true, "backups": [...] }

POST /api/system/backup
响应: { "ok": true, "backupName": "backup-2026-03-12.json" }

POST /api/system/restore
请求: { "backupName": "backup-2026-03-12.json" }
响应: { "ok": true }

GET /api/system/diagnose
响应: { "ok": true, "issues": [...], "suggestions": [...] }
```

### 4.2 WebSocket 接口

#### 4.2.1 连接

```
ws://localhost:19527/ws?token=<jwt_token>
```

#### 4.2.2 消息类型

| type | 说明 | 数据结构 |
|------|------|---------|
| `napcat-status` | QQ 连接状态 | `{ connected, selfId, nickname }` |
| `wechat-status` | 微信连接状态 | `{ connected, loggedIn, name }` |
| `openclaw-status` | OpenClaw 状态 | `{ configured, enabledChannels }` |
| `process-status` | 进程状态 | `{ running, pid, uptime }` |
| `event` | 消息事件 | `{ source, type, summary, detail }` |
| `log-entry` | 日志条目 | `{ timestamp, level, message }` |
| `process-log` | 进程日志流 | `{ line }` |

---

## 五、技能配置系统

### 5.1 技能架构

```
┌─────────────────────────────────────────────────────────────┐
│                      技能系统                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   技能来源                             │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐                │  │
│  │  │ Bundled │ │ Managed │ │Workspace│                │  │
│  │  │ 内置    │ │ ClawHub │ │ 本地    │                │  │
│  │  └─────────┘ └─────────┘ └─────────┘                │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   技能加载优先级                       │  │
│  │  Workspace > Managed > Bundled                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   技能文件结构                         │  │
│  │  skills/<skill-slug>/                                 │  │
│  │  ├── SKILL.md              # 技能定义                 │  │
│  │  ├── metadata.openclaw     # 元数据与门控             │  │
│  │  └── *.ts / *.js           # 可选实现                 │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 SKILL.md 格式

```markdown
---
name: Weather
description: Get weather information for any location
requires:
  bins: []
  env: ["WEATHER_API_KEY"]
  config: []
---

# Weather Skill

## Purpose
Fetch current weather and forecasts for any location.

## Usage
Ask me about the weather in any city, for example:
- "What's the weather in Beijing?"
- "Will it rain tomorrow in Shanghai?"

## Tools
- `weather_current`: Get current weather
- `weather_forecast`: Get weather forecast

## Configuration
Set `WEATHER_API_KEY` in your environment or config:
```json
{
  "skills": {
    "weather": {
      "apiKey": "your_api_key"
    }
  }
}
```
```

### 5.3 技能门控

```typescript
interface SkillMetadata {
  requires: {
    bins?: string[];      // 需要的二进制
    env?: string[];       // 需要的环境变量
    config?: string[];    // 需要的配置项
  };
}

// 示例：需要二进制和环境变量
{
  "requires": {
    "bins": ["ffmpeg", "ffprobe"],
    "env": ["ELEVENLABS_API_KEY"],
    "config": ["skills.voice-elevenlabs.voiceId"]
  }
}
```

### 5.4 技能配置界面

```
┌─────────────────────────────────────────────────────────────┐
│ 技能中心                                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 已安装技能:                                                 │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ ★ weather (v1.1.0)                                      ││
│ │   获取天气信息                                           ││
│ │   状态: ✅ 已配置 | 来源: ClawHub                       ││
│ │   [配置] [禁用] [卸载]                                   ││
│ ├─────────────────────────────────────────────────────────┤│
│ │ ○ code-review (v2.0.0)                                   ││
│ │   代码审查助手                                           ││
│ │   状态: ⚠️ 缺少配置 | 来源: Bundled                     ││
│ │   [配置] [启用]                                          ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ClawHub 市场:                                               │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 搜索: [________________] [搜索]                         ││
│ │                                                         ││
│ │ 技能        | 描述           | 已安装 | 操作           ││
│ │ weather     | 天气信息       | ✅     | [查看]         ││
│ │ translator  | 多语言翻译     | ❌     | [安装]         ││
│ │ calendar    | 日历管理       | ❌     | [安装]         ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 六、模型提供商配置

### 6.1 支持的提供商

#### 6.1.1 国际提供商

| 提供商 | 模型 | 特点 |
|--------|------|------|
| OpenAI | GPT-4o, GPT-4o-mini | 默认推荐 |
| Anthropic | Claude Sonnet 4.5, Claude Opus 4 | 长上下文 |
| Google | Gemini 2.5 Pro, Gemini 2.5 Flash | 多模态 |
| OpenRouter | 多模型聚合 | 统一接口 |
| Perplexity | pplx-7b-online | 联网搜索 |

#### 6.1.2 国内提供商

| 提供商 | 模型 | 配置方式 |
|--------|------|---------|
| 火山引擎 | Doubao Pro | custom provider |
| Kimi/Moonshot | moonshot-v1-8k | custom provider |
| 智谱 GLM | glm-4, glm-4-flash | custom provider |
| MiniMax | abab6.5-chat | custom provider |
| 百度千帆 | ERNIE-4.0 | custom provider |
| 阿里云 | qwen-max | custom provider |

#### 6.1.3 本地模型

| 方案 | 说明 |
|------|------|
| Ollama | `http://localhost:11434` |
| vLLM | 高性能推理 |
| LM Studio | GUI 本地部署 |
| LiteLLM | 统一代理层 |

### 6.2 配置示例

**OpenAI:**
```json
{
  "name": "openai",
  "apiKey": "${OPENAI_API_KEY}",
  "models": [
    { "id": "gpt-4o", "label": "GPT-4o" },
    { "id": "gpt-4o-mini", "label": "GPT-4o Mini" }
  ]
}
```

**Anthropic:**
```json
{
  "name": "anthropic",
  "apiKey": "${ANTHROPIC_API_KEY}",
  "models": [
    { "id": "claude-sonnet-4-5", "label": "Claude Sonnet 4.5" },
    { "id": "claude-opus-4", "label": "Claude Opus 4" }
  ]
}
```

**自定义提供商 (Kimi):**
```json
{
  "name": "kimi",
  "baseUrl": "https://api.moonshot.cn/v1",
  "apiKey": "${MOONSHOT_API_KEY}",
  "compat": {
    "supportsDeveloperRole": false
  },
  "models": [
    { "id": "moonshot-v1-8k", "label": "Kimi 8K" },
    { "id": "moonshot-v1-32k", "label": "Kimi 32K" }
  ]
}
```

**Ollama 本地模型:**
```json
{
  "name": "ollama",
  "baseUrl": "http://localhost:11434/v1",
  "apiKey": "ollama",
  "models": [
    { "id": "llama3.2:latest", "label": "Llama 3.2" },
    { "id": "qwen2.5:latest", "label": "Qwen 2.5" }
  ]
}
```

### 6.3 API Key 轮换

```json
{
  "name": "openai",
  "apiKey": ["sk-xxx1", "sk-xxx2", "sk-xxx3"],
  "keyRotation": {
    "enabled": true,
    "strategy": "round-robin",
    "onFailure": "next"
  }
}
```

### 6.4 故障转移

```json
{
  "models": {
    "fallbackOrder": ["openai", "anthropic", "google"],
    "fallbackConfig": {
      "onRateLimit": true,
      "onError": true,
      "timeout": 30000
    }
  }
}
```

---

## 七、多智能体配置

### 7.1 多智能体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    多智能体系统                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   消息路由层                          │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │              Bindings 路由规则                   │ │  │
│  │  │  优先级: sender > peer > guildId > accountId   │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
│                              │                               │
│              ┌───────────────┼───────────────┐              │
│              ▼               ▼               ▼              │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐     │
│  │   Agent A     │ │   Agent B     │ │   Agent C     │     │
│  │   (main)      │ │   (work)      │ │   (personal)  │     │
│  │               │ │               │ │               │     │
│  │ workspace/    │ │ agents/work/  │ │ agents/per/   │     │
│  │ ├── AGENTS.md │ │ ├── AGENTS.md │ │ ├── AGENTS.md │     │
│  │ ├── SOUL.md   │ │ ├── SOUL.md   │ │ ├── SOUL.md   │     │
│  │ └── agent/    │ │ └── agent/    │ │ └── agent/    │     │
│  └───────────────┘ └───────────────┘ └───────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 路由规则 (Bindings)

#### 7.2.1 匹配字段

| 字段 | 说明 | 示例 |
|------|------|------|
| `channel` | 通道类型 | `telegram`, `discord`, `qq` |
| `sender` | 发送者 ID | `alice`, `user:123` |
| `peer` | 会话对象 | `group:123`, `user:456` |
| `parentPeer` | 父级会话 | 线程所属群组 |
| `guildId` | 服务器 ID | Discord 服务器 |
| `teamId` | 团队 ID | 飞书/钉钉团队 |
| `accountId` | 账号 ID | 机器人账号 |
| `roles` | 角色列表 | Discord 角色 |

#### 7.2.2 优先级规则

```
sender > peer > parentPeer > guildId+roles > guildId > teamId > accountId > channel > default
```

#### 7.2.3 配置示例

```json
{
  "bindings": [
    {
      "comment": "alice-private-chat",
      "agentId": "personal",
      "match": {
        "sender": "alice"
      }
    },
    {
      "comment": "work-group",
      "agentId": "work",
      "match": {
        "channel": "qq",
        "peer": { "kind": "group", "id": "123456" }
      }
    },
    {
      "comment": "discord-admin",
      "agentId": "admin",
      "match": {
        "channel": "discord",
        "guildId": "789",
        "roles": ["admin", "moderator"]
      }
    },
    {
      "comment": "feishu-work",
      "agentId": "work",
      "match": {
        "channel": "feishu",
        "teamId": "team-001"
      }
    }
  ]
}
```

### 7.3 Agent 核心文件

#### 7.3.1 AGENTS.md

定义 Agent 的行为规则：

```markdown
# Agent 行为规则

## 角色定义
你是一个专业的代码审查助手，负责帮助团队进行代码质量检查。

## 行为准则
- 始终保持专业和客观
- 提供具体的改进建议
- 关注代码质量、安全性和性能

## 工具使用规则
- 使用 `memory_search` 检索历史审查记录
- 使用 `exec` 执行代码检查工具

## 响应格式
1. 问题摘要
2. 详细分析
3. 改进建议
4. 相关参考
```

#### 7.3.2 SOUL.md

定义 Agent 的人格：

```markdown
# Soul Configuration

## Core Truths
- 你是团队的代码审查专家
- 你帮助提升代码质量
- 你保持学习和更新知识

## Boundaries
- 不执行危险操作
- 不泄露敏感代码信息
- 不做超出职责范围的决定

## Vibe
- 专业、严谨、友好
- 使用技术术语但保持清晰
- 适时使用代码块和列表

## Continuity
- 记住团队的编码规范
- 跟踪历史审查记录
- 保持审查标准一致
```

### 7.4 多智能体配置界面

```
┌─────────────────────────────────────────────────────────────┐
│ 创建新 Agent                                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 基本信息:                                                   │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Agent ID:     [work____________] (唯一标识)             ││
│ │ 显示名称:     [工作助手_________]                       ││
│ │ 工作目录:     [/data/work_______] [浏览]               ││
│ │ Agent 目录:   [agents/work_____] (可选)                ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ 模型配置:                                                   │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 主模型:       [anthropic/claude-sonnet-4-5 ▼]          ││
│ │ 备用模型:     [openai/gpt-4o ▼]                        ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ 核心文件:                                                   │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ ☑ AGENTS.md  (行为规则)                                ││
│ │ ☑ SOUL.md    (人格定义)                                ││
│ │ ☐ TOOLS.md   (工具说明)                                ││
│ │ ☐ MEMORY.md  (记忆配置)                                ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ [取消] [创建]                                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 八、工具配置系统

### 8.1 工具分类

| 类别 | 工具 | 说明 |
|------|------|------|
| **内置工具** | `memory_search` | 记忆检索 |
| | `memory_get` | 记忆获取 |
| | `exec` | 命令执行 |
| | `web_search` | 网络搜索 |
| | `browser` | 浏览器操作 |
| **技能工具** | 技能定义的工具 | 按技能加载 |
| **MCP 工具** | MCP 服务器提供 | 外部集成 |

### 8.2 工具策略层

```
┌─────────────────────────────────────────────────────────────┐
│                    工具策略层级                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Layer 1: Sandbox (沙箱层)                             │  │
│  │ - 限制文件系统访问                                    │  │
│  │ - 限制网络访问                                        │  │
│  │ - 限制命令执行                                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                              ▼                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Layer 2: Subagent (子代理层)                          │  │
│  │ - 子代理工具继承父代理限制                            │  │
│  │ - 防止权限提升                                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                              ▼                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Layer 3: Group (群组层)                               │  │
│  │ - 群组级别的工具策略                                  │  │
│  └───────────────────────────────────────────────────────┘  │
│                              ▼                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Layer 4: Agent (智能体层)                             │  │
│  │ - Agent 级别的工具配置                                │  │
│  └───────────────────────────────────────────────────────┘  │
│                              ▼                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Layer 5: Global (全局层)                             │  │
│  │ - 全局默认策略                                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                              ▼                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Layer 6: Profile (配置层)                             │  │
│  │ - 用户配置覆盖                                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 网络搜索配置

#### 8.3.1 支持的搜索提供商

| 提供商 | 说明 | 配置 |
|--------|------|------|
| Brave Search | 默认推荐 | `BRAVE_SEARCH_API_KEY` |
| Google Gemini | Google 搜索 | `GEMINI_API_KEY` |
| Perplexity | AI 搜索 | `PERPLEXITY_API_KEY` |
| Tavily | 专业搜索 | `TAVILY_API_KEY` |

#### 8.3.2 配置示例

```json
{
  "tools": {
    "webSearch": {
      "provider": "brave",
      "apiKey": "${BRAVE_SEARCH_API_KEY}",
      "defaultCountry": "cn",
      "defaultLocale": "zh-cn"
    }
  }
}
```

### 8.4 浏览器工具配置

#### 8.4.1 配置项

```json
{
  "tools": {
    "browser": {
      "enabled": true,
      "headless": true,
      "profileDir": "~/.openclaw/browser-profile",
      "timeout": 30000,
      "allowedDomains": ["*.wikipedia.org", "*.github.com"]
    }
  }
}
```

#### 8.4.2 CLI 命令

```bash
# 启动浏览器会话
openclaw browser launch

# 截图
openclaw browser screenshot <url>

# 执行脚本
openclaw browser exec <script.js>
```

### 8.5 工具配置界面

```
┌─────────────────────────────────────────────────────────────┐
│ 工具配置                                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 沙箱配置:                                                   │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ ☑ 启用沙箱                                              ││
│ │                                                         ││
│ │ 允许路径:                                               ││
│ │ [~/.openclaw/workspace___________________] [+]         ││
│ │                                                         ││
│ │ 禁止路径:                                               ││
│ │ [/etc____________________________________] [+]         ││
│ │ [~/.ssh__________________________________] [+]         ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ 网络配置:                                                   │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 搜索提供商: [Brave Search ▼]                           ││
│ │ API Key:     [sk-xxx___________________] [验证]        ││
│ │                                                         ││
│ │ 允许域名:                                               ││
│ │ [*.wikipedia.org________________________] [+]         ││
│ │ [*.github.com___________________________] [+]         ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ 浏览器配置:                                                 │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ ☑ 启用浏览器工具                                        ││
│ │ 无头模式: [启用 ▼]                                     ││
│ │ 超时时间: [30___] 秒                                    ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ [保存] [重置]                                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 九、通道集成

### 9.1 支持的通道

#### 9.1.1 内置通道

| 通道 | 配置方式 | 登录方式 | 状态监控 |
|------|---------|---------|---------|
| Telegram | Bot Token | API Key | ✅ |
| Discord | Bot Token + App Token | API Key | ✅ |
| WhatsApp | Baileys | 扫码 | ✅ |
| Slack | Bot Token + App Token | API Key | ✅ |
| Signal | Signal CLI | 扫码/链接 | ✅ |
| iMessage | Apple ID | iCloud | ✅ |

#### 9.1.2 插件通道

| 通道 | 插件 ID | 配置方式 |
|------|---------|---------|
| QQ | `qq` | NapCat / OneBot |
| 微信 | `wechat` | 扫码登录 |
| 飞书 | `feishu` | App ID + Secret |
| 钉钉 | `dingtalk` | Client ID + Secret |
| 企业微信 | `wecom` | Corp ID + Agent ID |
| Matrix | `matrix` | Homeserver + Token |
| MS Teams | `msteams` | App ID + Tenant ID |
| LINE | `line` | Channel ID + Secret |
| IRC | `irc` | Server + Nick |
| Mattermost | `mattermost` | Server + Token |
| Twitch | `twitch` | OAuth Token |

### 9.2 通道配置详解

#### 9.2.1 Telegram

```json
{
  "telegram": {
    "enabled": true,
    "accessToken": "${TELEGRAM_BOT_TOKEN}",
    "dmPolicy": "pairing",
    "groupPolicy": "pairing",
    "allowFrom": ["*"],
    "accounts": [
      {
        "accountId": "bot:123456",
        "label": "Main Bot"
      }
    ]
  }
}
```

**获取 Bot Token:**
1. 在 Telegram 中找到 @BotFather
2. 发送 `/newbot` 创建新机器人
3. 按提示设置名称
4. 获取 API Token

#### 9.2.2 Discord

```json
{
  "discord": {
    "enabled": true,
    "botToken": "${DISCORD_BOT_TOKEN}",
    "appToken": "${DISCORD_APP_TOKEN}",
    "dmPolicy": "pairing",
    "groupPolicy": "open",
    "allowFrom": ["*"]
  }
}
```

**配置步骤:**
1. 访问 Discord Developer Portal
2. 创建 Application
3. 创建 Bot 并获取 Token
4. 启用 Message Content Intent
5. 邀请 Bot 到服务器

#### 9.2.3 飞书

```json
{
  "feishu": {
    "enabled": true,
    "appId": "cli_xxx",
    "appSecret": "${FEISHU_APP_SECRET}",
    "encryptKey": "${FEISHU_ENCRYPT_KEY}",
    "verificationToken": "${FEISHU_VERIFY_TOKEN}",
    "dmPolicy": "open",
    "groupPolicy": "open"
  }
}
```

**配置步骤:**
1. 访问飞书开放平台
2. 创建企业自建应用
3. 获取 App ID 和 App Secret
4. 配置事件订阅
5. 配置权限范围

#### 9.2.4 钉钉

```json
{
  "dingtalk": {
    "enabled": true,
    "clientId": "dingxxx",
    "clientSecret": "${DINGTALK_CLIENT_SECRET}",
    "agentId": "123456",
    "dmPolicy": "pairing",
    "groupPolicy": "open"
  }
}
```

#### 9.2.5 QQ (NapCat)

```json
{
  "qq": {
    "enabled": true,
    "accessToken": "napcat_token",
    "host": "localhost",
    "port": 3001,
    "dmPolicy": "open",
    "groupPolicy": "open"
  }
}
```

**NapCat 部署:**
```bash
# Docker 部署
docker run -d \
  --name napcat \
  -p 3001:3001 \
  -v ~/.napcat:/app/.napcat \
  mlikiowa/napcat-docker:latest
```

#### 9.2.6 企业微信

```json
{
  "wecom": {
    "enabled": true,
    "corpId": "wwxxx",
    "agentId": "100001",
    "corpSecret": "${WECOM_CORP_SECRET}",
    "token": "${WECOM_TOKEN}",
    "encodingAESKey": "${WECOM_AES_KEY}",
    "dmPolicy": "open",
    "groupPolicy": "open"
  }
}
```

### 9.3 访问控制策略

#### 9.3.1 策略类型

| 策略 | 说明 | 适用场景 |
|------|------|---------|
| `pairing` | 需要配对确认 | 安全场景 |
| `open` | 开放访问 | 公共服务 |
| `none` | 禁止访问 | 禁用通道 |

#### 9.3.2 allowFrom 配置

```json
{
  "telegram": {
    "dmPolicy": "open",
    "allowFrom": ["*"]
  },
  "discord": {
    "dmPolicy": "open",
    "allowFrom": ["user:123456", "role:admin"]
  },
  "qq": {
    "groupPolicy": "open",
    "allowFrom": ["group:123456", "group:789012"]
  }
}
```

### 9.4 通道配置界面

```
┌─────────────────────────────────────────────────────────────┐
│ 添加通道                                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 选择通道类型:                                               │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ ○ Telegram    ○ Discord    ○ WhatsApp                  ││
│ │ ○ Slack       ○ 飞书       ○ 钉钉                       ││
│ │ ○ QQ          ○ 企业微信   ○ 更多...                   ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ 飞书配置:                                                   │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ App ID:           [cli_xxxxxxxxxxxxx___]               ││
│ │ App Secret:       [•••••••••••••••••••] [显示]         ││
│ │ Encrypt Key:      [•••••••••••••••••••] [显示]         ││
│ │ Verification Token:[•••••••••••••••••••] [显示]         ││
│ │                                                         ││
│ │ 私聊策略: [pairing ▼]                                  ││
│ │ 群聊策略: [open ▼]                                     ││
│ │                                                         ││
│ │ 允许来源:                                               ││
│ │ [*_________________________________] [+]               ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ [取消] [保存并启用]                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 十、运维监控

### 10.1 监控指标

#### 10.1.1 系统指标

| 指标 | 采集方式 | 告警阈值 |
|------|---------|---------|
| CPU 使用率 | 系统监控 | > 80% |
| 内存使用率 | 系统监控 | > 85% |
| 磁盘使用率 | 系统监控 | > 90% |
| 网络延迟 | Ping | > 5s |
| 进程状态 | 进程检测 | 停止 |

#### 10.1.2 业务指标

| 指标 | 采集方式 | 告警阈值 |
|------|---------|---------|
| 消息吞吐量 | 日志分析 | 下降 > 50% |
| 响应延迟 | 时间统计 | > 10s |
| 错误率 | 日志分析 | > 1% |
| 通道在线率 | 心跳检测 | < 80% |

### 10.2 日志系统

#### 10.2.1 日志类型

| 类型 | 来源 | 存储位置 |
|------|------|---------|
| 系统日志 | Dashboard | SQLite |
| 进程日志 | OpenClaw | 文件 |
| 事件日志 | 通道 | SQLite |
| 审计日志 | 配置变更 | JSONL |

#### 10.2.2 日志查询

```
GET /api/events?limit=100&offset=0&source=qq&search=keyword

响应:
{
  "ok": true,
  "events": [
    {
      "id": 1,
      "timestamp": "2026-03-12T10:00:00Z",
      "source": "qq",
      "type": "message",
      "summary": "收到消息",
      "detail": "..."
    }
  ],
  "total": 1000
}
```

### 10.3 告警系统

#### 10.3.1 告警规则

```typescript
interface AlertRule {
  name: string;
  condition: string;      // 表达式
  severity: "info" | "warning" | "critical";
  channels: string[];     // 通知通道
  cooldown: number;       // 冷却时间(秒)
}

// 示例规则
const rules: AlertRule[] = [
  {
    name: "gateway-down",
    condition: "gateway.status !== 'running'",
    severity: "critical",
    channels: ["telegram", "discord"],
    cooldown: 300
  },
  {
    name: "high-error-rate",
    condition: "errorRate > 0.01",
    severity: "warning",
    channels: ["telegram"],
    cooldown: 600
  }
];
```

#### 10.3.2 告警通知

```typescript
interface AlertNotification {
  rule: string;
  severity: string;
  message: string;
  timestamp: Date;
  channels: AlertChannel[];
}

interface AlertChannel {
  type: "telegram" | "discord" | "webhook" | "email";
  config: {
    chatId?: string;
    webhookUrl?: string;
    email?: string;
  };
}
```

### 10.4 诊断工具

#### 10.4.1 CLI 诊断

```bash
# 系统诊断
openclaw doctor

# 输出示例
✅ Node.js 版本: 22.0.0
✅ 配置文件存在
✅ Gateway 运行中
⚠️  通道 wechat 离线
❌ API Key 无效: openai

建议:
1. 检查 wechat 通道登录状态
2. 验证 OpenAI API Key
```

#### 10.4.2 配置检测

```typescript
interface ConfigCheck {
  path: string;
  status: "ok" | "warning" | "error";
  message: string;
  suggestion?: string;
}

// 检测项
const checks: ConfigCheck[] = [
  {
    path: "models.providers.openai.apiKey",
    status: "ok",
    message: "API Key 已配置"
  },
  {
    path: "channels.telegram.enabled",
    status: "warning",
    message: "通道已启用但未连接",
    suggestion: "检查 Bot Token 是否正确"
  }
];
```

### 10.5 备份与恢复

#### 10.5.1 自动备份

- 配置修改前自动备份
- 保留最近 10 份备份
- 备份位置: `~/.openclaw/backups/`

#### 10.5.2 手动备份

```bash
# 创建备份
POST /api/system/backup

# 响应
{
  "ok": true,
  "backupName": "backup-2026-03-12.json"
}
```

#### 10.5.3 恢复备份

```bash
# 获取备份列表
GET /api/system/backups

# 恢复备份
POST /api/system/restore
{
  "backupName": "backup-2026-03-12.json"
}
```

---

## 十一、部署方案

### 11.1 部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                    部署架构选项                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  方案 A: 单机部署                                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │              Dashboard + OpenClaw               │ │  │
│  │  │              (单二进制 / npm 全局安装)          │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  │                        │                              │  │
│  │                        ▼                              │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │              ~/.openclaw                        │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  方案 B: Docker 部署                                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  ┌─────────────┐    ┌─────────────┐                   │  │
│  │  │ Dashboard   │───▶│ OpenClaw    │                   │  │
│  │  │ Container   │    │ Container   │                   │  │
│  │  └─────────────┘    └─────────────┘                   │  │
│  │         │                  │                          │  │
│  │         ▼                  ▼                          │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │              Docker Volume                      │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  方案 C: 集群部署                                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  ┌─────────────┐    ┌─────────────┐                   │  │
│  │  │ Load        │───▶│ Dashboard   │ (多实例)         │  │
│  │  │ Balancer    │    │ Cluster     │                   │  │
│  │  └─────────────┘    └─────────────┘                   │  │
│  │                            │                          │  │
│  │                            ▼                          │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │              Redis (状态共享)                   │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 11.2 Docker 部署

#### 11.2.1 Docker Compose

```yaml
version: '3.8'

services:
  dashboard:
    image: openclaw/dashboard:latest
    container_name: openclaw-dashboard
    ports:
      - "19527:19527"
    volumes:
      - openclaw-data:/root/.openclaw
    environment:
      - ADMIN_TOKEN=your_secure_token
      - OPENCLAW_GATEWAY_TOKEN=your_gateway_token
    restart: unless-stopped

  openclaw:
    image: openclaw/openclaw:latest
    container_name: openclaw-gateway
    volumes:
      - openclaw-data:/root/.openclaw
    environment:
      - OPENCLAW_GATEWAY_MODE=local
      - OPENCLAW_GATEWAY_PORT=18789
    restart: unless-stopped

volumes:
  openclaw-data:
```

#### 11.2.2 启动命令

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 11.3 系统服务部署

#### 11.3.1 systemd (Linux)

```ini
[Unit]
Description=OpenClaw Dashboard
After=network.target

[Service]
Type=simple
User=openclaw
WorkingDirectory=/opt/openclaw
ExecStart=/opt/openclaw/dashboard
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### 11.3.2 launchd (macOS)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>ai.openclaw.dashboard</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/openclaw/dashboard</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

#### 11.3.3 Windows Service

```powershell
# 使用 NSSM 注册服务
nssm install OpenClawDashboard "C:\Program Files\OpenClaw\dashboard.exe"
nssm start OpenClawDashboard
```

---

## 十二、安全设计

### 12.1 认证与授权

#### 12.1.1 JWT 认证

```typescript
interface JWTConfig {
  secret: string;
  expiresIn: string;    // 如 "24h"
  algorithm: "HS256";
}

// Token 结构
interface JWTPayload {
  sub: string;          // 用户 ID
  iat: number;          // 签发时间
  exp: number;          // 过期时间
  role: "admin" | "user";
}
```

#### 12.1.2 权限控制

| 角色 | 权限 |
|------|------|
| admin | 所有操作 |
| user | 只读 + 部分配置修改 |

### 12.2 敏感数据处理

#### 12.2.1 环境变量引用

```json
{
  "apiKey": "${OPENAI_API_KEY}"
}
```

**优势:**
- 配置文件不包含明文密钥
- 支持密钥轮换
- 环境隔离

#### 12.2.2 凭证存储

```
~/.openclaw/credentials/
├── oauth.json       # OAuth 凭证
└── tokens.json      # 其他令牌
```

**权限设置:**
```bash
chmod 700 ~/.openclaw
chmod 600 ~/.openclaw/credentials/*
```

### 12.3 网络安全

#### 12.3.1 HTTPS 配置

```typescript
interface TLSConfig {
  enabled: boolean;
  certFile: string;
  keyFile: string;
  autoCert: boolean;    // Let's Encrypt
}
```

#### 12.3.2 CORS 配置

```typescript
interface CORSConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  allowCredentials: boolean;
}
```

### 12.4 审计日志

#### 12.4.1 审计事件

| 事件类型 | 说明 |
|---------|------|
| `auth.login` | 登录事件 |
| `config.write` | 配置修改 |
| `process.control` | 进程操作 |
| `channel.toggle` | 通道开关 |
| `agent.create` | Agent 创建 |

#### 12.4.2 审计记录

```typescript
interface AuditLog {
  timestamp: Date;
  event: string;
  user: string;
  ip: string;
  details: Record<string, unknown>;
}
```

---

## 十三、扩展性设计

### 13.1 插件系统

#### 13.1.1 插件架构

```
┌─────────────────────────────────────────────────────────────┐
│                    插件系统架构                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   插件管理器                          │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │  │
│  │  │ 加载器      │ │ 注册表      │ │ 生命周期    │    │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘    │  │
│  └───────────────────────────────────────────────────────┘  │
│                              │                               │
│              ┌───────────────┼───────────────┐              │
│              ▼               ▼               ▼              │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐     │
│  │ 通道插件      │ │ 工具插件      │ │ UI 插件       │     │
│  │ (feishu)      │ │ (custom-tool) │ │ (dashboard)   │     │
│  └───────────────┘ └───────────────┘ └───────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 13.1.2 插件规范

```typescript
interface Plugin {
  id: string;
  name: string;
  version: string;
  category: "channel" | "tool" | "ui" | "other";
  config: PluginConfig;
  hooks: PluginHooks;
}

interface PluginConfig {
  schema: JSONSchema;      // 配置 Schema
  uiSchema?: UISchema;     // UI 配置
  defaults?: object;       // 默认值
}

interface PluginHooks {
  onLoad?: () => Promise<void>;
  onEnable?: () => Promise<void>;
  onDisable?: () => Promise<void>;
  onUnload?: () => Promise<void>;
}
```

### 13.2 API 扩展

#### 13.2.1 REST API 扩展

```typescript
interface APIExtension {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  handler: RequestHandler;
  middleware?: Middleware[];
}
```

#### 13.2.2 WebSocket 扩展

```typescript
interface WSExtension {
  messageType: string;
  handler: (data: unknown) => Promise<void>;
}
```

### 13.3 UI 扩展

#### 13.3.1 自定义页面

```typescript
interface UIPage {
  path: string;
  component: React.ComponentType;
  navItem?: NavItem;
}
```

#### 13.3.2 自定义组件

```typescript
interface UIComponent {
  id: string;
  position: "dashboard" | "sidebar" | "header";
  component: React.ComponentType;
}
```

---

## 十四、技术选型

### 14.1 后端技术栈

| 组件 | 技术选型 | 备选方案 |
|------|---------|---------|
| 语言 | Go / Node.js | Rust |
| Web 框架 | Gin / Express | Fastify |
| 数据库 | SQLite | PostgreSQL |
| 缓存 | 内存 | Redis |
| WebSocket | gorilla/websocket | Socket.io |
| 认证 | JWT | OAuth2 |

### 14.2 前端技术栈

| 组件 | 技术选型 | 备选方案 |
|------|---------|---------|
| 框架 | React 18 | Vue 3 |
| 语言 | TypeScript | - |
| 样式 | TailwindCSS | CSS Modules |
| 构建 | Vite | Webpack |
| 图标 | Lucide | Heroicons |
| 路由 | React Router v6 | - |
| 状态 | React Context | Zustand |

### 14.3 部署技术栈

| 组件 | 技术选型 |
|------|---------|
| 容器化 | Docker |
| 编排 | Docker Compose / Kubernetes |
| 反向代理 | Nginx / Caddy |
| 监控 | Prometheus / Grafana |
| 日志 | Loki |

---

## 十五、开发计划

### 15.1 里程碑规划

| 阶段 | 功能 | 周期 |
|------|------|------|
| **M1: MVP** | 一键安装、基础配置、进程监控 | 4 周 |
| **M2: 通道管理** | 通道配置、状态监控、多账号 | 3 周 |
| **M3: 多智能体** | Agent 管理、路由规则、核心文件 | 3 周 |
| **M4: 运维监控** | 日志系统、告警、诊断 | 3 周 |
| **M5: 高级功能** | 工作流、插件市场、API 扩展 | 4 周 |

### 15.2 技术债务

- [ ] 单元测试覆盖率 > 80%
- [ ] E2E 测试自动化
- [ ] 性能基准测试
- [ ] 安全审计
- [ ] 文档完善

---

## 十六、参考资源

### 16.1 OpenClaw 相关

- **OpenClaw GitHub**: https://github.com/openclaw/openclaw
- **OpenClaw 文档**: https://docs.openclaw.ai
- **ClawHub 技能市场**: https://clawhub.ai

### 16.2 ClawPanel 参考

- **ClawPanel 源码**: `opensource/ClawPanel/`
- **ClawPanel 分析文档**: `opensource/docs/ClawPanel-Analysis.md`

### 16.3 配置参考

- **OpenClaw 核心架构分析**: `opensource/docs/openclaw-core-architecture-analysis.md`
- **OpenClaw 运维指南**: `opensource/docs/openclaw-care-guide.md`
- **配置深度分析**: `opensource/docs/moltbot-config-deep-analysis.md`

---

## 附录 A: API 接口完整列表

### A.1 认证接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/change-password` | 修改密码 |

### A.2 配置接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/openclaw/config` | 获取完整配置 |
| PUT | `/api/openclaw/config` | 更新完整配置 |
| GET | `/api/openclaw/models` | 获取模型配置 |
| PUT | `/api/openclaw/models` | 更新模型配置 |
| GET | `/api/openclaw/channels` | 获取通道配置 |
| PUT | `/api/openclaw/channels/:id` | 更新通道配置 |
| POST | `/api/openclaw/toggle-channel` | 切换通道开关 |

### A.3 多智能体接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/openclaw/agents` | 获取 Agent 列表 |
| POST | `/api/openclaw/agents` | 创建 Agent |
| PUT | `/api/openclaw/agents/:id` | 更新 Agent |
| DELETE | `/api/openclaw/agents/:id` | 删除 Agent |
| GET | `/api/openclaw/agents/:id/core-files` | 获取核心文件 |
| PUT | `/api/openclaw/agents/:id/core-files` | 保存核心文件 |
| GET | `/api/openclaw/bindings` | 获取路由规则 |
| PUT | `/api/openclaw/bindings` | 更新路由规则 |
| POST | `/api/openclaw/route/preview` | 路由预览 |

### A.4 进程接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/process/start` | 启动进程 |
| POST | `/api/process/stop` | 停止进程 |
| POST | `/api/process/restart` | 重启进程 |
| GET | `/api/process/status` | 获取进程状态 |
| POST | `/api/system/restart-gateway` | 重启网关 |

### A.5 技能接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/system/skills` | 获取技能列表 |
| PUT | `/api/system/skills/:id/toggle` | 切换技能开关 |
| GET | `/api/system/clawhub/search` | 搜索 ClawHub |
| POST | `/api/system/clawhub/install` | 安装技能 |

### A.6 插件接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/plugins/list` | 获取插件列表 |
| POST | `/api/plugins/install` | 安装插件 |
| DELETE | `/api/plugins/:id` | 卸载插件 |
| PUT | `/api/plugins/:id/toggle` | 启用/禁用插件 |
| GET | `/api/plugins/:id/config` | 获取插件配置 |
| PUT | `/api/plugins/:id/config` | 更新插件配置 |

### A.7 监控接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/status` | 获取系统状态 |
| GET | `/api/events` | 获取事件日志 |
| POST | `/api/events/clear` | 清空日志 |
| GET | `/api/sessions` | 获取会话列表 |
| DELETE | `/api/sessions/:id` | 删除会话 |

### A.8 系统接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/system/env` | 获取环境信息 |
| GET | `/api/system/version` | 获取版本 |
| POST | `/api/system/check-update` | 检查更新 |
| POST | `/api/system/do-update` | 执行更新 |
| GET | `/api/system/backups` | 获取备份列表 |
| POST | `/api/system/backup` | 创建备份 |
| POST | `/api/system/restore` | 恢复备份 |
| GET | `/api/system/diagnose` | 系统诊断 |

---

## 附录 B: 配置文件模板

### B.1 完整配置模板

```json5
{
  // 模型配置
  models: {
    providers: [
      {
        name: "openai",
        apiKey: "${OPENAI_API_KEY}",
        models: [
          { id: "gpt-4o", label: "GPT-4o" },
          { id: "gpt-4o-mini", label: "GPT-4o Mini" }
        ]
      }
    ],
    fallbackOrder: ["openai"]
  },

  // 多智能体配置
  agents: {
    default: "main",
    defaults: {
      model: { primary: "openai/gpt-4o" },
      tools: { policy: "standard" }
    },
    list: [
      {
        id: "main",
        workspace: "~/.openclaw/workspace",
        default: true
      }
    ]
  },

  // 路由绑定
  bindings: [],

  // 通道配置
  channels: {
    telegram: {
      enabled: false,
      accessToken: "${TELEGRAM_BOT_TOKEN}",
      dmPolicy: "pairing",
      groupPolicy: "pairing"
    }
  },

  // 工具配置
  tools: {
    policy: {
      sandbox: { enabled: true }
    }
  },

  // 网关配置
  gateway: {
    mode: "local",
    port: 18789
  }
}
```

### B.2 AGENTS.md 模板

```markdown
# Agent 行为规则

## 角色定义
你是一个 AI 助手，负责帮助用户解决问题。

## 行为准则
- 始终保持专业和礼貌
- 在不确定时请求澄清
- 遵循安全最佳实践

## 工具使用
- 使用 `memory_search` 检索历史信息
- 使用 `web_search` 搜索网络信息

## 响应格式
1. 理解用户需求
2. 提供解决方案
3. 确认用户满意
```

### B.3 SOUL.md 模板

```markdown
# Soul Configuration

## Core Truths
- 你是 OpenClaw AI 助手
- 你帮助用户解决问题

## Boundaries
- 不执行危险操作
- 不泄露敏感信息

## Vibe
- 友好、专业、高效
- 适当时使用表情符号

## Continuity
- 记住用户偏好
- 保持对话连贯性
```

---

## 附录 C: OpenClaw 接口深度分析

### C.1 接口总览

OpenClaw 提供了多层次、多协议的完整接口体系：

```
┌─────────────────────────────────────────────────────────────┐
│                    OpenClaw 接口体系                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  CLI 接口 (src/cli/)                                │   │
│  │  - 命令行参数解析                                    │   │
│  │  - 帮助系统                                          │   │
│  │  - 版本管理                                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  命令接口 (src/commands/)                           │   │
│  │  - agent: Agent 运行命令                            │   │
│  │  - channels: 通道管理命令                           │   │
│  │  - configure: 配置管理命令                          │   │
│  │  - agents: 多智能体管理                             │   │
│  │  - status/health: 状态与健康检查                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Gateway REST API (src/browser/routes/)             │   │
│  │  - basic.ts: 浏览器配置管理                         │   │
│  │  - tabs.ts: 标签页管理                              │   │
│  │  - agent.act.ts: 浏览器自动化操作                   │   │
│  │  - agent.snapshot.ts: 截图/PDF/导航                 │   │
│  │  - agent.storage.ts: 存储/Cookie/模拟               │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  WebSocket RPC (src/gateway/server-methods/)        │   │
│  │  - 106+ RPC 方法                                    │   │
│  │  - 认证与授权                                        │   │
│  │  - 实时事件推送                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Channel 插件接口 (src/channels/plugins/)           │   │
│  │  - 15+ 适配器接口                                   │   │
│  │  - 插件生命周期管理                                  │   │
│  │  - 消息收发抽象                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Agent 核心接口 (src/agents/)                       │   │
│  │  - Agent 作用域管理                                  │   │
│  │  - 模型选择与回退                                    │   │
│  │  - 会话管理                                          │   │
│  │  - 工具调用                                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  配置管理接口 (src/config/)                         │   │
│  │  - 路径解析                                          │   │
│  │  - IO 操作                                           │   │
│  │  - 验证与迁移                                        │   │
│  │  - Schema 定义                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  工具系统接口 (src/agents/tools/)                   │   │
│  │  - 50+ 内置工具                                      │   │
│  │  - 工具策略管道                                      │   │
│  │  - 沙箱隔离                                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  技能系统接口 (src/agents/skills/)                  │   │
│  │  - 技能加载与验证                                    │   │
│  │  - 工作区同步                                        │   │
│  │  - 环境覆盖                                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### C.2 CLI 接口详解

#### C.2.1 参数解析 (src/cli/argv.ts)

```typescript
// 核心函数
function hasHelpFlag(argv: string[]): boolean;
function hasVersionFlag(argv: string[]): boolean;
function extractFlagValue(argv: string[], flag: string): string | undefined;
function resolveCommandPath(argv: string[]): string[];
```

**支持的参数格式:**
- `--flag value`
- `--flag=value`
- `-f value`
- `-f=value`

#### C.2.2 CLI 命令入口

| 命令 | 模块 | 功能 |
|------|------|------|
| `openclaw agent` | `src/commands/agent.ts` | Agent 交互运行 |
| `openclaw channels` | `src/commands/channels.ts` | 通道管理 |
| `openclaw configure` | `src/commands/configure.ts` | 配置向导 |
| `openclaw agents` | `src/commands/agents.ts` | 多智能体管理 |
| `openclaw status` | `src/commands/status.ts` | 状态查看 |
| `openclaw health` | `src/commands/health.ts` | 健康检查 |

### C.3 Gateway REST API 详解

#### C.3.1 基础路由 (src/browser/routes/basic.ts)

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/profiles` | 列出浏览器配置 |
| POST | `/profiles` | 创建浏览器配置 |
| DELETE | `/profiles/:id` | 删除浏览器配置 |
| POST | `/start` | 启动浏览器 |
| POST | `/stop` | 停止浏览器 |
| POST | `/reset` | 重置浏览器 |
| GET | `/status` | 获取浏览器状态 |

#### C.3.2 标签页路由 (src/browser/routes/tabs.ts)

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/tabs` | 列出标签页 |
| POST | `/tabs` | 创建标签页 |
| DELETE | `/tabs/:id` | 关闭标签页 |
| POST | `/tabs/:id/focus` | 聚焦标签页 |

#### C.3.3 Agent 操作路由 (src/browser/routes/agent.act.ts)

**POST `/act` - 浏览器自动化操作:**

| kind | 参数 | 说明 |
|------|------|------|
| `click` | selector, button, clickCount | 点击元素 |
| `type` | selector, text | 输入文本 |
| `press` | key | 按键 |
| `hover` | selector | 悬停 |
| `scrollIntoView` | selector | 滚动到视图 |
| `drag` | selector, target | 拖拽 |
| `select` | selector, value | 选择选项 |
| `fill` | selector, value | 填充表单 |
| `resize` | width, height | 调整窗口大小 |
| `wait` | selector, timeout | 等待元素 |
| `evaluate` | script | 执行脚本 |
| `close` | - | 关闭浏览器 |

**其他路由:**
- POST `/response/body` - 获取响应体
- POST `/highlight` - 高亮元素

#### C.3.4 快照路由 (src/browser/routes/agent.snapshot.ts)

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/navigate` | 导航到 URL |
| POST | `/pdf` | 生成 PDF |
| POST | `/screenshot` | 截图 |
| POST | `/snapshot` | 获取可访问性快照 |

**快照格式:**
- `aria`: ARIA 树结构
- `ai`: AI 优化的简化结构

#### C.3.5 存储路由 (src/browser/routes/agent.storage.ts)

**Cookie 管理:**
- GET `/cookies` - 获取所有 Cookie
- POST `/cookies/set` - 设置 Cookie
- POST `/cookies/clear` - 清除 Cookie

**本地存储:**
- GET `/storage/:kind` - 获取存储 (localStorage/sessionStorage)
- POST `/storage/:kind/set` - 设置存储项
- POST `/storage/:kind/clear` - 清除存储

**模拟设置:**
- POST `/set/offline` - 离线模式
- POST `/set/headers` - 自定义请求头
- POST `/set/credentials` - 认证凭证
- POST `/set/geolocation` - 地理位置
- POST `/set/media` - 媒体模拟
- POST `/set/timezone` - 时区
- POST `/set/locale` - 语言环境
- POST `/set/device` - 设备模拟

### C.4 WebSocket RPC 详解

#### C.4.1 连接协议

```
WebSocket URL: ws://localhost:18789/ws
认证: Token 或 Password
协议版本: PROTOCOL_VERSION
```

#### C.4.2 RPC 方法分类

**系统管理 (15 方法):**
| 方法 | 说明 |
|------|------|
| `health` | 健康检查 |
| `status` | 系统状态 |
| `doctor.memory.status` | 内存诊断 |
| `logs.tail` | 日志流 |
| `update.run` | 执行更新 |
| `gateway.identity.get` | 网关身份 |

**配置管理 (10 方法):**
| 方法 | 说明 |
|------|------|
| `config.get` | 获取配置 |
| `config.set` | 设置配置 |
| `config.apply` | 应用配置 |
| `config.patch` | 补丁更新 |
| `config.schema` | 获取 Schema |
| `config.schema.lookup` | Schema 查询 |

**通道管理 (5 方法):**
| 方法 | 说明 |
|------|------|
| `channels.status` | 通道状态 |
| `channels.logout` | 通道登出 |

**Agent 管理 (10 方法):**
| 方法 | 说明 |
|------|------|
| `agent` | Agent 交互 |
| `agent.identity.get` | Agent 身份 |
| `agent.wait` | 等待完成 |
| `agents.list` | Agent 列表 |
| `agents.create` | 创建 Agent |
| `agents.update` | 更新 Agent |
| `agents.delete` | 删除 Agent |

**会话管理 (8 方法):**
| 方法 | 说明 |
|------|------|
| `sessions.list` | 会话列表 |
| `sessions.preview` | 会话预览 |
| `sessions.patch` | 会话补丁 |
| `sessions.reset` | 会话重置 |
| `sessions.delete` | 删除会话 |
| `sessions.compact` | 压缩会话 |

**聊天接口 (3 方法):**
| 方法 | 说明 |
|------|------|
| `chat.history` | 聊天历史 |
| `chat.send` | 发送消息 |
| `chat.abort` | 中止运行 |

**定时任务 (7 方法):**
| 方法 | 说明 |
|------|------|
| `cron.list` | 任务列表 |
| `cron.status` | 任务状态 |
| `cron.add` | 添加任务 |
| `cron.update` | 更新任务 |
| `cron.remove` | 删除任务 |
| `cron.run` | 执行任务 |
| `cron.runs` | 执行历史 |

**节点管理 (15 方法):**
| 方法 | 说明 |
|------|------|
| `node.pair.request` | 配对请求 |
| `node.pair.list` | 配对列表 |
| `node.pair.approve` | 批准配对 |
| `node.pair.reject` | 拒绝配对 |
| `node.invoke` | 节点调用 |
| `node.pending.pull` | 拉取待处理 |
| `node.pending.ack` | 确认处理 |

**技能管理 (5 方法):**
| 方法 | 说明 |
|------|------|
| `skills.status` | 技能状态 |
| `skills.bins` | 技能二进制 |
| `skills.install` | 安装技能 |
| `skills.update` | 更新技能 |

**工具管理 (3 方法):**
| 方法 | 说明 |
|------|------|
| `tools.catalog` | 工具目录 |
| `exec.approvals.get` | 执行审批 |
| `exec.approvals.set` | 设置审批 |

**设备管理 (6 方法):**
| 方法 | 说明 |
|------|------|
| `device.pair.list` | 设备配对列表 |
| `device.pair.approve` | 批准设备 |
| `device.token.rotate` | 轮换令牌 |
| `device.token.revoke` | 撤销令牌 |

**TTS 接口 (5 方法):**
| 方法 | 说明 |
|------|------|
| `tts.status` | TTS 状态 |
| `tts.providers` | 提供商列表 |
| `tts.enable` | 启用 TTS |
| `tts.disable` | 禁用 TTS |
| `tts.convert` | 文本转语音 |

#### C.4.3 事件类型

| 事件 | 说明 |
|------|------|
| `connect.challenge` | 连接挑战 |
| `agent` | Agent 事件 |
| `chat` | 聊天事件 |
| `presence` | 在线状态 |
| `tick` | 心跳 |
| `talk.mode` | 对话模式 |
| `shutdown` | 关闭通知 |
| `health` | 健康事件 |
| `heartbeat` | 心跳事件 |
| `cron` | 定时任务事件 |
| `node.pair.requested` | 节点配对请求 |
| `device.pair.requested` | 设备配对请求 |
| `voicewake.changed` | 唤醒词变更 |
| `exec.approval.requested` | 执行审批请求 |

### C.5 Channel 插件接口详解

#### C.5.1 插件适配器接口

```typescript
interface ChannelPlugin {
  id: ChannelId;
  meta: ChannelMeta;
  capabilities: ChannelCapabilities;
  
  // 核心适配器
  config: ChannelConfigAdapter;
  setup?: ChannelSetupAdapter;
  pairing?: ChannelPairingAdapter;
  status?: ChannelStatusAdapter;
  gateway?: ChannelGatewayAdapter;
  outbound?: ChannelOutboundAdapter;
  
  // 功能适配器
  auth?: ChannelAuthAdapter;
  commands?: ChannelCommandAdapter;
  streaming?: ChannelStreamingAdapter;
  threading?: ChannelThreadingAdapter;
  messaging?: ChannelMessagingAdapter;
  mentions?: ChannelMentionAdapter;
  groups?: ChannelGroupAdapter;
  directory?: ChannelDirectoryAdapter;
  resolver?: ChannelResolverAdapter;
  actions?: ChannelMessageActionAdapter;
  heartbeat?: ChannelHeartbeatAdapter;
  
  // Agent 工具
  agentTools?: ChannelAgentToolFactory | ChannelAgentTool[];
  
  // Gateway 方法
  gatewayMethods?: string[];
}
```

#### C.5.2 适配器类型

| 适配器 | 功能 | 核心方法 |
|--------|------|----------|
| `ChannelConfigAdapter` | 配置管理 | `resolveConfig`, `validateConfig` |
| `ChannelSetupAdapter` | 初始化设置 | `setup`, `isConfigured` |
| `ChannelPairingAdapter` | 配对管理 | `startPairing`, `completePairing` |
| `ChannelStatusAdapter` | 状态监控 | `probe`, `resolveStatus` |
| `ChannelGatewayAdapter` | 网关集成 | `start`, `stop`, `handleMessage` |
| `ChannelOutboundAdapter` | 消息发送 | `send`, `sendTyping` |
| `ChannelAuthAdapter` | 认证管理 | `login`, `logout`, `refresh` |
| `ChannelStreamingAdapter` | 流式响应 | `startStream`, `appendStream` |
| `ChannelThreadingAdapter` | 线程管理 | `resolveThreadContext` |
| `ChannelMessagingAdapter` | 消息处理 | `parseMessage`, `formatMessage` |
| `ChannelMentionAdapter` | 提及处理 | `resolveMentions` |
| `ChannelGroupAdapter` | 群组管理 | `resolveGroupContext` |
| `ChannelDirectoryAdapter` | 目录服务 | `resolveDirectoryEntry` |
| `ChannelResolverAdapter` | 解析服务 | `resolve` |
| `ChannelMessageActionAdapter` | 消息动作 | `react`, `reply`, `edit` |
| `ChannelHeartbeatAdapter` | 心跳检测 | `heartbeat` |

#### C.5.3 Channel 账号快照

```typescript
interface ChannelAccountSnapshot {
  accountId: string;
  name?: string;
  enabled?: boolean;
  configured?: boolean;
  linked?: boolean;
  running?: boolean;
  connected?: boolean;
  reconnectAttempts?: number;
  lastConnectedAt?: number | null;
  lastDisconnect?: string | object | null;
  lastMessageAt?: number | null;
  lastError?: string | null;
  busy?: boolean;
  activeRuns?: number;
  mode?: string;
  dmPolicy?: string;
  allowFrom?: string[];
  probe?: unknown;
}
```

### C.6 Agent 核心接口详解

#### C.6.1 Agent 作用域

```typescript
// 核心函数
function resolveDefaultAgentId(cfg: OpenClawConfig): string;
function resolveAgentConfig(cfg: OpenClawConfig, agentId: string): AgentConfig | undefined;
function resolveAgentWorkspaceDir(cfg: OpenClawConfig, agentId: string): string;
function listAgentIds(cfg: OpenClawConfig): string[];
```

#### C.6.2 模型选择

```typescript
interface ModelSelection {
  primary: string;           // 主模型
  fallback?: string;         // 备用模型
  thinking?: string;         // 思考模型
}

function resolvePrimaryModelRef(cfg: OpenClawConfig, agentId: string): ModelRef;
function resolveFallbackModelRef(cfg: OpenClawConfig, agentId: string): ModelRef | undefined;
```

#### C.6.3 Agent 工具

**工具分类:**

| 类别 | 工具 | 文件 |
|------|------|------|
| **文件操作** | read, write, edit | `pi-tools.read.ts` |
| **执行** | exec, process | `bash-tools.ts` |
| **浏览器** | browser_* | `browser-tool.ts` |
| **网络** | web_search, web_fetch | `web-search.ts`, `web-fetch.ts` |
| **图像** | image_tool | `image-tool.ts` |
| **PDF** | pdf_tool | `pdf-tool.ts` |
| **记忆** | memory_search, memory_get | `memory-tool.ts` |
| **消息** | message_send, message_reply | `message-tool.ts` |
| **会话** | sessions_list, sessions_send | `sessions-*.ts` |
| **定时** | cron_add, cron_remove | `cron-tool.ts` |
| **节点** | node_invoke, node_list | `nodes-tool.ts` |
| **TTS** | tts_convert | `tts-tool.ts` |
| **画布** | canvas_* | `canvas-tool.ts` |
| **网关** | gateway_* | `gateway-tool.ts` |
| **子代理** | subagents_spawn | `subagents-tool.ts` |

#### C.6.4 工具策略管道

```
┌─────────────────────────────────────────────────────────────┐
│                    工具策略管道                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Owner-Only Policy (所有者限制)                         │
│     └─ 仅所有者可用工具                                      │
│                                                             │
│  2. Message Provider Policy (消息提供商限制)                │
│     └─ voice: 禁用 tts                                      │
│                                                             │
│  3. Model Provider Policy (模型提供商限制)                  │
│     └─ xAI: 禁用 web_search                                 │
│                                                             │
│  4. Sandbox Policy (沙箱策略)                               │
│     └─ 文件系统/网络限制                                     │
│                                                             │
│  5. Subagent Policy (子代理策略)                            │
│     └─ 继承父代理限制                                        │
│                                                             │
│  6. Group Policy (群组策略)                                 │
│     └─ 群组级别限制                                          │
│                                                             │
│  7. Agent Policy (智能体策略)                               │
│     └─ Agent 级别配置                                        │
│                                                             │
│  8. Global Policy (全局策略)                                │
│     └─ 全局默认配置                                          │
│                                                             │
│  9. Profile Policy (配置策略)                               │
│     └─ 用户配置覆盖                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### C.7 配置管理接口详解

#### C.7.1 路径解析 (src/config/paths.ts)

```typescript
// 核心函数
function resolveStateDir(env: Record<string, string>): string;
function resolveConfigPath(env: Record<string, string>): string;
function resolveGatewayPort(env: Record<string, string>): number;
function resolveOAuthDir(): string;

// 环境变量
// OPENCLAW_STATE_DIR - 状态目录覆盖
// OPENCLAW_CONFIG_PATH - 配置文件路径覆盖
// OPENCLAW_GATEWAY_PORT - 网关端口覆盖
```

#### C.7.2 IO 操作 (src/config/io.ts)

```typescript
// 读取配置
function loadConfig(): OpenClawConfig;
function readConfigFileSnapshot(): ConfigFileSnapshot;

// 写入配置
function writeConfigFile(config: OpenClawConfig, options?: ConfigWriteOptions): void;

// 验证配置
function validateConfigObject(config: unknown): ConfigValidationIssue[];

// 环境变量替换
function substituteEnvVars(config: OpenClawConfig): OpenClawConfig;
```

#### C.7.3 配置结构

```typescript
interface OpenClawConfig {
  models?: {
    providers: ModelProvider[];
    fallbackOrder?: string[];
  };
  agents?: {
    default: string;
    defaults?: AgentDefaults;
    list: AgentConfig[];
  };
  bindings?: BindingConfig[];
  channels?: Record<string, ChannelConfig>;
  tools?: ToolsConfig;
  session?: SessionConfig;
  cron?: CronConfig[];
  gateway?: GatewayConfig;
  skills?: SkillsConfig;
}
```

### C.8 技能系统接口详解

#### C.8.1 技能加载

```typescript
// 从工作区加载技能
function loadWorkspaceSkillEntries(cfg?: OpenClawConfig): SkillEntry[];

// 构建技能提示
function buildWorkspaceSkillsPrompt(entries: SkillEntry[]): string;

// 同步技能到工作区
function syncSkillsToWorkspace(cfg?: OpenClawConfig): void;
```

#### C.8.2 技能元数据

```typescript
interface OpenClawSkillMetadata {
  requires?: {
    bins?: string[];      // 需要的二进制
    env?: string[];       // 需要的环境变量
    config?: string[];    // 需要的配置项
  };
}
```

#### C.8.3 技能类型

| 类型 | 来源 | 优先级 |
|------|------|--------|
| Bundled | 内置 | 低 |
| Managed | ClawHub | 中 |
| Workspace | 本地 | 高 |

### C.9 接口优化建议

#### C.9.1 API 网关优化

1. **统一入口**
   - 将 REST API 和 WebSocket RPC 统一到单一网关
   - 减少端口占用，简化防火墙配置
   - 支持路径路由: `/api/*` → REST, `/ws` → WebSocket

2. **认证统一**
   - JWT Token 同时支持 REST 和 WebSocket
   - 统一的 Scope 和 Role 控制
   - 审计日志统一格式

3. **错误处理标准化**
   - 统一错误码体系
   - 标准化错误响应格式
   - 国际化错误消息

#### C.9.2 Channel 插件优化

1. **适配器简化**
   - 合并相似适配器 (messaging + streaming)
   - 提供默认实现基类
   - 减少必需适配器数量

2. **生命周期管理**
   - 统一的 init/start/stop/destroy 流程
   - 状态机标准化
   - 错误恢复机制

3. **测试工具**
   - 提供 Mock 基类
   - 标准化测试套件
   - 集成测试框架

#### C.9.3 Agent 工具优化

1. **工具分类**
   - 核心工具 (内置，不可禁用)
   - 扩展工具 (可选，按需加载)
   - 自定义工具 (用户定义)

2. **沙箱增强**
   - 容器化隔离
   - 资源限制 (CPU/内存/时间)
   - 网络策略细化

3. **性能优化**
   - 工具懒加载
   - 结果缓存
   - 并行执行

#### C.9.4 配置管理优化

1. **热重载**
   - 配置变更实时生效
   - 部分配置动态更新
   - 回滚支持

2. **Schema 增强**
   - JSON Schema 完整定义
   - UI Schema 自动生成
   - 验证错误友好提示

3. **迁移工具**
   - 版本间自动迁移
   - 兼容性检查
   - 迁移日志

---

*文档版本: 1.1.0*
*最后更新: 2026-03-12*
