# OpenCode & Oh-My-OpenAgent 实践指南

**生成时间**: 2026-03-12  
**配套文档**: opencode-oh-my-openagent-deep-analysis.md

---

## 目录

1. [快速开始](#1-快速开始)
2. [自定义智能体开发](#2-自定义智能体开发)
3. [工具开发指南](#3-工具开发指南)
4. [钩子开发指南](#4-钩子开发指南)
5. [技能开发指南](#5-技能开发指南)
6. [常见问题解决](#6-常见问题解决)
7. [性能调优](#7-性能调优)
8. [最佳实践](#8-最佳实践)

---

## 1. 快速开始

### 1.1 OpenCode 基础使用

```bash
# 安装
npm install -g opencode

# 初始化项目
cd your-project
opencode init

# 启动交互式会话
opencode run

# 启动服务器模式
opencode serve --port 3000
```

### 1.2 Oh-My-OpenAgent 安装

```bash
# 交互式安装
bunx oh-my-opencode install

# 验证安装
bunx oh-my-opencode doctor

# 查看配置
cat .opencode/oh-my-opencode.jsonc
```

### 1.3 第一个自定义配置

创建 `.opencode/oh-my-opencode.jsonc`:

```jsonc
{
  "agents": {
    "sisyphus": {
      "model": "anthropic/claude-sonnet-4",
      "temperature": 0.7
    }
  },
  "categories": {
    "my-category": {
      "description": "My custom category",
      "model": "openai/gpt-4-turbo"
    }
  },
  "background_task": {
    "max_concurrent": 3
  }
}
```

---

## 2. 自定义智能体开发

### 2.1 创建简单智能体

在 `.opencode/agents/` 目录创建 `my-agent.ts`:

```typescript
import type { AgentConfig } from "@opencode-ai/sdk"

export default function createMyAgent(model: string): AgentConfig {
  return {
    name: "my-agent",
    description: "My custom agent for specific tasks",
    model,
    temperature: 0.5,
    prompt: `
You are a specialized agent for [specific domain].

Your responsibilities:
1. [Responsibility 1]
2. [Responsibility 2]
3. [Responsibility 3]

Guidelines:
- Be concise and precise
- Focus on [specific aspect]
- Always validate [specific requirement]
    `.trim(),
  }
}

// 导出工厂函数的模式属性
createMyAgent.mode = "subagent" as const
```

### 2.2 带技能的智能体

```typescript
export default function createAdvancedAgent(model: string): AgentConfig {
  return {
    name: "advanced-agent",
    description: "Advanced agent with skills",
    model,
    
    // 关联技能
    skills: ["git-workflow", "testing-best-practices"],
    
    // 关联分类
    category: "backend",
    
    prompt: `
You are an advanced backend development agent.

Available skills:
- Git workflow management
- Testing best practices

Use these skills when appropriate.
    `.trim(),
  }
}
```

### 2.3 智能体元数据配置

```typescript
import type { AgentPromptMetadata } from "../types"

export const MY_AGENT_METADATA: AgentPromptMetadata = {
  category: "specialist",
  cost: "CHEAP",
  
  triggers: [
    {
      domain: "Database Operations",
      trigger: "When user mentions SQL, database schema, or queries"
    },
    {
      domain: "Data Migration",
      trigger: "When migrating data between systems"
    }
  ],
  
  useWhen: [
    "Database schema design needed",
    "SQL query optimization required",
    "Data migration planning"
  ],
  
  avoidWhen: [
    "Frontend UI work",
    "Simple CRUD operations"
  ],
  
  keyTrigger: "Database mentioned → fire database-expert",
  
  promptAlias: "DB Expert"
}

export default function createDatabaseAgent(model: string): AgentConfig {
  return {
    name: "database-expert",
    description: "Database design and optimization specialist",
    model,
    prompt: "You are a database expert...",
  }
}

createDatabaseAgent.mode = "subagent" as const
```

---

## 3. 工具开发指南

### 3.1 创建基础工具

在 `.opencode/tools/` 目录创建 `my-tool.ts`:

```typescript
import type { ToolDefinition } from "@opencode-ai/plugin"
import { z } from "zod"

export const myTool: ToolDefinition = {
  name: "my_tool",
  description: "Description of what this tool does",
  
  args: {
    input: z.string().describe("Input parameter description"),
    options: z.object({
      verbose: z.boolean().optional(),
      format: z.enum(["json", "text"]).optional(),
    }).optional(),
  },
  
  execute: async (params, ctx) => {
    // 访问上下文
    const { directory, worktree, sessionId } = ctx
    
    // 执行工具逻辑
    const result = await performOperation(params.input, params.options)
    
    // 返回结果
    return {
      success: true,
      data: result,
      message: "Operation completed successfully"
    }
  }
}

// 默认导出
export default myTool
```

### 3.2 带文件操作的工具

```typescript
import fs from "fs/promises"
import path from "path"

export const fileAnalyzer: ToolDefinition = {
  name: "analyze_file",
  description: "Analyze file structure and content",
  
  args: {
    filePath: z.string().describe("Path to file"),
    depth: z.number().optional().describe("Analysis depth"),
  },
  
  execute: async (params, ctx) => {
    // 构建完整路径
    const fullPath = path.join(ctx.directory, params.filePath)
    
    // 检查文件是否存在
    try {
      await fs.access(fullPath)
    } catch {
      return {
        error: `File not found: ${params.filePath}`
      }
    }
    
    // 读取文件
    const content = await fs.readFile(fullPath, "utf-8")
    
    // 分析
    const analysis = {
      path: params.filePath,
      size: content.length,
      lines: content.split("\n").length,
      extension: path.extname(params.filePath),
      // 更多分析...
    }
    
    return analysis
  }
}
```

### 3.3 异步工具（调用外部API）

```typescript
export const apiCaller: ToolDefinition = {
  name: "call_external_api",
  description: "Call external API with retry logic",
  
  args: {
    endpoint: z.string().url(),
    method: z.enum(["GET", "POST", "PUT", "DELETE"]),
    body: z.record(z.any()).optional(),
    headers: z.record(z.string()).optional(),
  },
  
  execute: async (params, ctx) => {
    const maxRetries = 3
    let lastError: Error | null = null
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(params.endpoint, {
          method: params.method,
          headers: {
            "Content-Type": "application/json",
            ...params.headers,
          },
          body: params.body ? JSON.stringify(params.body) : undefined,
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        
        return {
          success: true,
          status: response.status,
          data,
        }
      } catch (error) {
        lastError = error as Error
        
        // 指数退避
        if (i < maxRetries - 1) {
          await new Promise(resolve => 
            setTimeout(resolve, Math.pow(2, i) * 1000)
          )
        }
      }
    }
    
    return {
      success: false,
      error: `Failed after ${maxRetries} retries: ${lastError?.message}`
    }
  }
}
```

### 3.4 工具组合（多个工具）

```typescript
// 可以在一个文件中导出多个工具
export const toolA: ToolDefinition = {
  name: "tool_a",
  description: "First tool",
  args: { /* ... */ },
  execute: async (params, ctx) => { /* ... */ }
}

export const toolB: ToolDefinition = {
  name: "tool_b",
  description: "Second tool",
  args: { /* ... */ },
  execute: async (params, ctx) => { /* ... */ }
}

// 或者使用命名空间
export const myTools = {
  toolA,
  toolB,
}
```

---

## 4. 钩子开发指南

### 4.1 创建消息钩子

```typescript
import type { Hook } from "@opencode-ai/plugin"

export function createMessageHook(): Hook {
  return {
    "chat.message": async (input, output) => {
      // 在消息发送前修改
      
      // 1. 检查消息内容
      if (input.message.includes("urgent")) {
        // 添加优先级标记
        output.system.push(
          "\n<priority>HIGH</priority>\n" +
          "This is marked as urgent. Prioritize accordingly."
        )
      }
      
      // 2. 注入上下文
      if (input.isFirstMessage) {
        output.system.push(
          "\n<project-context>\n" +
          `Project: ${input.directory}\n` +
          `Session: ${input.sessionId}\n` +
          "</project-context>"
        )
      }
      
      // 3. 添加提醒
      const hourOfDay = new Date().getHours()
      if (hourOfDay < 6 || hourOfDay > 22) {
        output.system.push(
          "\nNote: It's late. Keep responses concise."
        )
      }
    }
  }
}
```

### 4.2 工具执行钩子

```typescript
export function createToolGuardHook(): Hook {
  return {
    "tool.execute.before": async (input, output) => {
      // 工具执行前的检查
      
      // 1. 危险操作警告
      if (input.toolName === "bash" && 
          input.args.command?.includes("rm -rf")) {
        output.warning = "Dangerous command detected. Please confirm."
        output.requireConfirmation = true
      }
      
      // 2. 记录工具使用
      console.log(`[Tool] ${input.toolName} called at ${new Date().toISOString()}`)
      
      // 3. 参数验证
      if (input.toolName === "write" && 
          !input.args.path?.startsWith("src/")) {
        output.error = "Write operations restricted to src/ directory"
        output.cancel = true
      }
    },
    
    "tool.execute.after": async (input, output) => {
      // 工具执行后的处理
      
      // 1. 结果转换
      if (input.toolName === "read" && output.result) {
        // 添加元数据
        output.metadata = {
          ...output.metadata,
          readAt: Date.now(),
          fileSize: output.result.length,
        }
      }
      
      // 2. 错误处理
      if (output.error) {
        console.error(`[Tool Error] ${input.toolName}:`, output.error)
      }
      
      // 3. 性能监控
      const duration = Date.now() - input.startTime
      if (duration > 5000) {
        console.warn(`[Tool Slow] ${input.toolName} took ${duration}ms`)
      }
    }
  }
}
```

### 4.3 会话事件钩子

```typescript
export function createSessionHook(): Hook {
  const sessionData = new Map<string, any>()
  
  return {
    "event": async (input, output) => {
      switch (input.type) {
        case "session.created":
          // 会话创建
          sessionData.set(input.sessionId, {
            createdAt: Date.now(),
            messageCount: 0,
          })
          console.log(`[Session] Created: ${input.sessionId}`)
          break
          
        case "session.deleted":
          // 会话删除
          sessionData.delete(input.sessionId)
          console.log(`[Session] Deleted: ${input.sessionId}`)
          break
          
        case "session.idle":
          // 会话空闲
          const data = sessionData.get(input.sessionId)
          if (data) {
            const idleTime = Date.now() - data.lastActivity
            if (idleTime > 30 * 60 * 1000) { // 30分钟
              output.action = "archive"
            }
          }
          break
          
        case "session.error":
          // 会话错误
          console.error(`[Session Error] ${input.sessionId}:`, input.error)
          break
      }
    }
  }
}
```

---

## 5. 技能开发指南

### 5.1 基础技能文件

创建 `.opencode/skills/my-skill.md`:

```markdown
---
name: my-skill
description: Custom skill for specific tasks
tags: [custom, automation]
---

# My Custom Skill

## Overview

This skill provides guidance for [specific domain].

## Best Practices

1. Always validate input
2. Use error handling
3. Document your code

## Code Examples

### Example 1: Basic Usage

\`\`\`typescript
function example() {
  // Implementation
}
\`\`\`

### Example 2: Advanced Pattern

\`\`\`typescript
async function advancedExample() {
  // Advanced implementation
}
\`\`\`

## Common Pitfalls

- Avoid [pitfall 1]
- Watch out for [pitfall 2]

## References

- [Documentation](https://example.com)
- [Best Practices Guide](https://example.com/guide)
```

### 5.2 带MCP的技能

```markdown
---
name: api-integration-skill
description: API integration with MCP support
tags: [api, mcp]
mcp:
  servers:
    - name: api-server
      type: http
      url: https://api.example.com/mcp
      auth:
        type: api-key
        header: X-API-Key
        envVar: MY_API_KEY
  tools:
    - name: fetch_data
      description: Fetch data from API
---

# API Integration Skill

## Using the MCP Server

This skill includes an MCP server for API operations.

### Available Tools

1. `fetch_data` - Retrieve data from the API
2. `update_data` - Update existing data
3. `delete_data` - Remove data

### Usage Example

When you need to fetch data:
1. Use the `skill_mcp` tool
2. Specify skill: "api-integration-skill"
3. Specify tool: "fetch_data"
4. Provide required arguments
```

### 5.3 文件引用技能

```markdown
---
name: project-standards
description: Project coding standards
tags: [standards, guidelines]
---

# Project Standards

## Configuration Files

Reference to project configuration:
#[[file:.eslintrc.json]]

## TypeScript Configuration

Reference to TypeScript config:
#[[file:tsconfig.json]]

## Coding Guidelines

Follow the patterns defined in:
#[[file:docs/coding-guidelines.md]]

These files will be automatically loaded when this skill is used.
```

---

## 6. 常见问题解决

### 6.1 智能体不响应

**问题**: 智能体创建后不响应

**解决方案**:

```bash
# 1. 检查配置
bunx oh-my-opencode doctor

# 2. 验证智能体配置
cat .opencode/oh-my-opencode.jsonc | grep -A 10 "agents"

# 3. 检查日志
tail -f /tmp/oh-my-opencode.log

# 4. 清除缓存
rm -rf ~/.cache/opencode
```

### 6.2 工具执行失败

**问题**: 自定义工具无法执行

**调试步骤**:

```typescript
// 在工具中添加详细日志
export const myTool: ToolDefinition = {
  name: "my_tool",
  description: "...",
  args: { /* ... */ },
  execute: async (params, ctx) => {
    console.log("[my_tool] Starting execution")
    console.log("[my_tool] Params:", JSON.stringify(params))
    console.log("[my_tool] Context:", {
      directory: ctx.directory,
      sessionId: ctx.sessionId,
    })
    
    try {
      const result = await performOperation(params)
      console.log("[my_tool] Success:", result)
      return result
    } catch (error) {
      console.error("[my_tool] Error:", error)
      throw error
    }
  }
}
```

### 6.3 配置不生效

**问题**: 修改配置后没有效果

**解决方案**:

```bash
# 1. 验证JSON格式
cat .opencode/oh-my-opencode.jsonc | jq .

# 2. 检查配置优先级
# 项目配置 > 用户配置 > 默认配置

# 3. 重启OpenCode
# 配置更改需要重启才能生效

# 4. 使用配置验证工具
bunx oh-my-opencode doctor --check-config
```

### 6.4 内存占用过高

**问题**: 后台任务导致内存占用高

**优化配置**:

```jsonc
{
  "background_task": {
    "max_concurrent": 3,  // 降低并发数
    "timeout_ms": 180000, // 3分钟超时
    "syncPollTimeoutMs": 30000
  },
  
  // 禁用不需要的智能体
  "disabled_agents": [
    "momus",
    "prometheus"
  ],
  
  // 禁用不需要的钩子
  "disabled_hooks": [
    "auto-update-checker"
  ]
}
```
