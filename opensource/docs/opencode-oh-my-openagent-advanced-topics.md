# OpenCode & Oh-My-OpenAgent 高级主题

**生成时间**: 2026-03-12  
**配套文档**: 
- opencode-oh-my-openagent-deep-analysis.md
- opencode-oh-my-openagent-practical-guide.md

---

## 目录

1. [性能调优](#1-性能调优)
2. [最佳实践](#2-最佳实践)
3. [架构扩展](#3-架构扩展)
4. [监控与调试](#4-监控与调试)
5. [生产部署](#5-生产部署)

---

## 1. 性能调优

### 1.1 后台任务优化

```jsonc
{
  "background_task": {
    // 并发控制
    "max_concurrent": 5,
    
    // 超时设置
    "timeout_ms": 300000,
    
    // 同步轮询超时
    "syncPollTimeoutMs": 60000,
    
    // 队列大小限制
    "max_queue_size": 100,
    
    // 优先级队列
    "enable_priority_queue": true
  }
}
```

**优化策略**:

1. **并发限制**: 根据系统资源调整
   - 低端机器: 2-3
   - 中端机器: 5-8
   - 高端机器: 10-15

2. **超时管理**: 防止任务挂起
   - 快速任务: 30秒
   - 中等任务: 5分钟
   - 长期任务: 30分钟

3. **队列管理**: 防止内存溢出
   - 监控队列大小
   - 实现背压机制
   - 定期清理过期任务

### 1.2 缓存策略

```typescript
// 实现智能缓存
class SmartCache {
  private cache = new Map<string, CacheEntry>()
  private ttl = new Map<string, number>()
  
  set(key: string, value: any, ttlMs: number = 5 * 60 * 1000) {
    this.cache.set(key, {
      value,
      createdAt: Date.now(),
    })
    
    // 设置过期时间
    this.ttl.set(key, Date.now() + ttlMs)
    
    // 定期清理
    setTimeout(() => this.cleanup(key), ttlMs)
  }
  
  get(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    // 检查是否过期
    const expiry = this.ttl.get(key)
    if (expiry && Date.now() > expiry) {
      this.cache.delete(key)
      this.ttl.delete(key)
      return null
    }
    
    return entry.value
  }
  
  private cleanup(key: string) {
    this.cache.delete(key)
    this.ttl.delete(key)
  }
}
```

### 1.3 数据库优化

```typescript
// 批量操作
async function batchInsertSessions(sessions: Session[]) {
  const batchSize = 100
  
  for (let i = 0; i < sessions.length; i += batchSize) {
    const batch = sessions.slice(i, i + batchSize)
    
    await Database.use((db) => {
      db.insert(SessionTable)
        .values(batch.map(toRow))
        .run()
    })
  }
}

// 索引优化
// 在常用查询字段上创建索引
// - session.project_id
// - session.time_updated
// - message.session_id
// - part.message_id

// 查询优化
async function getSessionsOptimized(projectId: string) {
  return Database.use((db) =>
    db
      .select()
      .from(SessionTable)
      .where(eq(SessionTable.project_id, projectId))
      .orderBy(desc(SessionTable.time_updated))
      .limit(100)
      .all()
  )
}
```

---

## 2. 最佳实践

### 2.1 智能体设计最佳实践

```typescript
// ✅ 好的实践
export function createSpecializedAgent(model: string): AgentConfig {
  return {
    name: "specialized-agent",
    description: "Focused on specific domain",
    model,
    
    // 明确的职责
    prompt: `
You are specialized in [domain].

Your core responsibilities:
1. [Specific task 1]
2. [Specific task 2]

Constraints:
- Do not attempt [out-of-scope task]
- Always validate [specific requirement]
    `.trim(),
    
    // 合理的温度设置
    temperature: 0.3, // 低温度 = 更确定性
  }
}

// ❌ 不好的实践
export function createBadAgent(model: string): AgentConfig {
  return {
    name: "bad-agent",
    description: "Does everything", // 太宽泛
    model,
    
    // 过于通用的提示词
    prompt: "You are a helpful assistant",
    
    // 过高的温度
    temperature: 1.0, // 太随机
  }
}
```

### 2.2 工具设计最佳实践

```typescript
// ✅ 好的工具设计
export const goodTool: ToolDefinition = {
  name: "analyze_code",
  description: "Analyze code for quality issues",
  
  args: {
    filePath: z.string()
      .describe("Path to file to analyze")
      .refine(p => p.endsWith(".ts") || p.endsWith(".js"),
        "Only TypeScript and JavaScript files"),
    
    checks: z.array(z.enum(["syntax", "types", "performance"]))
      .optional()
      .describe("Specific checks to run"),
  },
  
  execute: async (params, ctx) => {
    // 1. 输入验证
    if (!params.filePath) {
      return { error: "File path is required" }
    }
    
    // 2. 安全检查
    const fullPath = path.resolve(ctx.directory, params.filePath)
    if (!fullPath.startsWith(ctx.directory)) {
      return { error: "Path traversal not allowed" }
    }
    
    // 3. 执行操作
    try {
      const result = await analyzeCode(fullPath, params.checks)
      return { success: true, data: result }
    } catch (error) {
      return { error: String(error) }
    }
  }
}

// ❌ 不好的工具设计
export const badTool: ToolDefinition = {
  name: "do_something",
  description: "Does something", // 不清楚
  
  args: {
    input: z.any(), // 太宽泛
  },
  
  execute: async (params) => {
    // 没有错误处理
    return await someOperation(params.input)
  }
}
```

### 2.3 钩子设计最佳实践

```typescript
// ✅ 好的钩子设计
export function createGoodHook(): Hook {
  return {
    "chat.message": async (input, output) => {
      // 1. 快速检查
      if (!shouldProcess(input)) {
        return
      }
      
      // 2. 安全操作
      try {
        const enhancement = await enhanceMessage(input)
        output.system.push(enhancement)
      } catch (error) {
        // 记录但不中断
        console.error("[hook] Enhancement failed:", error)
      }
      
      // 3. 性能考虑
      if (output.system.length > 10000) {
        // 避免过大的系统提示
        output.system = output.system.slice(0, 10000)
      }
    }
  }
}

// ❌ 不好的钩子设计
export function createBadHook(): Hook {
  return {
    "chat.message": async (input, output) => {
      // 没有错误处理
      const result = await expensiveOperation(input)
      
      // 无限制地添加内容
      output.system.push(result)
      
      // 阻塞操作
      await sleep(5000)
    }
  }
}
```

---

## 3. 架构扩展

### 3.1 自定义管理器

```typescript
// 创建自定义管理器
export class CustomManager {
  private state = new Map<string, any>()
  
  async initialize(): Promise<void> {
    // 初始化逻辑
  }
  
  async cleanup(): Promise<void> {
    // 清理逻辑
    this.state.clear()
  }
  
  // 在插件中使用
  async execute(sessionId: string, task: Task): Promise<Result> {
    const context = this.state.get(sessionId) || {}
    
    try {
      const result = await task.execute(context)
      this.state.set(sessionId, { ...context, lastResult: result })
      return result
    } catch (error) {
      this.state.set(sessionId, { ...context, error })
      throw error
    }
  }
}

// 在插件中集成
export async function createManagers(args: {
  ctx: PluginContext
  pluginConfig: OhMyOpenCodeConfig
}): Promise<Managers> {
  const customManager = new CustomManager()
  await customManager.initialize()
  
  return {
    // ... 其他管理器
    customManager,
  }
}
```

### 3.2 自定义钩子链

```typescript
// 创建钩子链
export class HookChain {
  private hooks: Hook[] = []
  
  add(hook: Hook): this {
    this.hooks.push(hook)
    return this
  }
  
  async execute(
    event: string,
    input: any,
    output: any
  ): Promise<void> {
    for (const hook of this.hooks) {
      const handler = hook[event]
      if (handler) {
        await handler(input, output)
      }
    }
  }
}

// 使用
const chain = new HookChain()
  .add(createValidationHook())
  .add(createEnhancementHook())
  .add(createMonitoringHook())

await chain.execute("chat.message", input, output)
```

---

## 4. 监控与调试

### 4.1 性能监控

```typescript
// 性能监控工具
export class PerformanceMonitor {
  private metrics = new Map<string, Metric[]>()
  
  startTimer(label: string): () => void {
    const startTime = performance.now()
    
    return () => {
      const duration = performance.now() - startTime
      
      if (!this.metrics.has(label)) {
        this.metrics.set(label, [])
      }
      
      this.metrics.get(label)!.push({
        duration,
        timestamp: Date.now(),
      })
      
      // 记录慢操作
      if (duration > 1000) {
        console.warn(`[Slow] ${label} took ${duration.toFixed(2)}ms`)
      }
    }
  }
  
  getStats(label: string) {
    const metrics = this.metrics.get(label) || []
    const durations = metrics.map(m => m.duration)
    
    return {
      count: durations.length,
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      p95: this.percentile(durations, 0.95),
    }
  }
  
  private percentile(arr: number[], p: number): number {
    const sorted = arr.sort((a, b) => a - b)
    const index = Math.ceil(sorted.length * p) - 1
    return sorted[index]
  }
}
```

### 4.2 调试工具

```typescript
// 调试助手
export class DebugHelper {
  static logHookExecution(
    hookName: string,
    event: string,
    input: any,
    output: any
  ) {
    console.log(`[Hook] ${hookName}:${event}`)
    console.log("  Input:", JSON.stringify(input, null, 2))
    console.log("  Output:", JSON.stringify(output, null, 2))
  }
  
  static logToolExecution(
    toolName: string,
    params: any,
    result: any,
    duration: number
  ) {
    console.log(`[Tool] ${toolName} (${duration}ms)`)
    console.log("  Params:", JSON.stringify(params, null, 2))
    console.log("  Result:", JSON.stringify(result, null, 2))
  }
  
  static dumpSessionState(sessionId: string, state: SessionState) {
    console.log(`[Session] ${sessionId}`)
    console.log("  Agent:", state.agentID)
    console.log("  Model:", state.currentModel)
    console.log("  Tools Used:", Array.from(state.toolsUsed))
    console.log("  Memories:", state.memories.length)
  }
}
```

---

## 5. 生产部署

### 5.1 部署检查清单

```bash
# 部署前检查
□ 运行所有测试
  bun test

□ 类型检查
  bun run typecheck

□ 代码检查
  bun run lint

□ 构建验证
  bun run build

□ 配置验证
  bunx oh-my-opencode doctor

□ 性能基准测试
  bun run benchmark

□ 安全审计
  npm audit
```

### 5.2 生产配置

```jsonc
{
  // 禁用开发功能
  "experimental": {
    "safe_hook_creation": false,
    "task_system": true
  },
  
  // 优化性能
  "background_task": {
    "max_concurrent": 10,
    "timeout_ms": 600000
  },
  
  // 禁用不必要的智能体
  "disabled_agents": [
    "momus"
  ],
  
  // 禁用调试钩子
  "disabled_hooks": [
    "auto-update-checker",
    "comment-checker"
  ],
  
  // 日志配置
  "logging": {
    "level": "info",
    "format": "json",
    "output": "/var/log/opencode/app.log"
  }
}
```

### 5.3 监控和告警

```typescript
// 设置监控
export function setupMonitoring() {
  // 1. 性能监控
  const monitor = new PerformanceMonitor()
  
  // 2. 错误追踪
  process.on("uncaughtException", (error) => {
    console.error("[Fatal]", error)
    // 发送告警
    alerting.sendAlert({
      severity: "critical",
      message: error.message,
      stack: error.stack,
    })
  })
  
  // 3. 资源监控
  setInterval(() => {
    const usage = process.memoryUsage()
    if (usage.heapUsed > 1024 * 1024 * 1024) { // 1GB
      alerting.sendAlert({
        severity: "warning",
        message: "High memory usage",
        memory: usage,
      })
    }
  }, 60000)
}
```

---

## 总结

这份高级主题文档涵盖了：

1. **性能优化**: 并发控制、缓存策略、数据库优化
2. **最佳实践**: 智能体、工具、钩子的设计原则
3. **架构扩展**: 自定义管理器和钩子链
4. **监控调试**: 性能监控和调试工具
5. **生产部署**: 部署检查清单和监控告警

通过遵循这些指南，可以构建高性能、可靠的AI编程助手系统。
