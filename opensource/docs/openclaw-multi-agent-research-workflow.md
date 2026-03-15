# OpenClaw 科研多智能体协作方案

基于 oh-my-openagent 架构分析，为 OpenClaw 设计科研场景多智能体协作配置方案。

---

## 一、架构对比分析

### oh-my-openagent 核心模式

| 特性 | 实现方式 |
|------|----------|
| **11个预定义智能体** | Sisyphus（协调）、Hephaestus（执行）、Oracle（咨询）、Librarian（搜索）、Explore（探索）等 |
| **Category 分类系统** | visual-engineering、deep、quick、ultrabrain 等任务类别，每类有专用模型+prompt |
| **委托任务工具** | `task(category="quick", prompt="...")` 自动路由到最优智能体 |
| **动态 Prompt** | 根据可用智能体/技能/类别动态构建协调者系统提示 |
| **模型回退链** | 每个智能体配置 fallback_models |

### OpenClaw 现有能力

| 特性 | 实现方式 |
|------|----------|
| **Sub-agents 系统** | `sessions_spawn` 工具，支持嵌套深度、orchestrator/leaf 角色 |
| **多智能体路由** | `agents.list` + `bindings` 配置 |
| **工具策略** | `tools.allow/deny` 精细控制 |
| **会话延续** | `session_id` 参数支持上下文保持 |

### 可行性评估

**✅ 高度可行** - OpenClaw 已具备完整基础设施：
- `sessions_spawn` 支持所有必要参数
- 已有 subagent-capabilities 角色系统
- 配置系统支持多智能体定义

---

## 二、科研场景配置方案

### 2.1 智能体定义

```json5
// ~/.openclaw/openclaw.json
{
  agents: {
    list: [
      // ===== 主协调者 =====
      {
        id: "research",
        default: true,
        name: "科研协调者",
        workspace: "~/.openclaw/workspace-research",
        model: "anthropic/claude-sonnet-4-5",
        subagents: {
          allowAgents: ["searcher", "analyst", "writer", "reviewer"],
          maxSpawnDepth: 2,
          maxConcurrent: 4,
        },
      },

      // ===== 搜索专家 =====
      {
        id: "searcher",
        name: "文献搜索",
        workspace: "~/.openclaw/workspace-searcher",
        model: "anthropic/claude-sonnet-4-5",  // 快速模型
        tools: {
          allow: ["web_search", "web_fetch", "read", "exec"],
          deny: ["write", "edit", "apply_patch"],
        },
      },

      // ===== 深度分析专家 =====
      {
        id: "analyst",
        name: "深度分析",
        workspace: "~/.openclaw/workspace-analyst",
        model: "anthropic/claude-opus-4-6",  // 强模型
        tools: {
          allow: ["read", "write", "exec", "web_fetch"],
        },
      },

      // ===== 报告撰写专家 =====
      {
        id: "writer",
        name: "报告撰写",
        workspace: "~/.openclaw/workspace-writer",
        model: "anthropic/claude-sonnet-4-5",
        tools: {
          allow: ["read", "write", "edit"],
          deny: ["exec", "web_search"],
        },
      },

      // ===== 审核专家 =====
      {
        id: "reviewer",
        name: "质量审核",
        workspace: "~/.openclaw/workspace-reviewer",
        model: "anthropic/claude-opus-4-6",
        tools: {
          allow: ["read"],
          deny: ["write", "edit", "exec"],
        },
      },
    ],
  },
}
```

### 2.2 工具配置

```json5
{
  tools: {
    // Web 搜索配置
    web: {
      search: {
        provider: "gemini",
        gemini: {
          apiKey: "AIza...",
        },
      },
    },

    // 智能体间通信
    agentToAgent: {
      enabled: true,
      allow: ["research", "searcher", "analyst", "writer", "reviewer"],
    },

    // 子智能体配置
    subagents: {
      runTimeoutSeconds: 1800,  // 30分钟超时
      archiveAfterMinutes: 120,
    },
  },
}
```

---

## 三、工作流实现

### 3.1 流水线协作模式

```
用户请求 → research（协调者）
              │
              ├── searcher（搜索论文/课题）
              │      └── 返回：文献列表、摘要、链接
              │
              ├── analyst（深度分析）
              │      └── 返回：方法论对比、关键发现、数据提取
              │
              ├── writer（撰写报告）
              │      └── 返回：结构化报告文档
              │
              └── reviewer（质量审核）
                     └── 返回：审核意见、改进建议
```

### 3.2 并行执行示例

主智能体可以并行启动多个搜索子智能体：

```json
// 并行搜索多个数据库
[
  {
    "task": "在 arXiv 搜索 'LLM multimodal fusion' 最新论文",
    "agentId": "searcher",
    "label": "arxiv-search"
  },
  {
    "task": "在 Google Scholar 搜索 'vision language model' 高引用论文",
    "agentId": "searcher",
    "label": "scholar-search"
  },
  {
    "task": "在 Semantic Scholar 搜索 'cross-modal attention' 相关研究",
    "agentId": "searcher",
    "label": "semantic-search"
  }
]
```

### 3.3 会话延续（关键特性）

使用 `session_id` 保持上下文，避免重复工作：

```json
// 第一次搜索
{
  "task": "搜索大语言模型多模态融合的最新进展",
  "agentId": "searcher"
}
// 返回: { "childSessionKey": "agent:research:subagent:uuid-1", ... }

// 后续深入（使用 session_id 延续）
{
  "task": "重点分析其中关于 CLIP 和 BLIP 模型的部分",
  "agentId": "searcher",
  "session_id": "uuid-1"
}
```

---

## 四、Category 分类系统（借鉴 oh-my-openagent）

### 4.1 配置实现

OpenClaw 可通过 `agents.list` 模拟 Category 功能：

```json5
{
  agents: {
    list: [
      // quick 类别 - 快速任务
      {
        id: "quick",
        name: "快速执行",
        model: "anthropic/claude-sonnet-4-5",
        tools: { allow: ["read", "edit"] },
      },

      // deep 类别 - 深度分析
      {
        id: "deep",
        name: "深度分析",
        model: "anthropic/claude-opus-4-6",
        tools: { allow: ["read", "write", "exec", "web_search"] },
      },

      // visual 类别 - 可视化
      {
        id: "visual",
        name: "可视化",
        model: "anthropic/claude-sonnet-4-5",
        tools: { allow: ["read", "write", "exec"] },
      },
    ],
  },
}
```

### 4.2 使用方式

```json
// 快速任务
{ "task": "修复 README 中的拼写错误", "agentId": "quick" }

// 深度分析
{ "task": "分析系统架构并输出详细报告", "agentId": "deep" }

// 可视化
{ "task": "生成数据可视化图表", "agentId": "visual" }
```

---

## 五、动态 Prompt 构建（建议增强）

### 5.1 当前状态

OpenClaw 的子智能体 prompt 主要通过 `AGENTS.md` 和 `SOUL.md` 静态定义。

### 5.2 建议增强

借鉴 oh-my-openagent 的 `dynamic-agent-prompt-builder.ts`，可增加：

1. **可用智能体列表注入**：在协调者 prompt 中自动列出可用子智能体及其能力
2. **委托触发表**：根据任务类型自动推荐最优子智能体
3. **工具选择表**：列出各智能体的成本和适用场景

### 5.3 实现建议

在 `subagent-announce.ts` 的 `buildSubagentSystemPrompt` 中增加动态内容：

```typescript
// 伪代码示例
function buildSubagentSystemPrompt(params: {
  agentId: string;
  availableAgents: AgentInfo[];
}): string {
  const delegationTable = buildDelegationTable(availableAgents);
  return `
<Role>
You are ${params.agentId}, a research coordinator.
</Role>

<Available_Agents>
${delegationTable}
</Available_Agents>

<Delegation_Rules>
- Literature search → searcher
- Deep analysis → analyst  
- Report writing → writer
- Quality review → reviewer
</Delegation_Rules>
`;
}
```

---

## 六、完整配置示例

### 科研场景完整配置

```json5
// ~/.openclaw/openclaw.json
{
  agents: {
    defaults: {
      workspace: "~/.openclaw/workspace-default",
      subagents: {
        maxSpawnDepth: 2,
        maxConcurrent: 4,
        runTimeoutSeconds: 1800,
      },
    },

    list: [
      {
        id: "research",
        default: true,
        name: "科研协调者",
        workspace: "~/.openclaw/workspace-research",
        model: "anthropic/claude-sonnet-4-5",
        subagents: {
          allowAgents: ["*"],  // 允许所有智能体
        },
      },
      {
        id: "searcher",
        name: "文献搜索",
        model: "anthropic/claude-sonnet-4-5",
        tools: {
          allow: ["web_search", "web_fetch", "read"],
        },
      },
      {
        id: "analyst",
        name: "深度分析",
        model: "anthropic/claude-opus-4-6",
        tools: {
          allow: ["read", "write", "exec"],
        },
      },
      {
        id: "writer",
        name: "报告撰写",
        model: "anthropic/claude-sonnet-4-5",
        tools: {
          allow: ["read", "write", "edit"],
        },
      },
    ],
  },

  tools: {
    web: {
      search: {
        provider: "gemini",
        gemini: { apiKey: "AIza..." },
      },
    },
    agentToAgent: {
      enabled: true,
      allow: ["*"],
    },
  },
}
```

---

## 七、使用示例

### 自然语言请求

```
"帮我研究'大语言模型的多模态融合'这个课题：
1. 搜索相关论文
2. 深度分析主要方法
3. 输出一份研究报告"
```

### 手动控制

```bash
# 启动搜索子智能体
/subagents spawn searcher "搜索 LLM 多模态融合的最新论文"

# 查看状态
/subagents list

# 查看日志
/subagents log <session-id>
```

---

## 八、总结

| 方面 | 可行性 | 说明 |
|------|--------|------|
| 多智能体定义 | ✅ 已支持 | `agents.list` 配置 |
| 任务委托 | ✅ 已支持 | `sessions_spawn` 工具 |
| 并行执行 | ✅ 已支持 | 多次 spawn 调用 |
| 会话延续 | ✅ 已支持 | `session_id` 参数 |
| 工具隔离 | ✅ 已支持 | `tools.allow/deny` |
| Category 系统 | ⚠️ 需配置 | 通过 agents.list 模拟 |
| 动态 Prompt | ⚠️ 建议增强 | 可扩展 buildSubagentSystemPrompt |

**结论**：OpenClaw 已具备实现 oh-my-openagent 风格多智能体协作的完整基础设施，通过合理配置即可构建科研场景的流水线协作模式。
