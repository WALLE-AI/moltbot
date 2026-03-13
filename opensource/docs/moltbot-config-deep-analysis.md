# OpenClaw 项目配置深度分析

本文档详细分析 OpenClaw 主项目中的 AGENTS.md、SOUL.md、记忆系统、多智能体系统、模型厂商配置以及技能系统的配置架构与实现细节。

---

## 目录

1. [AGENTS.md 配置分析](#1-agentsmd-配置分析)
2. [SOUL.md 配置分析](#2-soulmd-配置分析)
3. [记忆系统配置分析](#3-记忆系统配置分析)
4. [多智能体系统配置分析](#4-多智能体系统配置分析)
5. [模型厂商配置分析](#5-模型厂商配置分析)
6. [技能系统配置分析](#6-技能系统配置分析)
7. [配置最佳实践总结](#7-配置最佳实践总结)

---

## 1. AGENTS.md 配置分析

### 1.1 概述

AGENTS.md 是 OpenClaw 项目的核心配置文件，定义了 AI Agent 在工作空间中的行为准则、开发规范和操作指南。位于项目根目录 `AGENTS.md`。

### 1.2 核心配置

#### 1.2.1 自动关闭标签 (Auto-close Labels)

```yaml
# 定义的自动关闭标签及其用途
r: skill          # 引导发布技能到 Clawhub
r: support        # 重定向到 Discord 支持
r: no-ci-pr       # 关闭仅修复 CI 的 PR
r: too-many-prs   # 超出活跃 PR 限制
r: testflight     # TestFlight 访问请求
r: third-party-extension  # 第三方插件引导
r: moltbook       # 离题内容关闭+锁定
r: spam           # 垃圾信息关闭+锁定
invalid           # 无效项目关闭
dirty             # 过多无关变更的 PR 关闭
```

#### 1.2.2 项目结构规范

```
src/                    # 源代码
├── cli/               # CLI 接线
├── commands/          # 命令实现
├── provider-web.ts    # Web 提供者
├── infra/             # 基础设施
└── media/             # 媒体管道
docs/                   # 文档
extensions/*            # 插件/扩展（工作区包）
```

#### 1.2.3 构建与测试命令

```bash
# 依赖安装
pnpm install

# 类型检查/构建
pnpm build
pnpm tsgo

# 代码检查/格式化
pnpm check
pnpm format        # 检查
pnpm format:fix    # 修复

# 测试
pnpm test                    # Vitest 测试
pnpm test:coverage          # 覆盖率测试
OPENCLAW_TEST_PROFILE=low OPENCLAW_TEST_SERIAL_GATEWAY=1 pnpm test  # 低内存模式
```

#### 1.2.4 编码风格规范

- **语言**: TypeScript (ESM)，严格类型，避免 `any`
- **格式化**: Oxlint + Oxfmt
- **动态导入**: 不混用 `await import("x")` 和静态导入
- **原型突变**: 禁止通过原型突变共享类行为
- **文件大小**: 目标 ~700 LOC 以下
- **命名**: 产品用 **OpenClaw**，CLI/包/路径用 `openclaw`

---

## 2. SOUL.md 配置分析

### 2.1 概述

SOUL.md 定义了 AI Agent 的"人格"和行为准则。它是一个模板文件，用于塑造 Agent 的个性和交互方式。

### 2.2 核心配置结构

```markdown
# SOUL.md - Who You Are

## Core Truths
- 真诚有用，而非表演性有用
- 拥有观点，可以不同意
- 先尝试自己解决，再提问
- 通过能力赢得信任
- 记住自己是客人

## Boundaries
- 私密事物保持私密
- 外部行动前先询问
- 不发送半成品回复到消息平台
- 不是用户的声音——在群聊中要小心

## Vibe
简洁时简洁，重要时详尽。不做企业机器人，不做马屁精。

## Continuity
每个会话都重新开始。这些文件就是记忆。读取它们，更新它们。
```

### 2.3 SOUL.md 与 AGENTS.md 的关系

| 特性 | SOUL.md | AGENTS.md |
|-----|---------|-----------|
| 定义内容 | 人格、价值观、边界 | 工作流、工具、技能 |
| 加载时机 | 会话启动时首先加载 | 会话启动时第二加载 |
| 修改频率 | 较少（人格稳定） | 较多（工作流变化） |
| 安全级别 | 高（包含个人上下文） | 中（包含操作规则） |

### 2.4 开发版 SOUL.md (SOUL.dev.md)

开发版 SOUL.md 提供了额外的开发指导：

```markdown
## Development Mode
- 更详细的日志输出
- 调试模式下的冗长响应
- 测试环境的特殊行为
```

---

## 3. 记忆系统配置分析

### 3.1 概述

OpenClaw 的记忆系统基于 **纯 Markdown 文件**，存储在 Agent 工作空间中。文件是真实来源，模型只"记住"写入磁盘的内容。

### 3.2 记忆文件结构

```
~/.openclaw/workspace/
├── MEMORY.md              # 长期记忆（仅在主会话加载）
├── memory/
│   ├── 2026-03-13.md     # 每日日志（追加式）
│   ├── 2026-03-12.md     # 昨日日志
│   └── projects.md       # 非日期文件（永久）
```

### 3.3 记忆工具

| 工具 | 功能 | 说明 |
|-----|------|------|
| `memory_search` | 语义搜索 | 在索引片段上搜索 |
| `memory_get` | 定向读取 | 读取特定 Markdown 文件/行范围 |

### 3.4 自动记忆刷新（预压缩 Ping）

```json5
{
  agents: {
    defaults: {
      compaction: {
        reserveTokensFloor: 20000,
        memoryFlush: {
          enabled: true,
          softThresholdTokens: 4000,
          systemPrompt: "Session nearing compaction. Store durable memories now.",
          prompt: "Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO_REPLY if nothing to store.",
        },
      },
    },
  },
}
```

### 3.5 向量记忆搜索配置

#### 3.5.1 提供者自动选择

```
1. local - 如果配置了 memorySearch.local.modelPath 且文件存在
2. openai - 如果能解析 OpenAI 密钥
3. gemini - 如果能解析 Gemini 密钥
4. voyage - 如果能解析 Voyage 密钥
5. mistral - 如果能解析 Mistral 密钥
6. 禁用 - 否则
```

#### 3.5.2 混合搜索配置

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        query: {
          hybrid: {
            enabled: true,
            vectorWeight: 0.7,
            textWeight: 0.3,
            candidateMultiplier: 4,
            // MMR 多样性重排
            mmr: {
              enabled: true,
              lambda: 0.7  // 0=最大多样性, 1=最大相关性
            },
            // 时间衰减
            temporalDecay: {
              enabled: true,
              halfLifeDays: 30  // 每30天分数减半
            }
          }
        }
      }
    }
  }
}
```

### 3.6 QMD 后端（实验性）

```json5
{
  memory: {
    backend: "qmd",
    citations: "auto",
    qmd: {
      includeDefaultMemory: true,
      update: { interval: "5m", debounceMs: 15000 },
      limits: { maxResults: 6, timeoutMs: 4000 },
      scope: {
        default: "deny",
        rules: [
          { action: "allow", match: { chatType: "direct" } },
        ]
      },
      paths: [
        { name: "docs", path: "~/notes", pattern: "**/*.md" }
      ]
    }
  }
}
```

### 3.7 记忆插件配置

#### memory-core 插件

```json
{
  "id": "memory-core",
  "kind": "memory",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  }
}
```

#### memory-lancedb 插件

```json
{
  "id": "memory-lancedb",
  "kind": "memory",
  "configSchema": {
    "type": "object",
    "properties": {
      "embedding": {
        "type": "object",
        "properties": {
          "apiKey": { "type": "string" },
          "model": { "type": "string" },
          "baseUrl": { "type": "string" },
          "dimensions": { "type": "number" }
        },
        "required": ["apiKey"]
      },
      "dbPath": { "type": "string" },
      "autoCapture": { "type": "boolean" },
      "autoRecall": { "type": "boolean" },
      "captureMaxChars": { "type": "number", "minimum": 100, "maximum": 10000 }
    },
    "required": ["embedding"]
  }
}
```

---

## 4. 多智能体系统配置分析

### 4.1 概述

多智能体路由允许在单个 Gateway 进程中运行多个 **隔离的 Agent**（独立工作空间 + agentDir + 会话），以及多个通道账户（如两个 WhatsApp）。

### 4.2 核心概念

| 概念 | 说明 |
|-----|------|
| `agentId` | 一个"大脑"（工作空间、每 Agent 认证、每 Agent 会话存储） |
| `accountId` | 一个通道账户实例（如 WhatsApp 账户 "personal" vs "biz"） |
| `binding` | 通过 `(channel, accountId, peer)` 将入站消息路由到 `agentId` |

### 4.3 路由规则（确定性，最具体优先）

```
1. peer 匹配（精确 DM/群组/通道 ID）
2. parentPeer 匹配（线程继承）
3. guildId + roles（Discord 角色路由）
4. guildId（Discord）
5. teamId（Slack）
6. accountId 匹配通道
7. 通道级匹配（accountId: "*"）
8. 回退到默认 Agent
```

### 4.4 配置示例

#### 4.4.1 多 WhatsApp 号码

```json5
{
  agents: {
    list: [
      {
        id: "home",
        default: true,
        name: "Home",
        workspace: "~/.openclaw/workspace-home",
        agentDir: "~/.openclaw/agents/home/agent",
      },
      {
        id: "work",
        name: "Work",
        workspace: "~/.openclaw/workspace-work",
        agentDir: "~/.openclaw/agents/work/agent",
      },
    ],
  },
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

#### 4.4.2 Discord 多机器人

```json5
{
  agents: {
    list: [
      { id: "main", workspace: "~/.openclaw/workspace-main" },
      { id: "coding", workspace: "~/.openclaw/workspace-coding" },
    ],
  },
  bindings: [
    { agentId: "main", match: { channel: "discord", accountId: "default" } },
    { agentId: "coding", match: { channel: "discord", accountId: "coding" } },
  ],
  channels: {
    discord: {
      accounts: {
        default: {
          token: "DISCORD_BOT_TOKEN_MAIN",
          guilds: { "123456789012345678": { channels: { "222222222222222222": { allow: true } } } },
        },
        coding: {
          token: "DISCORD_BOT_TOKEN_CODING",
          guilds: { "123456789012345678": { channels: { "333333333333333333": { allow: true } } } },
        },
      },
    },
  },
}
```

### 4.5 每 Agent 沙箱和工具配置

```json5
{
  agents: {
    list: [
      {
        id: "personal",
        workspace: "~/.openclaw/workspace-personal",
        sandbox: { mode: "off" },  // 无沙箱
        // 无工具限制
      },
      {
        id: "family",
        workspace: "~/.openclaw/workspace-family",
        sandbox: {
          mode: "all",
          scope: "agent",
          docker: {
            setupCommand: "apt-get update && apt-get install -y git curl",
          },
        },
        tools: {
          allow: ["read"],
          deny: ["exec", "write", "edit", "apply_patch"],
        },
      },
    ],
  },
}
```

---

## 5. 模型厂商配置分析

### 5.1 概述

OpenClaw 支持多种 LLM 提供者，分为内置提供者和自定义提供者两类。

### 5.2 内置提供者

| 提供者 | 认证方式 | 示例模型 |
|-------|---------|---------|
| `openai` | `OPENAI_API_KEY` | `openai/gpt-5.4` |
| `anthropic` | `ANTHROPIC_API_KEY` 或 setup-token | `anthropic/claude-opus-4-6` |
| `openai-codex` | OAuth (ChatGPT) | `openai-codex/gpt-5.4` |
| `opencode` | `OPENCODE_API_KEY` | `opencode/claude-opus-4-6` |
| `google` | `GEMINI_API_KEY` | `google/gemini-3.1-pro-preview` |
| `zai` | `ZAI_API_KEY` | `zai/glm-5` |
| `openrouter` | `OPENROUTER_API_KEY` | `openrouter/anthropic/claude-sonnet-4-5` |
| `xai` | `XAI_API_KEY` | Grok 模型 |
| `mistral` | `MISTRAL_API_KEY` | `mistral/mistral-large-latest` |
| `groq` | `GROQ_API_KEY` | 快速推理 |
| `cerebras` | `CEREBRAS_API_KEY` | 超快推理 |
| `github-copilot` | `COPILOT_GITHUB_TOKEN` | Copilot 模型 |
| `huggingface` | `HF_TOKEN` | `huggingface/deepseek-ai/DeepSeek-R1` |

### 5.3 API 密钥轮换

```
优先级顺序：
1. OPENCLAW_LIVE_<PROVIDER>_KEY（单次实时覆盖，最高优先级）
2. <PROVIDER>_API_KEYS（逗号/分号列表）
3. <PROVIDER>_API_KEY（主密钥）
4. <PROVIDER>_API_KEY_*（编号列表，如 <PROVIDER>_API_KEY_1）

重试行为：
- 仅在速率限制响应时重试（429, rate_limit, quota, resource exhausted）
- 非速率限制失败立即返回错误
```

### 5.4 自定义提供者配置

#### 5.4.1 Moonshot AI (Kimi)

```json5
{
  agents: {
    defaults: { model: { primary: "moonshot/kimi-k2.5" } },
  },
  models: {
    mode: "merge",
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

#### 5.4.2 本地代理 (LM Studio, vLLM, LiteLLM)

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/minimax-m2.5-gs32" },
      models: { "lmstudio/minimax-m2.5-gs32": { alias: "Minimax" } },
    },
  },
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://localhost:1234/v1",
        apiKey: "LMSTUDIO_KEY",
        api: "openai-completions",
        models: [{
          id: "minimax-m2.5-gs32",
          name: "MiniMax M2.5",
          reasoning: false,
          input: ["text"],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow: 200000,
          maxTokens: 8192,
        }],
      },
    },
  },
}
```

### 5.5 Ollama 本地模型

```bash
# 安装 Ollama
ollama pull llama3.3
```

```json5
{
  agents: {
    defaults: { model: { primary: "ollama/llama3.3" } },
  },
}
```

---

## 6. 技能系统配置分析

### 6.1 概述

OpenClaw 使用 **AgentSkills 兼容** 的技能文件夹来教 Agent 如何使用工具。每个技能是一个包含 `SKILL.md` 的目录。

### 6.2 技能位置和优先级

```
优先级（高→低）：
1. <workspace>/skills        # 工作区技能
2. ~/.openclaw/skills        # 托管/本地技能
3. bundled skills            # 内置技能
4. skills.load.extraDirs     # 额外目录
```

### 6.3 SKILL.md 格式

```markdown
---
name: nano-banana-pro
description: Generate or edit images via Gemini 3 Pro Image
homepage: https://example.com
user-invocable: true
disable-model-invocation: false
command-dispatch: tool
command-tool: tool-name
metadata:
  {
    "openclaw":
      {
        "emoji": "🎨",
        "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] },
        "primaryEnv": "GEMINI_API_KEY",
        "install": [{ "id": "brew", "kind": "brew", "formula": "gemini-cli", "bins": ["gemini"] }]
      }
  }
---

# 技能指令内容
使用 {baseDir} 引用技能文件夹路径。
```

### 6.4 技能门控（加载时过滤）

| 字段 | 说明 |
|-----|------|
| `always` | 总是包含技能（跳过其他门控） |
| `os` | 平台列表 (`darwin`, `linux`, `win32`) |
| `requires.bins` | PATH 上必须存在的二进制文件 |
| `requires.anyBins` | 至少一个必须存在 |
| `requires.env` | 必须存在的环境变量 |
| `requires.config` | 必须为真的配置路径 |

### 6.5 技能配置覆盖

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],  // 内置技能白名单
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills"],
      watch: true,
      watchDebounceMs: 250,
    },
    install: {
      preferBrew: true,
      nodeManager: "npm",  // npm | pnpm | yarn | bun
    },
    entries: {
      "nano-banana-pro": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" },
        env: { GEMINI_API_KEY: "GEMINI_KEY_HERE" },
        config: {
          endpoint: "https://example.invalid",
          model: "nano-pro",
        },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

### 6.6 Token 影响

```
基础开销（≥1 技能时）：195 字符
每技能：97 字符 + len(name_escaped) + len(description_escaped) + len(location_escaped)

公式：
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))

估算：~24 tokens/技能 + 字段长度
```

---

## 7. 配置最佳实践总结

### 7.1 AGENTS.md 最佳实践

1. **保持文件简洁**: 目标 ~500-700 LOC
2. **使用相对路径**: 在聊天回复中使用仓库根相对路径
3. **遵循命名规范**: 产品用 OpenClaw，CLI 用 openclaw
4. **避免原型突变**: 使用显式继承/组合

### 7.2 SOUL.md 最佳实践

1. **定义清晰边界**: 私密数据、外部行动
2. **保持人格一致**: 不要频繁修改
3. **通知用户变更**: 修改 SOUL.md 时告知用户

### 7.3 记忆系统最佳实践

1. **使用混合搜索**: 结合向量和 BM25
2. **启用时间衰减**: 对每日笔记启用
3. **配置自动刷新**: 防止压缩时丢失记忆
4. **选择合适后端**: QMD 用于高级搜索，SQLite 用于简单场景

### 7.4 多智能体最佳实践

1. **隔离工作空间**: 每个 Agent 独立 workspace 和 agentDir
2. **明确路由规则**: 使用确定性绑定
3. **配置沙箱**: 对不受信任的 Agent 启用沙箱
4. **分离认证**: 不共享 auth-profiles.json

### 7.5 模型配置最佳实践

1. **使用密钥轮换**: 配置多个 API 密钥
2. **设置回退模型**: 配置 fallback_models
3. **本地模型优先**: 使用 Ollama/vLLM 降低成本
4. **监控使用量**: 跟踪 token 消耗

### 7.6 技能配置最佳实践

1. **使用 ClawHub**: 从官方仓库安装技能
2. **配置门控**: 确保 requires 条件正确
3. **沙箱环境**: 在沙箱中测试新技能
4. **定期更新**: 使用 `clawhub update --all`

---

## 附录：配置文件路径速查

| 配置类型 | 路径 |
|---------|------|
| 主配置 | `~/.openclaw/openclaw.json` |
| 状态目录 | `~/.openclaw` |
| 工作空间 | `~/.openclaw/workspace` |
| Agent 目录 | `~/.openclaw/agents/<agentId>/agent` |
| 会话存储 | `~/.openclaw/agents/<agentId>/sessions` |
| 记忆文件 | `~/.openclaw/workspace/MEMORY.md` |
| 每日日志 | `~/.openclaw/workspace/memory/YYYY-MM-DD.md` |
| 技能目录 | `~/.openclaw/skills` |
| 凭证存储 | `~/.openclaw/credentials/` |
| 记忆索引 | `~/.openclaw/memory/<agentId>.sqlite` |

---

*文档生成时间: 2026-03-13*
*项目版本: 基于 main 分支*
