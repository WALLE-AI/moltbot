# Pi-Mono 项目模块深度分析报告

> 本报告对 `opensource/pi-mono` 项目进行深度模块分析，涵盖核心架构、功能实现及模块间协作机制。

---

## 目录

1. [Agent-Run-Loop 模块](#1-agent-run-loop-模块)
2. [Tools 模块](#2-tools-模块)
3. [技能池/MCP 模块](#3-技能池mcp-模块)
4. [上下文管理模块（重点）](#4-上下文管理模块重点)
5. [记忆管理模块（多智能体协作，重点）](#5-记忆管理模块多智能体协作重点)
6. [心跳技术模块](#6-心跳技术模块)
7. [模块协作关系总结](#7-模块协作关系总结)

---

## 1. Agent-Run-Loop 模块

### 1.1 模块概述

Agent-Run-Loop 是整个 pi-mono 项目的核心执行引擎，负责驱动 Agent 与 LLM 的交互循环。该模块位于 `packages/agent/src/agent-loop.ts`。

### 1.2 核心架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Agent Loop 架构                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │ agentLoop() │───▶│  runLoop()  │───▶│  Events     │      │
│  │ (入口)      │    │ (主循环)    │    │  Stream     │      │
│  └─────────────┘    └─────────────┘    └─────────────┘      │
│         │                  │                   │             │
│         ▼                  ▼                   ▼             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │ Context     │    │ streamAssistant│  │ Lifecycle   │      │
│  │ Init        │    │ Response()    │  │ Events      │      │
│  └─────────────┘    └─────────────┘    └─────────────┘      │
│                            │                                │
│                            ▼                                │
│                    ┌─────────────┐                         │
│                    │ executeTool │                         │
│                    │ Calls()     │                         │
│                    └─────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 关键函数详解

#### `agentLoop()` - 入口函数

```typescript
export function agentLoop(
  prompts: AgentMessage[],
  context: AgentContext,
  config: AgentLoopConfig,
  signal?: AbortSignal,
  streamFn?: StreamFn,
): EventStream<AgentEvent, AgentMessage[]>
```

**职责：**
- 初始化事件流（EventStream）
- 构建初始上下文
- 发射生命周期事件：`agent_start` → `turn_start` → `message_start`
- 调用 `runLoop()` 执行主循环

#### `runLoop()` - 主循环逻辑

**核心流程：**

1. **流式响应处理**：调用 `streamAssistantResponse()` 获取 LLM 响应
2. **工具调用执行**：检测 tool calls 并调用 `executeToolCalls()`
3. **Steering 消息处理**：中断当前流程，插入高优先级消息
4. **Follow-up 消息处理**：在当前轮次结束后追加消息
5. **循环控制**：根据 stop reason 决定是否继续

#### `executeToolCalls()` - 工具执行

```typescript
async function executeToolCalls(
  toolCalls: ToolCall[],
  context: AgentContext,
  config: AgentLoopConfig,
  signal: AbortSignal | undefined,
  stream: EventStream<AgentEvent, AgentMessage[]>,
  streamFn?: StreamFn,
): Promise<ToolResultMessage[]>
```

**特性：**
- 并行执行多个工具调用
- 支持流式部分结果（streaming partial results）
- 完整的错误处理和验证
- 发射 `tool_execution_start` 和 `tool_execution_end` 事件

### 1.4 事件系统

Agent Loop 采用事件驱动架构，定义了完整的生命周期事件：

| 事件类型 | 触发时机 | 携带数据 |
|---------|---------|---------|
| `agent_start` | Agent 开始运行 | - |
| `agent_end` | Agent 结束运行 | 最终消息列表 |
| `turn_start` | 每轮对话开始 | - |
| `turn_end` | 每轮对话结束 | 助手消息 |
| `message_start` | 消息开始处理 | 消息对象 |
| `message_end` | 消息处理完成 | 消息对象 |
| `tool_execution_start` | 工具开始执行 | 工具名、参数 |
| `tool_execution_end` | 工具执行完成 | 结果、错误状态 |

### 1.5 Agent 类

位于 `packages/agent/src/agent.ts`，封装了 Agent 状态管理：

```typescript
export class Agent {
  private _state: AgentState;
  private _steeringQueue: AgentMessage[] = [];
  private _followUpQueue: AgentMessage[] = [];
  
  async prompt(input: string | AgentMessage | AgentMessage[], images?: ImageContent[]);
  async continue();
  abort();
  subscribe(listener: AgentEventListener): () => void;
}
```

**核心特性：**
- **消息队列管理**：steering（中断）和 follow-up（追加）双队列
- **流式状态控制**：防止并发 prompt 调用
- **AbortController**：支持取消操作
- **事件订阅**：允许外部监听 Agent 行为

---

## 2. Tools 模块

### 2.1 模块概述

Tools 模块提供了 Agent 与外部环境交互的能力，包括文件操作、命令执行、搜索等核心工具。位于 `packages/coding-agent/src/core/tools/`。

### 2.2 工具注册机制

#### 工具定义接口

```typescript
export interface AgentTool<TParameters = any> {
  name: string;
  description: string;
  parameters: TSchema;  // TypeBox schema
  execute: (args: ValidateResult<TParameters>, context: ToolContext) => Promise<unknown>;
}
```

#### 工具工厂函数

每个工具都提供默认实例和工厂函数：

```typescript
// 默认实例（使用 process.cwd()）
export const readTool: AgentTool;

// 工厂函数（自定义工作目录）
export function createReadTool(cwd: string, options?: ReadToolOptions): AgentTool;
```

### 2.3 核心工具集

| 工具名 | 文件 | 功能描述 |
|-------|------|---------|
| `read` | `read.ts` | 读取文件内容，支持分页、编码检测 |
| `bash` | `bash.ts` | 执行 shell 命令，支持超时、中断 |
| `edit` | `edit.ts` | 精确字符串替换编辑文件 |
| `write` | `write.ts` | 创建或覆盖写入文件 |
| `grep` | `grep.ts` | 文件内容搜索（ripgrep） |
| `find` | `find.ts` | 文件名搜索（fd） |
| `ls` | `ls.ts` | 目录列表 |

### 2.4 工具组合配置

```typescript
// 完整编码工具集
export const codingTools: Tool[] = [readTool, bashTool, editTool, writeTool];

// 只读探索工具集
export const readOnlyTools: Tool[] = [readTool, grepTool, findTool, lsTool];

// 工厂函数创建自定义工具集
export function createCodingTools(cwd: string, options?: ToolsOptions): Tool[];
export function createReadOnlyTools(cwd: string, options?: ToolsOptions): Tool[];
```

### 2.5 Bash 工具详解

Bash 工具是最复杂的工具，位于 `packages/coding-agent/src/core/tools/bash.ts`：

**特性：**
- 支持交互式命令（通过 PTY）
- 超时控制（默认 120 秒）
- 后台进程管理
- 沙箱执行支持
- 安全命令过滤

```typescript
export interface BashToolOptions {
  timeout?: number;
  requireApproval?: boolean | string[];
  sandbox?: SandboxConfig;
}
```

### 2.6 工具扩展系统

通过 Extension 系统可以注册自定义工具：

```typescript
// 扩展注册工具
const extension: Extension = {
  name: "my-extension",
  setup(api) {
    api.registerTool({
      name: "my_tool",
      description: "Custom tool",
      parameters: Type.Object({ ... }),
      execute: async (args, context) => { ... }
    });
  }
};
```

---

## 3. 技能池/MCP 模块

### 3.1 模块概述

技能池（Skills）模块实现了可复用的 CLI 工具定义系统，遵循 [Agent Skills 标准](https://agentskills.io)。位于 `packages/coding-agent/src/core/skills.ts`。

### 3.2 技能定义结构

每个技能是一个包含 `SKILL.md` 文件的目录：

```
skills/
└── my-skill/
    ├── SKILL.md          # 技能定义文件（必需）
    ├── scripts/          # 辅助脚本
    └── templates/        # 模板文件
```

#### SKILL.md 格式

```markdown
---
name: skill-name
description: Short description of what this skill does
disable-model-invocation: false  # 可选
---

# Skill Name

Usage instructions, examples, etc.
Scripts are in: {baseDir}/
```

### 3.3 技能加载机制

```typescript
export interface Skill {
  name: string;
  description: string;
  filePath: string;      // SKILL.md 的完整路径
  baseDir: string;       // 技能目录路径
  source: string;        // 来源：user/project/channel/path
  disableModelInvocation: boolean;
}

export function loadSkills(options: LoadSkillsOptions): LoadSkillsResult;
export function loadSkillsFromDir(options: LoadSkillsFromDirOptions): LoadSkillsResult;
```

**加载顺序（优先级从低到高）：**
1. 用户全局技能：`~/.pi/agent/skills/`
2. 项目技能：`.pi/skills/`
3. 显式指定路径

### 3.4 技能验证规则

```typescript
// 名称验证
- 必须与父目录名匹配
- 最大长度 64 字符
- 仅允许小写字母、数字、连字符
- 不能以连字符开头或结尾
- 不能包含连续连字符

// 描述验证
- 必需字段
- 最大长度 1024 字符
```

### 3.5 技能注入系统提示

加载的技能会格式化为 XML 并注入到系统提示中：

```typescript
export function formatSkillsForPrompt(skills: Skill[]): string;

// 输出格式：
<available_skills>
  <skill>
    <name>skill-name</name>
    <description>Description text</description>
    <location>/path/to/SKILL.md</location>
  </skill>
</available_skills>
```

### 3.6 MCP 集成

虽然当前代码库未直接实现 MCP（Model Context Protocol），但扩展系统提供了集成点：

```typescript
// 扩展可以注册外部工具提供者
api.registerTool({
  name: "mcp_tool",
  // 通过 MCP 协议与外部服务通信
});
```

---

## 4. 上下文管理模块（重点）

### 4.1 模块概述

上下文管理是 pi-mono 项目最核心的模块之一，负责管理 Agent 与 LLM 交互的完整上下文生命周期。主要组件位于：
- `packages/coding-agent/src/core/session-manager.ts`
- `packages/coding-agent/src/core/agent-session.ts`
- `packages/coding-agent/src/core/compaction/`

### 4.2 SessionManager 核心架构

```
┌─────────────────────────────────────────────────────────────┐
│                  SessionManager 架构                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Session File (JSONL)                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ {"type":"session","id":"...","timestamp":"..."}    │   │
│  │ {"type":"message","id":"abc","parentId":null,...}  │   │
│  │ {"type":"message","id":"def","parentId":"abc",...} │   │
│  │ {"type":"compaction","id":"xyz",...}               │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Tree Structure (byId Map)              │   │
│  │                                                     │   │
│  │    session ──▶ msg1 ──▶ msg2 ──▶ compaction         │   │
│  │                         │                            │   │
│  │                         └──▶ msg3 (branch)          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 会话条目类型

```typescript
export type SessionEntry =
  | SessionMessageEntry       // 普通消息
  | ThinkingLevelChangeEntry  // 思考级别变更
  | ModelChangeEntry          // 模型变更
  | CompactionEntry           // 压缩摘要
  | BranchSummaryEntry        // 分支摘要
  | CustomEntry               // 扩展自定义数据
  | CustomMessageEntry        // 扩展注入消息
  | LabelEntry                // 用户标签
  | SessionInfoEntry;         // 会话元信息
```

### 4.4 树形结构与会话分支

SessionManager 使用**追加式树形结构**：

```typescript
export class SessionManager {
  private fileEntries: FileEntry[] = [];
  private byId: Map<string, SessionEntry> = new Map();
  private leafId: string | null = null;  // 当前叶子节点
  
  // 追加消息（作为当前叶子的子节点）
  appendMessage(message: Message): string;
  
  // 获取从根到叶子的路径
  getBranch(fromId?: string): SessionEntry[];
  
  // 构建发送给 LLM 的上下文
  buildSessionContext(): SessionContext;
}
```

**分支导航机制：**
- `leafId` 指向当前位置
- 通过修改 `leafId` 可以切换到任意分支
- 新消息总是追加到当前叶子下

### 4.5 上下文构建

```typescript
export function buildSessionContext(
  entries: SessionEntry[],
  leafId?: string | null,
  byId?: Map<string, SessionEntry>,
): SessionContext {
  // 1. 从叶子向根遍历，收集路径
  // 2. 处理压缩条目（只保留摘要和后续消息）
  // 3. 提取 thinking level 和 model 信息
  // 4. 返回完整上下文
}
```

### 4.6 自动压缩机制（Auto-Compaction）

#### 触发条件

```typescript
export function shouldCompact(
  contextTokens: number,
  contextWindow: number,
  settings: CompactionSettings
): boolean {
  return contextTokens > contextWindow - settings.reserveTokens;
}

// 默认配置
export const DEFAULT_COMPACTION_SETTINGS = {
  enabled: true,
  reserveTokens: 16384,    // 保留空间
  keepRecentTokens: 20000, // 保留最近消息
};
```

#### 压缩流程

```
┌─────────────────────────────────────────────────────────────┐
│                    压缩流程                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 计算当前上下文 token 数量                                │
│     └─▶ estimateContextTokens()                            │
│                                                             │
│  2. 确定压缩切分点                                          │
│     └─▶ findValidCutPoints()                               │
│     └─▶ 避免在 toolResult 处切分                            │
│                                                             │
│  3. 调用 LLM 生成摘要                                       │
│     └─▶ generateSummary()                                  │
│     └─▶ 包含文件操作追踪                                    │
│                                                             │
│  4. 创建 CompactionEntry                                    │
│     └─▶ 记录 firstKeptEntryId                              │
│     └─▶ 记录 tokensBefore                                  │
│                                                             │
│  5. 后续上下文构建时使用摘要替代旧消息                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 文件操作追踪

压缩过程会追踪文件操作，确保上下文完整性：

```typescript
export interface CompactionDetails {
  readFiles: string[];     // 已读取的文件
  modifiedFiles: string[]; // 已修改的文件
}
```

### 4.7 分支摘要（Branch Summary）

当导航到其他分支时，生成当前分支摘要：

```typescript
export function collectEntriesForBranchSummary(
  session: ReadonlySessionManager,
  oldLeafId: string | null,
  targetId: string,
): CollectEntriesResult;

export function generateBranchSummary(
  preparation: BranchPreparation,
  model: Model<any>,
  apiKey: string,
  signal: AbortSignal,
): Promise<BranchSummaryResult>;
```

### 4.8 AgentSession 集成

`AgentSession` 类整合了所有上下文管理功能：

```typescript
export class AgentSession {
  readonly agent: Agent;
  readonly sessionManager: SessionManager;
  readonly settingsManager: SettingsManager;
  
  // 事件订阅
  subscribe(listener: AgentSessionEventListener): () => void;
  
  // 发送 prompt
  prompt(input: string, options?: PromptOptions): Promise<void>;
  
  // 压缩控制
  compact(options?: CompactOptions): Promise<CompactionResult | undefined>;
  abortCompaction(): void;
}
```

---

## 5. 记忆管理模块（多智能体协作，重点）

### 5.1 模块概述

记忆管理模块实现了跨会话、跨通道的知识持久化机制，支持多智能体协作场景。主要实现在 `packages/mom/src/agent.ts` 和 `packages/mom/src/context.ts`。

### 5.2 记忆存储架构

```
┌─────────────────────────────────────────────────────────────┐
│                    记忆存储层级                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  workspace/                                                 │
│  ├── MEMORY.md           # 全局记忆（所有通道共享）          │
│  ├── skills/             # 全局技能                         │
│  ├── events/             # 事件定义                         │
│  └── CHANNEL_ID/                                           │
│      ├── MEMORY.md       # 通道特定记忆                     │
│      ├── context.jsonl   # LLM 上下文（结构化）              │
│      ├── log.jsonl       # 人类可读历史（无工具结果）         │
│      ├── skills/         # 通道特定技能                     │
│      └── scratch/        # 工作目录                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 双层记忆系统

#### 全局记忆 (MEMORY.md)

```typescript
function getMemory(channelDir: string): string {
  const parts: string[] = [];
  
  // 读取工作区级别记忆（所有通道共享）
  const workspaceMemoryPath = join(channelDir, "..", "MEMORY.md");
  if (existsSync(workspaceMemoryPath)) {
    parts.push(`### Global Workspace Memory\n${content}`);
  }
  
  // 读取通道特定记忆
  const channelMemoryPath = join(channelDir, "MEMORY.md");
  if (existsSync(channelMemoryPath)) {
    parts.push(`### Channel-Specific Memory\n${content}`);
  }
  
  return parts.join("\n\n");
}
```

#### 记忆注入系统提示

```typescript
function buildSystemPrompt(
  workspacePath: string,
  channelId: string,
  memory: string,
  // ...
): string {
  return `
## Memory
Write to MEMORY.md files to persist context across conversations.
- Global (${workspacePath}/MEMORY.md): skills, preferences, project info
- Channel (${channelPath}/MEMORY.md): channel-specific decisions, ongoing work

### Current Memory
${memory}
`;
}
```

### 5.4 上下文同步机制

`packages/mom/src/context.ts` 实现了 `log.jsonl` 与 `context.jsonl` 的同步：

```typescript
export function syncLogToSessionManager(
  sessionManager: SessionManager,
  channelDir: string,
  excludeSlackTs?: string,
): number {
  // 1. 构建已有消息集合
  const existingMessages = new Set<string>();
  for (const entry of sessionManager.getEntries()) {
    // 提取消息文本，规范化格式
  }
  
  // 2. 读取 log.jsonl，找出未同步的用户消息
  const logLines = readFileSync(logFile, "utf-8").trim().split("\n");
  
  // 3. 按时间戳排序并追加到 session
  newMessages.sort((a, b) => a.timestamp - b.timestamp);
  for (const { message } of newMessages) {
    sessionManager.appendMessage(message);
  }
}
```

**设计目的：**
- 确保 Agent 离线期间的消息不丢失
- 支持消息回填（backfill）
- 避免重复消息

### 5.5 多智能体协作支持

#### 通道隔离

每个 Slack 通道有独立的：
- 记忆文件 (MEMORY.md)
- 上下文文件 (context.jsonl)
- 日志文件 (log.jsonl)
- 工作目录 (scratch/)
- 技能目录 (skills/)

#### Runner 缓存机制

```typescript
// 每个 Channel 一个 AgentRunner，跨消息持久化
const channelRunners = new Map<string, AgentRunner>();

export function getOrCreateRunner(
  sandboxConfig: SandboxConfig,
  channelId: string,
  channelDir: string
): AgentRunner {
  const existing = channelRunners.get(channelId);
  if (existing) return existing;
  
  const runner = createRunner(sandboxConfig, channelId, channelDir);
  channelRunners.set(channelId, runner);
  return runner;
}
```

#### 状态共享

```typescript
// 运行时状态（每次运行重置）
const runState = {
  ctx: null as SlackContext | null,
  queue: null as MessageQueue | null,
  pendingTools: new Map<string, ToolExecution>(),
  totalUsage: { input: 0, output: 0, ... },
  stopReason: "stop",
  errorMessage: undefined,
};
```

### 5.6 消息类型扩展

`packages/coding-agent/src/core/messages.ts` 定义了扩展消息类型：

```typescript
// Bash 执行消息
export interface BashExecutionMessage {
  role: "bashExecution";
  command: string;
  output: string;
  exitCode: number | undefined;
  cancelled: boolean;
  truncated: boolean;
}

// 自定义消息（扩展注入）
export interface CustomMessage<T = unknown> {
  role: "custom";
  customType: string;
  content: string | (TextContent | ImageContent)[];
  display: boolean;
  details?: T;
}

// 分支摘要消息
export interface BranchSummaryMessage {
  role: "branchSummary";
  summary: string;
  fromId: string;
}

// 压缩摘要消息
export interface CompactionSummaryMessage {
  role: "compactionSummary";
  summary: string;
  tokensBefore: number;
}
```

### 5.7 消息转换

```typescript
export function convertToLlm(messages: AgentMessage[]): Message[] {
  return messages.map(m => {
    switch (m.role) {
      case "bashExecution":
        return { role: "user", content: bashExecutionToText(m) };
      case "custom":
        return { role: "user", content: m.content };
      case "branchSummary":
        return { role: "user", content: BRANCH_SUMMARY_PREFIX + m.summary + BRANCH_SUMMARY_SUFFIX };
      case "compactionSummary":
        return { role: "user", content: COMPACTION_SUMMARY_PREFIX + m.summary + COMPACTION_SUMMARY_SUFFIX };
      default:
        return m;
    }
  });
}
```

---

## 6. 心跳技术模块

### 6.1 模块概述

心跳技术模块实现了定时任务和主动触发机制，允许 Agent 在特定时间或外部事件发生时被唤醒。位于 `packages/mom/src/events.ts`。

### 6.2 事件类型定义

```typescript
// 立即事件 - 外部触发
export interface ImmediateEvent {
  type: "immediate";
  channelId: string;
  text: string;
}

// 单次事件 - 定时触发
export interface OneShotEvent {
  type: "one-shot";
  channelId: string;
  text: string;
  at: string;  // ISO 8601 with timezone offset
}

// 周期事件 - Cron 调度
export interface PeriodicEvent {
  type: "periodic";
  channelId: string;
  text: string;
  schedule: string;  // cron syntax
  timezone: string;  // IANA timezone
}

export type MomEvent = ImmediateEvent | OneShotEvent | PeriodicEvent;
```

### 6.3 EventsWatcher 架构

```
┌─────────────────────────────────────────────────────────────┐
│                  EventsWatcher 架构                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐                                        │
│  │  Events Dir     │  (JSON files)                          │
│  │  events/*.json  │                                        │
│  └────────┬────────┘                                        │
│           │ fs.watch()                                      │
│           ▼                                                 │
│  ┌─────────────────┐                                        │
│  │ EventsWatcher   │                                        │
│  ├─────────────────┤                                        │
│  │ - timers: Map   │  (one-shot timers)                     │
│  │ - crons: Map    │  (Cron jobs)                           │
│  │ - debounceTimers│  (file change debounce)                │
│  │ - knownFiles    │  (tracked files)                       │
│  └────────┬────────┘                                        │
│           │ execute()                                       │
│           ▼                                                 │
│  ┌─────────────────┐                                        │
│  │ SlackBot        │                                        │
│  │ enqueueEvent()  │  (synthetic SlackEvent)                │
│  └─────────────────┘                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.4 核心实现

```typescript
export class EventsWatcher {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private crons: Map<string, Cron> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private startTime: number;
  private watcher: FSWatcher | null = null;
  private knownFiles: Set<string> = new Set();
  
  start(): void {
    // 1. 扫描现有事件文件
    this.scanExisting();
    
    // 2. 监听文件变化
    this.watcher = watch(this.eventsDir, (_eventType, filename) => {
      this.debounce(filename, () => this.handleFileChange(filename));
    });
  }
  
  stop(): void {
    // 清理所有定时器和监听器
  }
}
```

### 6.5 事件处理流程

#### 立即事件

```typescript
private handleImmediate(filename: string, event: ImmediateEvent): void {
  // 检查是否过期（创建于 harness 启动前）
  if (stat.mtimeMs < this.startTime) {
    this.deleteFile(filename);
    return;
  }
  
  // 立即执行
  this.execute(filename, event);
}
```

#### 单次事件

```typescript
private handleOneShot(filename: string, event: OneShotEvent): void {
  const atTime = new Date(event.at).getTime();
  const delay = atTime - Date.now();
  
  // 设置定时器
  const timer = setTimeout(() => {
    this.execute(filename, event);
  }, delay);
  
  this.timers.set(filename, timer);
}
```

#### 周期事件

```typescript
private handlePeriodic(filename: string, event: PeriodicEvent): void {
  const cron = new Cron(event.schedule, { timezone: event.timezone }, () => {
    this.execute(filename, event, false);  // 不删除
  });
  
  this.crons.set(filename, cron);
}
```

### 6.6 事件执行

```typescript
private execute(filename: string, event: MomEvent, deleteAfter: boolean = true): void {
  // 格式化消息
  const message = `[EVENT:${filename}:${event.type}:${scheduleInfo}] ${event.text}`;
  
  // 创建合成 SlackEvent
  const syntheticEvent: SlackEvent = {
    type: "mention",
    channel: event.channelId,
    user: "EVENT",
    text: message,
    ts: Date.now().toString(),
  };
  
  // 入队处理
  const enqueued = this.slack.enqueueEvent(syntheticEvent);
  
  // 删除已处理的一次性事件
  if (enqueued && deleteAfter) {
    this.deleteFile(filename);
  }
}
```

### 6.7 事件文件格式

```json
// 立即事件
{"type": "immediate", "channelId": "C12345", "text": "New GitHub issue opened"}

// 单次事件
{"type": "one-shot", "channelId": "C12345", "text": "Remind about meeting", "at": "2025-12-15T09:00:00+01:00"}

// 周期事件
{"type": "periodic", "channelId": "C12345", "text": "Check inbox", "schedule": "0 9 * * 1-5", "timezone": "Europe/Berlin"}
```

### 6.8 静默完成机制

Agent 可以响应 `[SILENT]` 来静默完成周期任务：

```typescript
// 在 agent.ts 中
if (finalText.trim() === "[SILENT]" || finalText.trim().startsWith("[SILENT]")) {
  await ctx.deleteMessage();
  log.logInfo("Silent response - deleted message and thread");
}
```

**用途：** 周期检查无新内容时，避免向通道发送垃圾消息。

### 6.9 防抖建议

系统提示中包含防抖指导：

```
When writing programs that create immediate events (email watchers, webhook handlers, etc.),
always debounce. If 50 emails arrive in a minute, don't create 50 immediate events.
Instead collect events over a window and create ONE immediate event summarizing what happened.
```

---

## 7. 模块协作关系总结

### 7.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Pi-Mono 整体架构                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    External Interfaces                           │   │
│  │  Slack API  │  CLI  │  RPC  │  Webhook  │  File Watcher         │   │
│  └──────────────────────────┬──────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    AgentSession                                  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │   Agent     │  │ SessionMgr  │  │ SettingsMgr │              │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │   │
│  └──────────────────────────┬──────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Agent-Run-Loop                                │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │ EventStream │  │ ToolExecutor│  │ MsgQueues   │              │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │   │
│  └──────────────────────────┬──────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Tools & Skills                                │   │
│  │  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────────┐          │   │
│  │  │ read  │ │ bash  │ │ edit  │ │ write │ │  Skills   │          │   │
│  │  └───────┘ └───────┘ └───────┘ └───────┘ └───────────┘          │   │
│  └──────────────────────────┬──────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Context & Memory                              │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │ Compaction  │  │ BranchSum   │  │ MEMORY.md   │              │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │   │
│  └──────────────────────────┬──────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Heartbeat / Events                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │ Immediate   │  │ OneShot     │  │ Periodic    │              │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.2 数据流向

```
用户输入 → AgentSession.prompt()
         → AgentLoop (事件驱动)
         → streamAssistantResponse() → LLM API
         → executeToolCalls() → Tools
         → 消息追加 → SessionManager
         → 上下文检查 → Auto-Compaction (可选)
         → 记忆更新 → MEMORY.md (可选)
         → 响应输出 → 用户
```

### 7.3 关键设计模式

| 模式 | 应用场景 | 实现位置 |
|-----|---------|---------|
| 事件驱动 | Agent 生命周期 | AgentLoop, EventStream |
| 追加式树形结构 | 会话历史 | SessionManager |
| 工厂模式 | 工具创建 | createXxxTool() |
| 观察者模式 | 事件订阅 | Agent.subscribe() |
| 策略模式 | 压缩算法 | Compaction |
| 单例缓存 | Runner 管理 | channelRunners Map |

### 7.4 扩展点

1. **自定义工具**：通过 Extension API 注册
2. **自定义消息类型**：通过 `CustomAgentMessages` 声明合并
3. **自定义压缩钩子**：`beforeCompact` 事件
4. **自定义事件类型**：扩展 EventsWatcher

---

## 附录：文件路径索引

| 模块 | 主要文件 |
|-----|---------|
| Agent-Run-Loop | `packages/agent/src/agent-loop.ts`, `packages/agent/src/agent.ts`, `packages/agent/src/types.ts` |
| Tools | `packages/coding-agent/src/core/tools/index.ts`, `bash.ts`, `read.ts`, `edit.ts`, `write.ts` |
| Skills | `packages/coding-agent/src/core/skills.ts` |
| SessionManager | `packages/coding-agent/src/core/session-manager.ts` |
| AgentSession | `packages/coding-agent/src/core/agent-session.ts` |
| Compaction | `packages/coding-agent/src/core/compaction/compaction.ts`, `branch-summarization.ts` |
| Messages | `packages/coding-agent/src/core/messages.ts` |
| Events | `packages/mom/src/events.ts` |
| Mom Agent | `packages/mom/src/agent.ts`, `packages/mom/src/context.ts` |
| AI Types | `packages/ai/src/types.ts` |

---

*报告生成时间：2025-01*
*项目版本：pi-mono (opensource)*
