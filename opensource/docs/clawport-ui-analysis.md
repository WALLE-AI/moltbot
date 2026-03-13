# ClawPort UI 项目源码分析文档

## 目录
1. [项目概述](#项目概述)
2. [产品定位](#产品定位)
3. [竞品分析](#竞品分析)
4. [技术架构](#技术架构)
5. [核心模块分析](#核心模块分析)
6. [API接口详解](#api接口详解)
7. [数据流向](#数据流向)
8. [部署与配置](#部署与配置)

---

## 项目概述

**项目名称**: ClawPort UI  
**版本**: 0.8.3  
**开源协议**: MIT  
**仓库地址**: https://github.com/JohnRiceML/clawport-ui  
**官网**: https://clawport.dev  
**npm包名**: clawport-ui  

ClawPort 是一个开源的可视化命令中心，用于管理、监控和直接与 OpenClaw AI 智能体团队进行交互。它连接到本地 OpenClaw 网关，提供组织架构图、支持视觉和语音的智能体聊天、看板、定时任务监控、成本追踪、活动控制台（实时日志流）和内存浏览器等功能。

### 核心特点
- 无需单独的 AI API 密钥，所有请求通过 OpenClaw 网关路由
- 支持多模态交互（文本、图像、语音）
- 实时日志流和活动监控
- 成本分析和优化建议
- 完整的测试覆盖（771个测试用例）

---

## 产品定位

### 目标用户

1. **AI 开发者和研究人员**: 需要管理多个 AI 智能体的开发团队
2. **企业 AI 运维团队**: 需要监控和管理 AI 智能体系统的运维人员
3. **个人 AI 爱好者**: 使用 OpenClaw 构建个人 AI 助手的用户

### 核心价值主张

1. **统一管理界面**: 提供单一界面管理所有 AI 智能体
2. **可视化组织架构**: 通过交互式组织图展示智能体层级关系
3. **多模态交互**: 支持文本、图像、语音等多种交互方式
4. **成本透明化**: 实时追踪和分析 AI 使用成本
5. **开源免费**: MIT 协议，完全开源，无隐藏费用

### 应用场景

- **智能体团队协作**: 管理多个专业化 AI 智能体的协作工作流
- **定时任务监控**: 监控和管理定期执行的 AI 任务
- **成本优化**: 分析 token 使用情况，优化 AI 调用成本
- **开发调试**: 实时查看日志，调试智能体行为
- **知识管理**: 浏览和管理智能体的长期记忆和团队知识库

---

## 竞品分析

### 主要竞品对比

| 特性 | ClawPort | LangSmith | Weights & Biases | Helicone | OpenAI Dashboard |
|------|----------|-----------|------------------|----------|------------------|
| **开源** | ✅ MIT | ❌ 商业 | ❌ 商业 | ✅ 部分开源 | ❌ 商业 |
| **本地部署** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **多模态支持** | ✅ | ✅ | ❌ | ✅ | ✅ |
| **成本分析** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **实时日志** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **组织架构图** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **看板管理** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **定价** | 免费 | $39+/月 | $50+/月 | 免费层+付费 | 按使用付费 |

### 竞争优势

1. **完全开源**: MIT 协议，代码完全透明
2. **本地优先**: 数据存储在本地，隐私安全
3. **零额外成本**: 无需单独的 API 密钥或订阅费用
4. **专为 OpenClaw 优化**: 深度集成 OpenClaw 生态系统
5. **丰富的可视化**: 独特的组织架构图和看板功能

### 差异化特点

- **智能体组织架构可视化**: 独有的 React Flow 驱动的组织图
- **内置看板系统**: 任务管理与智能体协作的无缝集成
- **AI 驱动的成本优化**: 自动分析并提供优化建议
- **主题系统**: 5 种内置主题（Dark, Glass, Color, Light, System）
- **引导式入门**: 完整的新手引导向导

---

## 技术架构

### 技术栈

#### 前端框架
- **Next.js 16.1.6**: React 框架，使用 App Router 和 Turbopack
- **React 19.2.3**: UI 库
- **TypeScript 5**: 类型安全的 JavaScript 超集

#### UI 组件
- **Tailwind CSS 4**: 实用优先的 CSS 框架
- **Radix UI**: 无样式的可访问组件库
- **Lucide React**: 图标库
- **React Flow (@xyflow/react)**: 组织架构图可视化

#### 状态管理
- **React Context**: 全局设置和主题管理
- **localStorage**: 本地数据持久化（对话、看板、设置）

#### AI 集成
- **OpenAI SDK**: 通过 OpenClaw 网关调用 Claude
- **Server-Sent Events (SSE)**: 流式响应处理

#### 测试
- **Vitest 4**: 单元测试和集成测试框架
- **jsdom**: DOM 环境模拟
- **@testing-library/react**: React 组件测试

### 架构模式

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (Client)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  React UI    │  │ localStorage │  │  SSE Client  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Next.js Server (Port 3000)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  API Routes  │  │  SSR Pages   │  │  File System │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              OpenClaw Gateway (localhost:18789)              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ HTTP API     │  │  WebSocket   │  │  CLI Tools   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      AI Providers                            │
│              (Claude, GPT, Local Models)                     │
└─────────────────────────────────────────────────────────────┘
```

### 目录结构

```
clawport-ui/
├── app/                    # Next.js App Router 页面和 API
│   ├── api/               # API 路由处理器
│   ├── activity/          # 活动控制台页面
│   ├── agents/            # 智能体详情页面
│   ├── chat/              # 聊天页面
│   ├── costs/             # 成本分析页面
│   ├── crons/             # 定时任务页面
│   ├── kanban/            # 看板页面
│   ├── memory/            # 内存浏览器页面
│   ├── settings/          # 设置页面
│   └── layout.tsx         # 根布局
├── components/            # React 组件
│   ├── ui/               # 基础 UI 组件
│   ├── chat/             # 聊天相关组件
│   ├── costs/            # 成本分析组件
│   ├── crons/            # 定时任务组件
│   ├── kanban/           # 看板组件
│   └── ...               # 其他功能组件
├── lib/                   # 核心业务逻辑
│   ├── agents.ts         # 智能体管理
│   ├── anthropic.ts      # Claude API 集成
│   ├── conversations.ts  # 对话管理
│   ├── costs.ts          # 成本计算
│   ├── crons.ts          # 定时任务管理
│   ├── memory.ts         # 内存管理
│   └── ...               # 其他工具函数
├── bin/                   # CLI 工具
│   └── clawport.mjs      # 命令行入口
├── scripts/               # 构建和设置脚本
│   └── setup.mjs         # 自动配置脚本
└── docs/                  # 文档
```

---

## 核心模块分析

### 1. 智能体管理模块 (lib/agents.ts)

**功能**: 智能体注册表的加载和管理

**核心逻辑**:

```typescript
// 智能体加载优先级
1. $WORKSPACE_PATH/clawport/agents.json  (用户自定义)
2. 自动发现 $WORKSPACE_PATH/agents/     (扫描目录)
3. lib/agents.json                       (内置默认)
```

**关键特性**:
- 自动发现工作区中的智能体
- 支持层级关系（reportsTo/directReports）
- 动态加载 SOUL.md 文件内容
- 支持自定义颜色、emoji、工具列表

### 2. 聊天模块 (lib/anthropic.ts, components/chat/)

**功能**: 多模态智能体对话

**两种管道**:

#### 文本流式管道
```
Client → POST /api/chat/[id] → OpenAI SDK → Gateway → Claude
                                          ↓
                                    SSE Stream
```

#### 视觉管道（图像）
```
Client → 图像调整大小(1200px) → base64编码
       ↓
POST /api/chat/[id] → 检测图像内容
       ↓
execFile: openclaw gateway call chat.send
       ↓
轮询: openclaw gateway call chat.history (每2秒)
       ↓
返回助手响应 (SSE)
```

**关键特性**:
- 支持文本、图像、语音消息
- 流式响应（实时显示）
- 对话历史持久化（localStorage）
- 斜杠命令系统（/clear, /help, /info, /soul, /tools, /crons）
- 文件附件支持（拖放、粘贴）

### 3. 成本分析模块 (lib/costs.ts)

**功能**: Token 使用和成本分析

**计算维度**:
- 每次运行成本（基于模型定价）
- 每个任务聚合（总成本 + 中位数成本）
- 每日成本时间线
- 模型分布（token 分布）
- 异常检测（超过中位数 5 倍的运行）
- 周环比分析
- 缓存节省估算
- 优化评分（0-100）

**定价表** (每百万 token):
```
Claude Opus 4.6:   输入 $5  / 输出 $25
Claude Sonnet 4.6: 输入 $3  / 输出 $15
Claude Haiku 4.5:  输入 $1  / 输出 $5
缓存读取: 0.1x 输入价格
缓存写入: 1.25x (5分钟TTL) 或 2x (1小时TTL)
批处理 API: 50% 折扣
```

**优化建议引擎**:
- 缓存启用建议
- 模型降级建议（Opus→Sonnet→Haiku）
- 异常警报
- 冗余输出检测

### 4. 定时任务模块 (lib/crons.ts, components/crons/)

**功能**: 定时任务监控和管道可视化

**核心功能**:
- 任务列表和状态监控
- 管道 DAG 可视化（React Flow）
- 周计划热力图
- AI 健康检查
- 管道自动检测向导

**数据源**:
```bash
openclaw cron list --json  # 获取任务列表
$WORKSPACE_PATH/../cron/runs/*.jsonl  # 运行历史
```

### 5. 活动控制台模块 (components/activity/, lib/logs.ts)

**功能**: 日志浏览和实时流

**两种模式**:
1. **历史日志浏览器**: 从 JSONL 文件读取历史事件
2. **实时流小部件**: SSE 流式日志（全局浮动窗口）

**日志来源**:
- 定时任务运行日志
- 配置审计日志

**实时流实现**:
```
LiveStreamWidget → fetch('/api/logs/stream')
                 ↓
                SSE Stream
                 ↓
openclaw logs --follow --json
```

### 6. 内存管理模块 (lib/memory.ts)

**功能**: 智能体记忆和知识库管理

**内存类型**:
- **长期记忆**: `MEMORY.md`
- **团队记忆**: `memory/team-memory.md`
- **团队情报**: `memory/team-intel.json`
- **每日日志**: `memory/YYYY-MM-DD.md`

**功能特性**:
- Markdown 渲染
- JSON 语法高亮
- 搜索和下载
- 健康检查和优化建议

### 7. 看板模块 (lib/kanban/, components/kanban/)

**功能**: 任务管理和智能体协作

**核心特性**:
- 拖放式任务卡片
- 智能体分配
- 任务详情面板（内联聊天）
- 聊天历史持久化

**数据存储**:
```
localStorage: clawport-kanban  # 看板状态
$WORKSPACE_PATH/../kanban/chats/{ticketId}.jsonl  # 聊天历史
```

### 8. 设置和主题模块 (lib/settings.ts, lib/themes.ts)

**功能**: 用户偏好和主题管理

**设置项**:
- 门户名称、副标题、emoji、图标
- 操作员姓名
- 主题选择
- 强调色
- 侧边栏折叠状态

**主题系统**:
- 5 种内置主题（Dark, Glass, Color, Light, System）
- CSS 自定义属性驱动
- 实时切换

---

## API接口详解

### 核心 API 端点

#### 1. GET /api/agents
**功能**: 获取所有智能体列表

**响应示例**:
```json
[
  {
    "id": "jarvis",
    "name": "JARVIS",
    "title": "Team Orchestrator",
    "reportsTo": null,
    "directReports": ["vera", "pulse"],
    "soulPath": "SOUL.md",
    "soul": "# JARVIS\n\nYou are the team's orchestrator...",
    "voiceId": null,
    "color": "#f5c518",
    "emoji": "🤖",
    "tools": ["read", "write", "exec", "message"],
    "crons": [],
    "memoryPath": null,
    "description": "Top-level orchestrator"
  }
]
```

**数据来源**: 
- JSON 注册表文件（内置或用户覆盖）
- SOUL.md 文件（从工作区文件系统加载）

#### 2. POST /api/chat/[id]
**功能**: 向智能体发送消息并接收流式响应

**请求体**:
```json
{
  "operatorName": "John",
  "messages": [
    {
      "role": "user",
      "content": "What cron jobs are running today?"
    }
  ]
}
```

**多模态请求（图像）**:
```json
{
  "messages": [
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "What do you see?" },
        { 
          "type": "image_url", 
          "image_url": { "url": "data:image/jpeg;base64,/9j/4AAQ..." }
        }
      ]
    }
  ]
}
```

**响应格式** (SSE):
```
data: {"content":"Hello"}

data: {"content":" there"}

data: [DONE]
```

#### 3. GET /api/crons
**功能**: 获取所有定时任务

**响应示例**:
```json
[
  {
    "id": "pulse-daily-digest",
    "name": "pulse-daily-digest",
    "schedule": "0 8 * * *",
    "scheduleDescription": "Daily at 8 AM",
    "timezone": "America/Los_Angeles",
    "status": "ok",
    "lastRun": "2026-03-12T08:00:00Z",
    "nextRun": "2026-03-13T08:00:00Z",
    "lastError": null,
    "agentId": "pulse",
    "description": "Daily digest email",
    "enabled": true,
    "delivery": {
      "mode": "email",
      "channel": "smtp",
      "to": "team@example.com"
    },
    "lastDurationMs": 2500,
    "consecutiveErrors": 0,
    "lastDeliveryStatus": "sent"
  }
]
```

**数据来源**: `openclaw cron list --json`

#### 4. GET /api/cron-runs
**功能**: 获取定时任务运行历史

**查询参数**:
- `jobId` (可选): 过滤特定任务的运行记录

**响应示例**:
```json
[
  {
    "ts": 1710230400000,
    "jobId": "pulse-daily-digest",
    "status": "ok",
    "summary": "Sent digest to 5 recipients",
    "error": null,
    "durationMs": 2500,
    "deliveryStatus": "sent",
    "model": "claude-sonnet-4-6",
    "provider": "anthropic",
    "usage": {
      "input_tokens": 1500,
      "output_tokens": 800,
      "total_tokens": 2300
    }
  }
]
```

**数据来源**: `$WORKSPACE_PATH/../cron/runs/*.jsonl`

#### 5. GET /api/memory
**功能**: 获取内存文件内容

**响应示例**:
```json
{
  "files": [
    {
      "label": "Long-Term Memory (Jarvis)",
      "path": "/Users/you/.openclaw/workspace/MEMORY.md",
      "relativePath": "MEMORY.md",
      "content": "# Memory\n\n...",
      "lastModified": "2026-03-12T10:30:00Z",
      "sizeBytes": 15420,
      "category": "evergreen"
    }
  ],
  "config": {
    "memorySearch": {
      "enabled": true,
      "provider": "openai",
      "model": "text-embedding-3-small"
    }
  },
  "status": {
    "indexed": true,
    "lastIndexed": "2026-03-12T09:00:00Z",
    "totalEntries": 1250
  },
  "stats": {
    "totalFiles": 45,
    "totalSizeBytes": 892000,
    "dailyLogCount": 30
  }
}
```

#### 6. GET /api/costs
**功能**: 获取成本分析摘要

**响应示例**:
```json
{
  "totalCost": 12.45,
  "topSpender": {
    "jobId": "pulse-daily-digest",
    "cost": 5.20
  },
  "anomalies": [
    {
      "ts": 1710230400000,
      "jobId": "vera-analysis",
      "totalTokens": 50000,
      "medianTokens": 8000,
      "ratio": 6.25
    }
  ],
  "jobCosts": [
    {
      "jobId": "pulse-daily-digest",
      "runs": 30,
      "totalInputTokens": 45000,
      "totalOutputTokens": 24000,
      "totalCost": 5.20,
      "medianCost": 0.17
    }
  ],
  "dailyCosts": [
    { "date": "2026-03-12", "cost": 0.85, "runs": 12 }
  ],
  "modelBreakdown": [
    { "model": "claude-sonnet-4-6", "tokens": 150000, "pct": 75 },
    { "model": "claude-haiku-4-5", "tokens": 50000, "pct": 25 }
  ],
  "weekOverWeek": {
    "thisWeek": 12.45,
    "lastWeek": 15.20,
    "changePct": -18.1
  },
  "cacheSavings": {
    "cacheTokens": 25000,
    "estimatedSavings": 0.75
  },
  "optimizationScore": {
    "overall": 72,
    "cacheScore": 85,
    "tieringScore": 60,
    "anomalyScore": 70,
    "efficiencyScore": 75
  },
  "insights": [
    {
      "id": "enable-cache",
      "severity": "warning",
      "title": "Enable Prompt Caching",
      "description": "3 jobs could benefit from prompt caching",
      "projectedSavings": 2.50,
      "action": "Enable prompt caching for pulse-daily-digest"
    }
  ]
}
```

#### 7. POST /api/tts
**功能**: 文本转语音

**请求体**:
```json
{
  "text": "Hello from Jarvis",
  "voice": "alloy"
}
```

**响应**: `audio/mpeg` (MP3 音频字节)

#### 8. POST /api/transcribe
**功能**: 语音转文本

**请求**: `multipart/form-data`
- `audio`: 音频文件（webm, mp4, wav 等）

**响应**:
```json
{
  "text": "Hello, what are the latest metrics?"
}
```

#### 9. GET /api/logs
**功能**: 获取历史日志条目

**响应示例**:
```json
{
  "entries": [
    {
      "id": "log-123",
      "ts": 1710230400000,
      "source": "cron",
      "level": "info",
      "category": "execution",
      "summary": "Job completed successfully",
      "agentId": "pulse",
      "jobId": "pulse-daily-digest",
      "durationMs": 2500,
      "details": { ... }
    }
  ],
  "summary": {
    "totalEntries": 1250,
    "errorCount": 15,
    "sources": { "cron": 1100, "config": 150 }
  }
}
```

#### 10. GET /api/logs/stream
**功能**: 实时日志流（SSE）

**响应格式**:
```
data: {"type":"log","time":"10:30:45","level":"INF","message":"Job started"}

data: {"type":"log","time":"10:30:47","level":"INF","message":"Job completed"}
```

### API 路由汇总表

| 方法 | 端点 | 需要网关 | 数据源 | 响应类型 |
|------|------|----------|--------|----------|
| GET | `/api/agents` | 否 | 文件系统 | JSON |
| POST | `/api/chat/[id]` | 是 | 网关/CLI | SSE |
| GET | `/api/crons` | 否 | CLI | JSON |
| GET | `/api/cron-runs` | 否 | 文件系统 | JSON |
| GET | `/api/memory` | 否 | 文件系统 | JSON |
| GET | `/api/costs` | 否 | 文件系统 | JSON |
| GET | `/api/logs` | 否 | 文件系统 | JSON |
| GET | `/api/logs/stream` | 否 | CLI | SSE |
| POST | `/api/tts` | 是 | 网关 | audio/mpeg |
| POST | `/api/transcribe` | 是 | 网关 | JSON |
| GET | `/api/pipelines` | 否 | 文件系统 | JSON |
| POST | `/api/pipelines` | 否 | 文件系统 | JSON |
| POST | `/api/kanban/chat/[id]` | 是 | 网关 | SSE |
| GET | `/api/kanban/chat-history/[ticketId]` | 否 | 文件系统 | JSON |
| POST | `/api/kanban/chat-history/[ticketId]` | 否 | 文件系统 | JSON |

---

## 数据流向

### 1. 智能体对话流程

```
用户输入消息
    ↓
ConversationView 组件
    ↓
检测消息类型（文本/图像/语音）
    ↓
┌─────────────┬─────────────┬─────────────┐
│   文本      │    图像     │    语音     │
└─────────────┴─────────────┴─────────────┘
      ↓              ↓              ↓
  POST /api/    调整大小      录音+波形
  chat/[id]     base64编码    捕获
      ↓              ↓              ↓
  OpenAI SDK    POST /api/    POST /api/
  流式请求      chat/[id]     transcribe
      ↓              ↓              ↓
  Gateway       CLI: chat.    Whisper API
  SSE响应       send+poll     转录文本
      ↓              ↓              ↓
  实时显示      SSE响应       作为文本
  token         完整响应      消息发送
      ↓              ↓              ↓
  保存到        保存到        保存到
  localStorage  localStorage  localStorage
```

### 2. 成本分析流程

```
GET /api/costs
    ↓
getCronRuns() 读取运行历史
    ↓
$WORKSPACE_PATH/../cron/runs/*.jsonl
    ↓
computeCostSummary() 计算
    ↓
┌─────────────────────────────────┐
│ • 每次运行成本（模型定价查找）    │
│ • 每个任务聚合                   │
│ • 每日成本时间线                 │
│ • 模型分布                       │
│ • 异常检测（>5x中位数）          │
│ • 周环比                         │
│ • 缓存节省                       │
│ • 优化评分（0-100）              │
│ • 优化建议                       │
└─────────────────────────────────┘
    ↓
返回 CostSummary JSON
    ↓
CostsPage 组件渲染
    ↓
┌─────────────────────────────────┐
│ • 优化评分卡                     │
│ • 优化建议列表                   │
│ • 每日成本柱状图                 │
│ • 任务成本表格                   │
│ • 模型分布饼图                   │
│ • 异常警报                       │
│ • AI 成本分析（可选）            │
└─────────────────────────────────┘
```

### 3. 实时日志流程

```
用户点击 "Open Live Stream"
    ↓
dispatch CustomEvent('clawport:open-stream-widget')
    ↓
LiveStreamWidget 监听事件
    ↓
fetch('/api/logs/stream')
    ↓
API 路由启动子进程
    ↓
execFile: openclaw logs --follow --json
    ↓
SSE 流式响应
    ↓
parseSSEBuffer() 解析
    ↓
实时渲染日志行
    ↓
┌─────────────────────────────────┐
│ • 时间戳                         │
│ • 级别标签（INF/WRN/ERR/DBG）    │
│ • 消息内容                       │
│ • 点击展开原始 JSON              │
└─────────────────────────────────┘
```

### 4. 数据持久化

#### localStorage 键值

| 键 | 用途 | 数据结构 |
|---|---|---|
| `clawport-settings` | 用户设置 | `ClawPortSettings` 对象 |
| `clawport-theme` | 选定主题 | 主题 ID 字符串 |
| `clawport-onboarded` | 首次运行标志 | 布尔值 |
| `clawport-conversations` | 聊天历史 | `{ [agentId]: Message[] }` |
| `clawport-kanban` | 看板状态 | 看板数据对象 |

#### 文件系统数据

| 路径 | 用途 |
|---|---|
| `$WORKSPACE_PATH/clawport/agents.json` | 用户自定义智能体注册表 |
| `$WORKSPACE_PATH/agents/*/SOUL.md` | 智能体身份文件 |
| `$WORKSPACE_PATH/memory/` | 团队记忆和每日日志 |
| `$WORKSPACE_PATH/../cron/runs/*.jsonl` | 定时任务运行历史 |
| `$WORKSPACE_PATH/../kanban/chats/*.jsonl` | 看板聊天历史 |
| `$WORKSPACE_PATH/../pipelines.json` | 管道配置 |

---

## 部署与配置

### 环境要求

- **Node.js**: 22+ 版本
- **OpenClaw**: 已安装并运行
- **操作系统**: macOS, Linux, Windows

### 安装步骤

#### 1. 全局安装（推荐）

```bash
npm install -g clawport-ui
```

#### 2. 从源码安装

```bash
git clone https://github.com/JohnRiceML/clawport-ui.git
cd clawport-ui
npm install
```

### 配置步骤

#### 1. 自动配置（推荐）

```bash
# 全局安装
clawport setup

# 源码安装
npm run setup
```

自动配置脚本会：
- 检测 OpenClaw 工作区路径
- 查找 `openclaw` 二进制文件
- 获取网关认证令牌
- 写入 `.env.local` 文件

#### 2. 手动配置

复制环境变量模板：
```bash
cp .env.example .env.local
```

编辑 `.env.local`:
```env
# 必需变量
WORKSPACE_PATH=/Users/yourname/.openclaw/workspace
OPENCLAW_BIN=/usr/local/bin/openclaw
OPENCLAW_GATEWAY_TOKEN=your-token-here

# 可选变量
ELEVENLABS_API_KEY=sk_your-key-here
OPENCLAW_GATEWAY_PORT=18789
```

#### 3. 启用 HTTP 端点

编辑 `~/.openclaw/openclaw.json`:
```json
{
  "gateway": {
    "http": {
      "endpoints": {
        "chatCompletions": { "enabled": true }
      }
    }
  }
}
```

### 启动服务

#### 开发模式

```bash
# 全局安装
clawport dev

# 源码安装
npm run dev
```

访问: http://localhost:3000

#### 生产模式

```bash
# 全局安装
clawport start

# 源码安装
npm run build
npm start
```

### CLI 命令

```bash
clawport dev      # 启动开发服务器
clawport start    # 构建并启动生产服务器
clawport setup    # 自动检测配置，写入 .env.local
clawport status   # 检查网关可达性和配置
clawport help     # 显示帮助信息
```

### 故障排除

#### 1. 权限错误（npm install -g）

```bash
# 清理缓存
sudo npm cache clean --force
npm install -g clawport-ui

# 或修复权限
sudo chown -R $(whoami) ~/.npm
npm install -g clawport-ui
```

#### 2. 网关连接失败

```bash
# 检查网关状态
openclaw gateway status

# 启动网关
openclaw gateway run

# 验证连接
curl http://localhost:18789/v1/models
```

#### 3. 405 Method Not Allowed

确保在 `openclaw.json` 中启用了 HTTP 聊天完成端点，然后重启网关。

#### 4. 智能体未显示

检查 `WORKSPACE_PATH` 是否正确指向 OpenClaw 工作区目录。

### 测试

```bash
# 运行所有测试
npm test

# 类型检查
npx tsc --noEmit

# 生产构建
npx next build
```

---

## 总结

ClawPort UI 是一个功能完整、架构清晰的开源 AI 智能体管理平台。它通过以下特点脱颖而出：

### 技术亮点
1. **现代化技术栈**: Next.js 16 + React 19 + TypeScript 5
2. **完整的测试覆盖**: 771 个测试用例，确保代码质量
3. **多模态支持**: 文本、图像、语音的无缝集成
4. **实时流式处理**: SSE 驱动的实时日志和聊天响应
5. **本地优先**: 数据存储在本地，保护隐私

### 产品优势
1. **零额外成本**: 无需单独的 API 密钥或订阅
2. **完全开源**: MIT 协议，代码透明
3. **易于部署**: 自动配置脚本，一键启动
4. **丰富的可视化**: 独特的组织架构图和看板功能
5. **AI 驱动优化**: 自动成本分析和优化建议

### 适用场景
- AI 智能体团队管理
- 定时任务监控和调试
- 成本分析和优化
- 知识库管理
- 任务协作和分配

ClawPort UI 为 OpenClaw 生态系统提供了一个强大而友好的可视化界面，是管理 AI 智能体团队的理想选择。

---

**文档版本**: 1.0  
**生成日期**: 2026-03-12  
**基于版本**: ClawPort UI v0.8.3
