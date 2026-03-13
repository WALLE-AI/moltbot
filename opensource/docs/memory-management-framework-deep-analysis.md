# OpenCode 与 OpenClaw 记忆管理框架深度技术分析

> 本报告基于源码级别的深入分析，对比 OpenCode 与 OpenClaw 两个项目的上下文/记忆管理技术框架。

---

## 目录

1. [执行摘要](#执行摘要)
2. [架构设计对比](#架构设计对比)
3. [核心组件深度分析](#核心组件深度分析)
4. [数据流与生命周期](#数据流与生命周期)
5. [压缩策略实现](#压缩策略实现)
6. [持久化与存储](#持久化与存储)
7. [Token 预算与上下文窗口管理](#token-预算与上下文窗口管理)
8. [设计模式与最佳实践](#设计模式与最佳实践)
9. [技术对比总结表](#技术对比总结表)

---

## 执行摘要

### OpenCode 特点

- **单体分层架构**: Session → Message → Part 三层结构，紧密耦合但高效
- **SQLite 原生持久化**: 直接使用 Drizzle ORM 操作数据库，无抽象层
- **内置压缩引擎**: `SessionCompaction` 模块实现多策略压缩（剪枝、摘要、溢出处理）
- **事件驱动通信**: 通过 Bus/BusEvent 实现组件间解耦

### OpenClaw 特点

- **插件化 ContextEngine 接口**: 抽象层设计，支持多种上下文引擎实现
- **Registry 模式**: 运行时发现和加载上下文引擎
- **LegacyContextEngine 适配器**: 封装现有压缩逻辑，保持向后兼容
- **混合语义搜索**: MemoryIndexManager 结合向量嵌入与全文搜索

---

## 架构设计对比

### 2.1 OpenCode 架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Session Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Session     │  │ SessionID   │  │ SessionManager      │  │
│  │ (index.ts)  │  │ (schema.ts) │  │ (session.sql.ts)    │  │
│  └──────┬──────┘  └─────────────┘  └─────────────────────┘  │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Message Layer (MessageV2)                  ││
│  │  ┌──────────┐  ┌──────────┐  ┌───────────────────────┐  ││
│  │  │ User     │  │Assistant │  │ Part (Text/Tool/File) │  ││
│  │  │ Message  │  │ Message  │  │ (message-v2.ts)       │  ││
│  │  └──────────┘  └──────────┘  └───────────────────────┘  ││
│  └─────────────────────────────────────────────────────────┘│
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Compaction Layer                           ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ││
│  │  │ prune()      │  │ process()    │  │ isOverflow() │  ││
│  │  │ (剪枝)       │  │ (摘要压缩)   │  │ (溢出检测)   │  ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘  ││
│  └─────────────────────────────────────────────────────────┘│
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Storage Layer (SQLite)                     ││
│  │  SessionTable │ MessageTable │ PartTable               ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**关键特征**:
- 单向依赖流: Session → Message → Part → Storage
- 压缩层作为独立模块，可被 Session 调用
- 无抽象接口，直接操作数据结构

### 2.2 OpenClaw 架构

```
┌─────────────────────────────────────────────────────────────┐
│                 ContextEngine Interface                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ bootstrap() │ ingest() │ assemble() │ compact()       │  │
│  │ afterTurn() │ prepareSubagentSpawn() │ dispose()      │  │
│  └───────────────────────────────────────────────────────┘  │
│         ▲                                                   │
│         │ implements                                        │
│  ┌──────┴──────────────┬────────────────────────────────┐   │
│  │ LegacyContextEngine │ CustomContextEngine (可扩展)    │   │
│  └─────────────────────┴────────────────────────────────┘   │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              ContextEngineRegistry                      ││
│  │  registerContextEngine() │ resolveContextEngine()      ││
│  └─────────────────────────────────────────────────────────┘│
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              MemoryIndexManager (可选)                  ││
│  │  search() │ sync() │ hybrid semantic + FTS             ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**关键特征**:
- 接口抽象层: ContextEngine 定义统一生命周期方法
- 插件化注册: 通过 Registry 支持运行时发现
- 可扩展性: 新引擎只需实现接口即可接入

---

## 核心组件深度分析

### 3.1 OpenCode Session 管理

**文件**: `opensource/opencode/packages/opencode/src/session/index.ts`

```typescript
// Session 信息结构 (第121-163行)
export const Info = z.object({
  id: SessionID.zod,
  slug: z.string(),
  projectID: ProjectID.zod,
  workspaceID: WorkspaceID.zod.optional(),
  directory: z.string(),
  parentID: SessionID.zod.optional(),
  summary: z.object({
    additions: z.number(),
    deletions: z.number(),
    files: z.number(),
    diffs: Snapshot.FileDiff.array().optional(),
  }).optional(),
  title: z.string(),
  version: z.string(),
  time: z.object({
    created: z.number(),
    updated: z.number(),
    compacting: z.number().optional(),
    archived: z.number().optional(),
  }),
  permission: PermissionNext.Ruleset.optional(),
  revert: z.object({
    messageID: MessageID.zod,
    partID: PartID.zod.optional(),
    snapshot: z.string().optional(),
    diff: z.string().optional(),
  }).optional(),
})
```

**核心方法**:

| 方法 | 功能 | 实现细节 |
|------|------|----------|
| `create()` | 创建新会话 | 生成 SessionID、slug，写入数据库，发布 Created 事件 |
| `fork()` | 分叉会话 | 复制消息和部件，生成新的 ID 映射 |
| `messages()` | 获取消息流 | 使用 `MessageV2.stream()` 迭代器，支持 limit |
| `updateMessage()` | 更新/插入消息 | UPSERT 语义，发布 Updated 事件 |
| `updatePart()` | 更新/插入部件 | UPSERT 语义，发布 PartUpdated 事件 |

**数据流**:
```
用户输入 → Session.create() → MessageV2.User → updateMessage()
         → Part (Text/Tool/File) → updatePart()
         → Bus.publish(Event.Created)
```

### 3.2 OpenCode Message 结构

**文件**: `opensource/opencode/packages/opencode/src/session/message-v2.ts`

**消息类型体系**:

```typescript
// Part 类型联合 (第376-393行)
export const Part = z.discriminatedUnion("type", [
  TextPart,      // type: "text", text: string
  SubtaskPart,   // type: "subtask", prompt, description, agent
  ReasoningPart, // type: "reasoning", text: string
  FilePart,      // type: "file", mime, url, filename
  ToolPart,      // type: "tool", callID, tool, state
  StepStartPart, // type: "step-start", snapshot
  StepFinishPart,// type: "step-finish", reason, cost, tokens
  SnapshotPart,  // type: "snapshot", snapshot: string
  PatchPart,     // type: "patch", hash, files
  AgentPart,     // type: "agent", name: string
  RetryPart,     // type: "retry", attempt, error
  CompactionPart,// type: "compaction", auto, overflow
])
```

**ToolPart 状态机**:

```typescript
// ToolState 状态 (第328-333行)
ToolState = ToolStatePending | ToolStateRunning | ToolStateCompleted | ToolStateError

// 状态转换
pending → running → completed
                  ↘ error
```

**关键方法 `toModelMessages()`** (第496-729行):
- 将内部消息格式转换为 AI SDK 的 `ModelMessage[]`
- 处理媒体文件提取和注入
- 支持不同 Provider 的媒体兼容性处理

### 3.3 OpenClaw ContextEngine 接口

**文件**: `src/context-engine/types.ts`

```typescript
// ContextEngine 接口定义 (第68-177行)
export interface ContextEngine {
  readonly info: ContextEngineInfo;

  // 生命周期方法
  bootstrap?(params: {
    sessionId: string;
    sessionKey?: string;
    sessionFile: string;
  }): Promise<BootstrapResult>;

  ingest(params: {
    sessionId: string;
    sessionKey?: string;
    message: AgentMessage;
    isHeartbeat?: boolean;
  }): Promise<IngestResult>;

  assemble(params: {
    sessionId: string;
    sessionKey?: string;
    messages: AgentMessage[];
    tokenBudget?: number;
  }): Promise<AssembleResult>;

  compact(params: {
    sessionId: string;
    sessionKey?: string;
    sessionFile: string;
    tokenBudget?: number;
    force?: boolean;
    currentTokenCount?: number;
    compactionTarget?: "budget" | "threshold";
    customInstructions?: string;
    runtimeContext?: ContextEngineRuntimeContext;
  }): Promise<CompactResult>;

  // 子代理支持
  prepareSubagentSpawn?(params: {
    parentSessionKey: string;
    childSessionKey: string;
    ttlMs?: number;
  }): Promise<SubagentSpawnPreparation | undefined>;

  onSubagentEnded?(params: {
    childSessionKey: string;
    reason: SubagentEndReason;
  }): Promise<void>;

  dispose?(): Promise<void>;
}
```

**生命周期流程**:

```
┌────────────┐   ┌─────────┐   ┌───────────┐   ┌─────────┐
│ bootstrap  │ → │ ingest  │ → │ assemble  │ → │ compact │
│ (初始化)   │   │ (摄入)  │   │ (组装)    │   │ (压缩)  │
└────────────┘   └─────────┘   └───────────┘   └─────────┘
                       │
                       ▼
               ┌─────────────┐
               │ afterTurn   │
               │ (回合后处理)│
               └─────────────┘
```

### 3.4 OpenClaw LegacyContextEngine 实现

**文件**: `src/context-engine/legacy.ts`

```typescript
export class LegacyContextEngine implements ContextEngine {
  readonly info: ContextEngineInfo = {
    id: "legacy",
    name: "Legacy Context Engine",
    version: "1.0.0",
  };

  async ingest(): Promise<IngestResult> {
    // No-op: SessionManager handles message persistence
    return { ingested: false };
  }

  async assemble(params): Promise<AssembleResult> {
    // Pass-through: existing pipeline handles this
    return { messages: params.messages, estimatedTokens: 0 };
  }

  async compact(params): Promise<CompactResult> {
    // Delegate to compactEmbeddedPiSessionDirect
    const { compactEmbeddedPiSessionDirect } =
      await import("../agents/pi-embedded-runner/compact.runtime.js");
    
    const result = await compactEmbeddedPiSessionDirect({
      ...runtimeContext,
      sessionId: params.sessionId,
      sessionFile: params.sessionFile,
      tokenBudget: params.tokenBudget,
      force: params.force,
    });
    
    return { ok: result.ok, compacted: result.compacted, ... };
  }
}
```

**设计意图**:
- **适配器模式**: 将现有压缩逻辑封装为 ContextEngine
- **向后兼容**: 不改变现有运行时行为
- **渐进迁移**: 允许新引擎逐步替换

### 3.5 OpenClaw ContextEngineRegistry

**文件**: `src/context-engine/registry.ts`

```typescript
// 全局注册表 (使用 Symbol.for 确保跨 chunk 共享)
const CONTEXT_ENGINE_REGISTRY_STATE = Symbol.for("openclaw.contextEngineRegistryState");

function getContextEngineRegistryState(): ContextEngineRegistryState {
  const globalState = globalThis as typeof globalThis & {
    [CONTEXT_ENGINE_REGISTRY_STATE]?: ContextEngineRegistryState;
  };
  if (!globalState[CONTEXT_ENGINE_REGISTRY_STATE]) {
    globalState[CONTEXT_ENGINE_REGISTRY_STATE] = {
      engines: new Map<string, ContextEngineFactory>(),
    };
  }
  return globalState[CONTEXT_ENGINE_REGISTRY_STATE];
}

// 解析引擎 (第69-85行)
export async function resolveContextEngine(config?: OpenClawConfig): Promise<ContextEngine> {
  const slotValue = config?.plugins?.slots?.contextEngine;
  const engineId = typeof slotValue === "string" && slotValue.trim()
    ? slotValue.trim()
    : defaultSlotIdForKey("contextEngine");  // 默认 "legacy"

  const factory = getContextEngineRegistryState().engines.get(engineId);
  if (!factory) {
    throw new Error(`Context engine "${engineId}" is not registered.`);
  }
  return factory();
}
```

**解析优先级**:
1. `config.plugins.slots.contextEngine` (显式配置)
2. `defaultSlotIdForKey("contextEngine")` → "legacy"

---

## 数据流与生命周期

### 4.1 OpenCode 消息流

```
用户输入
    │
    ▼
┌─────────────────┐
│ SessionPrompt   │  解析输入，创建 UserMessage
│ .prompt()       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Session.updateMessage()  │  写入 MessageTable
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Session.updatePart()  │  写入 PartTable
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ SessionProcessor │  处理消息，调用 LLM
│ .process()       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ SessionCompaction.isOverflow()  │  检查是否需要压缩
└────────┬────────┘
         │ overflow=true
         ▼
┌─────────────────┐
│ SessionCompaction.process()  │  执行压缩
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Bus.publish(Event.Compacted)  │  发布压缩事件
└─────────────────┘
```

### 4.2 OpenClaw 上下文引擎生命周期

```
运行开始
    │
    ▼
┌─────────────────────────┐
│ resolveContextEngine()  │  从注册表获取引擎
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ engine.bootstrap()      │  初始化会话状态
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ 消息摄入循环            │
│ engine.ingest(msg)      │  每条消息调用
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ engine.afterTurn()      │  回合后处理
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ engine.assemble()       │  组装上下文
└────────┬────────────────┘
         │ 需要压缩
         ▼
┌─────────────────────────┐
│ engine.compact()        │  执行压缩
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ engine.dispose()        │  清理资源
└─────────────────────────┘
```

### 4.3 子代理上下文共享 (OpenClaw 特有)

```typescript
// 父代理准备子代理上下文
const prep = await engine.prepareSubagentSpawn({
  parentSessionKey: "parent-123",
  childSessionKey: "child-456",
  ttlMs: 60000,
});

// 子代理运行...
// ...

// 子代理结束，通知引擎
await engine.onSubagentEnded({
  childSessionKey: "child-456",
  reason: "completed",  // | "deleted" | "swept" | "released"
});
```

---

## 压缩策略实现

### 5.1 OpenCode 压缩策略

**文件**: `opensource/opencode/packages/opencode/src/session/compaction.ts`

#### 5.1.1 溢出检测 (`isOverflow`)

```typescript
// 第32-48行
export async function isOverflow(input: { tokens: MessageV2.Assistant["tokens"]; model: Provider.Model }) {
  const config = await Config.get()
  if (config.compaction?.auto === false) return false
  const context = input.model.limit.context
  if (context === 0) return false

  const count = input.tokens.total ||
    input.tokens.input + input.tokens.output + input.tokens.cache.read + input.tokens.cache.write

  const reserved = config.compaction?.reserved ?? Math.min(COMPACTION_BUFFER, ProviderTransform.maxOutputTokens(input.model))
  const usable = input.model.limit.input
    ? input.model.limit.input - reserved
    : context - ProviderTransform.maxOutputTokens(input.model)
  return count >= usable
}
```

**计算公式**:
```
usable = model.limit.input - reserved
       或 context - maxOutputTokens
overflow = tokens.total >= usable
```

#### 5.1.2 剪枝策略 (`prune`)

```typescript
// 第58-99行
export async function prune(input: { sessionID: SessionID }) {
  const msgs = await Session.messages({ sessionID: input.sessionID })
  let total = 0
  let pruned = 0
  const toPrune = []
  let turns = 0

  // 从后向前遍历
  loop: for (let msgIndex = msgs.length - 1; msgIndex >= 0; msgIndex--) {
    const msg = msgs[msgIndex]
    if (msg.info.role === "user") turns++
    if (turns < 2) continue  // 保护最近2轮
    if (msg.info.role === "assistant" && msg.info.summary) break loop  // 遇到摘要停止
    
    for (let partIndex = msg.parts.length - 1; partIndex >= 0; partIndex--) {
      const part = msg.parts[partIndex]
      if (part.type === "tool" && part.state.status === "completed") {
        if (PRUNE_PROTECTED_TOOLS.includes(part.tool)) continue  // 保护 skill 工具
        if (part.state.time.compacted) break loop  // 已压缩过
        
        const estimate = Token.estimate(part.state.output)
        total += estimate
        if (total > PRUNE_PROTECT) {  // 超过 40k tokens
          pruned += estimate
          toPrune.push(part)
        }
      }
    }
  }
  
  if (pruned > PRUNE_MINIMUM) {  // 超过 20k tokens 才执行
    for (const part of toPrune) {
      part.state.time.compacted = Date.now()
      await Session.updatePart(part)
    }
  }
}
```

**剪枝规则**:
- **保护最近2轮**: 确保当前对话上下文完整
- **保护 skill 工具**: 这些工具结果可能被后续引用
- **保护带摘要的消息**: 摘要后的消息已被压缩
- **阈值**: 总工具输出 > 40k tokens 时开始剪枝，剪枝量 > 20k tokens 才执行

#### 5.1.3 摘要压缩 (`process`)

```typescript
// 第101-294行
export async function process(input: {
  parentID: MessageID
  messages: MessageV2.WithParts[]
  sessionID: SessionID
  abort: AbortSignal
  auto: boolean
  overflow?: boolean
}) {
  // 1. 创建压缩消息
  const msg = await Session.updateMessage({
    id: MessageID.ascending(),
    role: "assistant",
    mode: "compaction",
    agent: "compaction",
    summary: true,
    ...
  })
  
  // 2. 允许插件注入上下文
  const compacting = await Plugin.trigger("experimental.session.compacting", {
    sessionID: input.sessionID
  }, { context: [], prompt: undefined })
  
  // 3. 构建压缩提示
  const defaultPrompt = `Provide a detailed prompt for continuing our conversation above.
Focus on information that would be helpful for continuing the conversation...
---
## Goal
## Instructions
## Discoveries
## Accomplished
## Relevant files / directories
---`
  
  // 4. 调用 LLM 生成摘要
  const result = await processor.process({
    user: userMessage,
    agent,
    messages: MessageV2.toModelMessages(messages, model, { stripMedia: true }),
    ...
  })
  
  // 5. 处理结果
  if (result === "compact") {
    // 压缩失败，上下文仍然过大
    processor.message.error = new MessageV2.ContextOverflowError(...)
    return "stop"
  }
  
  if (result === "continue" && input.auto) {
    // 创建续接消息
    const continueMsg = await Session.updateMessage({
      role: "user",
      text: "Continue if you have next steps..."
    })
  }
  
  Bus.publish(Event.Compacted, { sessionID: input.sessionID })
  return "continue"
}
```

**摘要模板结构**:
- **Goal**: 用户目标
- **Instructions**: 重要指令
- **Discoveries**: 发现的关键信息
- **Accomplished**: 已完成/进行中/待完成的工作
- **Relevant files**: 相关文件列表

### 5.2 OpenClaw 压缩实现

**文件**: `src/agents/pi-embedded-runner/compact.ts`

#### 5.2.1 压缩入口

```typescript
// 第366-419行
export async function compactEmbeddedPiSessionDirect(
  params: CompactEmbeddedPiSessionParams
): Promise<EmbeddedPiCompactResult> {
  const startedAt = Date.now()
  const diagId = params.diagId?.trim() || createCompactionDiagId()
  const trigger = params.trigger ?? "manual"
  const attempt = params.attempt ?? 1
  
  // 解析压缩模型
  const compactionModelOverride = params.config?.agents?.defaults?.compaction?.model?.trim()
  let provider: string
  let modelId: string
  
  if (compactionModelOverride) {
    // 使用配置的专用压缩模型
    const slashIdx = compactionModelOverride.indexOf("/")
    if (slashIdx > 0) {
      provider = compactionModelOverride.slice(0, slashIdx).trim()
      modelId = compactionModelOverride.slice(slashIdx + 1).trim()
    }
  } else {
    // 使用当前会话模型
    provider = params.provider ?? DEFAULT_PROVIDER
    modelId = params.model ?? DEFAULT_MODEL
  }
  
  const fail = (reason: string): EmbeddedPiCompactResult => {
    log.warn(`[compaction-diag] end ... outcome=failed reason=${classifyCompactionReason(reason)}`)
    return { ok: false, compacted: false, reason }
  }
  
  // ... 后续处理
}
```

#### 5.2.2 压缩指标收集

```typescript
// 第195-226行
function summarizeCompactionMessages(messages: AgentMessage[]): CompactionMessageMetrics {
  let historyTextChars = 0
  let toolResultChars = 0
  const contributors: Array<{ role: string; chars: number; tool?: string }> = []
  let estTokens = 0
  
  for (const msg of messages) {
    const role = typeof msg.role === "string" ? msg.role : "unknown"
    const chars = getMessageTextChars(msg)
    historyTextChars += chars
    if (role === "toolResult") {
      toolResultChars += chars
    }
    contributors.push({ role, chars, tool: resolveMessageToolLabel(msg) })
    
    estTokens += estimateTokens(msg)
  }
  
  return {
    messages: messages.length,
    historyTextChars,
    toolResultChars,
    estTokens,
    contributors: contributors.toSorted((a, b) => b.chars - a.chars).slice(0, 3),
  }
}
```

#### 5.2.3 压缩原因分类

```typescript
// 第228-271行
function classifyCompactionReason(reason?: string): string {
  const text = (reason ?? "").trim().toLowerCase()
  if (text.includes("nothing to compact")) return "no_compactable_entries"
  if (text.includes("below threshold")) return "below_threshold"
  if (text.includes("already compacted")) return "already_compacted_recently"
  if (text.includes("still exceeds target")) return "live_context_still_exceeds_target"
  if (text.includes("guard")) return "guard_blocked"
  if (text.includes("summary")) return "summary_failed"
  if (text.includes("timed out") || text.includes("timeout")) return "timeout"
  if (text.includes("400") || text.includes("401") || text.includes("403") || text.includes("429")) {
    return "provider_error_4xx"
  }
  if (text.includes("500") || text.includes("502") || text.includes("503") || text.includes("504")) {
    return "provider_error_5xx"
  }
  return "unknown"
}
```

#### 5.2.4 压缩后内存同步

```typescript
// 第281-342行
async function runPostCompactionSessionMemorySync(params: {
  config?: OpenClawConfig;
  sessionKey?: string;
  sessionFile: string;
}): Promise<void> {
  const agentId = resolveSessionAgentId({
    sessionKey: params.sessionKey,
    config: params.config,
  })
  const resolvedMemory = resolveMemorySearchConfig(params.config, agentId)
  
  if (!resolvedMemory || !resolvedMemory.sources.includes("sessions")) {
    return
  }
  
  const { manager } = await getMemorySearchManager({ cfg: params.config, agentId })
  if (!manager?.sync) return
  
  await manager.sync({
    reason: "post-compaction",
    sessionFiles: [sessionFile],
  })
}
```

---

## 持久化与存储

### 6.1 OpenCode SQLite Schema

**文件**: `opensource/opencode/packages/opencode/src/session/session.sql.ts`

```typescript
// Session 表
export const SessionTable = sqliteTable("session", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  project_id: text("project_id").notNull(),
  workspace_id: text("workspace_id"),
  parent_id: text("parent_id"),
  directory: text("directory").notNull(),
  title: text("title").notNull(),
  version: text("version").notNull(),
  share_url: text("share_url"),
  summary_additions: integer("summary_additions"),
  summary_deletions: integer("summary_deletions"),
  summary_files: integer("summary_files"),
  summary_diffs: text("summary_diffs"),
  revert: text("revert", { mode: "json" }),
  permission: text("permission", { mode: "json" }),
  time_created: integer("time_created").notNull(),
  time_updated: integer("time_updated").notNull(),
  time_compacting: integer("time_compacting"),
  time_archived: integer("time_archived"),
})

// Message 表
export const MessageTable = sqliteTable("message", {
  id: text("id").primaryKey(),
  session_id: text("session_id").notNull().references(() => SessionTable.id, { onDelete: "cascade" }),
  time_created: integer("time_created").notNull(),
  data: text("data", { mode: "json" }).notNull(),  // 消息元数据
})

// Part 表
export const PartTable = sqliteTable("part", {
  id: text("id").primaryKey(),
  message_id: text("message_id").notNull().references(() => MessageTable.id, { onDelete: "cascade" }),
  session_id: text("session_id").notNull().references(() => SessionTable.id, { onDelete: "cascade" }),
  time_created: integer("time_created").notNull(),
  data: text("data", { mode: "json" }).notNull(),  // 部件数据
})
```

**外键级联**:
- `MessageTable.session_id` → `SessionTable.id` (CASCADE DELETE)
- `PartTable.message_id` → `MessageTable.id` (CASCADE DELETE)
- `PartTable.session_id` → `SessionTable.id` (CASCADE DELETE)

### 6.2 OpenClaw 会话文件格式

OpenClaw 使用 JSON 格式的会话文件，由 `@mariozechner/pi-coding-agent` 的 `SessionManager` 管理：

```typescript
// SessionManager.open() 打开会话文件
const sessionManager = SessionManager.open(params.sessionFile)

// 会话文件结构 (简化)
{
  "id": "session-123",
  "messages": [
    {
      "role": "user",
      "content": [...]
    },
    {
      "role": "assistant",
      "content": [...],
      "toolCalls": [...]
    }
  ],
  "metadata": {
    "created": 1234567890,
    "updated": 1234567890
  }
}
```

### 6.3 OpenClaw MemoryIndexManager 持久化

**文件**: `src/memory/manager.ts`

```typescript
// 混合语义搜索 (第1-841行)
export class MemoryIndexManager {
  private db: Database;
  private embeddingProvider: EmbeddingProvider;
  
  async search(query: string, opts?: {
    maxResults?: number;
    minScore?: number;
    sessionKey?: string;
  }): Promise<MemorySearchResult[]> {
    // 1. 向量搜索
    const vectorResults = await this.vectorSearch(query, opts)
    
    // 2. 全文搜索 (FTS)
    const ftsResults = await this.ftsSearch(query, opts)
    
    // 3. 合并结果
    return this.mergeResults(vectorResults, ftsResults)
  }
  
  async sync(params: {
    reason: string;
    sessionFiles?: string[];
  }): Promise<void> {
    // 同步会话文件到索引
    for (const file of params.sessionFiles ?? []) {
      await this.indexSessionFile(file)
    }
  }
}
```

---

## Token 预算与上下文窗口管理

### 7.1 OpenCode Token 计算

**文件**: `opensource/opencode/packages/opencode/src/session/index.ts`

```typescript
// 第790-867行
export const getUsage = fn(
  z.object({
    model: z.custom<Provider.Model>(),
    usage: z.custom<LanguageModelV2Usage>(),
    metadata: z.custom<ProviderMetadata>().optional(),
  }),
  (input) => {
    const inputTokens = safe(input.usage.inputTokens ?? 0)
    const outputTokens = safe(input.usage.outputTokens ?? 0)
    const reasoningTokens = safe(input.usage.reasoningTokens ?? 0)
    const cacheReadInputTokens = safe(input.usage.cachedInputTokens ?? 0)
    const cacheWriteInputTokens = safe(
      input.metadata?.["anthropic"]?.["cacheCreationInputTokens"] ?? 0
    )
    
    // 处理不同 Provider 的 token 计数差异
    const excludesCachedTokens = !!(input.metadata?.["anthropic"] || input.metadata?.["bedrock"])
    const adjustedInputTokens = excludesCachedTokens
      ? inputTokens
      : inputTokens - cacheReadInputTokens - cacheWriteInputTokens
    
    // 计算总 token
    const total = (model.api.npm === "@ai-sdk/anthropic" || ...)
      ? adjustedInputTokens + outputTokens + cacheReadInputTokens + cacheWriteInputTokens
      : input.usage.totalTokens
    
    // 计算成本
    const cost = new Decimal(0)
      .add(new Decimal(tokens.input).mul(costInfo?.input ?? 0).div(1_000_000))
      .add(new Decimal(tokens.output).mul(costInfo?.output ?? 0).div(1_000_000))
      .add(new Decimal(tokens.cache.read).mul(costInfo?.cache?.read ?? 0).div(1_000_000))
      .add(new Decimal(tokens.cache.write).mul(costInfo?.cache?.write ?? 0).div(1_000_000))
      .add(new Decimal(tokens.reasoning).mul(costInfo?.output ?? 0).div(1_000_000))
      .toNumber()
    
    return { cost, tokens }
  }
)
```

### 7.2 OpenClaw 上下文窗口解析

**文件**: `src/agents/context.ts`

```typescript
// 第309-389行
export function resolveContextTokensForModel(params: {
  cfg?: OpenClawConfig;
  provider?: string;
  model?: string;
  contextTokensOverride?: number;
  fallbackContextTokens?: number;
}): number | undefined {
  // 1. 显式覆盖优先
  if (typeof params.contextTokensOverride === "number" && params.contextTokensOverride > 0) {
    return params.contextTokensOverride
  }
  
  // 2. 检查 Anthropic 1M 上下文标记
  const ref = resolveProviderModelRef({ provider: params.provider, model: params.model })
  if (ref) {
    const modelParams = resolveConfiguredModelParams(params.cfg, ref.provider, ref.model)
    if (modelParams?.context1m === true && isAnthropic1MModel(ref.provider, ref.model)) {
      return ANTHROPIC_CONTEXT_1M_TOKENS  // 1_048_576
    }
  }
  
  // 3. 配置文件中的 contextWindow
  const configuredWindow = resolveConfiguredProviderContextWindow(
    params.cfg, ref.provider, ref.model
  )
  if (configuredWindow !== undefined) {
    return configuredWindow
  }
  
  // 4. 发现缓存查询
  const qualifiedResult = lookupContextTokens(`${provider}/${model}`)
  if (qualifiedResult !== undefined) return qualifiedResult
  
  // 5. 裸模型 ID 查询
  const bareResult = lookupContextTokens(params.model)
  if (bareResult !== undefined) return bareResult
  
  return params.fallbackContextTokens
}
```

**解析优先级**:
1. `contextTokensOverride` (显式覆盖)
2. `context1m: true` 配置标记
3. `models.providers[].models[].contextWindow`
4. 发现缓存 (qualified key: `provider/model`)
5. 发现缓存 (bare key: `model`)
6. `fallbackContextTokens`

---

## 设计模式与最佳实践

### 8.1 设计模式对比

| 模式 | OpenCode | OpenClaw |
|------|----------|----------|
| **架构模式** | 单体分层 | 插件化接口 |
| **数据访问** | Active Record (Drizzle ORM) | Repository (SessionManager) |
| **事件通信** | Bus/BusEvent (发布-订阅) | Internal Hooks + Plugin Hooks |
| **工厂模式** | `fn()` 包装器 | `ContextEngineFactory` |
| **适配器模式** | - | `LegacyContextEngine` |
| **注册表模式** | - | `ContextEngineRegistry` |
| **策略模式** | 压缩策略 (prune/process) | 可插拔 ContextEngine |

### 8.2 可复用的设计模式

#### 8.2.1 插件化引擎注册表

```typescript
// OpenClaw 的 Registry 模式
// 优点: 支持运行时发现、配置驱动、热插拔

// 注册
registerContextEngine("custom", () => new CustomContextEngine())

// 解析
const engine = await resolveContextEngine(config)

// 最佳实践:
// 1. 使用 Symbol.for 确保跨 chunk 共享
// 2. 支持异步工厂函数
// 3. 提供清晰的错误信息
```

#### 8.2.2 适配器封装

```typescript
// OpenClaw 的 LegacyContextEngine
// 优点: 渐进迁移、向后兼容、测试隔离

class LegacyContextEngine implements ContextEngine {
  async compact(params) {
    // 委托给现有实现
    const result = await compactEmbeddedPiSessionDirect({ ... })
    // 转换结果格式
    return { ok: result.ok, compacted: result.compacted, ... }
  }
}

// 最佳实践:
// 1. 接口方法保持简单
// 2. 复杂逻辑委托给专用模块
// 3. 结果格式标准化
```

#### 8.2.3 多策略压缩

```typescript
// OpenCode 的压缩策略链
// 优点: 分层处理、渐进式压缩、保护关键内容

async function runCompaction(sessionId) {
  // 1. 检测溢出
  if (!isOverflow(tokens, model)) return
  
  // 2. 剪枝 (低成本)
  await prune({ sessionID: sessionId })
  
  // 3. 摘要 (高成本)
  if (stillOverflow) {
    await process({ sessionID: sessionId, messages, auto: true })
  }
}

// 最佳实践:
// 1. 先尝试低成本策略
// 2. 保护最近对话上下文
// 3. 允许插件干预
```

#### 8.2.4 Token 预算安全边际

```typescript
// OpenCode 的安全边际计算
const COMPACTION_BUFFER = 20_000  // 预留空间
const reserved = config.compaction?.reserved ?? 
  Math.min(COMPACTION_BUFFER, maxOutputTokens(model))
const usable = context - reserved

// OpenClaw 的上下文窗口覆盖
const effectiveModel = ctxInfo.tokens < model.contextWindow
  ? { ...model, contextWindow: ctxInfo.tokens }
  : model

// 最佳实践:
// 1. 预留输出 token 空间
// 2. 支持配置覆盖
// 3. 应用最小值约束
```

### 8.3 架构最佳实践

#### 8.3.1 分离关注点

```
OpenCode: Session (业务) → Message (数据) → Compaction (策略)
OpenClaw: ContextEngine (接口) → LegacyContextEngine (实现) → compact.ts (逻辑)
```

**建议**: 保持策略逻辑独立于数据模型

#### 8.3.2 事件驱动解耦

```typescript
// OpenCode Bus 模式
Bus.publish(Event.Compacted, { sessionID })

// 订阅者可以独立响应
Bus.subscribe(Event.Compacted, async (event) => {
  await updateUI(event.sessionID)
  await logMetrics(event.sessionID)
})
```

**建议**: 使用事件通知状态变更，避免直接依赖

#### 8.3.3 配置驱动行为

```typescript
// OpenCode
config.compaction?.auto === false  // 禁用自动压缩
config.compaction?.prune === false // 禁用剪枝
config.compaction?.reserved        // 自定义预留

// OpenClaw
config.plugins.slots.contextEngine = "custom"  // 选择引擎
config.agents.defaults.compaction.model        // 压缩模型
```

**建议**: 所有关键行为可通过配置覆盖

---

## 技术对比总结表

### 9.1 架构对比

| 维度 | OpenCode | OpenClaw |
|------|----------|----------|
| **整体架构** | 单体分层 | 插件化接口 |
| **扩展性** | 需修改核心代码 | 实现 ContextEngine 接口 |
| **测试隔离** | 紧耦合，较难 | 接口抽象，易于 Mock |
| **运行时开销** | 低 (直接调用) | 略高 (接口间接层) |

### 9.2 数据管理对比

| 维度 | OpenCode | OpenClaw |
|------|----------|----------|
| **存储格式** | SQLite (Drizzle ORM) | JSON 文件 (SessionManager) |
| **消息结构** | Message + Part (细粒度) | AgentMessage (统一) |
| **查询能力** | SQL 全功能 | 文件流式读取 |
| **并发安全** | SQLite 事务 | 文件锁 |

### 9.3 压缩策略对比

| 维度 | OpenCode | OpenClaw |
|------|----------|----------|
| **触发方式** | 自动检测 + 手动 | 配置驱动 + 手动 |
| **剪枝策略** | 工具输出截断 | 依赖 pi-coding-agent |
| **摘要策略** | LLM 生成结构化摘要 | LLM 生成摘要 |
| **保护机制** | 最近2轮 + skill 工具 | 配置化保护 |
| **溢出处理** | 重放消息 + 续接 | 错误返回 + 重试 |

### 9.4 Token 管理对比

| 维度 | OpenCode | OpenClaw |
|------|----------|----------|
| **计数方式** | Provider 差异化处理 | estimateTokens() 估算 |
| **上下文窗口** | model.limit.context | 配置 + 发现缓存 |
| **预算计算** | context - reserved | tokenBudget 参数 |
| **成本追踪** | 详细成本计算 | 嵌入式追踪 |

### 9.5 扩展能力对比

| 维度 | OpenCode | OpenClaw |
|------|----------|----------|
| **子代理支持** | SubtaskPart | prepareSubagentSpawn() |
| **插件扩展** | Plugin.trigger() | ContextEngine 插件槽 |
| **内存索引** | 无 | MemoryIndexManager |
| **语义搜索** | 无 | 向量 + FTS 混合 |

---

## 附录

### A. 关键文件索引

**OpenCode**:
- `opensource/opencode/packages/opencode/src/session/index.ts` - Session 管理
- `opensource/opencode/packages/opencode/src/session/message-v2.ts` - 消息结构
- `opensource/opencode/packages/opencode/src/session/compaction.ts` - 压缩策略
- `opensource/opencode/packages/opencode/src/session/prompt.ts` - 提示处理
- `opensource/opencode/packages/opencode/src/session/session.sql.ts` - 数据库 Schema

**OpenClaw**:
- `src/context-engine/types.ts` - ContextEngine 接口定义
- `src/context-engine/legacy.ts` - LegacyContextEngine 实现
- `src/context-engine/registry.ts` - 引擎注册表
- `src/agents/pi-embedded-runner/compact.ts` - 压缩实现
- `src/agents/context.ts` - 上下文窗口管理
- `src/memory/manager.ts` - 内存索引管理

### B. 常量参考

```typescript
// OpenCode 压缩常量
COMPACTION_BUFFER = 20_000   // 压缩缓冲区
PRUNE_MINIMUM = 20_000       // 剪枝最小阈值
PRUNE_PROTECT = 40_000       // 剪枝保护阈值

// OpenClaw 上下文常量
ANTHROPIC_CONTEXT_1M_TOKENS = 1_048_576
DEFAULT_CONTEXT_TOKENS = 128_000
```

---

*报告生成时间: 2025-01*
*基于源码版本: OpenCode (当前), OpenClaw (当前 main 分支)*
