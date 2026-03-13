# 上下文管理框架分析

## OpenCode 与 OpenClaw 技术对比

**分析日期**: 2025-01-18  
**范围**: 基于源码模块的上下文管理架构深度分析

---

## 摘要

本报告对两个 AI Agent 系统的上下文管理框架进行了全面的技术分析：

1. **OpenCode** (`opensource/opencode`): 基于 TypeScript 的 AI 编程助手，采用数据库支持的会话管理
2. **OpenClaw** (`src/`): 基于 `pi-coding-agent` 构建的多通道 AI 助手，采用可插拔的上下文引擎

分析揭示了两种根本不同的架构方法：
- **OpenCode** 采用单体、数据库中心的模型，会话、消息和压缩逻辑紧密耦合
- **OpenClaw** 采用模块化、插件式的 `ContextEngine` 抽象，将上下文生命周期管理与 Agent 运行时解耦

---

## 目录

1. [架构概览](#架构概览)
2. [OpenCode 上下文管理](#opencode-上下文管理)
3. [OpenClaw 上下文管理](#openclaw-上下文管理)
4. [对比分析](#对比分析)
5. [数据流图](#数据流图)
6. [关键接口与类型](#关键接口与类型)
7. [压缩策略](#压缩策略)
8. [内存与持久化](#内存与持久化)
9. [Agent 集成](#agent-集成)
10. [建议与洞察](#建议与洞察)

---

## 架构概览

### OpenCode 架构

OpenCode 采用**分层单体架构**：

```
┌─────────────────────────────────────────────────────┐
│                    会话层                            │
│  (session/index.ts - CRUD, 生命周期, 事件)          │
├─────────────────────────────────────────────────────┤
│                  消息层                              │
│  (message-v2.ts - MessageV2, Parts, 流式处理)       │
├─────────────────────────────────────────────────────┤
│                 压缩层                               │
│  (compaction.ts - 剪枝, 处理, 溢出)                  │
├─────────────────────────────────────────────────────┤
│                  存储层                              │
│  (session.sql.ts - SQLite 表, 查询)                 │
└─────────────────────────────────────────────────────┘
```

**关键特性**：
- 单一数据库（SQLite）用于所有会话/消息持久化
- 使用 `Database.use()` 包装器的同步风格 API
- 基于命名空间的模块组织（`Session`、`MessageV2`、`SessionCompaction`）
- 事件总线用于实时更新（`Bus.publish`、`BusEvent.define`）

### OpenClaw 架构

OpenClaw 采用**模块化插件架构**：

```
┌──────────────────────────────────────────────────────────────┐
│                    上下文引擎注册表                           │
│         (context-engine/registry.ts - 注册)                  │
├──────────────────────────────────────────────────────────────┤
│                     ContextEngine 接口                       │
│   (context-engine/types.ts - bootstrap, ingest, assemble,   │
│                              compact, subagent 生命周期)     │
├──────────────────────┬───────────────────────────────────────┤
│  LegacyContextEngine │    未来引擎实现                        │
│  (legacy.ts)         │    (通过 ContextEngineInfo 可插拔)    │
├──────────────────────┴───────────────────────────────────────┤
│                    Agent 运行时层                            │
│  (pi-embedded-runner/run.ts, attempt.ts - 执行循环)         │
├──────────────────────────────────────────────────────────────┤
│                  内存索引管理器                              │
│  (memory/manager.ts - 向量搜索, FTS, 嵌入)                  │
└──────────────────────────────────────────────────────────────┘
```

**关键特性**：
- 可插拔的 `ContextEngine` 接口，包含生命周期方法
- 引擎发现和解析的注册表模式
- 基于 `@mariozechner/pi-coding-agent` 框架构建
- 独立的内存管理，支持混合搜索（向量 + FTS）
- 通过 `prepareSubagentSpawn`/`onSubagentEnded` 实现子 Agent 上下文共享

---

## OpenCode 上下文管理

### 核心组件

#### 1. 会话模块 (`session/index.ts`)

`Session` 命名空间提供主要的会话生命周期管理：

```typescript
// 会话创建与持久化
export const create = fn(z.object({...}), async (input) => {
  return createNext({
    parentID: input?.parentID,
    directory: Instance.directory,
    title: input?.title,
    permission: input?.permission,
    workspaceID: input?.workspaceID,
  })
})

// 数据库支持的会话信息
export function fromRow(row: SessionRow): Info {
  return {
    id: row.id,
    slug: row.slug,
    projectID: row.project_id,
    workspaceID: row.workspace_id ?? undefined,
    directory: row.directory,
    parentID: row.parent_id ?? undefined,
    title: row.title,
    version: row.version,
    summary: row.summary_additions !== null ? {...} : undefined,
    time: {
      created: row.time_created,
      updated: row.time_updated,
      compacting: row.time_compacting ?? undefined,
      archived: row.time_archived ?? undefined,
    },
  }
}
```

**关键功能**：
- 会话分叉与消息克隆（`fork()`）
- 通过 `parentID` 实现层级会话（父子关系）
- 会话归档和软删除
- 附加到会话的权限规则集
- 带快照跟踪的回滚能力

#### 2. 消息模块 (`session/message-v2.ts`)

消息结构为 `Info` + `Part[]`：

```typescript
export const User = Base.extend({
  role: z.literal("user"),
  time: z.object({ created: z.number() }),
  format: Format.optional(),
  summary: z.object({
    title: z.string().optional(),
    body: z.string().optional(),
    diffs: Snapshot.FileDiff.array(),
  }).optional(),
  agent: z.string(),
  model: z.object({
    providerID: z.string(),
    modelID: z.string(),
  }),
  system: z.string().optional(),
  tools: z.record(z.string(), z.boolean()).optional(),
  variant: z.string().optional(),
})

export const Part = z.discriminatedUnion("type", [
  TextPart, SubtaskPart, ReasoningPart, FilePart,
  ToolPart, StepStartPart, StepFinishPart, SnapshotPart,
  PatchPart, AgentPart, RetryPart, CompactionPart,
])
```

**消息流式处理**：
```typescript
export const stream = fn(SessionID.zod, async function* (sessionID) {
  const size = 50
  let offset = 0
  while (true) {
    const rows = Database.use((db) =>
      db.select().from(MessageTable)
        .where(eq(MessageTable.session_id, sessionID))
        .orderBy(desc(MessageTable.time_created))
        .limit(size)
        .offset(offset)
        .all(),
    )
    // 带部分的 yield 消息...
  }
})
```

**模型消息转换**：
```typescript
export function toModelMessages(
  input: WithParts[],
  model: Provider.Model,
  options?: { stripMedia?: boolean },
): ModelMessage[] {
  // 将内部消息格式转换为 AI SDK ModelMessage[]
  // 处理工具结果、推理、媒体、压缩部分
}
```

#### 3. 压缩模块 (`session/compaction.ts`)

OpenCode 实现了**多策略压缩**：

**策略 1：剪枝**（移除旧工具输出）
```typescript
export async function prune(input: { sessionID: SessionID }) {
  const msgs = await Session.messages({ sessionID: input.sessionID })
  let total = 0
  let pruned = 0
  const toPrune = []
  
  // 向后遍历部分，直到 40k token 的工具调用
  // 然后清除之前工具调用的输出
  for (let msgIndex = msgs.length - 1; msgIndex >= 0; msgIndex--) {
    const msg = msgs[msgIndex]
    if (turns < 2) continue
    if (msg.info.role === "assistant" && msg.info.summary) break
    
    for (let partIndex = msg.parts.length - 1; partIndex >= 0; partIndex--) {
      const part = msg.parts[partIndex]
      if (part.type === "tool" && part.state.status === "completed") {
        if (PRUNE_PROTECTED_TOOLS.includes(part.tool)) continue
        if (part.state.time.compacted) break
        
        const estimate = Token.estimate(part.state.output)
        total += estimate
        if (total > PRUNE_PROTECT) {
          pruned += estimate
          toPrune.push(part)
        }
      }
    }
  }
  
  // 标记为已压缩
  for (const part of toPrune) {
    part.state.time.compacted = Date.now()
    await Session.updatePart(part)
  }
}
```

**策略 2：摘要**（LLM 生成的摘要）
```typescript
export async function process(input: {
  parentID: MessageID
  messages: MessageV2.WithParts[]
  sessionID: SessionID
  abort: AbortSignal
  auto: boolean
  overflow?: boolean
}) {
  // 创建压缩 agent 消息
  const agent = await Agent.get("compaction")
  const model = agent.model 
    ? await Provider.getModel(agent.model.providerID, agent.model.modelID)
    : await Provider.getModel(userMessage.model.providerID, userMessage.model.modelID)
  
  // 使用对话历史构建提示
  const defaultPrompt = `Provide a detailed prompt for continuing our conversation above.
Focus on information that would be helpful for continuing the conversation...
---
## Goal
## Instructions
## Discoveries
## Accomplished
## Relevant files / directories
---`
  
  // 使用压缩 agent 处理
  const result = await processor.process({
    user: userMessage,
    agent,
    messages: [
      ...MessageV2.toModelMessages(messages, model, { stripMedia: true }),
      { role: "user", content: [{ type: "text", text: promptText }] },
    ],
    model,
  })
}
```

**溢出检测**：
```typescript
export async function isOverflow(input: { 
  tokens: MessageV2.Assistant["tokens"]
  model: Provider.Model 
}) {
  const config = await Config.get()
  if (config.compaction?.auto === false) return false
  const context = input.model.limit.context
  if (context === 0) return false
  
  const count = input.tokens.total || 
    input.tokens.input + input.tokens.output + 
    input.tokens.cache.read + input.tokens.cache.write
  
  const reserved = config.compaction?.reserved ?? 
    Math.min(COMPACTION_BUFFER, ProviderTransform.maxOutputTokens(input.model))
  const usable = input.model.limit.input
    ? input.model.limit.input - reserved
    : context - ProviderTransform.maxOutputTokens(input.model)
  
  return count >= usable
}
```

### 数据持久化

OpenCode 使用**带类型表的 SQLite**：

```typescript
// session.sql.ts
export const SessionTable = Database.table("session", {
  id: { type: "text", primary: true },
  slug: { type: "text" },
  project_id: { type: "text" },
  workspace_id: { type: "text", nullable: true },
  parent_id: { type: "text", nullable: true },
  title: { type: "text" },
  version: { type: "text" },
  share_url: { type: "text", nullable: true },
  summary_additions: { type: "integer", nullable: true },
  summary_deletions: { type: "integer", nullable: true },
  summary_files: { type: "integer", nullable: true },
  time_created: { type: "integer" },
  time_updated: { type: "integer" },
  time_compacting: { type: "integer", nullable: true },
  time_archived: { type: "integer", nullable: true },
  permission: { type: "text", nullable: true },
  revert: { type: "text", nullable: true },
})

export const MessageTable = Database.table("message", {
  id: { type: "text", primary: true },
  session_id: { type: "text", references: "session.id" },
  time_created: { type: "integer" },
  data: { type: "text" }, // JSON 序列化的消息数据
})

export const PartTable = Database.table("part", {
  id: { type: "text", primary: true },
  message_id: { type: "text", references: "message.id" },
  session_id: { type: "text", references: "session.id" },
  time_created: { type: "integer" },
  data: { type: "text" }, // JSON 序列化的部分数据
})
```

---

## OpenClaw 上下文管理

### 核心组件

#### 1. ContextEngine 接口 (`context-engine/types.ts`)

`ContextEngine` 接口定义了**生命周期契约**：

```typescript
export interface ContextEngine {
  readonly info: ContextEngineInfo;
  
  // 会话初始化
  bootstrap?(params: { 
    sessionId: string
    sessionKey?: string
    sessionFile: string 
  }): Promise<BootstrapResult>;
  
  // 消息摄入（实时上下文更新）
  ingest(params: { 
    sessionId: string
    sessionKey?: string
    message: AgentMessage
    isHeartbeat?: boolean 
  }): Promise<IngestResult>;
  
  // LLM 调用的上下文组装
  assemble(params: { 
    sessionId: string
    sessionKey?: string
    messages: AgentMessage[]
    tokenBudget?: number 
  }): Promise<AssembleResult>;
  
  // 上下文压缩
  compact(params: { 
    sessionId: string
    sessionKey?: string
    sessionFile: string
    tokenBudget?: number
    force?: boolean
    currentTokenCount?: number
    compactionTarget?: "budget" | "threshold"
    customInstructions?: string
    runtimeContext?: ContextEngineRuntimeContext 
  }): Promise<CompactResult>;
  
  // 子 Agent 上下文共享
  prepareSubagentSpawn?(params: { 
    parentSessionKey: string
    childSessionKey: string
    ttlMs?: number 
  }): Promise<SubagentSpawnPreparation | undefined>;
  
  onSubagentEnded?(params: { 
    childSessionKey: string
    reason: SubagentEndReason 
  }): Promise<void>;
  
  // 清理
  dispose?(): Promise<void>;
}
```

**关键设计原则**：
1. **生命周期感知**：方法映射到会话生命周期阶段
2. **预算感知**：显式传递 token 预算用于上下文窗口管理
3. **子 Agent 支持**：内置父子 Agent 间上下文共享
4. **可插拔**：不同引擎可实现不同策略

#### 2. 上下文引擎注册表 (`context-engine/registry.ts`)

```typescript
const ENGINES = new Map<string, ContextEngineFactory>()
const ENGINE_CACHE = new Map<string, Promise<ContextEngine>>()

export function registerContextEngine(
  id: string, 
  factory: ContextEngineFactory
): void {
  if (ENGINES.has(id)) {
    throw new Error(`Context engine already registered: ${id}`)
  }
  ENGINES.set(id, factory)
}

export async function resolveContextEngine(
  config?: OpenClawConfig
): Promise<ContextEngine> {
  const engineId = config?.contextEngine?.engine ?? "legacy"
  const cached = ENGINE_CACHE.get(engineId)
  if (cached) return cached
  
  const factory = ENGINES.get(engineId)
  if (!factory) {
    throw new Error(`Context engine not found: ${engineId}`)
  }
  
  const promise = factory({ config })
  ENGINE_CACHE.set(engineId, promise)
  return promise
}
```

#### 3. LegacyContextEngine (`context-engine/legacy.ts`)

默认实现包装现有压缩逻辑：

```typescript
export class LegacyContextEngine implements ContextEngine {
  readonly info: ContextEngineInfo = {
    id: "legacy",
    displayName: "Legacy Context Engine",
    description: "Backward-compatible context management",
  }
  
  async ingest(params: { 
    sessionId: string
    sessionKey?: string
    message: AgentMessage
    isHeartbeat?: boolean 
  }): Promise<IngestResult> {
    // 默认：无特殊摄入
    return { ingested: false }
  }
  
  async assemble(params: { 
    sessionId: string
    sessionKey?: string
    messages: AgentMessage[]
    tokenBudget?: number 
  }): Promise<AssembleResult> {
    // 默认：直接传递消息
    return { 
      messages: params.messages, 
      estimatedTokens: 0 
    }
  }
  
  async compact(params: { 
    sessionId: string
    sessionKey?: string
    sessionFile: string
    tokenBudget?: number
    // ...
  }): Promise<CompactResult> {
    // 委托给 pi-coding-agent 压缩
    const { compactEmbeddedPiSessionDirect } = await import(
      "../agents/pi-embedded-runner/compact.runtime.js"
    )
    return await compactEmbeddedPiSessionDirect({
      sessionKey: params.sessionKey,
      sessionFile: params.sessionFile,
      tokenBudget: params.tokenBudget,
      force: params.force,
      // ...
    })
  }
  
  async prepareSubagentSpawn(params: { 
    parentSessionKey: string
    childSessionKey: string
    ttlMs?: number 
  }): Promise<SubagentSpawnPreparation | undefined> {
    // 默认：无上下文共享
    return undefined
  }
  
  async onSubagentEnded(params: { 
    childSessionKey: string
    reason: SubagentEndReason 
  }): Promise<void> {
    // 默认：无清理
  }
}

export function registerLegacyContextEngine(): void {
  registerContextEngine("legacy", async () => {
    return new LegacyContextEngine()
  })
}
```

#### 4. 压缩模块 (`agents/compaction.ts`)

OpenClaw 实现**多阶段自适应压缩**：

```typescript
// 带安全边际的 token 估算
export const SAFETY_MARGIN = 1.2 // 20% 缓冲用于 estimateTokens() 不准确性

// 基于消息大小的自适应块比率
export function computeAdaptiveChunkRatio(
  messages: AgentMessage[], 
  contextWindow: number
): number {
  if (messages.length === 0) return BASE_CHUNK_RATIO
  
  const totalTokens = estimateMessagesTokens(messages)
  const avgTokens = totalTokens / messages.length
  const safeAvgTokens = avgTokens * SAFETY_MARGIN
  const avgRatio = safeAvgTokens / contextWindow
  
  // 如果平均消息 > 上下文的 10%，降低块比率
  if (avgRatio > 0.1) {
    const reduction = Math.min(avgRatio * 2, BASE_CHUNK_RATIO - MIN_CHUNK_RATIO)
    return Math.max(MIN_CHUNK_RATIO, BASE_CHUNK_RATIO - reduction)
  }
  
  return BASE_CHUNK_RATIO
}

// 大对话的分块
export function chunkMessagesByMaxTokens(
  messages: AgentMessage[],
  maxTokens: number,
): AgentMessage[][] {
  const effectiveMax = Math.max(1, Math.floor(maxTokens / SAFETY_MARGIN))
  const chunks: AgentMessage[][] = []
  let currentChunk: AgentMessage[] = []
  let currentTokens = 0
  
  for (const message of messages) {
    const messageTokens = estimateCompactionMessageTokens(message)
    if (currentChunk.length > 0 && currentTokens + messageTokens > effectiveMax) {
      chunks.push(currentChunk)
      currentChunk = []
      currentTokens = 0
    }
    currentChunk.push(message)
    currentTokens += messageTokens
  }
  
  if (currentChunk.length > 0) chunks.push(currentChunk)
  return chunks
}

// 带回退的渐进式摘要
export async function summarizeWithFallback(params: {
  messages: AgentMessage[]
  model: NonNullable<ExtensionContext["model"]>
  apiKey: string
  signal: AbortSignal
  reserveTokens: number
  maxChunkTokens: number
  contextWindow: number
  customInstructions?: string
  previousSummary?: string
}): Promise<string> {
  // 先尝试完整摘要
  try {
    return await summarizeChunks(params)
  } catch (fullError) {
    // 回退 1：仅摘要小消息
    const smallMessages: AgentMessage[] = []
    const oversizedNotes: string[] = []
    
    for (const msg of messages) {
      if (isOversizedForSummary(msg, contextWindow)) {
        oversizedNotes.push(`[Large message omitted from summary]`)
      } else {
        smallMessages.push(msg)
      }
    }
    
    if (smallMessages.length > 0) {
      try {
        return await summarizeChunks({ ...params, messages: smallMessages })
      } catch {}
    }
    
    // 最终回退
    return `Context contained ${messages.length} messages. Summary unavailable.`
  }
}

// 超大上下文的多阶段摘要
export async function summarizeInStages(params: {
  messages: AgentMessage[]
  model: NonNullable<ExtensionContext["model"]>
  // ... 其他参数
  parts?: number
  minMessagesForSplit?: number
}): Promise<string> {
  const parts = normalizeParts(params.parts ?? DEFAULT_PARTS, messages.length)
  
  if (parts <= 1 || messages.length < minMessagesForSplit) {
    return summarizeWithFallback(params)
  }
  
  // 分割为多个部分并分别摘要
  const splits = splitMessagesByTokenShare(messages, parts)
  const partialSummaries: string[] = []
  
  for (const chunk of splits) {
    partialSummaries.push(await summarizeWithFallback({ ...params, messages: chunk }))
  }
  
  // 合并部分摘要
  const summaryMessages: AgentMessage[] = partialSummaries.map(summary => ({
    role: "user",
    content: summary,
    timestamp: Date.now(),
  }))
  
  return summarizeWithFallback({
    ...params,
    messages: summaryMessages,
    customInstructions: MERGE_SUMMARIES_INSTRUCTIONS,
  })
}
```

**上下文共享的历史剪枝**：
```typescript
export function pruneHistoryForContextShare(params: {
  messages: AgentMessage[]
  maxContextTokens: number
  maxHistoryShare?: number
  parts?: number
}): {
  messages: AgentMessage[]
  droppedMessagesList: AgentMessage[]
  droppedChunks: number
  droppedTokens: number
  keptTokens: number
  budgetTokens: number
} {
  const maxHistoryShare = params.maxHistoryShare ?? 0.5
  const budgetTokens = Math.floor(params.maxContextTokens * maxHistoryShare)
  let keptMessages = params.messages
  const allDroppedMessages: AgentMessage[] = []
  
  while (keptMessages.length > 0 && estimateMessagesTokens(keptMessages) > budgetTokens) {
    const chunks = splitMessagesByTokenShare(keptMessages, parts)
    if (chunks.length <= 1) break
    
    const [dropped, ...rest] = chunks
    const flatRest = rest.flat()
    
    // 丢弃后修复 tool_use/tool_result 配对
    const repairReport = repairToolUseResultPairing(flatRest)
    
    allDroppedMessages.push(...dropped)
    keptMessages = repairReport.messages
  }
  
  return {
    messages: keptMessages,
    droppedMessagesList: allDroppedMessages,
    // ... 统计信息
  }
}
```

#### 5. 内存索引管理器 (`memory/manager.ts`)

OpenClaw 包含**混合语义搜索**：

```typescript
export class MemoryIndexManager implements MemorySearchManager {
  protected readonly db: DatabaseSync
  protected provider: EmbeddingProvider | null
  protected readonly vector: {
    enabled: boolean
    available: boolean | null
    dims?: number
  }
  protected readonly fts: {
    enabled: boolean
    available: boolean
  }
  
  async search(
    query: string,
    opts?: {
      maxResults?: number
      minScore?: number
      sessionKey?: string
    },
  ): Promise<MemorySearchResult[]> {
    // 无嵌入提供者时的 FTS-only 模式
    if (!this.provider) {
      const keywords = extractKeywords(query)
      const resultSets = await Promise.all(
        keywords.map(term => this.searchKeyword(term, candidates))
      )
      // 合并并去重...
      return merged
    }
    
    // 混合搜索：向量 + 关键词
    const queryVec = await this.embedQueryWithTimeout(query)
    const vectorResults = await this.searchVector(queryVec, candidates)
    const keywordResults = await this.searchKeyword(query, candidates)
    
    const merged = await this.mergeHybridResults({
      vector: vectorResults,
      keyword: keywordResults,
      vectorWeight: hybrid.vectorWeight,
      textWeight: hybrid.textWeight,
      mmr: hybrid.mmr,
      temporalDecay: hybrid.temporalDecay,
    })
    
    return merged
  }
  
  async sync(params?: {
    reason?: string
    force?: boolean
    sessionFiles?: string[]
    progress?: (update: MemorySyncProgressUpdate) => void
  }): Promise<void> {
    // 将内存文件同步到索引
    // 处理只读恢复、批量嵌入等
  }
}
```

### Agent 运行时集成

`pi-embedded-runner` 集成上下文引擎：

```typescript
// run.ts - 主 Agent 循环
export async function runEmbeddedPiAgent(params: RunEmbeddedPiAgentParams) {
  // 初始化上下文引擎
  await ensureContextEnginesInitialized()
  const contextEngine = await resolveContextEngine(params.config)
  
  // 引导会话
  if (contextEngine.bootstrap) {
    await contextEngine.bootstrap({
      sessionId: params.sessionId,
      sessionKey: params.sessionKey,
      sessionFile: params.sessionFile,
    })
  }
  
  // 主循环
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // ... 模型选择、认证等
    
    const result = await runEmbeddedAttempt({
      // ... 参数
      contextEngine,
    })
    
    // 处理溢出
    if (result.type === "overflow") {
      const compactResult = await contextEngine.compact({
        sessionId: params.sessionId,
        sessionKey: params.sessionKey,
        sessionFile: params.sessionFile,
        tokenBudget: result.tokenBudget,
        force: true,
      })
      
      if (compactResult.compacted) {
        continue // 使用压缩后的上下文重试
      }
    }
    
    // ... 处理其他结果类型
  }
}

// attempt.ts - 单次尝试执行
export async function runEmbeddedAttempt(params: EmbeddedRunAttemptParams) {
  const { contextEngine, sessionManager, messages } = params
  
  // 摄入最近消息
  for (const message of messages) {
    await contextEngine.ingest({
      sessionId: params.sessionId,
      sessionKey: params.sessionKey,
      message,
    })
  }
  
  // 为 LLM 组装上下文
  const assembled = await contextEngine.assemble({
    sessionId: params.sessionId,
    sessionKey: params.sessionKey,
    messages,
    tokenBudget: params.tokenBudget,
  })
  
  // 使用组装的上下文执行
  const result = await sessionManager.run(assembled.messages)
  
  return result
}
```

---

## 对比分析

### 设计理念

| 方面 | OpenCode | OpenClaw |
|------|----------|----------|
| **架构** | 单体、紧密耦合 | 模块化、插件式 |
| **抽象层级** | Session/Message/Part | ContextEngine 生命周期 |
| **可扩展性** | 修改核心模块 | 实现 ContextEngine |
| **持久化** | SQLite（单一来源） | 基于文件 + 可插拔 |
| **内存** | 仅会话范围 | 混合搜索 + 会话 |

### 上下文生命周期

**OpenCode 流程**：
```
用户提示 → Session.touch() → MessageV2.create()
    → SessionPrompt.loop() → MessageV2.stream()
    → MessageV2.toModelMessages() → LLM
    → [如果溢出] SessionCompaction.prune() → SessionCompaction.process()
    → [使用压缩后的上下文重试]
```

**OpenClaw 流程**：
```
用户提示 → contextEngine.bootstrap() → contextEngine.ingest()
    → contextEngine.assemble() → LLM
    → [如果溢出] contextEngine.compact()
    → [使用压缩后的上下文重试]
    → [子 Agent 时] contextEngine.prepareSubagentSpawn()
    → [子 Agent 结束时] contextEngine.onSubagentEnded()
    → [销毁时] contextEngine.dispose()
```

### 压缩策略

| 策略 | OpenCode | OpenClaw |
|------|----------|----------|
| **剪枝** | 工具结果截断（40k 保护） | 工具结果截断 + 配对修复 |
| **摘要** | 单阶段 LLM 摘要 | 多阶段自适应分块 |
| **回退** | 基本溢出检测 | 渐进式回退（完整→部分→最小） |
| **分块** | 未实现 | Token 感知带安全边际 |
| **标识符保留** | 不明确 | 可配置策略（strict/custom/off） |
| **工具配对修复** | 未实现 | 自动修复孤立结果 |
| **媒体剥离** | 溢出模式 | 可配置 |

### Token 管理

**OpenCode**：
```typescript
// 简单上下文窗口检查
const usable = model.limit.input 
  ? model.limit.input - reserved 
  : context - maxOutputTokens
return count >= usable
```

**OpenClaw**：
```typescript
// 带安全边际的自适应
const SAFETY_MARGIN = 1.2
const effectiveMax = maxTokens / SAFETY_MARGIN

// 带提供者感知的上下文窗口解析
function resolveContextTokensForModel(params: {
  cfg?: OpenClawConfig
  provider?: string
  model?: string
  contextTokensOverride?: number
}): number | undefined {
  // 1. 检查显式覆盖
  // 2. 检查提供者限定的缓存键
  // 3. 检查裸模型 ID
  // 4. 回退到默认值
}
```

### 子 Agent 支持

**OpenCode**：无显式子 Agent 上下文共享

**OpenClaw**：通过 ContextEngine 接口内置
```typescript
// 父 Agent 为子 Agent 准备上下文
const prep = await contextEngine.prepareSubagentSpawn({
  parentSessionKey: "parent-123",
  childSessionKey: "child-456",
  ttlMs: 300000,
})

// 子 Agent 继承剪枝后的上下文
const childContext = pruneHistoryForContextShare({
  messages: parentMessages,
  maxContextTokens: childBudget,
  maxHistoryShare: 0.5,
})

// 父 Agent 接收子 Agent 结果
await contextEngine.onSubagentEnded({
  childSessionKey: "child-456",
  reason: "completed",
})
```

---

## 数据流图

### OpenCode 消息流

```
┌─────────────┐
│  用户输入   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ SessionPrompt   │
│   .prompt()     │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐     ┌──────────────┐
│ createUserMsg   │────▶│ MessageTable │
└──────┬──────────┘     └──────────────┘
       │
       ▼
┌─────────────────┐
│ SessionPrompt   │
│   .loop()       │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ MessageV2       │
│  .stream()      │◀────┐
└──────┬──────────┘     │
       │                │
       ▼                │
┌─────────────────┐     │
│ filterCompacted │     │
└──────┬──────────┘     │
       │                │
       ▼                │
┌─────────────────┐     │
│ toModelMessages │     │
└──────┬──────────┘     │
       │                │
       ▼                │
┌─────────────────┐     │
│  LLM Provider   │     │
└──────┬──────────┘     │
       │                │
       ▼                │
┌─────────────────┐     │
│ isOverflow?     │     │
└──────┬──────────┘     │
       │                │
  是   │         否     │
       ▼                │
┌─────────────────┐     │
│ prune()         │     │
└──────┬──────────┘     │
       │                │
       ▼                │
┌─────────────────┐     │
│ process()       │     │
│ (summarize)     │     │
└──────┬──────────┘     │
       │                │
       └────────────────┘
```

### OpenClaw 上下文引擎流

```
┌─────────────┐
│  用户输入   │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ resolveContextEngine│
│   (from registry)   │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ contextEngine       │
│   .bootstrap()      │◀─── 会话初始化
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ contextEngine       │
│   .ingest()         │◀─── 每条消息
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ contextEngine       │
│   .assemble()       │◀─── 为 LLM 构建上下文
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  LLM Provider       │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ 检测到溢出?         │
└──────┬──────────────┘
       │
  是   │         否
       ▼
┌─────────────────────┐
│ contextEngine       │
│   .compact()        │◀─── 摘要/剪枝
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ 使用压缩后上下文重试│
└─────────────────────┘
```

---

## 关键接口与类型

### OpenCode 类型

```typescript
// 会话信息
interface SessionInfo {
  id: string
  slug: string
  projectID: string
  workspaceID?: string
  directory: string
  parentID?: string
  title: string
  version: string
  summary?: {
    additions: number
    deletions: number
    files: number
    diffs?: Snapshot.FileDiff[]
  }
  share?: { url: string }
  revert?: {
    messageID: string
    partID?: string
    snapshot?: string
    diff?: string
  }
  time: {
    created: number
    updated: number
    compacting?: number
    archived?: number
  }
  permission?: PermissionNext.Ruleset
}

// 消息类型
type Message = UserMessage | AssistantMessage

interface UserMessage {
  role: "user"
  id: string
  sessionID: string
  time: { created: number }
  format?: OutputFormat
  summary?: { title?: string; body?: string; diffs: FileDiff[] }
  agent: string
  model: { providerID: string; modelID: string }
  system?: string
  tools?: Record<string, boolean>
  variant?: string
}

interface AssistantMessage {
  role: "assistant"
  id: string
  sessionID: string
  parentID: string
  time: { created: number; completed?: number }
  error?: ErrorObject
  modelID: string
  providerID: string
  mode: string
  agent: string
  path: { cwd: string; root: string }
  summary?: boolean
  cost: number
  tokens: {
    total?: number
    input: number
    output: number
    reasoning: number
    cache: { read: number; write: number }
  }
  finish?: string
}

// 部分类型
type Part = 
  | TextPart
  | ToolPart
  | FilePart
  | ReasoningPart
  | CompactionPart
  | SubtaskPart
  | StepStartPart
  | StepFinishPart
  | SnapshotPart
  | PatchPart
  | AgentPart
  | RetryPart
```

### OpenClaw 类型

```typescript
// 上下文引擎接口
interface ContextEngine {
  readonly info: ContextEngineInfo
  bootstrap?(params: BootstrapParams): Promise<BootstrapResult>
  ingest(params: IngestParams): Promise<IngestResult>
  assemble(params: AssembleParams): Promise<AssembleResult>
  compact(params: CompactParams): Promise<CompactResult>
  prepareSubagentSpawn?(params: SpawnParams): Promise<SpawnPreparation | undefined>
  onSubagentEnded?(params: EndParams): Promise<void>
  dispose?(): Promise<void>
}

interface ContextEngineInfo {
  id: string
  displayName: string
  description: string
  capabilities?: {
    supportsSubagentContext?: boolean
    supportsIncrementalIngest?: boolean
    supportsBudgetAwareAssembly?: boolean
  }
}

// 结果类型
interface IngestResult {
  ingested: boolean
  estimatedTokens?: number
}

interface AssembleResult {
  messages: AgentMessage[]
  estimatedTokens: number
  contextWarning?: string
}

interface CompactResult {
  compacted: boolean
  summary?: string
  droppedMessageCount?: number
  estimatedTokens?: number
  error?: string
}

interface SubagentSpawnPreparation {
  parentContextSummary?: string
  sharedMemoryKeys?: string[]
  inheritTools?: string[]
  budgetAllocation?: {
    parentReserve: number
    childAllocation: number
  }
}

// Agent 消息（来自 pi-agent-core）
interface AgentMessage {
  role: "user" | "assistant"
  content: string | ContentPart[]
  timestamp?: number
  toolUse?: ToolUse[]
  toolResult?: ToolResult[]
}

interface ToolResult {
  toolUseId: string
  result: string | object
  details?: unknown // 安全：从压缩中排除
}
```

---

## 压缩策略

### 策略对比

| 策略 | 描述 | OpenCode | OpenClaw |
|------|------|----------|----------|
| **剪枝** | 移除旧工具输出 | ✓ (40k 保护) | ✓ (自适应) |
| **摘要** | LLM 生成摘要 | ✓ (单阶段) | ✓ (多阶段) |
| **分块** | 分割大上下文 | ✗ | ✓ (token 感知) |
| **渐进式回退** | 优雅降级 | ✗ | ✓ (完整→部分→最小) |
| **标识符保留** | 摘要中保留 ID | ✗ | ✓ (可配置) |
| **工具配对修复** | 修复孤立结果 | ✗ | ✓ (自动) |
| **媒体剥离** | 移除图像/媒体 | ✓ (溢出模式) | ✓ (可配置) |

### 压缩触发

**OpenCode**：
```typescript
// 溢出时自动触发
if (isOverflow({ tokens, model })) {
  await prune({ sessionID })
  await process({ messages, sessionID, auto: true })
}

// 通过压缩部分手动触发
await Session.updatePart({
  type: "compaction",
  auto: boolean,
  overflow: boolean,
})
```

**OpenClaw**：
```typescript
// 上下文限制时自动触发
if (currentTokens > tokenBudget * 0.9) {
  await contextEngine.compact({
    sessionKey,
    sessionFile,
    tokenBudget,
    compactionTarget: "budget",
  })
}

// 通过 CLI/API 手动触发
await compactEmbeddedPiSession({
  sessionKey,
  force: true,
  customInstructions: "Focus on API design decisions",
})

// 子 Agent 上下文共享
await contextEngine.prepareSubagentSpawn({
  parentSessionKey,
  childSessionKey,
  ttlMs: 300000,
})
```

---

## 内存与持久化

### OpenCode 持久化

**存储**：SQLite 数据库

**Schema**：
```sql
CREATE TABLE session (
  id TEXT PRIMARY KEY,
  slug TEXT,
  project_id TEXT,
  workspace_id TEXT,
  parent_id TEXT,
  title TEXT,
  version TEXT,
  share_url TEXT,
  summary_additions INTEGER,
  summary_deletions INTEGER,
  summary_files INTEGER,
  time_created INTEGER,
  time_updated INTEGER,
  time_compacting INTEGER,
  time_archived INTEGER,
  permission TEXT,
  revert TEXT
);

CREATE TABLE message (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES session(id),
  time_created INTEGER,
  data TEXT -- JSON
);

CREATE TABLE part (
  id TEXT PRIMARY KEY,
  message_id TEXT REFERENCES message(id),
  session_id TEXT REFERENCES session(id),
  time_created INTEGER,
  data TEXT -- JSON
);
```

**特性**：
- CASCADE 删除保证引用完整性
- JSON 序列化支持灵活的消息/部分数据
- 按 session_id、time_created 索引查询

### OpenClaw 持久化

**存储**：基于文件的会话文件 + SQLite 内存索引

**会话文件** (JSONL)：
```
{"role":"user","content":"Hello","timestamp":1234567890}
{"role":"assistant","content":"Hi!","timestamp":1234567891,"toolUse":[...]}
{"role":"user","toolResult":[...],"timestamp":1234567892}
```

**内存索引** (SQLite)：
```sql
CREATE TABLE files (
  id TEXT PRIMARY KEY,
  source TEXT,
  path TEXT,
  mtime INTEGER,
  hash TEXT
);

CREATE TABLE chunks (
  id TEXT PRIMARY KEY,
  file_id TEXT REFERENCES files(id),
  start_line INTEGER,
  end_line INTEGER,
  content TEXT,
  embedding BLOB,
  created_at INTEGER
);

CREATE TABLE chunks_fts (
  id TEXT PRIMARY KEY,
  content TEXT
);

CREATE TABLE chunks_vec (
  id TEXT PRIMARY KEY,
  embedding BLOB
);

CREATE TABLE embedding_cache (
  hash TEXT PRIMARY KEY,
  embedding BLOB,
  created_at INTEGER
);
```

**特性**：
- 会话文件用于对话历史
- 内存索引用于语义搜索
- 混合搜索（向量 + FTS）
- 嵌入缓存优化成本
- 带重试逻辑的批量嵌入

---

## Agent 集成

### OpenCode Agent 系统

```typescript
// Agent 定义
interface AgentInfo {
  name: string
  description?: string
  mode: "subagent" | "primary" | "all"
  native?: boolean
  hidden?: boolean
  topP?: number
  temperature?: number
  color?: string
  permission: PermissionNext.Ruleset
  model?: { modelID: string; providerID: string }
  variant?: string
  prompt?: string
  options: Record<string, any>
  steps?: number
}

// 内置 Agent
const agents = {
  build: { /* 默认 agent */ },
  plan: { /* 计划模式，无编辑 */ },
  general: { /* 多步研究 */ },
  explore: { /* 代码库探索 */ },
  compaction: { /* 隐藏，摘要 */ },
  title: { /* 隐藏，生成标题 */ },
  summary: { /* 隐藏，会话摘要 */ },
}
```

### OpenClaw Agent 系统

```typescript
// 基于 pi-coding-agent 构建
import { createAgentSession, SessionManager } from "@mariozechner/pi-coding-agent"

// Agent 会话创建
const session = await createAgentSession({
  model: { api: "anthropic", id: "claude-3-5-sonnet-20241022" },
  apiKey: anthropicApiKey,
  systemPrompt: buildSystemPrompt(params),
  tools: createOpenClawCodingTools(params),
  extensions: buildEmbeddedExtensionFactories(params),
})

// 上下文引擎集成
const contextEngine = await resolveContextEngine(config)

// 带上下文管理运行
for await (const event of session.stream(assembledMessages)) {
  if (event.type === "tool_use") {
    // 处理工具调用
  }
  if (event.type === "content_block_delta") {
    // 流式文本
  }
  if (event.type === "message_stop") {
    // 检查溢出
    if (isOverflow(event.usage)) {
      await contextEngine.compact({ ... })
      // 重试
    }
  }
}
```

---

## 建议与洞察

### OpenCode 优势

1. **简洁性**：单体架构更易理解和调试
2. **数据库事务**：会话/消息一致性的 ACID 保证
3. **事件总线**：UI 同步的实时更新
4. **会话分叉**：内置支持分支对话
5. **回滚能力**：基于快照的更改撤销

### OpenCode 局限

1. **可扩展性**：添加新上下文策略需修改核心模块
2. **内存**：无语义搜索或长期记忆
3. **子 Agent 支持**：无显式 Agent 间上下文共享
4. **压缩**：单阶段摘要可能在超大上下文时失败

### OpenClaw 优势

1. **模块化**：可插拔上下文引擎支持实验
2. **可扩展性**：多阶段压缩处理超大上下文
3. **内存**：混合搜索提供语义检索
4. **子 Agent 支持**：内置多 Agent 工作流的上下文共享
5. **安全边际**：自适应分块防止压缩时溢出

### OpenClaw 局限

1. **复杂性**：更多组件增加调试难度
2. **基于文件的会话**：无 ACID 保证，可能损坏
3. **内存开销**：向量嵌入需要额外存储
4. **配置**：更多选项需要调优和理解

### 潜在改进

**针对 OpenCode**：
1. 为压缩策略添加类似 `ContextEngine` 的抽象
2. 实现带分块的多阶段摘要
3. 剪枝后添加工具配对修复
4. 考虑添加语义内存

**针对 OpenClaw**：
1. 添加数据库支持的会话存储选项
2. 实现会话分叉和回滚
3. 添加实时 UI 更新的事件总线
4. 考虑添加内置会话归档

### 混合方案

未来系统可以结合两者的优势：

```typescript
interface HybridContextEngine extends ContextEngine {
  // 来自 OpenCode
  fork(params: { sessionID: string; messageID?: string }): Promise<Session>
  revert(params: { sessionID: string; messageID: string }): Promise<void>
  
  // 来自 OpenClaw
  search(query: string, opts?: SearchOptions): Promise<SearchResult[]>
  prepareSubagentSpawn(params: SpawnParams): Promise<SpawnPreparation>
  
  // 新能力
  transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>
  subscribe(sessionID: string, callback: (event: Event) => void): () => void
}
```

---

## 结论

OpenCode 和 OpenClaw 代表了两种截然不同的上下文管理方法：

- **OpenCode** 优先考虑简洁性和一致性，采用数据库中心的单体架构
- **OpenClaw** 优先考虑灵活性和可扩展性，采用模块化的插件架构

选择取决于项目需求：
- 对于标准上下文管理需求的简单项目，选择 **OpenCode**
- 对于需要语义内存和自定义上下文策略的复杂多 Agent 系统，选择 **OpenClaw**

两个系统都实现了有效的压缩策略，但 OpenClaw 的带渐进式回退的多阶段方法对超大上下文更健壮。OpenCode 的数据库事务为会话持久化提供更强的一致性保证。

未来开发可以从结合 OpenCode 的事务性会话管理与 OpenClaw 的可插拔上下文引擎架构中受益。

---

## 附录：文件参考

### OpenCode 源文件

- `opensource/opencode/packages/opencode/src/session/index.ts` - 会话管理
- `opensource/opencode/packages/opencode/src/session/message-v2.ts` - 消息类型和流式处理
- `opensource/opencode/packages/opencode/src/session/compaction.ts` - 压缩策略
- `opensource/opencode/packages/opencode/src/session/prompt.ts` - 提示构建和循环
- `opensource/opencode/packages/opencode/src/session/session.sql.ts` - 数据库 schema
- `opensource/opencode/packages/opencode/src/agent/agent.ts` - Agent 定义

### OpenClaw 源文件

- `src/context-engine/types.ts` - ContextEngine 接口
- `src/context-engine/registry.ts` - 引擎注册和解析
- `src/context-engine/legacy.ts` - 默认实现
- `src/agents/compaction.ts` - 多阶段压缩
- `src/agents/pi-embedded-runner/run.ts` - Agent 运行时循环
- `src/agents/pi-embedded-runner/run/attempt.ts` - 单次尝试执行
- `src/memory/manager.ts` - 混合搜索管理器
- `src/agents/context.ts` - 上下文窗口解析
