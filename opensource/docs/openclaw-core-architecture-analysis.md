# OpenClaw 核心架构深度解析

## 项目概述

OpenClaw 是一个功能强大的 AI 代理框架，支持多渠道通信、工具调用、记忆管理和多智能体协作。本文档对其核心模块进行源码级别的详细解读。

**分析日期**: 2026-03-12  
**项目仓库**: https://github.com/openclaw/openclaw  
**主要技术栈**: TypeScript, Node.js, SQLite, WebSocket

---

## 目录

1. [PI Agent Runner - 智能体运行循环](#1-pi-agent-runner)
2. [Tools System - 工具注册与管理](#2-tools-system)
3. [Skills & MCP - 技能池与上下文管理](#3-skills-mcp)
4. [Memory Management - 记忆管理系统](#4-memory-management)
5. [Multi-Agent Coordination - 多智能体协作](#5-multi-agent-coordination)
6. [Heartbeat System - 心跳与定时任务](#6-heartbeat-system)
7. [Channel Technology - 渠道对接技术](#7-channel-technology)
8. [Gateway Architecture - 网关架构](#8-gateway-architecture)
9. [Configuration Management - 配置文件管理](#9-configuration-management)

---

## 1. PI Agent Runner - 智能体运行循环

### 1.1 核心架构

PI Agent Runner 是 OpenClaw 的核心执行引擎，负责管理 AI 模型的调用、工具执行和消息流转。

**关键文件**:
- `src/agents/pi-embedded-runner.ts` - 主入口和导出
- `src/agents/pi-embedded-runner/run.ts` - 核心运行逻辑
- `src/agents/pi-embedded-subscribe.ts` - 流式响应订阅
- `src/agents/pi-embedded-helpers.ts` - 辅助函数

### 1.2 运行流程

```typescript
// 核心运行流程（简化版）
export async function runEmbeddedPiAgent(params: {
  sessionKey: string;
  message: string;
  config: OpenClawConfig;
  // ... 其他参数
}): Promise<EmbeddedPiRunResult> {
  // 1. 准备上下文和工具
  const tools = createOpenClawCodingTools({
    agentId: params.agentId,
    sessionKey: params.sessionKey,
    config: params.config,
    // ... 工具配置
  });

  // 2. 加载会话历史
  const history = await loadSessionHistory(params.sessionKey);

  // 3. 构建系统提示词
  const systemPrompt = await buildSystemPrompt({
    config: params.config,
    agentId: params.agentId,
    // ... 上下文信息
  });

  // 4. 调用 AI 模型（流式）
  const stream = await invokeModel({
    messages: [...history, { role: 'user', content: params.message }],
    tools,
    systemPrompt,
    // ... 模型参数
  });

  // 5. 处理流式响应
  for await (const chunk of stream) {
    if (chunk.type === 'text') {
      // 处理文本块
    } else if (chunk.type === 'tool_call') {
      // 执行工具调用
      const result = await executeTool(chunk.tool, chunk.args);
      // 将结果反馈给模型
    }
  }

  // 6. 保存会话状态
  await saveSessionState(params.sessionKey, result);

  return result;
}
```

### 1.3 关键特性

**流式处理**:
- 使用 `pi-embedded-subscribe.ts` 实现流式响应处理
- 支持文本块、工具调用、推理过程的实时流转
- 通过 `onBlockReply` 回调实现增量输出

**工具执行**:
- 工具调用与模型推理交织进行
- 支持同步和异步工具执行
- 工具结果自动注入到对话上下文

**错误处理**:
- `pi-embedded-error-observation.ts` 监控执行错误
- 自动重试机制（compaction）
- 错误信息格式化和用户友好提示

---

## 2. Tools System - 工具注册与管理

### 2.1 工具目录结构

**核心文件**:
- `src/agents/tool-catalog.ts` - 工具分类和配置
- `src/agents/pi-tools.ts` - 工具创建和策略应用
- `src/agents/tool-policy.ts` - 工具访问控制
- `src/agents/bash-tools.ts` - Shell 命令工具
- `src/agents/openclaw-tools.ts` - OpenClaw 专有工具

### 2.2 工具分类体系

```typescript
// 工具按功能分组
const CORE_TOOL_SECTIONS = [
  { id: "fs", label: "Files" },           // 文件操作
  { id: "runtime", label: "Runtime" },    // 运行时执行
  { id: "web", label: "Web" },            // 网络访问
  { id: "memory", label: "Memory" },      // 记忆搜索
  { id: "sessions", label: "Sessions" },  // 会话管理
  { id: "ui", label: "UI" },              // 用户界面
  { id: "messaging", label: "Messaging" },// 消息发送
  { id: "automation", label: "Automation" }, // 自动化
  { id: "nodes", label: "Nodes" },        // 节点管理
  { id: "agents", label: "Agents" },      // 智能体
  { id: "media", label: "Media" },        // 媒体处理
];

// 工具配置文件（Tool Profiles）
const CORE_TOOL_PROFILES = {
  minimal: { allow: ["session_status"] },
  coding: { allow: ["read", "write", "edit", "exec", "web_search", ...] },
  messaging: { allow: ["message", "sessions_list", ...] },
  full: {},  // 允许所有工具
};
```

### 2.3 工具创建流程

```typescript
export function createOpenClawCodingTools(options: {
  agentId?: string;
  sessionKey?: string;
  config?: OpenClawConfig;
  sandbox?: SandboxContext;
  // ... 更多选项
}): AnyAgentTool[] {
  // 1. 解析工具策略
  const { globalPolicy, agentPolicy, profile } = 
    resolveEffectiveToolPolicy({
      config: options.config,
      sessionKey: options.sessionKey,
      agentId: options.agentId,
    });

  // 2. 创建基础工具
  const tools = [
    createReadTool(workspaceRoot),
    createWriteTool(workspaceRoot),
    createEditTool(workspaceRoot),
    createExecTool({ cwd: workspaceRoot, ... }),
    createProcessTool({ scopeKey: sessionKey }),
    ...createOpenClawTools({ ... }),
  ];

  // 3. 应用安全策略
  const filtered = applyToolPolicyPipeline({
    tools,
    steps: [
      { policy: profilePolicy, label: "profile" },
      { policy: globalPolicy, label: "global" },
      { policy: agentPolicy, label: "agent" },
      { policy: sandbox?.tools, label: "sandbox" },
    ],
  });

  // 4. 包装工具（钩子、中止信号等）
  return filtered.map(tool => 
    wrapToolWithAbortSignal(
      wrapToolWithBeforeToolCallHook(tool, { ... }),
      abortSignal
    )
  );
}
```

### 2.4 工具安全机制

**访问控制**:
```typescript
// 工具策略层级（优先级从高到低）
1. Sandbox 策略 - 沙箱环境限制
2. Subagent 策略 - 子智能体限制
3. Group 策略 - 群组/频道限制
4. Agent 策略 - 智能体级别配置
5. Global 策略 - 全局配置
6. Profile 策略 - 预设配置文件
```

**文件系统隔离**:
- `workspaceOnly` 模式：限制文件操作在工作区内
- 沙箱桥接：通过 `fsBridge` 访问容器内文件系统
- 路径守卫：`wrapToolWorkspaceRootGuard` 防止路径遍历

**命令执行安全**:
- `safeBins` 白名单：只允许执行特定命令
- 审批流程：`exec.ask` 配置需要用户确认
- 超时控制：`timeoutSec` 防止长时间运行

---

## 3. Skills & MCP - 技能池与上下文管理

### 3.1 Skills 系统架构

**核心文件**:
- `src/agents/skills.ts` - 技能管理主入口
- `src/agents/skills/workspace.ts` - 工作区技能加载
- `src/agents/skills/config.ts` - 技能配置解析
- `src/agents/skills-install.ts` - 技能安装

### 3.2 技能加载机制

```typescript
// 技能加载流程
export async function loadWorkspaceSkillEntries(params: {
  workspaceDir: string;
  config?: OpenClawConfig;
}): Promise<SkillEntry[]> {
  const skillsDir = path.join(params.workspaceDir, '.kiro/skills');
  
  // 1. 扫描技能目录
  const skillFiles = await fs.readdir(skillsDir);
  
  // 2. 解析每个技能
  const entries = await Promise.all(
    skillFiles.map(async (file) => {
      const content = await fs.readFile(
        path.join(skillsDir, file), 
        'utf-8'
      );
      
      // 3. 提取 frontmatter 元数据
      const { metadata, content: skillContent } = 
        parseFrontmatter(content);
      
      return {
        name: file,
        metadata,
        content: skillContent,
        eligibility: checkEligibility(metadata),
      };
    })
  );
  
  // 4. 过滤和排序
  return entries
    .filter(entry => entry.eligibility.eligible)
    .sort((a, b) => (a.metadata.priority ?? 0) - (b.metadata.priority ?? 0));
}
```

### 3.3 MCP (Model Context Protocol) 集成

**MCP 配置文件**: `.kiro/settings/mcp.json`

```json
{
  "mcpServers": {
    "aws-docs": {
      "command": "uvx",
      "args": ["awslabs.aws-documentation-mcp-server@latest"],
      "env": { "FASTMCP_LOG_LEVEL": "ERROR" },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

**MCP 工具注册**:
- MCP 服务器通过 `uvx` 运行（Python 包管理器）
- 工具自动注册到 OpenClaw 工具系统
- 支持多工作区配置合并（优先级：user < workspace1 < workspace2）

### 3.4 技能与系统提示词

```typescript
// 构建技能提示词
export function buildWorkspaceSkillsPrompt(params: {
  entries: SkillEntry[];
  config?: OpenClawConfig;
}): string {
  const sections = params.entries.map(entry => {
    const header = `## ${entry.metadata.name || entry.name}`;
    const description = entry.metadata.description 
      ? `\n${entry.metadata.description}\n` 
      : '';
    return `${header}${description}\n${entry.content}`;
  });
  
  return sections.join('\n\n---\n\n');
}

// 注入到系统提示词
const systemPrompt = `
${baseSystemPrompt}

# Available Skills

${skillsPrompt}

# Instructions

Use the skills above to assist the user...
`;
```

---

## 4. Memory Management - 记忆管理系统

### 4.1 架构概览

**核心组件**:
- `src/memory/manager.ts` - 记忆索引管理器
- `src/memory/embeddings.ts` - 向量嵌入提供者
- `src/memory/hybrid.ts` - 混合搜索（向量+关键词）
- `src/memory/sqlite.ts` - SQLite 存储后端

### 4.2 记忆索引管理器

```typescript
export class MemoryIndexManager implements MemorySearchManager {
  private db: DatabaseSync;              // SQLite 数据库
  private provider: EmbeddingProvider;   // 嵌入模型
  private watcher: FSWatcher;            // 文件监控
  private sources: Set<MemorySource>;    // 数据源
  
  // 搜索接口
  async search(query: string, opts?: {
    maxResults?: number;
    minScore?: number;
  }): Promise<MemorySearchResult[]> {
    // 1. 生成查询向量
    const queryVec = await this.embedQuery(query);
    
    // 2. 向量搜索
    const vectorResults = await this.searchVector(queryVec, limit);
    
    // 3. 关键词搜索（FTS）
    const keywordResults = await this.searchKeyword(query, limit);
    
    // 4. 混合排序
    return this.mergeHybridResults({
      vector: vectorResults,
      keyword: keywordResults,
      vectorWeight: 0.7,
      textWeight: 0.3,
    });
  }
  
  // 同步文件到索引
  async sync(): Promise<void> {
    // 扫描工作区文件
    const files = await this.scanWorkspace();
    
    // 分块和嵌入
    for (const file of files) {
      const chunks = this.chunkFile(file);
      const embeddings = await this.embedBatch(chunks);
      
      // 存储到数据库
      await this.storeChunks(file, chunks, embeddings);
    }
  }
}
```

### 4.3 数据库模式

```sql
-- 文件表
CREATE TABLE files (
  path TEXT PRIMARY KEY,
  source TEXT NOT NULL,  -- 'memory' | 'sessions'
  hash TEXT,
  size INTEGER,
  mtime INTEGER
);

-- 文本块表
CREATE TABLE chunks (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  source TEXT NOT NULL,
  startLine INTEGER,
  endLine INTEGER,
  text TEXT NOT NULL,
  FOREIGN KEY (path) REFERENCES files(path)
);

-- 向量表（使用 sqlite-vec 扩展）
CREATE VIRTUAL TABLE chunks_vec USING vec0(
  chunk_id TEXT PRIMARY KEY,
  embedding FLOAT[1536]  -- 向量维度
);

-- 全文搜索表
CREATE VIRTUAL TABLE chunks_fts USING fts5(
  chunk_id,
  text,
  content=chunks,
  content_rowid=rowid
);

-- 嵌入缓存表
CREATE TABLE embedding_cache (
  text_hash TEXT PRIMARY KEY,
  provider_model TEXT NOT NULL,
  embedding BLOB NOT NULL,
  created_at INTEGER
);
```

### 4.4 混合搜索算法

```typescript
// 混合搜索实现
export async function mergeHybridResults(params: {
  vector: Array<{ id: string; vectorScore: number; ... }>;
  keyword: Array<{ id: string; textScore: number; ... }>;
  vectorWeight: number;  // 0.7
  textWeight: number;    // 0.3
  mmr?: { enabled: boolean; lambda: number };
  temporalDecay?: { enabled: boolean; halfLifeDays: number };
}): Promise<MemorySearchResult[]> {
  // 1. 归一化分数
  const normalizedVector = normalizeScores(params.vector);
  const normalizedKeyword = normalizeScores(params.keyword);
  
  // 2. 合并结果
  const merged = new Map<string, MemorySearchResult>();
  
  for (const result of normalizedVector) {
    merged.set(result.id, {
      ...result,
      score: result.vectorScore * params.vectorWeight,
    });
  }
  
  for (const result of normalizedKeyword) {
    const existing = merged.get(result.id);
    if (existing) {
      existing.score += result.textScore * params.textWeight;
    } else {
      merged.set(result.id, {
        ...result,
        score: result.textScore * params.textWeight,
      });
    }
  }
  
  // 3. 应用 MMR（最大边际相关性）去重
  if (params.mmr?.enabled) {
    return applyMMR(Array.from(merged.values()), params.mmr.lambda);
  }
  
  // 4. 应用时间衰减
  if (params.temporalDecay?.enabled) {
    return applyTemporalDecay(
      Array.from(merged.values()), 
      params.temporalDecay.halfLifeDays
    );
  }
  
  // 5. 排序返回
  return Array.from(merged.values())
    .sort((a, b) => b.score - a.score);
}
```

### 4.5 嵌入提供者

支持的嵌入模型:
- **OpenAI**: `text-embedding-3-small`, `text-embedding-3-large`
- **Google Gemini**: `text-embedding-004`
- **Voyage AI**: `voyage-3`, `voyage-3-lite`
- **Mistral**: `mistral-embed`
- **Ollama**: 本地模型（如 `nomic-embed-text`）

---

## 5. Multi-Agent Coordination - 多智能体协作

### 5.1 子智能体系统

**核心文件**:
- `src/agents/subagent-registry.ts` - 子智能体注册表
- `src/agents/subagent-spawn.ts` - 子智能体生成
- `src/agents/subagent-announce.ts` - 子智能体通知
- `src/agents/sessions-spawn-hooks.ts` - 生成钩子

### 5.2 子智能体生成流程

```typescript
// sessions_spawn 工具实现
export async function spawnSubagent(params: {
  prompt: string;
  agentId?: string;
  model?: string;
  timeout?: number;
  thinking?: 'low' | 'medium' | 'high';
}): Promise<SubagentResult> {
  // 1. 生成子智能体 ID
  const subagentId = generateSubagentId();
  const sessionKey = `${params.agentId}:subagent:${subagentId}`;
  
  // 2. 注册子智能体
  await registerSubagent({
    id: subagentId,
    parentSessionKey: currentSessionKey,
    sessionKey,
    prompt: params.prompt,
    status: 'pending',
  });
  
  // 3. 启动子智能体运行
  const runPromise = runEmbeddedPiAgent({
    sessionKey,
    message: params.prompt,
    config: inheritedConfig,
    timeout: params.timeout,
    thinking: params.thinking,
  });
  
  // 4. 监听子智能体事件
  const announcePromise = waitForSubagentAnnounce(subagentId);
  
  // 5. 等待完成或超时
  const result = await Promise.race([
    runPromise,
    announcePromise,
    timeout(params.timeout),
  ]);
  
  // 6. 更新状态
  await updateSubagentStatus(subagentId, 'completed');
  
  return {
    id: subagentId,
    output: result.text,
    status: 'completed',
  };
}
```

### 5.3 子智能体通信

**Announce 机制**:
```typescript
// 子智能体向父智能体发送消息
export async function announceToParent(params: {
  subagentId: string;
  message: string;
  attachments?: Attachment[];
}): Promise<void> {
  const registry = getSubagentRegistry();
  const subagent = registry.get(params.subagentId);
  
  if (!subagent) {
    throw new Error(`Subagent ${params.subagentId} not found`);
  }
  
  // 1. 构建通知消息
  const announcement = {
    type: 'announce',
    from: params.subagentId,
    to: subagent.parentSessionKey,
    message: params.message,
    attachments: params.attachments,
    timestamp: Date.now(),
  };
  
  // 2. 发送到父智能体的消息队列
  await enqueueMessage(subagent.parentSessionKey, announcement);
  
  // 3. 触发父智能体的 announce 回调
  const parentRun = getActiveRun(subagent.parentSessionKey);
  if (parentRun?.onAnnounce) {
    await parentRun.onAnnounce(announcement);
  }
}
```

### 5.4 子智能体策略

**工具限制**:
```typescript
// 子智能体工具策略
const subagentPolicy = {
  allow: [
    'read',
    'write',
    'edit',
    'exec',
    'web_search',
    'memory_search',
    // 禁止子智能体再生成子智能体
    // 'sessions_spawn',
  ],
  deny: [
    'sessions_spawn',  // 防止无限递归
    'gateway',         // 禁止网关控制
    'cron',            // 禁止定时任务
  ],
};
```

**深度限制**:
```typescript
// 最大嵌套深度
const MAX_SUBAGENT_DEPTH = 3;

function checkSubagentDepth(sessionKey: string): number {
  let depth = 0;
  let current = sessionKey;
  
  while (current) {
    const parsed = parseAgentSessionKey(current);
    if (!parsed?.spawnedBy) break;
    
    depth++;
    current = parsed.spawnedBy;
    
    if (depth > MAX_SUBAGENT_DEPTH) {
      throw new Error('Maximum subagent depth exceeded');
    }
  }
  
  return depth;
}
```

---

## 6. Heartbeat System - 心跳与定时任务

### 6.1 心跳系统架构

**核心文件**:
- `src/infra/heartbeat-runner.ts` - 心跳运行器
- `src/auto-reply/heartbeat.ts` - 心跳配置和逻辑
- `src/infra/heartbeat-events.ts` - 心跳事件
- `src/cron/service.ts` - Cron 服务

### 6.2 心跳运行器实现

```typescript
export function startHeartbeatRunner(params: {
  cfg: OpenClawConfig;
}): HeartbeatRunner {
  const agents = resolveHeartbeatAgents(params.cfg);
  const timers = new Map<string, NodeJS.Timeout>();
  
  // 为每个智能体启动心跳定时器
  for (const agent of agents) {
    const intervalMs = resolveHeartbeatIntervalMs(
      params.cfg, 
      undefined, 
      agent.heartbeat
    );
    
    if (!intervalMs) continue;
    
    const timer = setInterval(async () => {
      // 检查是否在活跃时间段
      if (!isWithinActiveHours(params.cfg, agent.heartbeat)) {
        return;
      }
      
      // 检查是否有正在进行的请求
      if (getQueueSize() > 0) {
        return;
      }
      
      // 运行心跳
      await runHeartbeatOnce({
        cfg: params.cfg,
        agentId: agent.agentId,
        heartbeat: agent.heartbeat,
        reason: 'scheduled',
      });
    }, intervalMs);
    
    timers.set(agent.agentId, timer);
  }
  
  return {
    stop: () => {
      for (const timer of timers.values()) {
        clearInterval(timer);
      }
      timers.clear();
    },
    updateConfig: (cfg: OpenClawConfig) => {
      // 重新加载配置并更新定时器
    },
  };
}
```

### 6.3 心跳执行流程

```typescript
export async function runHeartbeatOnce(opts: {
  cfg: OpenClawConfig;
  agentId: string;
  heartbeat?: HeartbeatConfig;
  reason?: string;
}): Promise<HeartbeatRunResult> {
  // 1. 预检查
  const preflight = await resolveHeartbeatPreflight({
    cfg: opts.cfg,
    agentId: opts.agentId,
    heartbeat: opts.heartbeat,
    reason: opts.reason,
  });
  
  // 2. 检查 HEARTBEAT.md 文件
  const heartbeatFile = path.join(workspaceDir, 'HEARTBEAT.md');
  const content = await fs.readFile(heartbeatFile, 'utf-8');
  
  if (isHeartbeatContentEffectivelyEmpty(content)) {
    return { status: 'skipped', reason: 'empty-heartbeat-file' };
  }
  
  // 3. 构建心跳提示词
  const prompt = resolveHeartbeatPrompt(opts.cfg, opts.heartbeat);
  
  // 4. 运行智能体
  const result = await getReplyFromConfig({
    Body: prompt,
    SessionKey: sessionKey,
    Provider: 'heartbeat',
  }, { isHeartbeat: true }, opts.cfg);
  
  // 5. 处理响应
  const normalized = normalizeHeartbeatReply(
    result, 
    responsePrefix, 
    ackMaxChars
  );
  
  // 6. 判断是否需要发送
  if (normalized.shouldSkip) {
    // HEARTBEAT_OK - 无需通知用户
    await pruneHeartbeatTranscript(transcriptState);
    return { status: 'ok-token' };
  }
  
  // 7. 发送心跳消息
  await deliverOutboundPayloads({
    channel: delivery.channel,
    to: delivery.to,
    payloads: [{ text: normalized.text }],
  });
  
  return { status: 'ran', durationMs: Date.now() - startedAt };
}
```

### 6.4 HEARTBEAT_OK 机制

**智能过滤**:
```typescript
// 心跳响应标准化
function normalizeHeartbeatReply(
  payload: ReplyPayload,
  responsePrefix: string | undefined,
  ackMaxChars: number
): { shouldSkip: boolean; text: string; hasMedia: boolean } {
  const rawText = payload.text || '';
  
  // 1. 移除响应前缀
  const textForStrip = stripLeadingHeartbeatResponsePrefix(
    rawText, 
    responsePrefix
  );
  
  // 2. 检测 HEARTBEAT_OK 标记
  const stripped = stripHeartbeatToken(textForStrip, {
    mode: 'heartbeat',
    maxAckChars: ackMaxChars,
  });
  
  // 3. 判断是否跳过
  const hasMedia = Boolean(
    payload.mediaUrl || 
    (payload.mediaUrls?.length ?? 0) > 0
  );
  
  if (stripped.shouldSkip && !hasMedia) {
    return { shouldSkip: true, text: '', hasMedia };
  }
  
  // 4. 恢复响应前缀
  let finalText = stripped.text;
  if (responsePrefix && finalText && !finalText.startsWith(responsePrefix)) {
    finalText = `${responsePrefix} ${finalText}`;
  }
  
  return { shouldSkip: false, text: finalText, hasMedia };
}
```

**转录剪枝**:
```typescript
// 移除 HEARTBEAT_OK 的对话记录
async function pruneHeartbeatTranscript(params: {
  transcriptPath?: string;
  preHeartbeatSize?: number;
}): Promise<void> {
  if (!params.transcriptPath || !params.preHeartbeatSize) {
    return;
  }
  
  try {
    const stat = await fs.stat(params.transcriptPath);
    
    // 只有文件增长时才截断
    if (stat.size > params.preHeartbeatSize) {
      await fs.truncate(params.transcriptPath, params.preHeartbeatSize);
    }
  } catch {
    // 文件可能不存在或已被删除 - 忽略错误
  }
}
```

### 6.5 Cron 定时任务

**Cron 服务**:
```typescript
// Cron 任务调度
export class CronService {
  private jobs: Map<string, CronJob>;
  private store: CronStore;
  
  async start(): Promise<void> {
    // 1. 加载持久化的任务
    const jobs = await this.store.loadJobs();
    
    // 2. 为每个任务设置定时器
    for (const job of jobs) {
      this.scheduleJob(job);
    }
  }
  
  private scheduleJob(job: CronJob): void {
    const nextRun = this.calculateNextRun(job.schedule);
    const delay = nextRun - Date.now();
    
    const timer = setTimeout(async () => {
      // 执行任务
      await this.executeJob(job);
      
      // 重新调度
      if (job.type === 'recurring') {
        this.scheduleJob(job);
      }
    }, delay);
    
    this.jobs.set(job.id, { ...job, timer });
  }
  
  private async executeJob(job: CronJob): Promise<void> {
    // 运行智能体处理 cron 事件
    await runHeartbeatOnce({
      cfg: this.config,
      agentId: job.agentId,
      reason: `cron:${job.id}`,
    });
  }
}
```

---

## 7. Channel Technology - 渠道对接技术

### 7.1 渠道插件架构

**支持的渠道**:
- Discord
- Telegram
- Slack
- Signal
- iMessage
- WhatsApp (Web)
- LINE
- 扩展渠道（通过插件）

**核心文件**:
- `src/channels/plugins/index.ts` - 渠道插件注册
- `src/channels/registry.ts` - 渠道注册表
- `src/discord/monitor.ts` - Discord 监控
- `src/telegram/bot.ts` - Telegram Bot
- `src/slack/monitor.ts` - Slack 监控

### 7.2 渠道插件接口

```typescript
// 渠道插件定义
export interface ChannelPlugin {
  id: ChannelId;
  name: string;
  
  // 启动监控
  startMonitor(params: {
    cfg: OpenClawConfig;
    accountId?: string;
    onMessage: (envelope: InboundEnvelope) => Promise<void>;
  }): Promise<ChannelMonitor>;
  
  // 发送消息
  send(params: {
    cfg: OpenClawConfig;
    accountId?: string;
    to: string;
    text: string;
    mediaUrls?: string[];
    threadId?: string;
  }): Promise<SendResult>;
  
  // 探测配置
  probe(params: {
    cfg: OpenClawConfig;
    accountId?: string;
  }): Promise<ProbeResult>;
  
  // 可选：心跳检查
  heartbeat?: {
    checkReady(params: {
      cfg: OpenClawConfig;
      accountId?: string;
    }): Promise<{ ok: boolean; reason?: string }>;
  };
}
```

### 7.3 消息路由

```typescript
// 入站消息处理
export async function handleInboundMessage(
  envelope: InboundEnvelope
): Promise<void> {
  // 1. 解析会话键
  const sessionKey = resolveSessionKey({
    channel: envelope.channel,
    accountId: envelope.accountId,
    senderId: envelope.senderId,
    groupId: envelope.groupId,
  });
  
  // 2. 检查访问控制
  const allowed = await checkAllowlist({
    config: loadConfig(),
    channel: envelope.channel,
    accountId: envelope.accountId,
    senderId: envelope.senderId,
    groupId: envelope.groupId,
  });
  
  if (!allowed) {
    return; // 静默忽略未授权消息
  }
  
  // 3. 提取消息内容
  const { text, mediaUrls, attachments } = envelope;
  
  // 4. 检测命令
  const command = detectCommand(text);
  if (command) {
    return await handleCommand(command, envelope);
  }
  
  // 5. 触发自动回复
  await triggerAutoReply({
    sessionKey,
    message: text,
    mediaUrls,
    attachments,
    envelope,
  });
}
```

### 7.4 Discord 集成示例

```typescript
// Discord 监控器
export async function startDiscordMonitor(params: {
  cfg: OpenClawConfig;
  accountId?: string;
  onMessage: (envelope: InboundEnvelope) => Promise<void>;
}): Promise<ChannelMonitor> {
  const token = resolveDiscordToken(params.cfg, params.accountId);
  
  // 1. 创建 Discord 客户端
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
  });
  
  // 2. 监听消息事件
  client.on('messageCreate', async (message) => {
    // 忽略机器人自己的消息
    if (message.author.id === client.user?.id) {
      return;
    }
    
    // 3. 构建入站信封
    const envelope: InboundEnvelope = {
      channel: 'discord',
      accountId: params.accountId,
      senderId: message.author.id,
      senderName: message.author.username,
      groupId: message.guildId || undefined,
      groupChannel: message.channelId,
      text: message.content,
      mediaUrls: message.attachments.map(a => a.url),
      threadId: message.reference?.messageId,
      timestamp: message.createdTimestamp,
    };
    
    // 4. 触发消息处理
    await params.onMessage(envelope);
  });
  
  // 5. 登录
  await client.login(token);
  
  return {
    stop: async () => {
      await client.destroy();
    },
  };
}
```

---

## 8. Gateway Architecture - 网关架构

### 8.1 网关服务器

**核心文件**:
- `src/gateway/server.impl.ts` - 网关实现
- `src/gateway/server-methods.ts` - RPC 方法
- `src/gateway/server-chat.ts` - 聊天处理
- `src/gateway/server-ws-runtime.ts` - WebSocket 运行时

### 8.2 网关启动流程

```typescript
export async function startGatewayServer(
  port = 18789,
  opts: GatewayServerOptions = {}
): Promise<GatewayServer> {
  // 1. 加载配置
  const cfg = await loadConfig();
  
  // 2. 初始化认证
  const auth = await ensureGatewayStartupAuth({
    cfg,
    authOverride: opts.auth,
  });
  
  // 3. 加载插件
  const { pluginRegistry, gatewayMethods } = loadGatewayPlugins({
    cfg,
    workspaceDir: defaultWorkspaceDir,
  });
  
  // 4. 创建 HTTP/WebSocket 服务器
  const { httpServer, wss } = await createGatewayRuntimeState({
    cfg,
    bindHost: opts.host || '127.0.0.1',
    port,
    resolvedAuth: auth,
    pluginRegistry,
  });
  
  // 5. 启动渠道监控
  await startChannels(cfg);
  
  // 6. 启动心跳运行器
  const heartbeatRunner = startHeartbeatRunner({ cfg });
  
  // 7. 启动 Cron 服务
  await cron.start();
  
  // 8. 启动发现服务（mDNS/Bonjour）
  const discovery = await startGatewayDiscovery({
    port,
    machineDisplayName: await getMachineDisplayName(),
  });
  
  return {
    close: async (opts) => {
      // 清理资源
      heartbeatRunner.stop();
      await cron.stop();
      await discovery.bonjourStop();
      await stopChannels();
      httpServer.close();
    },
  };
}
```

### 8.3 WebSocket RPC 协议

```typescript
// WebSocket 消息格式
type WSMessage = {
  id: string;           // 请求 ID
  method: string;       // RPC 方法名
  params?: unknown;     // 参数
};

type WSResponse = {
  id: string;           // 对应请求 ID
  result?: unknown;     // 成功结果
  error?: {             // 错误信息
    code: number;
    message: string;
  };
};

// RPC 方法注册
const gatewayMethods = {
  // 聊天相关
  'chat.send': handleChatSend,
  'chat.abort': handleChatAbort,
  
  // 会话管理
  'sessions.list': handleSessionsList,
  'sessions.get': handleSessionsGet,
  'sessions.delete': handleSessionsDelete,
  
  // 渠道管理
  'channels.status': handleChannelsStatus,
  'channels.start': handleChannelsStart,
  'channels.stop': handleChannelsStop,
  
  // 节点管理
  'nodes.list': handleNodesList,
  'nodes.invoke': handleNodesInvoke,
  
  // 配置管理
  'config.get': handleConfigGet,
  'config.set': handleConfigSet,
  'config.reload': handleConfigReload,
  
  // 模型管理
  'models.list': handleModelsList,
  'models.probe': handleModelsProbe,
};
```

### 8.4 聊天处理流程

```typescript
// chat.send 方法实现
async function handleChatSend(params: {
  sessionKey: string;
  message: string;
  attachments?: Attachment[];
  model?: string;
  thinking?: 'low' | 'medium' | 'high';
}): Promise<ChatSendResult> {
  // 1. 生成运行 ID
  const runId = generateRunId();
  
  // 2. 创建中止控制器
  const abortController = new AbortController();
  chatAbortControllers.set(runId, abortController);
  
  // 3. 启动智能体运行
  const runPromise = runEmbeddedPiAgent({
    sessionKey: params.sessionKey,
    message: params.message,
    attachments: params.attachments,
    modelOverride: params.model,
    thinking: params.thinking,
    abortSignal: abortController.signal,
    
    // 流式回调
    onBlockReply: (block) => {
      // 广播到所有连接的客户端
      broadcast('chat.delta', {
        runId,
        sessionKey: params.sessionKey,
        delta: block.text,
        type: block.type,
      });
    },
    
    onToolCall: (tool) => {
      broadcast('chat.tool', {
        runId,
        sessionKey: params.sessionKey,
        tool: tool.name,
        args: tool.args,
      });
    },
  });
  
  // 4. 等待完成
  const result = await runPromise;
  
  // 5. 清理
  chatAbortControllers.delete(runId);
  
  return {
    runId,
    text: result.text,
    usage: result.usage,
  };
}
```
