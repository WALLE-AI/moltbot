# Context Management Framework Analysis

## OpenCode vs OpenClaw Technical Comparison

**Analysis Date**: 2025-01-18  
**Scope**: Deep source code module analysis of context management architectures

---

## Executive Summary

This report provides a comprehensive technical analysis of context management frameworks in two AI agent systems:

1. **OpenCode** (`opensource/opencode`): A TypeScript-based AI coding agent with database-backed session management
2. **OpenClaw** (`src/`): A multi-channel AI assistant built on `pi-coding-agent` with pluggable context engines

The analysis reveals fundamentally different architectural approaches:
- **OpenCode** uses a monolithic, database-centric model with tight coupling between session, message, and compaction logic
- **OpenClaw** employs a modular, plugin-based `ContextEngine` abstraction that decouples context lifecycle management from the agent runtime

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [OpenCode Context Management](#opencode-context-management)
3. [OpenClaw Context Management](#openclaw-context-management)
4. [Comparative Analysis](#comparative-analysis)
5. [Data Flow Diagrams](#data-flow-diagrams)
6. [Key Interfaces and Types](#key-interfaces-and-types)
7. [Compaction Strategies](#compaction-strategies)
8. [Memory and Persistence](#memory-and-persistence)
9. [Agent Integration](#agent-integration)
10. [Recommendations and Insights](#recommendations-and-insights)

---

## Architecture Overview

### OpenCode Architecture

OpenCode follows a **layered monolithic architecture**:

```
┌─────────────────────────────────────────────────────┐
│                    Session Layer                     │
│  (session/index.ts - CRUD, lifecycle, events)       │
├─────────────────────────────────────────────────────┤
│                  Message Layer                       │
│  (message-v2.ts - MessageV2, Parts, streaming)      │
├─────────────────────────────────────────────────────┤
│                 Compaction Layer                     │
│  (compaction.ts - prune, process, overflow)         │
├─────────────────────────────────────────────────────┤
│                  Storage Layer                       │
│  (session.sql.ts - SQLite tables, queries)          │
└─────────────────────────────────────────────────────┘
```

**Key Characteristics**:
- Single database (SQLite) for all session/message persistence
- Synchronous-style API with `Database.use()` wrapper
- Namespace-based module organization (`Session`, `MessageV2`, `SessionCompaction`)
- Event bus for real-time updates (`Bus.publish`, `BusEvent.define`)

### OpenClaw Architecture

OpenClaw follows a **modular plugin architecture**:

```
┌──────────────────────────────────────────────────────────────┐
│                    Context Engine Registry                   │
│         (context-engine/registry.ts - registration)         │
├──────────────────────────────────────────────────────────────┤
│                     ContextEngine Interface                  │
│   (context-engine/types.ts - bootstrap, ingest, assemble,   │
│                              compact, subagent lifecycle)   │
├──────────────────────┬───────────────────────────────────────┤
│  LegacyContextEngine │    Future Engine Implementations     │
│  (legacy.ts)         │    (pluggable via ContextEngineInfo)  │
├──────────────────────┴───────────────────────────────────────┤
│                    Agent Runtime Layer                       │
│  (pi-embedded-runner/run.ts, attempt.ts - execution loop)   │
├──────────────────────────────────────────────────────────────┤
│                  Memory Index Manager                        │
│  (memory/manager.ts - vector search, FTS, embeddings)       │
└──────────────────────────────────────────────────────────────┘
```

**Key Characteristics**:
- Pluggable `ContextEngine` interface with lifecycle methods
- Registry pattern for engine discovery and resolution
- Built on `@mariozechner/pi-coding-agent` framework
- Separate memory management with hybrid search (vector + FTS)
- Subagent context sharing via `prepareSubagentSpawn`/`onSubagentEnded`

---

## OpenCode Context Management

### Core Components

#### 1. Session Module (`session/index.ts`)

The `Session` namespace provides the primary session lifecycle management:

```typescript
// Session creation and persistence
export const create = fn(z.object({...}), async (input) => {
  return createNext({
    parentID: input?.parentID,
    directory: Instance.directory,
    title: input?.title,
    permission: input?.permission,
    workspaceID: input?.workspaceID,
  })
})

// Database-backed session info
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

**Key Features**:
- Session forking with message cloning (`fork()`)
- Hierarchical sessions via `parentID` (parent-child relationships)
- Session archiving and soft-delete
- Permission rulesets attached to sessions
- Revert capability with snapshot tracking

#### 2. Message Module (`session/message-v2.ts`)

Messages are structured as `Info` + `Part[]`:

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

**Message Streaming**:
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
    // Yield messages with parts...
  }
})
```

**Model Message Conversion**:
```typescript
export function toModelMessages(
  input: WithParts[],
  model: Provider.Model,
  options?: { stripMedia?: boolean },
): ModelMessage[] {
  // Converts internal message format to AI SDK ModelMessage[]
  // Handles tool results, reasoning, media, compaction parts
}
```

#### 3. Compaction Module (`session/compaction.ts`)

OpenCode implements **multi-strategy compaction**:

**Strategy 1: Pruning** (removes old tool outputs)
```typescript
export async function prune(input: { sessionID: SessionID }) {
  const msgs = await Session.messages({ sessionID: input.sessionID })
  let total = 0
  let pruned = 0
  const toPrune = []
  
  // Go backwards through parts until 40k tokens of tool calls
  // Then erase output of previous tool calls
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
  
  // Mark as compacted
  for (const part of toPrune) {
    part.state.time.compacted = Date.now()
    await Session.updatePart(part)
  }
}
```

**Strategy 2: Summarization** (LLM-generated summary)
```typescript
export async function process(input: {
  parentID: MessageID
  messages: MessageV2.WithParts[]
  sessionID: SessionID
  abort: AbortSignal
  auto: boolean
  overflow?: boolean
}) {
  // Create compaction agent message
  const agent = await Agent.get("compaction")
  const model = agent.model 
    ? await Provider.getModel(agent.model.providerID, agent.model.modelID)
    : await Provider.getModel(userMessage.model.providerID, userMessage.model.modelID)
  
  // Build prompt with conversation history
  const defaultPrompt = `Provide a detailed prompt for continuing our conversation above.
Focus on information that would be helpful for continuing the conversation...
---
## Goal
## Instructions
## Discoveries
## Accomplished
## Relevant files / directories
---`
  
  // Process with compaction agent
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

**Overflow Detection**:
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

### Data Persistence

OpenCode uses **SQLite with typed tables**:

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
  data: { type: "text" }, // JSON-serialized message data
})

export const PartTable = Database.table("part", {
  id: { type: "text", primary: true },
  message_id: { type: "text", references: "message.id" },
  session_id: { type: "text", references: "session.id" },
  time_created: { type: "integer" },
  data: { type: "text" }, // JSON-serialized part data
})
```

---

## OpenClaw Context Management

### Core Components

#### 1. ContextEngine Interface (`context-engine/types.ts`)

The `ContextEngine` interface defines the **lifecycle contract**:

```typescript
export interface ContextEngine {
  readonly info: ContextEngineInfo;
  
  // Session initialization
  bootstrap?(params: { 
    sessionId: string
    sessionKey?: string
    sessionFile: string 
  }): Promise<BootstrapResult>;
  
  // Message ingestion (real-time context updates)
  ingest(params: { 
    sessionId: string
    sessionKey?: string
    message: AgentMessage
    isHeartbeat?: boolean 
  }): Promise<IngestResult>;
  
  // Context assembly for LLM calls
  assemble(params: { 
    sessionId: string
    sessionKey?: string
    messages: AgentMessage[]
    tokenBudget?: number 
  }): Promise<AssembleResult>;
  
  // Context compaction
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
  
  // Subagent context sharing
  prepareSubagentSpawn?(params: { 
    parentSessionKey: string
    childSessionKey: string
    ttlMs?: number 
  }): Promise<SubagentSpawnPreparation | undefined>;
  
  onSubagentEnded?(params: { 
    childSessionKey: string
    reason: SubagentEndReason 
  }): Promise<void>;
  
  // Cleanup
  dispose?(): Promise<void>;
}
```

**Key Design Principles**:
1. **Lifecycle Awareness**: Methods map to session lifecycle stages
2. **Budget-Aware**: Token budgets passed explicitly for context window management
3. **Subagent Support**: Built-in context sharing between parent/child agents
4. **Pluggable**: Different engines can implement different strategies

#### 2. Context Engine Registry (`context-engine/registry.ts`)

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

The default implementation wraps existing compaction logic:

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
    // Default: no special ingestion
    return { ingested: false }
  }
  
  async assemble(params: { 
    sessionId: string
    sessionKey?: string
    messages: AgentMessage[]
    tokenBudget?: number 
  }): Promise<AssembleResult> {
    // Default: pass through messages unchanged
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
    // Delegate to pi-coding-agent compaction
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
    // Default: no context sharing
    return undefined
  }
  
  async onSubagentEnded(params: { 
    childSessionKey: string
    reason: SubagentEndReason 
  }): Promise<void> {
    // Default: no cleanup
  }
}

export function registerLegacyContextEngine(): void {
  registerContextEngine("legacy", async () => {
    return new LegacyContextEngine()
  })
}
```

#### 4. Compaction Module (`agents/compaction.ts`)

OpenClaw implements **multi-stage adaptive compaction**:

```typescript
// Token estimation with safety margin
export const SAFETY_MARGIN = 1.2 // 20% buffer for estimateTokens() inaccuracy

// Adaptive chunk ratio based on message sizes
export function computeAdaptiveChunkRatio(
  messages: AgentMessage[], 
  contextWindow: number
): number {
  if (messages.length === 0) return BASE_CHUNK_RATIO
  
  const totalTokens = estimateMessagesTokens(messages)
  const avgTokens = totalTokens / messages.length
  const safeAvgTokens = avgTokens * SAFETY_MARGIN
  const avgRatio = safeAvgTokens / contextWindow
  
  // If average message > 10% of context, reduce chunk ratio
  if (avgRatio > 0.1) {
    const reduction = Math.min(avgRatio * 2, BASE_CHUNK_RATIO - MIN_CHUNK_RATIO)
    return Math.max(MIN_CHUNK_RATIO, BASE_CHUNK_RATIO - reduction)
  }
  
  return BASE_CHUNK_RATIO
}

// Chunking for large conversations
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

// Progressive summarization with fallback
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
  // Try full summarization first
  try {
    return await summarizeChunks(params)
  } catch (fullError) {
    // Fallback 1: Summarize only small messages
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
    
    // Final fallback
    return `Context contained ${messages.length} messages. Summary unavailable.`
  }
}

// Multi-stage summarization for very large contexts
export async function summarizeInStages(params: {
  messages: AgentMessage[]
  model: NonNullable<ExtensionContext["model"]>
  // ... other params
  parts?: number
  minMessagesForSplit?: number
}): Promise<string> {
  const parts = normalizeParts(params.parts ?? DEFAULT_PARTS, messages.length)
  
  if (parts <= 1 || messages.length < minMessagesForSplit) {
    return summarizeWithFallback(params)
  }
  
  // Split into parts and summarize each
  const splits = splitMessagesByTokenShare(messages, parts)
  const partialSummaries: string[] = []
  
  for (const chunk of splits) {
    partialSummaries.push(await summarizeWithFallback({ ...params, messages: chunk }))
  }
  
  // Merge partial summaries
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

**History Pruning for Context Sharing**:
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
    
    // Repair tool_use/tool_result pairing after dropping
    const repairReport = repairToolUseResultPairing(flatRest)
    
    allDroppedMessages.push(...dropped)
    keptMessages = repairReport.messages
  }
  
  return {
    messages: keptMessages,
    droppedMessagesList: allDroppedMessages,
    // ... stats
  }
}
```

#### 5. Memory Index Manager (`memory/manager.ts`)

OpenClaw includes **hybrid semantic search**:

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
    // FTS-only mode when no embedding provider
    if (!this.provider) {
      const keywords = extractKeywords(query)
      const resultSets = await Promise.all(
        keywords.map(term => this.searchKeyword(term, candidates))
      )
      // Merge and deduplicate...
      return merged
    }
    
    // Hybrid search: vector + keyword
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
    // Sync memory files to index
    // Handles readonly recovery, batch embedding, etc.
  }
}
```

### Agent Runtime Integration

The `pi-embedded-runner` integrates context engines:

```typescript
// run.ts - Main agent loop
export async function runEmbeddedPiAgent(params: RunEmbeddedPiAgentParams) {
  // Initialize context engines
  await ensureContextEnginesInitialized()
  const contextEngine = await resolveContextEngine(params.config)
  
  // Bootstrap session
  if (contextEngine.bootstrap) {
    await contextEngine.bootstrap({
      sessionId: params.sessionId,
      sessionKey: params.sessionKey,
      sessionFile: params.sessionFile,
    })
  }
  
  // Main loop
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // ... model selection, auth, etc.
    
    const result = await runEmbeddedAttempt({
      // ... params
      contextEngine,
    })
    
    // Handle overflow
    if (result.type === "overflow") {
      const compactResult = await contextEngine.compact({
        sessionId: params.sessionId,
        sessionKey: params.sessionKey,
        sessionFile: params.sessionFile,
        tokenBudget: result.tokenBudget,
        force: true,
      })
      
      if (compactResult.compacted) {
        continue // Retry with compacted context
      }
    }
    
    // ... handle other result types
  }
}

// attempt.ts - Single attempt execution
export async function runEmbeddedAttempt(params: EmbeddedRunAttemptParams) {
  const { contextEngine, sessionManager, messages } = params
  
  // Ingest recent messages
  for (const message of messages) {
    await contextEngine.ingest({
      sessionId: params.sessionId,
      sessionKey: params.sessionKey,
      message,
    })
  }
  
  // Assemble context for LLM
  const assembled = await contextEngine.assemble({
    sessionId: params.sessionId,
    sessionKey: params.sessionKey,
    messages,
    tokenBudget: params.tokenBudget,
  })
  
  // Execute with assembled context
  const result = await sessionManager.run(assembled.messages)
  
  return result
}
```

---

## Comparative Analysis

### Design Philosophy

| Aspect | OpenCode | OpenClaw |
|--------|----------|----------|
| **Architecture** | Monolithic, tightly coupled | Modular, plugin-based |
| **Abstraction Level** | Session/Message/Part | ContextEngine lifecycle |
| **Extensibility** | Modify core modules | Implement ContextEngine |
| **Persistence** | SQLite (single source) | File-based + pluggable |
| **Memory** | Session-scoped only | Hybrid search + session |

### Context Lifecycle

**OpenCode Flow**:
```
User Prompt → Session.touch() → MessageV2.create()
    → SessionPrompt.loop() → MessageV2.stream()
    → MessageV2.toModelMessages() → LLM
    → [if overflow] SessionCompaction.prune() → SessionCompaction.process()
    → [retry with compacted context]
```

**OpenClaw Flow**:
```
User Prompt → contextEngine.bootstrap() → contextEngine.ingest()
    → contextEngine.assemble() → LLM
    → [if overflow] contextEngine.compact()
    → [retry with compacted context]
    → [on subagent] contextEngine.prepareSubagentSpawn()
    → [on subagent end] contextEngine.onSubagentEnded()
    → [on dispose] contextEngine.dispose()
```

### Compaction Strategies

| Strategy | OpenCode | OpenClaw |
|----------|----------|----------|
| **Pruning** | Tool result truncation (40k protected) | Tool result truncation + pairing repair |
| **Summarization** | Single-stage LLM summary | Multi-stage with adaptive chunking |
| **Fallback** | Basic overflow detection | Progressive fallback (full → partial → minimal) |
| **Chunking** | Not implemented | Token-aware with safety margin |
| **Identifier Preservation** | Not explicit | Configurable policy (strict/custom/off) |

### Token Management

**OpenCode**:
```typescript
// Simple context window check
const usable = model.limit.input 
  ? model.limit.input - reserved 
  : context - maxOutputTokens
return count >= usable
```

**OpenClaw**:
```typescript
// Adaptive with safety margin
const SAFETY_MARGIN = 1.2
const effectiveMax = maxTokens / SAFETY_MARGIN

// Context window resolution with provider awareness
function resolveContextTokensForModel(params: {
  cfg?: OpenClawConfig
  provider?: string
  model?: string
  contextTokensOverride?: number
}): number | undefined {
  // 1. Check explicit override
  // 2. Check provider-qualified cache key
  // 3. Check bare model ID
  // 4. Fallback to default
}
```

### Subagent Support

**OpenCode**: No explicit subagent context sharing

**OpenClaw**: Built-in via ContextEngine interface
```typescript
// Parent prepares context for child
const prep = await contextEngine.prepareSubagentSpawn({
  parentSessionKey: "parent-123",
  childSessionKey: "child-456",
  ttlMs: 300000,
})

// Child inherits pruned context
const childContext = pruneHistoryForContextShare({
  messages: parentMessages,
  maxContextTokens: childBudget,
  maxHistoryShare: 0.5,
})

// Parent receives child results
await contextEngine.onSubagentEnded({
  childSessionKey: "child-456",
  reason: "completed",
})
```

---

## Data Flow Diagrams

### OpenCode Message Flow

```
┌─────────────┐
│  User Input │
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
  Yes  │         No     │
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

### OpenClaw Context Engine Flow

```
┌─────────────┐
│  User Input │
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
│   .bootstrap()      │◀─── Session initialization
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ contextEngine       │
│   .ingest()         │◀─── Each message
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ contextEngine       │
│   .assemble()       │◀─── Build context for LLM
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  LLM Provider       │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Overflow detected?  │
└──────┬──────────────┘
       │
  Yes  │         No
       ▼
┌─────────────────────┐
│ contextEngine       │
│   .compact()        │◀─── Summarize/prune
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Retry with compacted│
└─────────────────────┘
```

---

## Key Interfaces and Types

### OpenCode Types

```typescript
// Session info
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

// Message types
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

// Part types
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

### OpenClaw Types

```typescript
// Context engine interface
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

// Results
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

// Agent message (from pi-agent-core)
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
  details?: unknown // SECURITY: excluded from compaction
}
```

---

## Compaction Strategies

### Strategy Comparison

| Strategy | Description | OpenCode | OpenClaw |
|----------|-------------|----------|----------|
| **Pruning** | Remove old tool outputs | ✓ (40k protected) | ✓ (adaptive) |
| **Summarization** | LLM-generated summary | ✓ (single-stage) | ✓ (multi-stage) |
| **Chunking** | Split large contexts | ✗ | ✓ (token-aware) |
| **Progressive Fallback** | Graceful degradation | ✗ | ✓ (full→partial→minimal) |
| **Identifier Preservation** | Keep IDs in summary | ✗ | ✓ (configurable) |
| **Tool Pairing Repair** | Fix orphaned results | ✗ | ✓ (automatic) |
| **Media Stripping** | Remove images/media | ✓ (overflow mode) | ✓ (configurable) |

### Compaction Triggers

**OpenCode**:
```typescript
// Automatic on overflow
if (isOverflow({ tokens, model })) {
  await prune({ sessionID })
  await process({ messages, sessionID, auto: true })
}

// Manual via compaction part
await Session.updatePart({
  type: "compaction",
  auto: boolean,
  overflow: boolean,
})
```

**OpenClaw**:
```typescript
// Automatic on context limit
if (currentTokens > tokenBudget * 0.9) {
  await contextEngine.compact({
    sessionKey,
    sessionFile,
    tokenBudget,
    compactionTarget: "budget",
  })
}

// Manual via CLI/API
await compactEmbeddedPiSession({
  sessionKey,
  force: true,
  customInstructions: "Focus on API design decisions",
})

// Subagent context sharing
await contextEngine.prepareSubagentSpawn({
  parentSessionKey,
  childSessionKey,
  ttlMs: 300000,
})
```

---

## Memory and Persistence

### OpenCode Persistence

**Storage**: SQLite database

**Schema**:
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

**Features**:
- CASCADE delete for referential integrity
- JSON serialization for flexible message/part data
- Indexed queries by session_id, time_created

### OpenClaw Persistence

**Storage**: File-based session files + SQLite memory index

**Session File** (JSONL):
```
{"role":"user","content":"Hello","timestamp":1234567890}
{"role":"assistant","content":"Hi!","timestamp":1234567891,"toolUse":[...]}
{"role":"user","toolResult":[...],"timestamp":1234567892}
```

**Memory Index** (SQLite):
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

**Features**:
- Session files for conversation history
- Memory index for semantic search
- Hybrid search (vector + FTS)
- Embedding cache for cost optimization
- Batch embedding with retry logic

---

## Agent Integration

### OpenCode Agent System

```typescript
// Agent definition
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

// Built-in agents
const agents = {
  build: { /* default agent */ },
  plan: { /* planning mode, no edits */ },
  general: { /* multi-step research */ },
  explore: { /* codebase exploration */ },
  compaction: { /* hidden, summarization */ },
  title: { /* hidden, generate title */ },
  summary: { /* hidden, session summary */ },
}
```

### OpenClaw Agent System

```typescript
// Built on pi-coding-agent
import { createAgentSession, SessionManager } from "@mariozechner/pi-coding-agent"

// Agent session creation
const session = await createAgentSession({
  model: { api: "anthropic", id: "claude-3-5-sonnet-20241022" },
  apiKey: anthropicApiKey,
  systemPrompt: buildSystemPrompt(params),
  tools: createOpenClawCodingTools(params),
  extensions: buildEmbeddedExtensionFactories(params),
})

// Context engine integration
const contextEngine = await resolveContextEngine(config)

// Run with context management
for await (const event of session.stream(assembledMessages)) {
  if (event.type === "tool_use") {
    // Handle tool calls
  }
  if (event.type === "content_block_delta") {
    // Stream text
  }
  if (event.type === "message_stop") {
    // Check for overflow
    if (isOverflow(event.usage)) {
      await contextEngine.compact({ ... })
      // Retry
    }
  }
}
```

---

## Recommendations and Insights

### OpenCode Strengths

1. **Simplicity**: Monolithic architecture is easier to understand and debug
2. **Database Transactions**: ACID guarantees for session/message consistency
3. **Event Bus**: Real-time updates for UI synchronization
4. **Session Forking**: Built-in support for branching conversations
5. **Revert Capability**: Snapshot-based undo for changes

### OpenCode Limitations

1. **Extensibility**: Adding new context strategies requires modifying core modules
2. **Memory**: No semantic search or long-term memory
3. **Subagent Support**: No explicit context sharing between agents
4. **Compaction**: Single-stage summarization may fail on very large contexts

### OpenClaw Strengths

1. **Modularity**: Pluggable context engines enable experimentation
2. **Scalability**: Multi-stage compaction handles very large contexts
3. **Memory**: Hybrid search provides semantic retrieval
4. **Subagent Support**: Built-in context sharing for multi-agent workflows
5. **Safety Margins**: Adaptive chunking prevents overflow during compaction

### OpenClaw Limitations

1. **Complexity**: More moving parts increase debugging difficulty
2. **File-based Sessions**: No ACID guarantees, potential for corruption
3. **Memory Overhead**: Vector embeddings require additional storage
4. **Configuration**: More options to tune and understand

### Potential Improvements

**For OpenCode**:
1. Add `ContextEngine`-like abstraction for compaction strategies
2. Implement multi-stage summarization with chunking
3. Add tool pairing repair after pruning
4. Consider adding semantic memory

**For OpenClaw**:
1. Add database-backed session storage option
2. Implement session forking and revert
3. Add event bus for real-time UI updates
4. Consider adding built-in session archiving

### Hybrid Approach

A future system could combine the best of both:

```typescript
interface HybridContextEngine extends ContextEngine {
  // From OpenCode
  fork(params: { sessionID: string; messageID?: string }): Promise<Session>
  revert(params: { sessionID: string; messageID: string }): Promise<void>
  
  // From OpenClaw
  search(query: string, opts?: SearchOptions): Promise<SearchResult[]>
  prepareSubagentSpawn(params: SpawnParams): Promise<SpawnPreparation>
  
  // New capabilities
  transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>
  subscribe(sessionID: string, callback: (event: Event) => void): () => void
}
```

---

## Conclusion

OpenCode and OpenClaw represent two distinct approaches to context management:

- **OpenCode** prioritizes simplicity and consistency with a database-centric monolithic architecture
- **OpenClaw** prioritizes flexibility and scalability with a modular plugin-based architecture

The choice between them depends on project requirements:
- Choose **OpenCode** for simpler projects with standard context management needs
- Choose **OpenClaw** for complex multi-agent systems requiring semantic memory and custom context strategies

Both systems implement effective compaction strategies, but OpenClaw's multi-stage approach with progressive fallback is more robust for very large contexts. OpenCode's database transactions provide stronger consistency guarantees for session persistence.

Future development could benefit from combining OpenCode's transactional session management with OpenClaw's pluggable context engine architecture.

---

## Appendix: File References

### OpenCode Source Files

- `opensource/opencode/packages/opencode/src/session/index.ts` - Session management
- `opensource/opencode/packages/opencode/src/session/message-v2.ts` - Message types and streaming
- `opensource/opencode/packages/opencode/src/session/compaction.ts` - Compaction strategies
- `opensource/opencode/packages/opencode/src/session/prompt.ts` - Prompt building and loop
- `opensource/opencode/packages/opencode/src/session/session.sql.ts` - Database schema
- `opensource/opencode/packages/opencode/src/agent/agent.ts` - Agent definitions

### OpenClaw Source Files

- `src/context-engine/types.ts` - ContextEngine interface
- `src/context-engine/registry.ts` - Engine registration and resolution
- `src/context-engine/legacy.ts` - Default implementation
- `src/agents/compaction.ts` - Multi-stage compaction
- `src/agents/pi-embedded-runner/run.ts` - Agent runtime loop
- `src/agents/pi-embedded-runner/run/attempt.ts` - Single attempt execution
- `src/memory/manager.ts` - Hybrid search manager
- `src/agents/context.ts` - Context window resolution
