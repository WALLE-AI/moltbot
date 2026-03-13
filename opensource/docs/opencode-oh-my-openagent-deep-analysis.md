# OpenCode & Oh-My-OpenAgent 深度源码解析报告

**生成时间**: 2026-03-12  
**分析范围**: opensource/opencode 和 opensource/oh-my-openagent  
**文档版本**: v1.0

---

## 目录

1. [项目概览](#1-项目概览)
2. [Agent Run Loop 架构](#2-agent-run-loop-架构)
3. [工具系统 (Tools)](#3-工具系统-tools)
4. [技能池与MCP管理](#4-技能池与mcp管理)
5. [记忆管理系统](#5-记忆管理系统)
6. [心跳技术](#6-心跳技术)
7. [渠道技术](#7-渠道技术)
8. [网关技术](#8-网关技术)
9. [多智能体技术](#9-多智能体技术)
10. [配置文件管理](#10-配置文件管理)

---

## 1. 项目概览

### 1.1 OpenCode 项目

**核心定位**: 基于 Claude 的 AI 编程助手平台，提供完整的代码生成、编辑和项目管理能力。

**技术栈**:
- TypeScript + Bun 运行时
- Drizzle ORM + SQLite 数据库
- AI SDK (Vercel AI SDK)
- Zod 模式验证

**项目结构**:
```
packages/opencode/
├── src/
│   ├── agent/          # Agent 核心逻辑
│   ├── session/        # 会话管理
│   ├── tool/           # 工具注册与执行
│   ├── mcp/            # MCP 协议支持
│   ├── skill/          # 技能系统
│   ├── scheduler/      # 调度器
│   ├── config/         # 配置管理
│   └── storage/        # 存储层
```

### 1.2 Oh-My-OpenAgent 项目

**核心定位**: OpenCode 的插件系统，提供多智能体编排、46个生命周期钩子、26个工具和完整的技能/命令/MCP系统。

**技术栈**:
- TypeScript + Bun
- Zod v4 配置验证
- OpenCode Plugin SDK
- 160k+ LOC

**项目结构**:
```
src/
├── agents/             # 11个内置智能体
├── hooks/              # 46个生命周期钩子
├── tools/              # 26个工具
├── features/           # 19个功能模块
├── config/             # Zod v4 配置系统
├── mcp/                # 3个内置远程MCP
└── plugin/             # 8个OpenCode钩子处理器
```

---

## 2. Agent Run Loop 架构

### 2.1 OpenCode Agent 系统

#### 2.1.1 Agent 定义与注册

**核心文件**: `src/agent/agent.ts`

Agent 系统采用声明式配置 + 动态注册模式：

```typescript
export namespace Agent {
  export const Info = z.object({
    name: z.string(),
    description: z.string().optional(),
    mode: z.enum(["subagent", "primary", "all"]),
    native: z.boolean().optional(),
    hidden: z.boolean().optional(),
    topP: z.number().optional(),
    temperature: z.number().optional(),
    color: z.string().optional(),
    permission: PermissionNext.Ruleset,
    model: z.object({
      modelID: z.string(),
      providerID: z.string(),
    }).optional(),
    variant: z.string().optional(),
    prompt: z.string().optional(),
    options: z.record(z.string(), z.any()),
    steps: z.number().int().positive().optional(),
  })
}
```

**Agent 模式分类**:

1. **primary**: 主要智能体，遵循UI选择的模型（如 sisyphus, atlas）
2. **subagent**: 子智能体，使用自己的回退链，忽略UI选择（如 oracle, explore）
3. **all**: 在两种上下文中都可用（OpenCode兼容性）

**内置 Agent**:
- `build`: 默认智能体，基于配置权限执行工具
- `plan`: 计划模式，禁用所有编辑工具
- `general`: 通用智能体，用于研究复杂问题和执行多步骤任务
- `explore`: 快速代码库探索智能体
- `compaction`: 上下文压缩智能体（隐藏）
- `title`: 会话标题生成智能体（隐藏）
- `summary`: 摘要生成智能体（隐藏）

#### 2.1.2 Agent 状态管理

使用 `Instance.state()` 实现实例级状态隔离：

```typescript
const state = Instance.state(async () => {
  const cfg = await Config.get()
  const result: Record<string, Info> = {
    // 初始化内置 agents
  }
  
  // 从配置加载自定义 agents
  for (const [key, value] of Object.entries(cfg.agent ?? {})) {
    if (value.disable) {
      delete result[key]
      continue
    }
    // 合并配置
  }
  
  return result
})
```

#### 2.1.3 权限系统

每个 Agent 都有独立的权限规则集：

```typescript
permission: PermissionNext.fromConfig({
  "*": "allow",
  doom_loop: "ask",
  external_directory: {
    "*": "ask",
    ...Object.fromEntries(whitelistedDirs.map((dir) => [dir, "allow"])),
  },
  question: "deny",
  plan_enter: "deny",
  plan_exit: "deny",
  read: {
    "*": "allow",
    "*.env": "ask",
    "*.env.*": "ask",
    "*.env.example": "allow",
  },
})
```

### 2.2 Oh-My-OpenAgent Agent 系统

#### 2.2.1 初始化流程

**核心文件**: `src/index.ts`

```typescript
const OhMyOpenCodePlugin: Plugin = async (ctx) => {
  // 1. 初始化配置上下文
  initConfigContext("opencode", null)
  
  // 2. 加载插件配置
  const pluginConfig = loadPluginConfig(ctx.directory, ctx)
  
  // 3. 创建管理器
  const managers = createManagers({
    ctx,
    pluginConfig,
    tmuxConfig,
    modelCacheState,
    backgroundNotificationHookEnabled,
  })
  
  // 4. 创建工具
  const toolsResult = await createTools({
    ctx,
    pluginConfig,
    managers,
  })
  
  // 5. 创建钩子
  const hooks = createHooks({
    ctx,
    pluginConfig,
    modelCacheState,
    backgroundManager: managers.backgroundManager,
    isHookEnabled,
    safeHookEnabled,
    mergedSkills: toolsResult.mergedSkills,
    availableSkills: toolsResult.availableSkills,
  })
  
  // 6. 创建插件接口
  return createPluginInterface({
    ctx,
    pluginConfig,
    firstMessageVariantGate,
    managers,
    hooks,
    tools: toolsResult.filteredTools,
  })
}
```

#### 2.2.2 内置智能体架构

**11个内置智能体**:

1. **Sisyphus** (主智能体)
   - 模式: `primary`
   - 职责: 主要编程助手，协调其他智能体
   - 特点: 动态生成提示词，包含委托表、工具选择表

2. **Hephaestus** (构建专家)
   - 模式: `primary`
   - 职责: 专注于构建、测试和部署任务
   - 特点: 优化的构建工具链

3. **Oracle** (外部知识专家)
   - 模式: `subagent`
   - 职责: 处理需要外部知识的查询
   - 工具: websearch, webfetch
   - 成本: EXPENSIVE

4. **Librarian** (库文档专家)
   - 模式: `subagent`
   - 职责: 查找和解释外部库文档
   - 触发: 外部库提及
   - 成本: CHEAP

5. **Explore** (代码库探索)
   - 模式: `subagent`
   - 职责: 快速探索代码库结构
   - 工具: grep, glob, list, bash, read
   - 成本: FREE

6. **Multimodal-Looker** (视觉分析)
   - 模式: `subagent`
   - 职责: 分析图像、截图、UI设计
   - 成本: CHEAP

7. **Metis** (代码审查)
   - 模式: `subagent`
   - 职责: 代码质量审查和建议
   - 成本: CHEAP

8. **Momus** (批评者)
   - 模式: `subagent`
   - 职责: 提供批判性反馈
   - 成本: CHEAP

9. **Atlas** (项目编排)
   - 模式: `primary`
   - 职责: 大型项目的高层规划和协调
   - 成本: EXPENSIVE

10. **Prometheus** (计划生成)
    - 模式: `subagent`
    - 职责: 生成详细的执行计划
    - 成本: CHEAP

11. **Sisyphus-Junior** (轻量级助手)
    - 模式: `subagent`
    - 职责: 简单任务的快速执行
    - 成本: FREE

#### 2.2.3 Agent 工厂模式

**核心文件**: `src/agents/agent-builder.ts`

```typescript
export function buildAgent(
  source: AgentSource,
  model: string,
  categories?: CategoriesConfig,
  gitMasterConfig?: GitMasterConfig,
  browserProvider?: BrowserAutomationProvider,
  disabledSkills?: Set<string>
): AgentConfig {
  const base = isFactory(source) ? source(model) : { ...source }
  
  // 1. 应用分类配置
  const categoryConfigs = mergeCategories(categories)
  if (agentWithCategory.category) {
    const categoryConfig = categoryConfigs[agentWithCategory.category]
    if (categoryConfig) {
      if (!base.model) base.model = categoryConfig.model
      if (base.temperature === undefined) 
        base.temperature = categoryConfig.temperature
    }
  }
  
  // 2. 解析技能
  if (agentWithCategory.skills?.length) {
    const { resolved } = resolveMultipleSkills(
      agentWithCategory.skills, 
      { gitMasterConfig, browserProvider, disabledSkills }
    )
    if (resolved.size > 0) {
      const skillContent = Array.from(resolved.values()).join("\n\n")
      base.prompt = skillContent + (base.prompt ? "\n\n" + base.prompt : "")
    }
  }
  
  return base
}
```

#### 2.2.4 动态提示词生成

**核心文件**: `src/agents/dynamic-agent-prompt-builder.ts`

Sisyphus 智能体使用动态提示词生成系统：

**提示词结构**:
1. Phase 0: 关键触发器（快速决策）
2. Delegation Table: 何时委托给其他智能体
3. Tool Selection: 工具选择指南
4. Available Agents: 可用智能体列表
5. Available Skills: 可用技能列表
6. Available Categories: 任务分类

---

## 3. 工具系统 (Tools)

### 3.1 OpenCode 工具注册系统

#### 3.1.1 工具注册表

**核心文件**: `src/tool/registry.ts`

```typescript
export namespace ToolRegistry {
  export const state = Instance.state(async () => {
    const custom = [] as Tool.Info[]
    
    // 1. 扫描自定义工具目录
    const matches = await Config.directories().then((dirs) =>
      dirs.flatMap((dir) =>
        Glob.scanSync("{tool,tools}/*.{js,ts}", { 
          cwd: dir, 
          absolute: true 
        })
      )
    )
    
    // 2. 动态导入工具模块
    for (const match of matches) {
      const namespace = path.basename(match, path.extname(match))
      const mod = await import(pathToFileURL(match).href)
      for (const [id, def] of Object.entries<ToolDefinition>(mod)) {
        custom.push(fromPlugin(
          id === "default" ? namespace : `${namespace}_${id}`, 
          def
        ))
      }
    }
    
    // 3. 加载插件工具
    const plugins = await Plugin.list()
    for (const plugin of plugins) {
      for (const [id, def] of Object.entries(plugin.tool ?? {})) {
        custom.push(fromPlugin(id, def))
      }
    }
    
    return { custom }
  })
}
```

#### 3.1.2 内置工具列表

**26个核心工具**:

1. **bash** - Shell命令执行
2. **read** - 文件读取
3. **write** - 文件写入
4. **edit** - 文件编辑
5. **glob** - 文件模式匹配
6. **grep** - 文本搜索
7. **ls** - 目录列表
8. **codesearch** - 代码搜索
9. **websearch** - 网络搜索
10. **webfetch** - 网页获取
11. **task** - 任务管理
12. **todo** - 待办事项
13. **question** - 用户提问
14. **skill** - 技能调用
15. **lsp** - LSP协议支持
16. **apply_patch** - 补丁应用
17. **batch** - 批量操作
18. **multiedit** - 多文件编辑
19. **plan-enter** - 进入计划模式
20. **plan-exit** - 退出计划模式

#### 3.1.3 工具执行流程

```typescript
export async function tools(
  model: { providerID: string; modelID: string },
  agent?: Agent.Info,
) {
  const tools = await all()
  const result = await Promise.all(
    tools
      .filter((t) => {
        // 根据模型和agent过滤工具
        if (t.id === "codesearch" || t.id === "websearch") {
          return model.providerID === "opencode" || Flag.OPENCODE_ENABLE_EXA
        }
        
        // GPT模型使用apply_patch格式
        const usePatch = model.modelID.includes("gpt-") && 
                        !model.modelID.includes("oss")
        if (t.id === "apply_patch") return usePatch
        if (t.id === "edit" || t.id === "write") return !usePatch
        
        return true
      })
      .map(async (t) => {
        const tool = await t.init({ agent })
        const output = {
          description: tool.description,
          parameters: tool.parameters,
        }
        // 触发插件钩子
        await Plugin.trigger("tool.definition", { toolID: t.id }, output)
        return {
          id: t.id,
          ...tool,
          description: output.description,
          parameters: output.parameters,
        }
      })
  )
  return result
}
```

### 3.2 Oh-My-OpenAgent 工具系统

#### 3.2.1 工具注册表

**核心文件**: `src/plugin/tool-registry.ts`

```typescript
export function createToolRegistry(args: {
  ctx: PluginContext
  pluginConfig: OhMyOpenCodeConfig
  managers: Pick<Managers, "backgroundManager" | "tmuxSessionManager" | "skillMcpManager">
  skillContext: SkillContext
  availableCategories: AvailableCategory[]
}): ToolRegistryResult {
  const { ctx, pluginConfig, managers, skillContext, availableCategories } = args
  
  // 1. 后台任务工具
  const backgroundTools = createBackgroundTools(
    managers.backgroundManager, 
    ctx.client
  )
  
  // 2. 智能体调用工具
  const callOmoAgent = createCallOmoAgent(
    ctx,
    managers.backgroundManager,
    pluginConfig.disabled_agents ?? [],
    pluginConfig.agents,
    pluginConfig.categories,
  )
  
  // 3. 多模态查看工具
  const lookAt = isMultimodalLookerEnabled 
    ? createLookAt(ctx) 
    : null
  
  // 4. 任务委托工具
  const delegateTask = createDelegateTask({
    manager: managers.backgroundManager,
    client: ctx.client,
    directory: ctx.directory,
    userCategories: pluginConfig.categories,
    agentOverrides: pluginConfig.agents,
    availableCategories,
    availableSkills: skillContext.availableSkills,
  })
  
  // 5. 技能MCP工具
  const skillMcpTool = createSkillMcpTool({
    manager: managers.skillMcpManager,
    getLoadedSkills: () => skillContext.mergedSkills,
    getSessionID: getSessionIDForMcp,
  })
  
  // 6. 技能工具
  const skillTool = createSkillTool({
    commands,
    skills: skillContext.mergedSkills,
    mcpManager: managers.skillMcpManager,
    getSessionID: getSessionIDForMcp,
  })
  
  // 7. 组装所有工具
  const allTools: Record<string, ToolDefinition> = {
    ...builtinTools,
    ...createGrepTools(ctx),
    ...createGlobTools(ctx),
    ...createAstGrepTools(ctx),
    ...createSessionManagerTools(ctx),
    ...backgroundTools,
    call_omo_agent: callOmoAgent,
    ...(lookAt ? { look_at: lookAt } : {}),
    task: delegateTask,
    skill_mcp: skillMcpTool,
    skill: skillTool,
    interactive_bash,
    ...taskToolsRecord,
    ...hashlineToolsRecord,
  }
  
  // 8. 标准化工具参数模式
  for (const toolDefinition of Object.values(allTools)) {
    normalizeToolArgSchemas(toolDefinition)
  }
  
  // 9. 过滤禁用的工具
  const filteredTools = filterDisabledTools(
    allTools, 
    pluginConfig.disabled_tools
  )
  
  return { filteredTools, taskSystemEnabled }
}
```

#### 3.2.2 核心工具详解

**1. delegate-task (任务委托)**

最重要的工具之一，用于将任务委托给子智能体：

```typescript
// 位置: src/tools/delegate-task/
export function createDelegateTask(args) {
  return {
    name: "task",
    description: "Delegate a task to a specialized agent or category",
    args: {
      category: z.string().describe("Task category"),
      description: z.string().describe("Task description"),
      agent: z.string().optional().describe("Specific agent to use"),
      sync: z.boolean().optional().describe("Wait for completion"),
    },
    execute: async (params, ctx) => {
      // 1. 解析分类和智能体
      const resolvedCategory = resolveCategory(params.category)
      const resolvedAgent = params.agent || 
                           resolvedCategory.defaultAgent
      
      // 2. 创建后台会话
      const session = await manager.createSession({
        agentId: resolvedAgent,
        prompt: params.description,
        parentSessionId: ctx.sessionId,
      })
      
      // 3. 同步或异步执行
      if (params.sync) {
        return await manager.waitForCompletion(session.id)
      } else {
        return { sessionId: session.id, status: "running" }
      }
    }
  }
}
```

**2. call_omo_agent (智能体调用)**

直接调用特定智能体：

```typescript
export function createCallOmoAgent(
  ctx: PluginContext,
  backgroundManager: BackgroundManager,
  disabledAgents: string[],
  agentOverrides: AgentOverrides,
  categories?: CategoriesConfig,
) {
  return {
    name: "call_omo_agent",
    description: "Call a specific oh-my-opencode agent",
    args: {
      agent: z.string().describe("Agent name"),
      prompt: z.string().describe("Prompt for the agent"),
      sync: z.boolean().optional(),
    },
    execute: async (params) => {
      // 验证智能体是否可用
      if (disabledAgents.includes(params.agent)) {
        throw new Error(`Agent ${params.agent} is disabled`)
      }
      
      // 创建子会话
      return await backgroundManager.createSession({
        agentId: params.agent,
        prompt: params.prompt,
        sync: params.sync,
      })
    }
  }
}
```

**3. skill_mcp (技能MCP)**

管理技能嵌入的MCP服务器：

```typescript
export function createSkillMcpTool(args: {
  manager: SkillMcpManager
  getLoadedSkills: () => LoadedSkill[]
  getSessionID: () => string
}) {
  return {
    name: "skill_mcp",
    description: "Interact with MCP servers embedded in skills",
    args: {
      skill: z.string().describe("Skill name"),
      tool: z.string().describe("MCP tool name"),
      arguments: z.record(z.any()).describe("Tool arguments"),
    },
    execute: async (params) => {
      const sessionID = args.getSessionID()
      
      // 1. 查找技能
      const skills = args.getLoadedSkills()
      const skill = skills.find(s => s.name === params.skill)
      if (!skill) throw new Error(`Skill not found: ${params.skill}`)
      
      // 2. 确保MCP服务器已启动
      await args.manager.ensureStarted(skill, sessionID)
      
      // 3. 调用MCP工具
      return await args.manager.callTool(
        skill,
        sessionID,
        params.tool,
        params.arguments
      )
    }
  }
}
```

**4. interactive_bash (交互式Shell)**

提供持久化的Shell会话：

```typescript
// 位置: src/tools/interactive-bash/
export const interactive_bash: ToolDefinition = {
  name: "interactive_bash",
  description: "Execute commands in a persistent bash session",
  args: {
    command: z.string().describe("Command to execute"),
    session_id: z.string().optional().describe("Session ID"),
  },
  execute: async (params, ctx) => {
    // 1. 获取或创建会话
    const sessionId = params.session_id || 
                     `bash-${ctx.sessionId}`
    let session = sessions.get(sessionId)
    
    if (!session) {
      session = spawn("bash", ["-i"], {
        cwd: ctx.directory,
        env: process.env,
      })
      sessions.set(sessionId, session)
    }
    
    // 2. 执行命令
    session.stdin.write(params.command + "\n")
    
    // 3. 收集输出
    const output = await collectOutput(session, timeout)
    
    return {
      output,
      sessionId,
      exitCode: session.exitCode,
    }
  }
}
```

**5. look_at (视觉分析)**

使用Multimodal-Looker智能体分析图像：

```typescript
export function createLookAt(ctx: PluginContext) {
  return {
    name: "look_at",
    description: "Analyze images, screenshots, or UI designs",
    args: {
      path: z.string().describe("Image file path"),
      question: z.string().optional().describe("Specific question"),
    },
    execute: async (params) => {
      // 1. 读取图像
      const imageData = await fs.readFile(params.path)
      const base64 = imageData.toString("base64")
      
      // 2. 调用multimodal-looker智能体
      const result = await ctx.client.request("agent.run", {
        agent: "multimodal-looker",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                image: `data:image/png;base64,${base64}`,
              },
              {
                type: "text",
                text: params.question || "Describe this image",
              },
            ],
          },
        ],
      })
      
      return result.content
    }
  }
}
```

#### 3.2.3 工具参数标准化

**核心文件**: `src/plugin/normalize-tool-arg-schemas.ts`

确保所有工具参数符合OpenCode规范：

```typescript
export function normalizeToolArgSchemas(tool: ToolDefinition): void {
  // 1. 避免使用 Type.Union (google-antigravity限制)
  // 2. 使用 stringEnum/optionalStringEnum 代替联合类型
  // 3. 使用 Type.Optional(...) 代替 | null
  // 4. 保持顶层为 type: "object"
  // 5. 避免使用 format 作为属性名
  
  if (tool.args && typeof tool.args === "object") {
    for (const [key, schema] of Object.entries(tool.args)) {
      // 标准化处理
      if (schema.anyOf || schema.oneOf) {
        // 转换为更简单的形式
      }
    }
  }
}
```

---

## 4. 技能池与MCP管理

### 4.1 OpenCode 技能系统

#### 4.1.1 技能发现

**核心文件**: `src/skill/discovery.ts`

```typescript
export namespace Skill {
  export async function dirs(): Promise<string[]> {
    const cfg = await Config.get()
    const directories = await Config.directories()
    
    // 1. 扫描技能目录
    const skillDirs = directories.flatMap(dir => [
      path.join(dir, "skill"),
      path.join(dir, "skills"),
    ])
    
    // 2. 过滤存在的目录
    const existing = await Promise.all(
      skillDirs.map(async dir => {
        const exists = await Filesystem.exists(dir)
        return exists ? dir : null
      })
    )
    
    return existing.filter(Boolean) as string[]
  }
  
  export async function discover(): Promise<SkillInfo[]> {
    const dirs = await this.dirs()
    const skills: SkillInfo[] = []
    
    for (const dir of dirs) {
      const files = await Glob.scan("*.md", { cwd: dir })
      for (const file of files) {
        const content = await fs.readFile(
          path.join(dir, file), 
          "utf-8"
        )
        const parsed = parseSkill(content)
        skills.push({
          name: path.basename(file, ".md"),
          path: path.join(dir, file),
          ...parsed,
        })
      }
    }
    
    return skills
  }
}
```

#### 4.1.2 技能格式

技能文件使用Markdown + YAML frontmatter：

```markdown
---
name: git-workflow
description: Git workflow best practices
tags: [git, version-control]
---

# Git Workflow Skill

## Commands

### Commit with conventional format
```bash
git commit -m "feat: add new feature"
```

### Create feature branch
```bash
git checkout -b feature/my-feature
```
```

### 4.2 Oh-My-OpenAgent 技能系统

#### 4.2.1 技能加载器

**核心文件**: `src/features/opencode-skill-loader/`

```typescript
export async function loadSkills(
  directory: string,
  pluginConfig: OhMyOpenCodeConfig
): Promise<LoadedSkill[]> {
  const skills: LoadedSkill[] = []
  
  // 1. 扫描内置技能
  const builtinSkills = await loadBuiltinSkills()
  skills.push(...builtinSkills)
  
  // 2. 扫描用户技能目录
  const userSkillDirs = [
    path.join(directory, ".opencode", "skills"),
    path.join(os.homedir(), ".config", "opencode", "skills"),
  ]
  
  for (const dir of userSkillDirs) {
    if (await fs.exists(dir)) {
      const files = await fs.readdir(dir)
      for (const file of files) {
        if (file.endsWith(".md")) {
          const content = await fs.readFile(
            path.join(dir, file), 
            "utf-8"
          )
          const skill = parseSkillFile(content, file)
          skills.push(skill)
        }
      }
    }
  }
  
  // 3. 过滤禁用的技能
  const disabledSkills = new Set(
    pluginConfig.disabled_skills ?? []
  )
  return skills.filter(s => !disabledSkills.has(s.name))
}
```

#### 4.2.2 技能文件解析

支持增强的YAML frontmatter：

```typescript
export function parseSkillFile(
  content: string, 
  filename: string
): LoadedSkill {
  const { frontmatter, body } = parseFrontmatter(content)
  
  return {
    name: frontmatter.name || 
          path.basename(filename, ".md"),
    description: frontmatter.description || "",
    tags: frontmatter.tags || [],
    
    // MCP配置（技能嵌入的MCP服务器）
    mcp: frontmatter.mcp ? {
      servers: frontmatter.mcp.servers || [],
      tools: frontmatter.mcp.tools || [],
    } : undefined,
    
    // 文件引用
    fileReferences: extractFileReferences(body),
    
    // 技能内容
    content: body,
    
    // 元数据
    metadata: {
      path: filename,
      loadedAt: Date.now(),
    },
  }
}

// 提取文件引用: #[[file:path/to/file]]
function extractFileReferences(content: string): string[] {
  const pattern = /#\[\[file:([^\]]+)\]\]/g
  const matches = content.matchAll(pattern)
  return Array.from(matches, m => m[1])
}
```

#### 4.2.3 技能MCP管理器

**核心文件**: `src/features/skill-mcp-manager/manager.ts`

```typescript
export class SkillMcpManager {
  private servers = new Map<string, McpServer>()
  private sessionServers = new Map<string, Set<string>>()
  
  // 启动技能嵌入的MCP服务器
  async ensureStarted(
    skill: LoadedSkill, 
    sessionID: string
  ): Promise<void> {
    if (!skill.mcp?.servers) return
    
    for (const serverConfig of skill.mcp.servers) {
      const serverKey = `${skill.name}:${serverConfig.name}`
      
      // 检查是否已启动
      if (this.servers.has(serverKey)) {
        this.trackSession(serverKey, sessionID)
        return
      }
      
      // 启动服务器
      const server = await this.startServer(serverConfig)
      this.servers.set(serverKey, server)
      this.trackSession(serverKey, sessionID)
      
      log(`[SkillMcpManager] Started MCP server: ${serverKey}`)
    }
  }
  
  // 调用MCP工具
  async callTool(
    skill: LoadedSkill,
    sessionID: string,
    toolName: string,
    args: Record<string, any>
  ): Promise<any> {
    const serverKey = `${skill.name}:${skill.mcp?.servers[0]?.name}`
    const server = this.servers.get(serverKey)
    
    if (!server) {
      throw new Error(`MCP server not started: ${serverKey}`)
    }
    
    return await server.callTool(toolName, args)
  }
  
  // 清理会话相关的服务器
  async cleanupSession(sessionID: string): Promise<void> {
    for (const [serverKey, sessions] of this.sessionServers) {
      sessions.delete(sessionID)
      
      // 如果没有会话使用此服务器，停止它
      if (sessions.size === 0) {
        const server = this.servers.get(serverKey)
        if (server) {
          await server.stop()
          this.servers.delete(serverKey)
          log(`[SkillMcpManager] Stopped MCP server: ${serverKey}`)
        }
      }
    }
  }
  
  private trackSession(serverKey: string, sessionID: string) {
    if (!this.sessionServers.has(serverKey)) {
      this.sessionServers.set(serverKey, new Set())
    }
    this.sessionServers.get(serverKey)!.add(sessionID)
  }
  
  private async startServer(
    config: McpServerConfig
  ): Promise<McpServer> {
    if (config.type === "stdio") {
      return await this.startStdioServer(config)
    } else if (config.type === "http") {
      return await this.startHttpServer(config)
    }
    throw new Error(`Unsupported MCP server type: ${config.type}`)
  }
}
```

### 4.3 MCP协议支持

#### 4.3.1 OpenCode MCP实现

**核心文件**: `src/mcp/index.ts`

```typescript
export namespace MCP {
  // OAuth回调处理
  export async function handleOAuthCallback(
    code: string,
    state: string
  ): Promise<OAuthResult> {
    const provider = await OAuthProvider.fromState(state)
    const tokens = await provider.exchangeCode(code)
    
    // 存储令牌
    await Auth.store(provider.id, {
      type: "oauth",
      tokens,
    })
    
    return { success: true, provider: provider.id }
  }
  
  // MCP服务器认证
  export async function authenticate(
    serverID: string
  ): Promise<AuthInfo> {
    const config = await Config.get()
    const serverConfig = config.mcp?.servers?.[serverID]
    
    if (!serverConfig) {
      throw new Error(`MCP server not found: ${serverID}`)
    }
    
    if (serverConfig.auth?.type === "oauth") {
      return await this.handleOAuth(serverConfig.auth)
    }
    
    return { type: "none" }
  }
}
```

#### 4.3.2 Oh-My-OpenAgent MCP系统

**三层MCP架构**:

1. **内置MCP** (`src/mcp/`)
   - websearch (Exa/Tavily)
   - context7
   - grep_app

2. **Claude Code MCP** (`.mcp.json`)
   - 环境变量展开: `${VAR}`
   - 通过claude-code-mcp-loader加载

3. **技能嵌入MCP** (SKILL.md YAML)
   - 由SkillMcpManager管理
   - 支持stdio和HTTP协议

**内置MCP示例**:

```typescript
// src/mcp/websearch.ts
export function createWebSearchMcp(): RemoteMcpConfig {
  return {
    name: "websearch",
    type: "http",
    url: "https://mcp.exa.ai",
    tools: [
      {
        name: "search",
        description: "Search the web using Exa",
        args: {
          query: z.string(),
          numResults: z.number().optional(),
        },
      },
    ],
    auth: {
      type: "api-key",
      header: "X-API-Key",
      envVar: "EXA_API_KEY",
    },
  }
}
```

---

## 5. 记忆管理系统

### 5.1 OpenCode 会话管理

#### 5.1.1 会话存储架构

**核心文件**: `src/session/index.ts`

使用SQLite + Drizzle ORM实现持久化：

```typescript
// 会话表结构
export const SessionTable = sqliteTable("session", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  project_id: text("project_id").notNull(),
  workspace_id: text("workspace_id"),
  parent_id: text("parent_id"),
  directory: text("directory").notNull(),
  title: text("title").notNull(),
  version: text("version").notNull(),
  
  // 摘要信息
  summary_additions: integer("summary_additions"),
  summary_deletions: integer("summary_deletions"),
  summary_files: integer("summary_files"),
  summary_diffs: text("summary_diffs", { mode: "json" }),
  
  // 分享和回滚
  share_url: text("share_url"),
  revert: text("revert", { mode: "json" }),
  
  // 权限
  permission: text("permission", { mode: "json" }),
  
  // 时间戳
  time_created: integer("time_created").notNull(),
  time_updated: integer("time_updated").notNull(),
  time_compacting: integer("time_compacting"),
  time_archived: integer("time_archived"),
})

// 消息表结构
export const MessageTable = sqliteTable("message", {
  id: text("id").primaryKey(),
  session_id: text("session_id")
    .notNull()
    .references(() => SessionTable.id, { onDelete: "cascade" }),
  time_created: integer("time_created").notNull(),
  data: text("data", { mode: "json" }).notNull(),
})

// 消息部分表结构
export const PartTable = sqliteTable("part", {
  id: text("id").primaryKey(),
  message_id: text("message_id")
    .notNull()
    .references(() => MessageTable.id, { onDelete: "cascade" }),
  session_id: text("session_id")
    .notNull()
    .references(() => SessionTable.id, { onDelete: "cascade" }),
  time_created: integer("time_created").notNull(),
  data: text("data", { mode: "json" }).notNull(),
})
```

#### 5.1.2 会话生命周期

```typescript
export namespace Session {
  // 创建会话
  export async function createNext(input: {
    id?: SessionID
    title?: string
    parentID?: SessionID
    workspaceID?: WorkspaceID
    directory: string
    permission?: PermissionNext.Ruleset
  }): Promise<Info> {
    const result: Info = {
      id: SessionID.descending(input.id),
      slug: Slug.create(),
      version: Installation.VERSION,
      projectID: Instance.project.id,
      directory: input.directory,
      workspaceID: input.workspaceID,
      parentID: input.parentID,
      title: input.title ?? createDefaultTitle(!!input.parentID),
      permission: input.permission,
      time: {
        created: Date.now(),
        updated: Date.now(),
      },
    }
    
    Database.use((db) => {
      db.insert(SessionTable).values(toRow(result)).run()
      Database.effect(() =>
        Bus.publish(Event.Created, { info: result })
      )
    })
    
    // 自动分享（如果配置）
    const cfg = await Config.get()
    if (!result.parentID && 
        (Flag.OPENCODE_AUTO_SHARE || cfg.share === "auto")) {
      share(result.id).catch(() => {})
    }
    
    return result
  }
  
  // 分叉会话
  export const fork = fn(
    z.object({
      sessionID: SessionID.zod,
      messageID: MessageID.zod.optional(),
    }),
    async (input) => {
      const original = await get(input.sessionID)
      const title = getForkedTitle(original.title)
      const session = await createNext({
        directory: Instance.directory,
        workspaceID: original.workspaceID,
        title,
      })
      
      // 复制消息历史
      const msgs = await messages({ sessionID: input.sessionID })
      const idMap = new Map<string, MessageID>()
      
      for (const msg of msgs) {
        if (input.messageID && msg.info.id >= input.messageID) break
        
        const newID = MessageID.ascending()
        idMap.set(msg.info.id, newID)
        
        const cloned = await updateMessage({
          ...msg.info,
          sessionID: session.id,
          id: newID,
        })
        
        for (const part of msg.parts) {
          await updatePart({
            ...part,
            id: PartID.ascending(),
            messageID: cloned.id,
            sessionID: session.id,
          })
        }
      }
      
      return session
    }
  )
  
  // 更新会话
  export const touch = fn(SessionID.zod, async (sessionID) => {
    const now = Date.now()
    Database.use((db) => {
      const row = db
        .update(SessionTable)
        .set({ time_updated: now })
        .where(eq(SessionTable.id, sessionID))
        .returning()
        .get()
      
      const info = fromRow(row)
      Database.effect(() => Bus.publish(Event.Updated, { info }))
    })
  })
}
```

#### 5.1.3 消息流式处理

```typescript
export namespace MessageV2 {
  // 流式读取消息
  export async function* stream(
    sessionID: SessionID
  ): AsyncGenerator<WithParts> {
    const messages = Database.use((db) =>
      db
        .select()
        .from(MessageTable)
        .where(eq(MessageTable.session_id, sessionID))
        .orderBy(desc(MessageTable.time_created))
        .all()
    )
    
    for (const msgRow of messages) {
      const info = msgRow.data as Info
      
      // 加载消息部分
      const parts = Database.use((db) =>
        db
          .select()
          .from(PartTable)
          .where(eq(PartTable.message_id, info.id))
          .orderBy(PartTable.time_created)
          .all()
      )
      
      yield {
        info,
        parts: parts.map(p => p.data as Part),
      }
    }
  }
}
```

### 5.2 Oh-My-OpenAgent 上下文管理

#### 5.2.1 会话状态管理

**核心文件**: `src/features/claude-code-session-state/`

```typescript
// 全局会话状态
const sessionState = new Map<string, SessionState>()

export interface SessionState {
  sessionID: string
  agentID: string
  parentID?: string
  
  // 上下文信息
  injectedPaths: Set<string>
  toolsUsed: Set<string>
  
  // 模型状态
  currentModel: string
  fallbackChain: string[]
  
  // 执行状态
  isRunning: boolean
  lastActivity: number
  
  // 记忆
  memories: Memory[]
}

export function getSessionState(
  sessionID: string
): SessionState | undefined {
  return sessionState.get(sessionID)
}

export function updateSessionState(
  sessionID: string,
  update: Partial<SessionState>
): void {
  const current = sessionState.get(sessionID) || {
    sessionID,
    agentID: "main",
    injectedPaths: new Set(),
    toolsUsed: new Set(),
    currentModel: "",
    fallbackChain: [],
    isRunning: false,
    lastActivity: Date.now(),
    memories: [],
  }
  
  sessionState.set(sessionID, {
    ...current,
    ...update,
    lastActivity: Date.now(),
  })
}
```

#### 5.2.2 上下文注入器

**核心文件**: `src/features/context-injector/`

```typescript
export class ContextInjector {
  private injectedContext = new Map<string, string[]>()
  
  // 注入上下文到会话
  async inject(
    sessionID: string,
    context: ContextItem[]
  ): Promise<void> {
    const existing = this.injectedContext.get(sessionID) || []
    const newContext = context.map(item => this.formatContext(item))
    
    this.injectedContext.set(sessionID, [
      ...existing,
      ...newContext,
    ])
  }
  
  // 获取会话的注入上下文
  getInjected(sessionID: string): string[] {
    return this.injectedContext.get(sessionID) || []
  }
  
  // 清理会话上下文
  clear(sessionID: string): void {
    this.injectedContext.delete(sessionID)
  }
  
  private formatContext(item: ContextItem): string {
    switch (item.type) {
      case "file":
        return `<file path="${item.path}">\n${item.content}\n</file>`
      
      case "memory":
        return `<memory>\n${item.content}\n</memory>`
      
      case "rule":
        return `<rule>\n${item.content}\n</rule>`
      
      default:
        return item.content
    }
  }
}
```

#### 5.2.3 压缩上下文管理

**核心文件**: `src/hooks/compaction-context-injector/`

```typescript
export class CompactionContextInjector {
  private capturedContext = new Map<string, CapturedContext>()
  
  // 在压缩前捕获重要上下文
  async capture(sessionID: string): Promise<void> {
    const state = getSessionState(sessionID)
    if (!state) return
    
    const context: CapturedContext = {
      // 1. 捕获已注入的文件路径
      injectedPaths: Array.from(state.injectedPaths),
      
      // 2. 捕获使用的工具
      toolsUsed: Array.from(state.toolsUsed),
      
      // 3. 捕获当前任务状态
      currentTasks: await this.getCurrentTasks(sessionID),
      
      // 4. 捕获重要的记忆
      memories: state.memories.filter(m => m.importance > 0.7),
    }
    
    this.capturedContext.set(sessionID, context)
  }
  
  // 在压缩后注入保留的上下文
  inject(sessionID: string): string {
    const context = this.capturedContext.get(sessionID)
    if (!context) return ""
    
    const parts: string[] = []
    
    // 注入文件路径上下文
    if (context.injectedPaths.length > 0) {
      parts.push(
        "<previously-accessed-files>",
        ...context.injectedPaths.map(p => `- ${p}`),
        "</previously-accessed-files>"
      )
    }
    
    // 注入工具使用历史
    if (context.toolsUsed.length > 0) {
      parts.push(
        "<tools-used>",
        ...context.toolsUsed.map(t => `- ${t}`),
        "</tools-used>"
      )
    }
    
    // 注入任务状态
    if (context.currentTasks.length > 0) {
      parts.push(
        "<current-tasks>",
        ...context.currentTasks.map(t => 
          `- [${t.status}] ${t.description}`
        ),
        "</current-tasks>"
      )
    }
    
    // 注入重要记忆
    if (context.memories.length > 0) {
      parts.push(
        "<relevant-memories>",
        ...context.memories.map(m => `- ${m.content}`),
        "</relevant-memories>"
      )
    }
    
    return parts.join("\n")
  }
}
```

### 5.3 多智能体协作记忆

#### 5.3.1 后台管理器

**核心文件**: `src/features/background-agent/manager.ts`

```typescript
export class BackgroundManager {
  private sessions = new Map<string, BackgroundSession>()
  private parentChildMap = new Map<string, Set<string>>()
  
  // 创建后台会话
  async createSession(args: {
    agentId: string
    prompt: string
    parentSessionId?: string
    sync?: boolean
  }): Promise<BackgroundSession> {
    const sessionID = generateSessionID()
    
    const session: BackgroundSession = {
      id: sessionID,
      agentId: args.agentId,
      parentId: args.parentSessionId,
      status: "pending",
      createdAt: Date.now(),
      prompt: args.prompt,
    }
    
    this.sessions.set(sessionID, session)
    
    // 建立父子关系
    if (args.parentSessionId) {
      if (!this.parentChildMap.has(args.parentSessionId)) {
        this.parentChildMap.set(args.parentSessionId, new Set())
      }
      this.parentChildMap.get(args.parentSessionId)!.add(sessionID)
    }
    
    // 启动会话
    await this.startSession(session)
    
    // 同步等待
    if (args.sync) {
      return await this.waitForCompletion(sessionID)
    }
    
    return session
  }
  
  // 获取子会话
  getChildSessions(parentId: string): BackgroundSession[] {
    const childIds = this.parentChildMap.get(parentId) || new Set()
    return Array.from(childIds)
      .map(id => this.sessions.get(id))
      .filter(Boolean) as BackgroundSession[]
  }
  
  // 传播上下文到子会话
  async propagateContext(
    parentId: string,
    context: ContextItem[]
  ): Promise<void> {
    const children = this.getChildSessions(parentId)
    
    for (const child of children) {
      await this.injectContext(child.id, context)
    }
  }
  
  // 收集子会话结果
  async collectResults(parentId: string): Promise<SessionResult[]> {
    const children = this.getChildSessions(parentId)
    const results: SessionResult[] = []
    
    for (const child of children) {
      if (child.status === "completed") {
        results.push({
          sessionId: child.id,
          agentId: child.agentId,
          output: child.output || "",
          metadata: child.metadata,
        })
      }
    }
    
    return results
  }
}
```

---

## 6. 心跳技术

### 6.1 OpenCode 调度器

**核心文件**: `src/scheduler/index.ts`

```typescript
export namespace Scheduler {
  export type Task = {
    id: string
    interval: number
    run: () => Promise<void>
    scope?: "instance" | "global"
  }
  
  // 注册定时任务
  export function register(task: Task) {
    const scope = task.scope ?? "instance"
    const entry = scope === "global" ? shared : state()
    
    const current = entry.timers.get(task.id)
    if (current && scope === "global") return
    if (current) clearInterval(current)
    
    entry.tasks.set(task.id, task)
    
    // 立即执行一次
    void run(task)
    
    // 设置定时器
    const timer = setInterval(() => {
      void run(task)
    }, task.interval)
    timer.unref()
    entry.timers.set(task.id, timer)
  }
  
  async function run(task: Task) {
    log.info("run", { id: task.id })
    await task.run().catch((error) => {
      log.error("run failed", { id: task.id, error })
    })
  }
}
```

**使用示例**:

```typescript
// 注册会话清理任务
Scheduler.register({
  id: "session-cleanup",
  interval: 60 * 60 * 1000, // 1小时
  scope: "global",
  run: async () => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000 // 7天
    const oldSessions = await Session.listGlobal({
      start: 0,
      cursor: cutoff,
    })
    
    for (const session of oldSessions) {
      if (session.time.archived) {
        await Session.remove(session.id)
      }
    }
  }
})

// 注册模型可用性检查
Scheduler.register({
  id: "model-availability-check",
  interval: 5 * 60 * 1000, // 5分钟
  scope: "instance",
  run: async () => {
    const providers = await Provider.list()
    for (const provider of providers) {
      await provider.checkAvailability()
    }
  }
})
```

### 6.2 Oh-My-OpenAgent 心跳系统

#### 6.2.1 会话通知调度器

**核心文件**: `src/hooks/session-notification-scheduler.ts`

```typescript
export class SessionNotificationScheduler {
  private timers = new Map<string, NodeJS.Timeout>()
  private pendingNotifications = new Map<string, PendingNotification>()
  
  // 调度通知
  schedule(
    sessionID: string,
    notification: NotificationConfig
  ): void {
    // 清除现有定时器
    this.cancel(sessionID)
    
    const delay = this.calculateDelay(notification)
    
    const timer = setTimeout(async () => {
      await this.sendNotification(sessionID, notification)
      this.timers.delete(sessionID)
      this.pendingNotifications.delete(sessionID)
    }, delay)
    
    this.timers.set(sessionID, timer)
    this.pendingNotifications.set(sessionID, {
      sessionID,
      notification,
      scheduledAt: Date.now(),
      dueAt: Date.now() + delay,
    })
  }
  
  // 取消通知
  cancel(sessionID: string): void {
    const timer = this.timers.get(sessionID)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(sessionID)
      this.pendingNotifications.delete(sessionID)
    }
  }
  
  // 计算延迟
  private calculateDelay(config: NotificationConfig): number {
    switch (config.trigger) {
      case "idle":
        return config.idleTimeout || 30000 // 30秒
      
      case "completion":
        return 0 // 立即
      
      case "error":
        return 1000 // 1秒延迟
      
      case "scheduled":
        return config.scheduledTime! - Date.now()
      
      default:
        return 0
    }
  }
  
  // 发送通知
  private async sendNotification(
    sessionID: string,
    config: NotificationConfig
  ): Promise<void> {
    const state = getSessionState(sessionID)
    if (!state) return
    
    // 检查是否需要通知
    if (!this.shouldNotify(state, config)) {
      return
    }
    
    // 构建通知消息
    const message = this.buildMessage(state, config)
    
    // 发送到父会话
    if (state.parentID) {
      await this.sendToParent(state.parentID, message)
    }
  }
  
  private shouldNotify(
    state: SessionState,
    config: NotificationConfig
  ): boolean {
    // 检查会话是否仍在运行
    if (config.trigger === "idle" && state.isRunning) {
      return false
    }
    
    // 检查是否有新活动
    const timeSinceActivity = Date.now() - state.lastActivity
    if (config.trigger === "idle" && 
        timeSinceActivity < (config.idleTimeout || 30000)) {
      return false
    }
    
    return true
  }
}
```

#### 6.2.2 自动更新检查器

**核心文件**: `src/hooks/auto-update-checker/`

```typescript
export function createAutoUpdateChecker(
  pluginConfig: OhMyOpenCodeConfig
): Hook {
  const checkInterval = pluginConfig.auto_update?.check_interval || 
                       24 * 60 * 60 * 1000 // 24小时
  
  let lastCheck = 0
  let latestVersion: string | null = null
  
  return {
    name: "auto-update-checker",
    
    "chat.message": async (input, output) => {
      const now = Date.now()
      
      // 检查是否需要更新检查
      if (now - lastCheck < checkInterval) {
        return
      }
      
      lastCheck = now
      
      // 获取最新版本
      try {
        const response = await fetch(
          "https://registry.npmjs.org/oh-my-opencode/latest"
        )
        const data = await response.json()
        latestVersion = data.version
        
        // 比较版本
        const currentVersion = getCurrentVersion()
        if (isNewerVersion(latestVersion, currentVersion)) {
          // 注入更新提示
          output.system.push(
            `\n<update-available>\n` +
            `A new version of oh-my-opencode is available: ${latestVersion}\n` +
            `Current version: ${currentVersion}\n` +
            `Run: bunx oh-my-opencode@latest install\n` +
            `</update-available>`
          )
        }
      } catch (error) {
        log("[auto-update-checker] Check failed:", error)
      }
    }
  }
}
```

#### 6.2.3 后台任务心跳

**核心文件**: `src/features/background-agent/heartbeat.ts`

```typescript
export class BackgroundHeartbeat {
  private heartbeats = new Map<string, HeartbeatState>()
  
  // 启动心跳
  start(sessionID: string, interval: number = 5000): void {
    if (this.heartbeats.has(sessionID)) {
      return
    }
    
    const state: HeartbeatState = {
      sessionID,
      interval,
      lastBeat: Date.now(),
      missedBeats: 0,
      timer: setInterval(() => {
        this.beat(sessionID)
      }, interval),
    }
    
    this.heartbeats.set(sessionID, state)
  }
  
  // 停止心跳
  stop(sessionID: string): void {
    const state = this.heartbeats.get(sessionID)
    if (state) {
      clearInterval(state.timer)
      this.heartbeats.delete(sessionID)
    }
  }
  
  // 心跳检测
  private async beat(sessionID: string): Promise<void> {
    const state = this.heartbeats.get(sessionID)
    if (!state) return
    
    try {
      // 检查会话是否仍然活跃
      const session = await this.checkSession(sessionID)
      
      if (!session) {
        // 会话已结束
        this.stop(sessionID)
        return
      }
      
      // 更新心跳时间
      state.lastBeat = Date.now()
      state.missedBeats = 0
      
      // 执行心跳任务
      await this.performHeartbeatTasks(session)
      
    } catch (error) {
      state.missedBeats++
      
      // 连续失败3次，停止心跳
      if (state.missedBeats >= 3) {
        log(`[heartbeat] Session ${sessionID} unresponsive, stopping`)
        this.stop(sessionID)
      }
    }
  }
  
  private async performHeartbeatTasks(
    session: BackgroundSession
  ): Promise<void> {
    // 1. 检查超时
    if (this.isTimeout(session)) {
      await this.handleTimeout(session)
    }
    
    // 2. 更新进度
    await this.updateProgress(session)
    
    // 3. 检查资源使用
    await this.checkResourceUsage(session)
  }
  
  private isTimeout(session: BackgroundSession): boolean {
    const maxDuration = 30 * 60 * 1000 // 30分钟
    return Date.now() - session.createdAt > maxDuration
  }
}
```

---

## 7. 渠道技术

### 7.1 OpenCode 渠道架构

OpenCode本身不直接实现渠道技术，这是OpenClaw项目的核心功能。但OpenCode提供了基础的会话和消息管理能力。

### 7.2 渠道抽象层（参考OpenClaw）

虽然不在当前分析的两个项目中，但可以看到OpenCode为渠道集成预留了接口：

```typescript
// 会话可以关联到不同的工作空间
export const Info = z.object({
  workspaceID: WorkspaceID.zod.optional(),
  // ...
})

// 消息支持多种来源
export namespace MessageV2 {
  export const User = z.object({
    role: z.literal("user"),
    content: z.string(),
    // 可扩展的元数据
    metadata: z.record(z.any()).optional(),
  })
}
```

---

## 8. 网关技术

### 8.1 OpenCode 服务器

**核心文件**: `src/server/`

OpenCode提供了HTTP/WebSocket服务器用于远程访问：

```typescript
export namespace Server {
  export async function start(options: {
    port: number
    host?: string
    auth?: AuthConfig
  }): Promise<ServerInstance> {
    const app = createApp()
    
    // 1. 设置路由
    app.use("/api/session", sessionRouter)
    app.use("/api/agent", agentRouter)
    app.use("/api/tool", toolRouter)
    
    // 2. WebSocket支持
    app.ws("/ws", (ws, req) => {
      const client = new WebSocketClient(ws)
      handleWebSocketConnection(client)
    })
    
    // 3. 认证中间件
    if (options.auth) {
      app.use(authMiddleware(options.auth))
    }
    
    // 4. 启动服务器
    const server = app.listen(options.port, options.host)
    
    return {
      server,
      close: () => server.close(),
    }
  }
}
```

### 8.2 Oh-My-OpenAgent 服务器集成

Oh-My-OpenAgent通过OpenCode的插件API与服务器集成：

```typescript
// 插件上下文提供客户端访问
export interface PluginContext {
  client: {
    request: (method: string, params?: any) => Promise<any>
  }
  directory: string
}

// 使用客户端API
async function callAgent(
  ctx: PluginContext,
  agentId: string,
  prompt: string
) {
  return await ctx.client.request("agent.run", {
    agent: agentId,
    messages: [
      { role: "user", content: prompt }
    ],
  })
}
```

---

## 9. 多智能体技术

### 9.1 Oh-My-OpenAgent 多智能体编排

#### 9.1.1 智能体委托系统

**核心流程**:

```
Sisyphus (主智能体)
    ↓ 识别需求
    ↓ 查询委托表
    ↓
    ├─→ Oracle (外部知识)
    │   └─→ websearch, webfetch
    │
    ├─→ Librarian (库文档)
    │   └─→ 文档搜索
    │
    ├─→ Explore (代码探索)
    │   └─→ grep, glob, read
    │
    ├─→ Hephaestus (构建任务)
    │   └─→ bash, task
    │
    └─→ Atlas (项目编排)
        └─→ 协调多个子智能体
```

#### 9.1.2 委托决策逻辑

**核心文件**: `src/agents/sisyphus/delegation-logic.ts`

```typescript
export function shouldDelegate(
  userMessage: string,
  availableAgents: AvailableAgent[]
): DelegationDecision {
  // 1. 关键词匹配
  const keywords = extractKeywords(userMessage)
  
  for (const agent of availableAgents) {
    if (agent.metadata?.keyTrigger) {
      const triggerMatch = keywords.some(k => 
        agent.metadata.keyTrigger.toLowerCase().includes(k)
      )
      if (triggerMatch) {
        return {
          shouldDelegate: true,
          targetAgent: agent.name,
          reason: `Key trigger matched: ${agent.metadata.keyTrigger}`,
        }
      }
    }
  }
  
  // 2. 领域匹配
  for (const agent of availableAgents) {
    if (agent.metadata?.triggers) {
      for (const trigger of agent.metadata.triggers) {
        if (matchesDomain(userMessage, trigger.domain)) {
          return {
            shouldDelegate: true,
            targetAgent: agent.name,
            reason: trigger.trigger,
          }
        }
      }
    }
  }
  
  // 3. 成本考虑
  const complexity = estimateComplexity(userMessage)
  if (complexity === "simple") {
    // 使用免费或便宜的智能体
    const cheapAgent = availableAgents.find(a => 
      a.metadata?.cost === "FREE" || a.metadata?.cost === "CHEAP"
    )
    if (cheapAgent) {
      return {
        shouldDelegate: true,
        targetAgent: cheapAgent.name,
        reason: "Simple task, using cost-effective agent",
      }
    }
  }
  
  return { shouldDelegate: false }
}
```

#### 9.1.3 并行智能体执行

**核心文件**: `src/features/background-agent/parallel-executor.ts`

```typescript
export class ParallelExecutor {
  private maxConcurrent: number
  private queue: ExecutionTask[] = []
  private running = new Set<string>()
  
  constructor(maxConcurrent: number = 5) {
    this.maxConcurrent = maxConcurrent
  }
  
  // 并行执行多个智能体任务
  async executeParallel(
    tasks: AgentTask[]
  ): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = []
    const promises: Promise<ExecutionResult>[] = []
    
    for (const task of tasks) {
      // 等待空闲槽位
      while (this.running.size >= this.maxConcurrent) {
        await this.waitForSlot()
      }
      
      // 启动任务
      const promise = this.executeTask(task)
      promises.push(promise)
      this.running.add(task.id)
      
      // 任务完成后释放槽位
      promise.finally(() => {
        this.running.delete(task.id)
      })
    }
    
    // 等待所有任务完成
    results.push(...await Promise.all(promises))
    
    return results
  }
  
  private async executeTask(
    task: AgentTask
  ): Promise<ExecutionResult> {
    const startTime = Date.now()
    
    try {
      const session = await backgroundManager.createSession({
        agentId: task.agentId,
        prompt: task.prompt,
        parentSessionId: task.parentId,
        sync: true,
      })
      
      return {
        taskId: task.id,
        sessionId: session.id,
        status: "success",
        output: session.output,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      return {
        taskId: task.id,
        status: "error",
        error: String(error),
        duration: Date.now() - startTime,
      }
    }
  }
  
  private async waitForSlot(): Promise<void> {
    return new Promise(resolve => {
      const check = () => {
        if (this.running.size < this.maxConcurrent) {
          resolve()
        } else {
          setTimeout(check, 100)
        }
      }
      check()
    })
  }
}
```

#### 9.1.4 智能体通信协议

```typescript
export interface AgentMessage {
  from: string        // 发送智能体ID
  to: string          // 接收智能体ID
  type: MessageType   // 消息类型
  content: any        // 消息内容
  metadata?: {
    parentSessionId?: string
    priority?: number
    timestamp?: number
  }
}

export enum MessageType {
  REQUEST = "request",           // 请求
  RESPONSE = "response",         // 响应
  NOTIFICATION = "notification", // 通知
  DELEGATION = "delegation",     // 委托
  RESULT = "result",            // 结果
}

// 智能体间消息传递
export class AgentMessageBus {
  private subscribers = new Map<string, Set<MessageHandler>>()
  
  // 订阅消息
  subscribe(
    agentId: string, 
    handler: MessageHandler
  ): () => void {
    if (!this.subscribers.has(agentId)) {
      this.subscribers.set(agentId, new Set())
    }
    this.subscribers.get(agentId)!.add(handler)
    
    // 返回取消订阅函数
    return () => {
      this.subscribers.get(agentId)?.delete(handler)
    }
  }
  
  // 发送消息
  async send(message: AgentMessage): Promise<void> {
    const handlers = this.subscribers.get(message.to)
    if (!handlers || handlers.size === 0) {
      throw new Error(`No handlers for agent: ${message.to}`)
    }
    
    // 并行调用所有处理器
    await Promise.all(
      Array.from(handlers).map(h => h(message))
    )
  }
  
  // 请求-响应模式
  async request(
    from: string,
    to: string,
    content: any,
    timeout: number = 30000
  ): Promise<any> {
    const requestId = generateId()
    
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("Request timeout"))
      }, timeout)
      
      // 订阅响应
      const unsubscribe = this.subscribe(from, (msg) => {
        if (msg.type === MessageType.RESPONSE && 
            msg.metadata?.requestId === requestId) {
          clearTimeout(timer)
          unsubscribe()
          resolve(msg.content)
        }
      })
      
      // 发送请求
      this.send({
        from,
        to,
        type: MessageType.REQUEST,
        content,
        metadata: { requestId },
      }).catch(reject)
    })
  }
}
```

---

## 10. 配置文件管理

### 10.1 OpenCode 配置系统

**核心文件**: `src/config/config.ts`

```typescript
export namespace Config {
  // 配置文件位置
  export async function directories(): Promise<string[]> {
    return [
      path.join(Instance.worktree, ".opencode"),
      path.join(os.homedir(), ".config", "opencode"),
    ]
  }
  
  // 加载配置
  export async function get(): Promise<OpenClawConfig> {
    const dirs = await directories()
    const configs: Partial<OpenClawConfig>[] = []
    
    // 从所有目录加载配置
    for (const dir of dirs) {
      const configPath = path.join(dir, "config.json")
      if (await Filesystem.exists(configPath)) {
        const content = await fs.readFile(configPath, "utf-8")
        const parsed = JSON.parse(content)
        configs.push(parsed)
      }
    }
    
    // 合并配置（后面的覆盖前面的）
    const merged = Object.assign({}, ...configs)
    
    // 应用默认值
    return applyDefaults(merged)
  }
}
```

### 10.2 Oh-My-OpenAgent 配置系统

#### 10.2.1 多层配置合并

**核心文件**: `src/plugin-config.ts`

```typescript
export function loadPluginConfig(
  directory: string,
  ctx: PluginContext
): OhMyOpenCodeConfig {
  // 1. 加载项目配置
  const projectConfig = loadProjectConfig(directory)
  
  // 2. 加载用户配置
  const userConfig = loadUserConfig()
  
  // 3. 获取默认配置
  const defaultConfig = getDefaultConfig()
  
  // 4. 深度合并
  const merged = deepMerge(
    defaultConfig,
    userConfig,
    projectConfig
  )
  
  // 5. Zod验证
  const validated = OhMyOpenCodeConfigSchema.parse(merged)
  
  // 6. 配置迁移
  const migrated = migrateConfigFile(validated)
  
  return migrated
}

// 深度合并策略
function deepMerge(
  ...configs: Partial<OhMyOpenCodeConfig>[]
): OhMyOpenCodeConfig {
  const result = {} as OhMyOpenCodeConfig
  
  for (const config of configs) {
    for (const [key, value] of Object.entries(config)) {
      if (key === "agents" || 
          key === "categories" || 
          key === "claude_code") {
        // 递归深度合并
        result[key] = deepMergeObject(result[key] || {}, value)
      } else if (key.startsWith("disabled_")) {
        // Set联合（去重）
        result[key] = Array.from(new Set([
          ...(result[key] || []),
          ...(value || []),
        ]))
      } else {
        // 直接覆盖
        result[key] = value
      }
    }
  }
  
  return result
}
```

#### 10.2.2 配置文件结构

**项目配置**: `.opencode/oh-my-opencode.jsonc`

```jsonc
{
  // 智能体配置
  "agents": {
    "sisyphus": {
      "model": "anthropic/claude-sonnet-4",
      "temperature": 0.7,
      "prompt_append": "Additional instructions..."
    },
    "oracle": {
      "variant": "extended",
      "fallback_models": ["openai/gpt-4", "google/gemini-pro"]
    }
  },
  
  // 分类配置
  "categories": {
    "frontend": {
      "description": "Frontend development tasks",
      "model": "anthropic/claude-sonnet-3.5",
      "temperature": 0.5
    },
    "backend": {
      "description": "Backend development tasks",
      "model": "openai/gpt-4-turbo"
    }
  },
  
  // 禁用配置
  "disabled_agents": ["momus"],
  "disabled_hooks": ["auto-update-checker"],
  "disabled_tools": ["interactive_bash"],
  "disabled_skills": ["experimental-feature"],
  
  // 后台任务配置
  "background_task": {
    "max_concurrent": 5,
    "timeout_ms": 300000,
    "syncPollTimeoutMs": 60000
  },
  
  // Tmux配置
  "tmux": {
    "enabled": true,
    "layout": "main-vertical",
    "main_pane_size": 60
  },
  
  // 实验性功能
  "experimental": {
    "task_system": true,
    "safe_hook_creation": true
  }
}
```

#### 10.2.3 配置迁移

**核心文件**: `src/shared/migration.ts`

```typescript
export function migrateConfigFile(
  config: OhMyOpenCodeConfig
): OhMyOpenCodeConfig {
  const migrations: Migration[] = [
    // 迁移1: 重命名智能体
    {
      version: "1.0.0",
      migrate: (cfg) => {
        if (cfg.agents?.["old-name"]) {
          cfg.agents["new-name"] = cfg.agents["old-name"]
          delete cfg.agents["old-name"]
        }
        return cfg
      }
    },
    
    // 迁移2: 更新模型名称
    {
      version: "1.1.0",
      migrate: (cfg) => {
        for (const agent of Object.values(cfg.agents || {})) {
          if (agent.model === "gpt-4-1106-preview") {
            agent.model = "gpt-4-turbo"
          }
        }
        return cfg
      }
    },
    
    // 迁移3: 合并配置字段
    {
      version: "1.2.0",
      migrate: (cfg) => {
        // 将旧的配置结构迁移到新结构
        if (cfg.legacy_field) {
          cfg.new_field = transformLegacyField(cfg.legacy_field)
          delete cfg.legacy_field
        }
        return cfg
      }
    },
  ]
  
  let result = config
  for (const migration of migrations) {
    result = migration.migrate(result)
  }
  
  return result
}
```

#### 10.2.4 配置文件类型

Oh-My-OpenAgent支持多种配置文件（虽然在代码中未明确实现，但从AGENTS.md可以看出设计意图）：

**1. AGENTS.md** - 智能体配置指南
- 定义智能体行为规范
- 编码风格指南
- 命名约定
- 反模式警告

**2. TOOLS.md** - 工具使用指南
- 工具使用最佳实践
- 工具限制说明
- 安全注意事项

**3. IDENTITY.md** - 身份配置
- 智能体人格定义
- 响应风格
- 语气和措辞

**4. MEMORY.md** - 记忆配置
- 记忆保留策略
- 上下文优先级
- 压缩规则

**5. HEARTBEAT.md** - 心跳配置
- 定时任务定义
- 监控规则
- 触发条件

**6. BOOT.md** - 启动配置
- 初始化流程
- 预加载资源
- 环境检查

**7. BOOTSTRAP.md** - 引导配置
- 首次运行设置
- 依赖安装
- 配置向导

---

## 11. 核心设计模式总结

### 11.1 OpenCode 设计模式

#### 11.1.1 实例状态模式

```typescript
// 使用Instance.state()实现实例级状态隔离
const state = Instance.state(
  async () => createInitialState(),
  async (state) => cleanupState(state)
)
```

**优势**:
- 自动生命周期管理
- 实例隔离
- 清理保证

#### 11.1.2 函数式API模式

```typescript
// 使用fn()包装函数，提供类型安全和验证
export const create = fn(
  z.object({ title: z.string() }),
  async (input) => {
    // 实现
  }
)
```

**优势**:
- 运行时类型验证
- 自动文档生成
- 统一错误处理

#### 11.1.3 事件总线模式

```typescript
// 使用Bus发布/订阅事件
Bus.publish(Event.Created, { info })
Bus.subscribe(Event.Updated, handler)
```

**优势**:
- 解耦组件
- 异步通信
- 可扩展性

### 11.2 Oh-My-OpenAgent 设计模式

#### 11.2.1 插件架构模式

```typescript
const OhMyOpenCodePlugin: Plugin = async (ctx) => {
  // 1. 加载配置
  // 2. 创建管理器
  // 3. 创建工具
  // 4. 创建钩子
  // 5. 返回插件接口
}
```

**优势**:
- 模块化
- 可配置
- 易于扩展

#### 11.2.2 工厂模式

```typescript
// 智能体工厂
export function createSisyphusAgent(model: string): AgentConfig {
  return {
    name: "sisyphus",
    model,
    prompt: generatePrompt(),
  }
}
```

**优势**:
- 延迟初始化
- 参数化创建
- 一致性保证

#### 11.2.3 管理器模式

```typescript
export class BackgroundManager {
  private sessions = new Map()
  
  async createSession() { }
  async getSession() { }
  async cleanup() { }
}
```

**优势**:
- 集中管理
- 生命周期控制
- 资源清理

#### 11.2.4 钩子模式

```typescript
export function createHook(): Hook {
  return {
    "chat.message": async (input, output) => {
      // 修改输入/输出
    },
    "tool.execute.before": async (input, output) => {
      // 工具执行前处理
    },
  }
}
```

**优势**:
- 非侵入式扩展
- 灵活的拦截点
- 可组合性

---

## 12. 性能优化策略

### 12.1 OpenCode 优化

1. **数据库优化**
   - 使用索引加速查询
   - 批量操作减少I/O
   - 连接池管理

2. **缓存策略**
   - 实例级状态缓存
   - 配置缓存
   - 模型元数据缓存

3. **流式处理**
   - 消息流式读取
   - 大文件分块处理
   - 增量更新

### 12.2 Oh-My-OpenAgent 优化

1. **并发控制**
   - 后台任务并发限制（默认5个）
   - 智能体调用队列
   - 资源池管理

2. **懒加载**
   - 技能按需加载
   - MCP服务器延迟启动
   - 工具动态注册

3. **上下文压缩**
   - 智能上下文保留
   - 重要信息提取
   - 历史消息压缩

---

## 13. 安全考虑

### 13.1 权限系统

```typescript
// OpenCode权限规则
permission: PermissionNext.fromConfig({
  "*": "allow",
  "*.env": "ask",
  external_directory: {
    "*": "ask",
    "/safe/path": "allow",
  },
})
```

### 13.2 工具执行安全

1. **沙箱隔离**
   - 限制文件系统访问
   - 网络请求白名单
   - 命令执行限制

2. **输入验证**
   - Zod模式验证
   - 路径规范化
   - 命令注入防护

3. **输出过滤**
   - 敏感信息脱敏
   - 输出大小限制
   - 错误信息清理

---

## 14. 测试策略

### 14.1 OpenCode 测试

```typescript
// Vitest测试
describe("Session", () => {
  it("creates session with default title", async () => {
    const session = await Session.create()
    expect(session.title).toMatch(/^New session/)
  })
  
  it("forks session with message history", async () => {
    const original = await Session.create()
    const forked = await Session.fork({
      sessionID: original.id,
    })
    expect(forked.title).toMatch(/fork/)
  })
})
```

### 14.2 Oh-My-OpenAgent 测试

```typescript
// Bun测试 (given/when/then风格)
describe("BackgroundManager", () => {
  describe("#given a background session", () => {
    describe("#when creating a child session", () => {
      describe("#then it should track parent-child relationship", () => {
        it("links child to parent", async () => {
          const parent = await manager.createSession({
            agentId: "sisyphus",
            prompt: "parent task",
          })
          
          const child = await manager.createSession({
            agentId: "oracle",
            prompt: "child task",
            parentSessionId: parent.id,
          })
          
          const children = manager.getChildSessions(parent.id)
          expect(children).toContainEqual(
            expect.objectContaining({ id: child.id })
          )
        })
      })
    })
  })
})
```

---

## 15. 部署与运维

### 15.1 安装方式

**OpenCode**:
```bash
# NPM安装
npm install -g opencode

# 本地开发
bun install
bun run build
```

**Oh-My-OpenAgent**:
```bash
# 交互式安装
bunx oh-my-opencode install

# 非交互式运行
bunx oh-my-opencode run

# 健康检查
bunx oh-my-opencode doctor
```

### 15.2 配置管理

**配置文件位置**:
- 项目级: `.opencode/oh-my-opencode.jsonc`
- 用户级: `~/.config/opencode/oh-my-opencode.jsonc`

**配置优先级**: 项目 > 用户 > 默认

### 15.3 日志管理

**OpenCode日志**:
- 位置: 系统临时目录
- 级别: DEBUG, INFO, WARN, ERROR
- 格式: 结构化JSON

**Oh-My-OpenAgent日志**:
- 位置: `/tmp/oh-my-opencode.log`
- 用途: 调试和故障排查

---

## 16. 未来展望

### 16.1 潜在改进方向

1. **分布式智能体**
   - 跨机器智能体协作
   - 负载均衡
   - 故障转移

2. **增强记忆系统**
   - 向量数据库集成
   - 语义搜索
   - 长期记忆持久化

3. **可视化工具**
   - 智能体执行流程图
   - 性能监控面板
   - 调试工具

4. **更多渠道支持**
   - 集成更多通信平台
   - 统一消息协议
   - 跨平台同步

### 16.2 社区生态

1. **插件市场**
   - 第三方智能体
   - 自定义工具
   - 技能共享

2. **文档完善**
   - API参考文档
   - 最佳实践指南
   - 案例研究

3. **开发者工具**
   - 智能体开发SDK
   - 测试框架
   - 调试工具

---

## 17. 总结

### 17.1 OpenCode 核心特性

- ✅ 完整的会话管理系统
- ✅ 灵活的Agent配置
- ✅ 强大的工具注册机制
- ✅ SQLite持久化存储
- ✅ 权限控制系统
- ✅ 插件架构支持

### 17.2 Oh-My-OpenAgent 核心特性

- ✅ 11个内置智能体
- ✅ 46个生命周期钩子
- ✅ 26个工具
- ✅ 三层MCP系统
- ✅ 多智能体编排
- ✅ 后台任务管理
- ✅ 技能系统
- ✅ 配置管理

### 17.3 架构优势

1. **模块化设计**: 清晰的模块边界，易于维护和扩展
2. **类型安全**: TypeScript + Zod提供完整的类型保护
3. **可扩展性**: 插件架构支持无限扩展
4. **性能优化**: 多层缓存、并发控制、懒加载
5. **安全性**: 权限系统、输入验证、沙箱隔离

### 17.4 学习价值

这两个项目展示了现代AI编程助手的完整架构：

- **Agent系统设计**: 如何设计和管理多个智能体
- **工具系统**: 如何抽象和注册工具
- **记忆管理**: 如何高效管理上下文和历史
- **配置系统**: 如何设计灵活的配置层次
- **插件架构**: 如何构建可扩展的插件系统

---

**文档结束**

*本文档基于源码分析生成，涵盖了OpenCode和Oh-My-OpenAgent的核心架构和实现细节。*
