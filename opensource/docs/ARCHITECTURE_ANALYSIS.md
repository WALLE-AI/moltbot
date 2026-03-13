# OpenCode + Oh-My-OpenAgent 架构深度分析报告

**生成日期:** 2025-03-12  
**分析范围:** opencode/packages/opencode + oh-my-openagent

---

## 目录

1. [项目概览](#项目概览)
2. [核心架构](#核心架构)
3. [Agent运行循环](#agent运行循环)
4. [工具系统](#工具系统)
5. [技能与MCP模块](#技能与mcp模块)
6. [上下文管理](#上下文管理)
7. [记忆与多智能体协作](#记忆与多智能体协作)
8. [心跳与定时任务](#心跳与定时任务)
9. [渠道集成](#渠道集成)
10. [网关与API](#网关与api)
11. [配置管理](#配置管理)
12. [关键发现与建议](#关键发现与建议)

---

## 项目概览

### OpenCode 项目结构

```
opencode/packages/opencode/src/
├── agent/           # Agent定义与生成
├── bus/             # 事件总线
├── cli/             # CLI命令与TUI
├── config/          # 配置管理
├── lsp/             # LSP集成
├── mcp/             # MCP协议
├── permission/      # 权限系统
├── provider/        # LLM提供者集成
├── server/          # HTTP API服务
├── session/         # 会话管理（核心）
├── skill/           # 技能系统
├── tool/            # 工具定义
└── util/            # 工具函数
```

### Oh-My-OpenAgent 项目结构

```
oh-my-openagent/src/
├── features/        # 功能模块
│   ├── background-agent/    # 后台任务管理（核心）
│   ├── builtin-skills/      # 内置技能
│   ├── builtin-commands/    # 内置命令
│   ├── context-injector/    # 上下文注入
│   ├── mcp-oauth/           # MCP OAuth
│   ├── skill-mcp-manager/   # MCP管理器
│   ├── tmux-subagent/       # Tmux子代理
│   └── task-toast-manager/  # 任务通知
├── hooks/           # 生命周期钩子（46个）
├── plugin/          # 插件系统
└── agents/          # Agent提示构建
```

---

## 核心架构

### 1. Session Prompt Loop（会话提示循环）

**位置:** `opencode/src/session/prompt.ts`

核心处理流程：

```
用户输入 → SessionPrompt.prompt() → loop()
    ↓
resolveTools() → 工具解析
    ↓
LLM.stream() → 流式响应
    ↓
SessionProcessor.process() → 处理流事件
    ↓
工具调用 / 文本生成 / 推理块
    ↓
SessionCompaction.check() → 检查是否需要压缩
    ↓
完成或继续循环
```

**关键函数:**

| 函数 | 作用 |
|------|------|
| `loop()` | 主循环，处理任务队列 |
| `resolveTools()` | 解析可用工具集 |
| `prompt()` | 同步提示处理 |
| `command()` | 命令处理 |
| `cancel()` | 取消会话 |

### 2. Session Compaction（会话压缩）

**位置:** `opencode/src/session/compaction.ts`

当token超过模型限制时触发压缩：

```typescript
// 检测溢出
export async function isOverflow(input: {
  tokens: Token
  model: Provider.Model
}): Promise<boolean>

// 处理压缩
export async function process(input: {
  sessionID: SessionID
  model: Provider.Model
  agent: string
}): Promise<"stop" | "continue">
```

**压缩策略:**
1. 修剪旧的工具调用
2. 生成摘要消息
3. 创建压缩事件
4. 保留关键上下文

---

## Agent运行循环

### Agent定义

**位置:** `opencode/src/agent/agent.ts`

```typescript
export const Info = z.object({
  name: z.string(),
  description: z.string().optional(),
  mode: z.enum(["subagent", "primary", "all"]),
  native: z.boolean().optional(),
  hidden: z.boolean().optional(),
  permission: PermissionNext.Ruleset,
  model: z.object({ modelID: z.string(), providerID: z.string() }).optional(),
  prompt: z.string().optional(),
  options: z.record(z.string(), z.any()),
  steps: z.number().int().positive().optional(),
})
```

**内置Agent:**

| Agent | 模式 | 用途 |
|-------|------|------|
| `build` | primary | 默认构建Agent |
| `plan` | primary | 规划模式，禁用编辑工具 |
| `general` | subagent | 通用研究Agent |
| `explore` | subagent | 快速代码库探索 |
| `compaction` | primary | 压缩专用（隐藏） |
| `title` | primary | 标题生成（隐藏） |
| `summary` | primary | 摘要生成（隐藏） |

### Background Agent Manager

**位置:** `oh-my-openagent/src/features/background-agent/manager.ts`

**任务生命周期:**

```
LaunchInput → pending → [ConcurrencyManager queue] → running → polling
    → completed/error/cancelled/interrupt
```

**核心组件:**

| 文件 | 功能 |
|------|------|
| `manager.ts` | BackgroundManager类，任务调度 |
| `spawner.ts` | 任务启动，会话创建 |
| `concurrency.ts` | 并发控制（默认5/模型） |
| `task-poller.ts` | 3秒轮询，空闲检测 |
| `result-handler.ts` | 结果处理，父会话通知 |

**并发模型:**

```typescript
// 并发键格式
const concurrencyKey = `${providerID}/${modelID}`

// 默认限制: 5个并发/键
// FIFO队列等待
// 完成/错误/取消时释放槽位
```

---

## 工具系统

### Tool Registry

**位置:** `opencode/src/tool/registry.ts`

**工具注册流程:**

```typescript
export async function tools(model, agent): Promise<Tool.Info[]> {
  const allTools = [
    InvalidTool,
    QuestionTool,      // 可选
    BashTool,
    ReadTool,
    GlobTool,
    GrepTool,
    EditTool,
    WriteTool,
    TaskTool,
    WebFetchTool,
    TodoWriteTool,
    WebSearchTool,     // 需要enable
    CodeSearchTool,    // 需要enable
    SkillTool,
    ApplyPatchTool,    // GPT模型专用
    ...custom,         // 插件/用户自定义
  ]
  // 过滤并初始化
  return Promise.all(tools.filter(...).map(init))
}
```

**内置工具列表:**

| 工具 | 功能 | 备注 |
|------|------|------|
| `bash` | 执行Shell命令 | 支持交互式会话 |
| `read` | 读取文件 | 支持图片、PDF |
| `edit` | 编辑文件 | 精确字符串替换 |
| `write` | 写入文件 | 创建新文件 |
| `glob` | 文件搜索 | glob模式 |
| `grep` | 内容搜索 | ripgrep |
| `task` | 子任务委托 | 多Agent协作 |
| `skill` | 技能调用 | 动态加载 |
| `webfetch` | 获取URL内容 | HTTP请求 |
| `websearch` | 网页搜索 | Exa集成 |
| `codesearch` | 代码搜索 | 语义搜索 |

### 插件工具扩展

```typescript
// 从插件加载工具
const plugins = await Plugin.list()
for (const plugin of plugins) {
  for (const [id, def] of Object.entries(plugin.tool ?? {})) {
    custom.push(fromPlugin(id, def))
  }
}

// 从目录加载自定义工具
const matches = await Glob.scanSync("{tool,tools}/*.{js,ts}")
```

---

## 技能与MCP模块

### Skill Loader

**位置:** `oh-my-openagent/src/features/opencode-skill-loader/`

**4级作用域优先级:**

```
project > opencode > user > global
```

**技能发现流程:**

1. 扫描各作用域的SKILL.md文件
2. 解析YAML frontmatter
3. 合并去重（高优先级覆盖）
4. 模板变量替换
5. 提供者门控过滤

**技能结构:**

```yaml
---
name: skill-name
description: Skill description
provider: anthropic  # 可选：限制提供者
tools:
  - bash
  - read
---

# Skill Instructions

实际技能内容...
```

### MCP Manager

**位置:** `oh-my-openagent/src/features/skill-mcp-manager/`

**支持的传输类型:**

| 类型 | 实现 | 用途 |
|------|------|------|
| `stdio` | `stdio-client.ts` | 本地MCP服务器 |
| `http` | `http-client.ts` | HTTP SSE |

**连接管理:**

```typescript
export class SkillMcpManager {
  // 每会话MCP客户端生命周期
  async connect(sessionID: string, config: McpConfig)
  async disconnect(sessionID: string)
  async listTools(sessionID: string)
  async executeTool(sessionID, toolName, args)
}
```

### MCP OAuth

**位置:** `oh-my-openagent/src/features/mcp-oauth/`

**支持的OAuth流程:**

- OAuth 2.0 + PKCE
- Dynamic Client Registration (RFC 7591)
- Step-up Authentication

---

## 上下文管理

### Context Injector

**位置:** `oh-my-openagent/src/features/context-injector/`

**注入机制:**

```typescript
export function injectPendingContext(
  collector: ContextCollector,
  sessionID: string,
  parts: OutputPart[]
): InjectionResult {
  if (!collector.hasPending(sessionID)) {
    return { injected: false, contextLength: 0 }
  }
  
  const pending = collector.getPending(sessionID)
  const merged = pending.merged
  
  // 在用户消息前注入
  parts[textPartIndex].text = `${merged}\n\n---\n\n${originalText}`
  
  return { injected: true, contextLength: merged.length }
}
```

**注入时机:**

- 通过 `experimental.chat.messages.transform` 钩子
- 在消息发送给模型前
- 支持AGENTS.md、README.md等

### Compaction-Aware Message Resolver

**位置:** `oh-my-openagent/src/features/background-agent/compaction-aware-message-resolver.ts`

**功能:**
- 处理压缩后的消息历史
- 为后台Agent提供一致的消息视图
- 处理消息引用解析

---

## 记忆与多智能体协作

### Session State

**位置:** `oh-my-openagent/src/features/claude-code-session-state/`

```typescript
// 子代理会话跟踪
export const subagentSessions = new Set<string>()

// 主会话ID
export function getMainSessionID(): string | undefined
```

### Boulder State

**位置:** `oh-my-openagent/src/features/boulder-state/`

**用途:**
- 多步骤操作持久化状态
- Boulder会话的进度跟踪
- 与Atlas钩子协作

### Task Storage

**位置:** `oh-my-openagent/src/features/claude-tasks/`

**存储层:**

| 文件 | 功能 |
|------|------|
| `types.ts` | Task数据结构 |
| `storage.ts` | 文件系统存储 |
| `session-storage.ts` | 会话级存储 |

---

## 心跳与定时任务

### Task Poller

**位置:** `oh-my-openagent/src/features/background-agent/task-poller.ts`

**轮询机制:**

```typescript
// 默认配置
const DEFAULT_STALE_TIMEOUT_MS = 10 * 60 * 1000  // 10分钟
const DEFAULT_MESSAGE_STALENESS_TIMEOUT_MS = 5 * 60 * 1000  // 5分钟
const TASK_TTL_MS = 30 * 60 * 1000  // 30分钟

// 轮询间隔: 3秒
// 空闲检测: 10秒无变化
```

**过期任务处理:**

```typescript
export function pruneStaleTasksAndNotifications(args: {
  tasks: Map<string, BackgroundTask>
  notifications: Map<string, BackgroundTask[]>
  onTaskPruned: (taskId, task, errorMessage) => void
}): void
```

### Session Notification

**位置:** `oh-my-openagent/src/hooks/session-notification.ts`

**通知触发事件:**

| 事件 | 通知类型 |
|------|----------|
| `session.idle` | 会话空闲 |
| `permission.ask` | 权限请求 |
| `tool.execute.before` (question) | 问题提示 |

---

## 渠道集成

### 当前状态

OpenCode核心**不包含**Slack/Telegram/Discord等渠道集成。这些需要通过：

1. **HTTP API** - 外部服务调用
2. **Plugin系统** - 自定义渠道插件
3. **Webhook** - 事件订阅

### API端点

**位置:** `opencode/src/server/routes/session.ts`

**核心端点:**

| 端点 | 方法 | 功能 |
|------|------|------|
| `/session` | GET | 列出会话 |
| `/session` | POST | 创建会话 |
| `/session/:id` | GET | 获取会话 |
| `/session/:id/message` | POST | 发送消息 |
| `/session/:id/prompt_async` | POST | 异步发送 |
| `/session/:id/abort` | POST | 中止会话 |

### 外部集成模式

```
外部渠道服务 (Slack/Telegram)
    ↓
HTTP POST /session/:id/message
    ↓
OpenCode处理
    ↓
SSE事件流 /events
    ↓
外部服务响应
```

---

## 网关与API

### Server架构

**位置:** `opencode/src/server/server.ts`

```typescript
export function createApp() {
  const app = new Hono()
  
  // 中间件
  app.use(cors())
  app.use(errorHandler)
  
  // 路由
  app.route("/session", SessionRoutes)
  app.route("/file", FileRoutes)
  app.route("/provider", ProviderRoutes)
  app.route("/mcp", McpRoutes)
  app.route("/config", ConfigRoutes)
  app.route("/permission", PermissionRoutes)
  // ...
  
  return app
}

export function listen(port: number) {
  const app = createApp()
  return Bun.serve({ port, fetch: app.fetch })
}
```

### Provider集成

**位置:** `opencode/src/provider/provider.ts`

**支持的提供者:**

| 提供者 | SDK | 特殊处理 |
|--------|-----|----------|
| Anthropic | @ai-sdk/anthropic | beta headers |
| OpenAI | @ai-sdk/openai | responses API |
| Azure | @ai-sdk/azure | cognitive services |
| Amazon Bedrock | @ai-sdk/amazon-bedrock | region prefixing |
| Google Vertex | @ai-sdk/google-vertex | auth handling |
| OpenRouter | @openrouter/ai-sdk-provider | headers |
| GitHub Copilot | custom | responses/chat切换 |
| GitLab | @gitlab/gitlab-ai-provider | agentic chat |

---

## 配置管理

### AGENTS.md

**位置:** 项目根目录 `.opencode/AGENTS.md`

**解析:** `opencode/src/config/markdown.ts`

```typescript
export async function parse(filePath: string) {
  const template = await Filesystem.readText(filePath)
  const md = matter(template)  // gray-matter
  return {
    data: md.data,    // frontmatter
    content: md.content
  }
}
```

### Config结构

**位置:** `opencode/src/config/config.ts`

```typescript
export const Config = z.object({
  // 模型配置
  provider: z.record(ProviderConfig),
  
  // Agent配置
  agent: z.record(AgentConfig),
  
  // 权限
  permission: PermissionConfig,
  
  // 技能
  skill: SkillConfig,
  
  // MCP
  mcp: McpConfig,
  
  // 实验性功能
  experimental: ExperimentalConfig,
})
```

### Hooks配置

**46个生命周期钩子，分5层:**

| 层级 | 钩子数 | 文件 |
|------|--------|------|
| Session Hooks | 23 | `create-session-hooks.ts` |
| Tool Guard Hooks | 10 | `create-tool-guard-hooks.ts` |
| Transform Hooks | 4 | `create-transform-hooks.ts` |
| Continuation Hooks | 7 | `create-continuation-hooks.ts` |
| Skill Hooks | 2 | `create-skill-hooks.ts` |

---

## 关键发现与建议

### 架构优势

1. **模块化设计** - 清晰的关注点分离
2. **插件系统** - 高度可扩展
3. **事件驱动** - 松耦合通信
4. **流式处理** - 实时响应

### 潜在改进点

1. **Context Injection**
   - 当前: 通过 `messages.transform` 钩子
   - 建议: 工具化（`createContextInjectorTool`）
   - 好处: 模型显式请求，更可控

2. **渠道集成**
   - 当前: 需要外部服务
   - 建议: 内置渠道适配器
   - 参考: OpenClaw的渠道模块

3. **压缩策略**
   - 当前: 单一摘要策略
   - 建议: 多级压缩（摘要+关键信息提取）

### Context Injection实现路径

**目标:** 将上下文注入从钩子改为工具调用

**步骤:**

1. 创建 `createContextInjectorTool()` 函数
2. 在 `SessionPrompt.resolveTools()` 中注册
3. 工具参数:
   ```typescript
   {
     context_types: ("agents_md" | "readme" | "custom")[],
     scope: "project" | "global",
     query: string  // 可选过滤
   }
   ```
4. 移除 `experimental.chat.messages.transform` 中的注入逻辑
5. 更新系统提示，告知模型可用的注入工具

---

## 附录: 关键文件索引

### OpenCode核心

| 文件 | 行数 | 功能 |
|------|------|------|
| `session/prompt.ts` | 961 | 会话提示循环 |
| `session/compaction.ts` | 329 | 会话压缩 |
| `session/processor.ts` | 431 | 流处理 |
| `provider/provider.ts` | 1419 | 提供者管理 |
| `tool/registry.ts` | 174 | 工具注册 |
| `server/server.ts` | 638 | HTTP服务 |
| `config/config.ts` | ~1500 | 配置管理 |

### Oh-My-OpenAgent核心

| 文件 | 行数 | 功能 |
|------|------|------|
| `background-agent/manager.ts` | ~900 | 后台任务管理 |
| `background-agent/spawner.ts` | 239 | 任务启动 |
| `background-agent/task-poller.ts` | 184 | 任务轮询 |
| `context-injector/injector.ts` | 168 | 上下文注入 |
| `hooks/AGENTS.md` | 168 | 钩子文档 |

---

**报告完成**
