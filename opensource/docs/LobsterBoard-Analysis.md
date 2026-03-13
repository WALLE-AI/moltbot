# LobsterBoard 项目深度分析报告

## 一、项目概述

### 1.1 产品定位

LobsterBoard 是一个自托管的拖拽式仪表板构建器，具有以下核心特点：

- **零云依赖**：完全本地运行，数据完全由用户控制
- **可视化编辑**：拖拽式界面，20px 网格对齐，实时预览
- **丰富组件**：60+ 内置小部件，涵盖系统监控、天气、日历、AI 使用情况等
- **模板系统**：支持导出/导入仪表板布局，内置模板库
- **自定义页面**：支持扩展自定义页面，构建完整的应用生态
- **多主题支持**：5 种内置主题（默认、终端、纸质、女性化、女性化暗色）
- **远程监控**：通过 lobsterboard-agent 支持多服务器监控

### 1.2 技术栈

**前端技术**：
- 纯 JavaScript（无框架依赖）
- 原生 DOM 操作
- CSS3 + 主题系统
- Server-Sent Events (SSE) 用于实时数据流

**后端技术**：
- Node.js (v16-22)
- 原生 HTTP 模块（无 Express 等框架）
- systeminformation 库用于系统监控
- ECDH 加密通信（用于远程 agent）

**构建工具**：
- Rollup（用于打包分发）
- 无需构建步骤即可运行

**数据存储**：
- JSON 文件存储（config.json, secrets.json, auth.json）
- 无数据库依赖

## 二、竞品分析

### 2.1 主要竞品对比

| 特性 | LobsterBoard | Glance | Homer | Dashy | Heimdall |
|------|-------------|--------|-------|-------|----------|
| 可视化编辑 | ✅ 拖拽式 | ❌ 配置文件 | ❌ 配置文件 | ✅ 有限支持 | ❌ 配置文件 |
| 小部件数量 | 60+ | 30+ | 基础 | 40+ | 基础 |
| 系统监控 | ✅ 内置 | ✅ 内置 | ❌ | 部分 | ❌ |
| AI 监控 | ✅ 12+ 提供商 | ❌ | ❌ | ❌ | ❌ |
| 远程监控 | ✅ Agent 架构 | ❌ | ❌ | ❌ | ❌ |
| 模板系统 | ✅ 导入/导出 | ❌ | ❌ | ✅ | ❌ |
| 自定义页面 | ✅ 插件系统 | ❌ | ❌ | 部分 | ❌ |
| 主题支持 | 5 种内置 | 基础 | 多种 | 多种 | 多种 |
| 技术栈 | Node.js | Go | HTML/JS | Vue.js | PHP |
| 部署复杂度 | 低 | 低 | 极低 | 中 | 中 |

### 2.2 核心竞争优势

1. **可视化编辑体验**：唯一提供完整拖拽式编辑的自托管仪表板
2. **AI 使用监控**：独家支持 12+ AI 编码工具的使用情况追踪
3. **远程监控架构**：通过加密 agent 实现多服务器监控
4. **零配置启动**：npm install 后即可运行，无需复杂配置
5. **OpenClaw 集成**：与 OpenClaw 深度集成，提供独特的工作流监控

### 2.3 市场定位

**目标用户**：
- 开发者和技术爱好者
- 需要监控多台服务器的运维人员
- AI 编码工具重度用户
- 注重隐私的自托管用户
- OpenClaw 用户生态

**使用场景**：
- 个人工作站监控面板
- Homelab 服务器监控
- AI 使用情况追踪
- 开发团队协作看板
- 项目状态展示大屏

## 三、技术架构分析

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser Client                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  app.html    │  │  builder.js  │  │  widgets.js  │      │
│  │  (编辑器)     │  │  (拖拽引擎)   │  │  (组件库)     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                     HTTP/SSE/WebSocket                       │
└────────────────────────────┼────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────┐
│                    Node.js Server (server.cjs)              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  HTTP Server │  │  SSE Stream  │  │  Pages API   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Stats Cache │  │  AI Providers│  │  Templates   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
    ┌─────┴─────┐      ┌────┴────┐      ┌─────┴─────┐
    │  File     │      │  System │      │  Remote   │
    │  Storage  │      │  Info   │      │  Agents   │
    └───────────┘      └─────────┘      └───────────┘
```

### 3.2 核心模块

#### 3.2.1 前端编辑器 (builder.js)

**功能**：
- 拖拽式小部件布局
- 网格对齐系统（20px）
- 缩放和平移画布
- 属性面板编辑
- 配置导入/导出

**关键技术**：
- 原生 Drag & Drop API
- Canvas 坐标系统
- 实时配置同步
- 本地存储缓存

#### 3.2.2 小部件系统 (widgets.js)

**架构设计**：
```javascript
// 小部件定义结构
{
  type: 'widget-type',
  name: '显示名称',
  icon: '🎨',
  category: '分类',
  defaultSize: { width: 200, height: 140 },
  properties: {
    // 可配置属性定义
  },
  render: (container, props) => {
    // 渲染逻辑
  },
  update: (container, props) => {
    // 更新逻辑
  }
}
```

**小部件分类**：
1. 系统监控（CPU、内存、磁盘、网络、Docker）
2. 天气（本地天气、世界天气）
3. 时间与生产力（时钟、世界时钟、倒计时、待办、番茄钟）
4. 媒体与内容（RSS、日历、正在播放、每日名言）
5. AI/LLM 监控（12+ 提供商）
6. 金融（股票、加密货币）
7. 智能家居（温湿度、摄像头、能耗）
8. 嵌入与媒体（图片、iframe）
9. 实用工具（认证状态、GitHub 统计、邮件计数）
10. 布局（标题、分隔线、页面菜单）

#### 3.2.3 服务器架构 (server.cjs)

**核心功能模块**：

1. **HTTP 服务器**
   - 静态文件服务
   - API 路由处理
   - CORS 支持
   - 请求体大小限制

2. **系统监控**
   - 分层缓存策略（CPU/网络 2s，内存 5s，磁盘 30s）
   - SSE 实时推送
   - 防止并发调用重叠
   - systeminformation 库集成

3. **远程服务器管理**
   - ECDH 密钥交换
   - AES-256-GCM 加密通信
   - 服务器配置持久化
   - 健康检查和连接测试

4. **AI 使用监控**
   - 12+ 提供商支持
   - 凭证自动发现（文件、Keychain）
   - 5 分钟缓存 + 持久化
   - Token 自动刷新

5. **安全机制**
   - PIN 码保护
   - 公开模式（只读）
   - 敏感数据分离存储
   - SSRF 防护（URL 验证）

6. **页面系统**
   - 自动发现机制
   - 动态路由挂载
   - API 路由支持
   - 数据目录隔离

### 3.3 数据流

#### 3.3.1 配置管理流程

```
用户编辑 → 前端验证 → POST /config → 敏感数据提取
    ↓
secrets.json (敏感数据)
    ↓
config.json (公开配置，敏感字段标记为 __SECRET__)
    ↓
GET /config → 敏感数据掩码 (••••••••) → 前端渲染
```

#### 3.3.2 实时监控数据流

```
systeminformation 库
    ↓
定时采集 (2s/5s/30s)
    ↓
cachedStats (内存缓存)
    ↓
SSE 广播 → 所有连接的客户端
    ↓
小部件实时更新
```

#### 3.3.3 远程监控数据流

```
LobsterBoard Server
    ↓
HTTPS + API Key + Client ID
    ↓
Remote Agent (lobsterboard-agent)
    ↓
ECDH 握手 → 共享密钥
    ↓
AES-256-GCM 加密响应
    ↓
LobsterBoard 解密 → 小部件显示
```

## 四、API 接口详解

### 4.1 核心配置接口

#### GET /config
**功能**：加载仪表板配置

**响应示例**：
```json
{
  "canvas": {
    "width": 1920,
    "height": 1080
  },
  "fontScale": 1.25,
  "widgets": [
    {
      "id": "widget-1",
      "type": "weather",
      "x": 600,
      "y": 120,
      "width": 200,
      "height": 140,
      "properties": {
        "title": "Local Weather",
        "location": "Atlanta",
        "units": "F",
        "refreshInterval": 600,
        "apiKey": "••••••••"
      }
    }
  ]
}
```

**特点**：
- 敏感字段自动掩码
- 不存在时返回默认配置
- 支持 fontScale 全局字体缩放

#### POST /config
**功能**：保存仪表板配置

**请求体**：完整的配置 JSON

**处理流程**：
1. 提取敏感字段到 secrets.json
2. 替换敏感字段为 `__SECRET__`
3. 保存到 config.json
4. 返回成功状态

**限制**：
- 最大 1MB 请求体
- 公开模式下禁止

### 4.2 系统监控接口

#### GET /api/stats
**功能**：获取缓存的系统统计信息

**响应示例**：
```json
{
  "cpu": {
    "currentLoad": 45.2,
    "cpus": [42.1, 48.3, 44.5, 46.0]
  },
  "memory": {
    "total": 17179869184,
    "used": 8589934592,
    "free": 8589934592,
    "active": 7516192768
  },
  "disk": [
    {
      "fs": "/dev/disk1s1",
      "mount": "/",
      "size": 500107862016,
      "used": 250053931008,
      "available": 250053931008,
      "use": 50.0
    }
  ],
  "network": [
    {
      "iface": "en0",
      "rx_sec": 1048576,
      "tx_sec": 524288,
      "rx_bytes": 1073741824,
      "tx_bytes": 536870912
    }
  ],
  "docker": [],
  "uptime": 86400,
  "timestamp": 1709856000000
}
```

#### GET /api/stats/stream
**功能**：SSE 实时系统统计流

**特点**：
- Server-Sent Events 协议
- 自动推送更新
- 最多 10 个并发连接
- 客户端断开自动清理

**数据格式**：
```
data: {"cpu":{"currentLoad":45.2},...}\n\n
```

### 4.3 远程服务器管理接口

#### GET /api/servers
**功能**：列出所有配置的服务器

**响应示例**：
```json
{
  "servers": [
    {
      "id": "local",
      "name": "Local",
      "type": "local"
    },
    {
      "id": "vps-1",
      "name": "Production VPS",
      "type": "remote",
      "url": "https://vps.example.com:9090",
      "apiKey": "lb_abc123...",
      "encrypted": true
    }
  ]
}
```

#### POST /api/servers
**功能**：添加远程服务器

**请求体**：
```json
{
  "name": "My VPS",
  "url": "https://vps.example.com:9090",
  "apiKey": "your-api-key"
}
```

**处理流程**：
1. 验证 URL 和 API Key
2. 生成 ECDH 密钥对
3. 与 agent 握手交换公钥
4. 计算共享密钥
5. 保存服务器配置

**响应**：
```json
{
  "status": "success",
  "id": "my-vps",
  "encrypted": true
}
```

#### POST /api/servers/:id/test
**功能**：测试服务器连接

**响应示例**：
```json
{
  "status": "ok",
  "serverName": "vps-production",
  "agentEncryption": true,
  "localEncryption": true
}
```

#### GET /api/servers/:id/stats
**功能**：获取远程服务器统计信息

**特点**：
- 自动解密加密响应
- 添加 `_remote: true` 标记
- 10 秒超时
- 错误自动降级

### 4.4 AI 使用监控接口

#### GET /api/ai-usage
**功能**：获取所有 AI 提供商的使用情况

**响应示例**：
```json
{
  "status": "ok",
  "providers": [
    {
      "provider": "claude",
      "name": "Claude Code",
      "icon": "🟣",
      "plan": "Pro",
      "metrics": [
        {
          "label": "Session (5h)",
          "used": 45.2,
          "limit": 100,
          "format": "percent",
          "resetsAt": "2026-03-12T18:00:00Z"
        },
        {
          "label": "Weekly",
          "used": 67.8,
          "limit": 100,
          "format": "percent",
          "resetsAt": "2026-03-17T00:00:00Z"
        }
      ],
      "cached": true
    }
  ]
}
```

#### GET /api/ai-usage/:provider
**功能**：获取特定提供商的使用情况

**支持的提供商**：
- `claude` - Claude Code
- `codex` - Codex CLI
- `copilot` - GitHub Copilot
- `cursor` - Cursor IDE
- `gemini` - Gemini CLI
- `amp` - Amp Code
- `factory` - Factory/Droid
- `kimi` - Kimi Code
- `jetbrains` - JetBrains AI
- `minimax` - MiniMax
- `zai` - Z.ai
- `antigravity` - Antigravity

**凭证发现机制**：
1. 文件路径扫描（~/.claude, ~/.codex 等）
2. macOS Keychain 查询
3. 环境变量读取
4. SQLite 数据库读取（Cursor）

**缓存策略**：
- 内存缓存：5 分钟 TTL
- 持久化缓存：data/ai-usage-cache.json
- 429 限流时返回过期缓存

### 4.5 模板系统接口

#### GET /api/templates
**功能**：列出所有可用模板

**响应示例**：
```json
[
  {
    "id": "minimal-layout-for-10-inch-screen",
    "name": "Minimal Layout",
    "description": "Compact layout optimized for 10-inch displays",
    "author": "LobsterBoard",
    "tags": ["minimal", "compact"],
    "preview": "preview.png",
    "widgetTypes": ["clock", "weather", "cpu-memory"]
  }
]
```

#### GET /api/templates/:id
**功能**：获取模板配置

**响应**：完整的 config.json 内容

#### GET /api/templates/:id/preview
**功能**：获取模板预览图

**响应**：PNG/JPG 图片文件

#### POST /api/templates/import
**功能**：导入模板

**请求体**：
```json
{
  "id": "minimal-layout-for-10-inch-screen",
  "mode": "replace"  // 或 "merge"
}
```

**模式说明**：
- `replace`：完全替换当前配置
- `merge`：将模板小部件追加到当前布局下方

**响应**：
```json
{
  "status": "success",
  "message": "Template imported (replace)"
}
```

#### POST /api/templates/export
**功能**：导出当前配置为模板

**请求体**：
```json
{
  "name": "My Custom Layout",
  "description": "Personal dashboard layout",
  "author": "Your Name",
  "tags": ["custom", "personal"],
  "widgetTypes": ["weather", "clock", "cpu-memory"]
}
```

**处理流程**：
1. 生成模板 ID（name 转小写短横线）
2. 创建模板目录
3. 清理敏感数据（API keys、私有 URL）
4. 保存 config.json 和 meta.json
5. 生成预览图（可选）

### 4.6 数据存储接口

#### GET/POST /api/todos
**功能**：待办事项列表

**GET 响应**：
```json
[
  {
    "id": "todo-1",
    "text": "Finish LobsterBoard",
    "completed": false
  }
]
```

**POST 请求**：完整的待办列表数组

**限制**：256KB 请求体

#### GET/POST /api/notes
**功能**：笔记内容

**GET 响应**：
```json
{
  "widget-123": {
    "content": "My notes here...",
    "updatedAt": 1709856000000
  }
}
```

**POST 请求**：完整的笔记对象

**限制**：512KB 请求体

### 4.7 代理接口

#### GET /api/rss?url=<feedUrl>
**功能**：RSS/Atom 订阅代理（解决 CORS）

**参数**：
- `url`：RSS 订阅地址
- `widgetId`：小部件 ID（用于从 secrets 读取 URL）
- `secretKey`：密钥名称（默认 feedUrl）

**安全措施**：
- 仅允许 http/https 协议
- 阻止私有 IP 地址（SSRF 防护）
- 最多 3 次重定向
- 5MB 响应大小限制
- 15 秒超时

**响应**：原始 XML 内容

#### GET /api/calendar?url=<icalUrl>&max=<maxEvents>
**功能**：iCal 日历代理 + 解析器

**参数**：
- `url`：iCal 订阅地址
- `max`：最大事件数（默认 10，最大 50）
- `widgetId`：小部件 ID
- `secretKey`：密钥名称（默认 icalUrl）

**响应示例**：
```json
[
  {
    "summary": "Team Meeting",
    "start": "2026-03-12T14:00:00Z",
    "end": "2026-03-12T15:00:00Z",
    "location": "Conference Room A",
    "allDay": false
  }
]
```

**特点**：
- 自动解析 iCal 格式
- 支持时区转换
- 仅返回未来事件
- 5 分钟缓存
- SSRF 防护

#### GET /api/quote
**功能**：每日名言代理（zenquotes.io）

**响应示例**：
```json
[
  {
    "q": "Stay hungry, stay foolish.",
    "a": "Steve Jobs"
  }
]
```

**特点**：
- 解决 CORS 限制
- 5 秒超时
- 失败时返回默认名言

### 4.8 安全认证接口

#### GET /api/auth/status
**功能**：获取认证状态

**响应**：
```json
{
  "hasPin": true,
  "publicMode": false
}
```

#### POST /api/auth/set-pin
**功能**：设置或修改 PIN 码

**请求体**：
```json
{
  "pin": "1234",
  "currentPin": "0000"  // 修改时需要
}
```

**验证规则**：
- 4-6 位数字
- 修改时需要当前 PIN
- SHA-256 哈希存储

#### POST /api/auth/verify-pin
**功能**：验证 PIN 码

**请求体**：
```json
{
  "pin": "1234"
}
```

**响应**：
```json
{
  "valid": true
}
```

#### POST /api/auth/remove-pin
**功能**：移除 PIN 码保护

**请求体**：
```json
{
  "pin": "1234"
}
```

#### GET/POST /api/mode
**功能**：获取/设置公开模式

**GET 响应**：
```json
{
  "publicMode": false
}
```

**POST 请求**：
```json
{
  "publicMode": true,
  "pin": "1234"  // 如果设置了 PIN
}
```

**公开模式限制**：
- 禁止保存配置
- 禁止导出模板
- 禁止修改敏感数据
- 只读访问

### 4.9 OpenClaw 集成接口

#### GET /api/auth
**功能**：OpenClaw 认证状态

**响应示例**：
```json
{
  "status": "ok",
  "mode": "Monthly",
  "primary": "anthropic:default"
}
```

**数据来源**：
- `~/.openclaw/openclaw.json`
- `~/.openclaw/agents/main/agent/auth-profiles.json`

#### GET /api/releases
**功能**：OpenClaw 版本检查

**响应示例**：
```json
{
  "status": "ok",
  "current": "2026.3.10",
  "latest": "v2026.3.12",
  "latestUrl": "https://github.com/openclaw/openclaw/releases/tag/v2026.3.12",
  "publishedAt": "2026-03-12T00:00:00Z"
}
```

**缓存**：1 小时

#### GET /api/lb-release
**功能**：LobsterBoard 版本检查

**响应**：同上，检查 LobsterBoard 仓库

#### GET /api/cron
**功能**：读取 OpenClaw cron 任务

**响应示例**：
```json
{
  "jobs": [
    {
      "name": "Daily Backup",
      "schedule": "0 2 * * *",
      "tz": "America/New_York",
      "enabled": true,
      "lastRun": "2026-03-12T02:00:00Z",
      "lastStatus": "success"
    }
  ]
}
```

**数据来源**：`~/.openclaw/cron/jobs.json`

#### GET /api/system-log
**功能**：结构化系统日志

**参数**：
- `max`：最大行数（默认 50，最大 200）

**响应示例**：
```json
{
  "status": "ok",
  "entries": [
    {
      "time": "2026-03-12T10:30:00Z",
      "level": "OK",
      "category": "gateway",
      "message": "Gateway started on port 18789"
    }
  ]
}
```

**日志级别**：
- `OK`：成功操作
- `INFO`：一般信息
- `WARN`：警告
- `ERROR`：错误

**日志分类**：
- `system`：系统事件
- `cron`：定时任务
- `auth`：认证相关
- `session`：会话管理
- `exec`：命令执行
- `file`：文件操作
- `gateway`：网关事件

#### GET /api/activity
**功能**：今日活动摘要

**响应示例**：
```json
{
  "items": [
    {
      "text": "📌 Morning standup",
      "time": "2026-03-12"
    },
    {
      "text": "Fixed authentication bug",
      "time": "2026-03-12"
    }
  ]
}
```

**数据来源**：`memory/YYYY-MM-DD.md`

#### GET /api/today
**功能**：今日活动汇总（增强版）

**响应示例**：
```json
{
  "date": "2026-03-12",
  "activities": [
    {
      "type": "note",
      "icon": "📝",
      "text": "Morning standup",
      "source": "memory"
    },
    {
      "type": "commit",
      "icon": "💾",
      "text": "Fix: authentication bug",
      "source": "git"
    },
    {
      "type": "cron",
      "icon": "⏰",
      "text": "Daily Backup ran",
      "source": "cron",
      "status": "ok"
    }
  ],
  "count": 3
}
```

**数据来源**：
- Memory 文件标题和列表项
- Git 提交记录（今日）
- Cron 任务执行记录

### 4.10 自定义页面系统接口

#### GET /api/pages
**功能**：列出所有自定义页面

**响应示例**：
```json
[
  {
    "id": "kanban",
    "title": "Kanban Board",
    "icon": "📋",
    "description": "Task management board",
    "order": 1
  }
]
```

#### GET /pages/:id
**功能**：访问自定义页面

**响应**：页面的 index.html 内容

#### GET /pages/:id/*
**功能**：访问页面静态资源

**支持**：CSS、JS、图片等

#### GET/POST/PATCH/DELETE /api/pages/:id/*
**功能**：自定义页面 API 路由

**路由匹配**：
- 支持路径参数：`/api/pages/kanban/tasks/:id`
- 支持通配符：`/api/pages/kanban/tasks/*`
- 自动解析 query 参数和 JSON body

**示例页面 API (api.cjs)**：
```javascript
module.exports = (ctx) => ({
  routes: {
    'GET /tasks': async (req, res, { query }) => {
      const tasks = ctx.readData('tasks.json');
      return tasks;
    },
    'POST /tasks': async (req, res, { body }) => {
      const tasks = ctx.readData('tasks.json');
      tasks.push(body);
      ctx.writeData('tasks.json', tasks);
      return { status: 'ok', id: tasks.length };
    },
    'DELETE /tasks/:id': async (req, res, { params }) => {
      const tasks = ctx.readData('tasks.json');
      const filtered = tasks.filter(t => t.id !== params.id);
      ctx.writeData('tasks.json', filtered);
      return { status: 'ok' };
    }
  }
});
```

**上下文对象 (ctx)**：
- `dataDir`：页面数据目录路径
- `readData(filename)`：读取 JSON 数据
- `writeData(filename, obj)`：写入 JSON 数据

### 4.11 实用工具接口

#### GET /api/browse-dirs?dir=<path>
**功能**：浏览目录（用于文件选择器）

**参数**：
- `dir`：目录路径（默认用户主目录）

**响应示例**：
```json
{
  "status": "ok",
  "path": "/Users/username/Pictures",
  "dirs": ["Vacation", "Screenshots", "Wallpapers"],
  "imageCount": 42
}
```

**安全限制**：
- 仅允许访问用户主目录下的路径
- 隐藏以 `.` 开头的目录
- 仅列出子目录

#### GET /api/latest-image?dir=<path>
**功能**：获取目录中最新的图片

**参数**：
- `dir`：图片目录路径

**响应**：图片文件（PNG/JPG/GIF/WebP）

**特点**：
- 按修改时间排序
- 支持常见图片格式
- 自动 MIME 类型检测

### 4.12 敏感数据管理接口

#### POST /api/secrets/:widgetId
**功能**：更新小部件敏感数据

**请求体**：
```json
{
  "apiKey": "sk-abc123...",
  "icalUrl": "https://calendar.google.com/..."
}
```

**限制**：公开模式下禁止

#### DELETE /api/secrets/:widgetId/:key
**功能**：删除特定敏感字段

**限制**：公开模式下禁止

## 五、接口数据获取方式总结

### 5.1 本地数据接口

这些接口直接从本地系统或文件获取数据，无需外部依赖：

| 接口 | 数据来源 | 刷新频率 | 说明 |
|------|---------|---------|------|
| `/api/stats` | systeminformation 库 | 缓存 | CPU、内存、磁盘、网络统计 |
| `/api/stats/stream` | 同上 | 实时 SSE | 系统监控实时流 |
| `/config` | config.json | 按需 | 仪表板配置 |
| `/api/todos` | todos.json | 按需 | 待办事项 |
| `/api/notes` | notes.json | 按需 | 笔记内容 |
| `/api/auth` | ~/.openclaw/openclaw.json | 按需 | OpenClaw 认证状态 |
| `/api/cron` | ~/.openclaw/cron/jobs.json | 按需 | Cron 任务列表 |
| `/api/system-log` | ~/.openclaw/logs/gateway.log | 按需 | 系统日志 |
| `/api/activity` | memory/YYYY-MM-DD.md | 按需 | 今日活动 |
| `/api/today` | 多个来源 | 按需 | 今日活动汇总 |

### 5.2 远程服务器接口

通过 lobsterboard-agent 获取远程服务器数据：

| 接口 | 数据来源 | 加密 | 说明 |
|------|---------|------|------|
| `/api/servers` | servers.json | - | 服务器列表 |
| `/api/servers/:id/stats` | Remote Agent | ECDH+AES | 远程系统统计 |
| `/api/servers/:id/test` | Remote Agent | - | 连接测试 |

**获取流程**：
1. 配置远程服务器（URL + API Key）
2. ECDH 握手建立加密通道
3. 定期请求 `/stats` 端点
4. 自动解密响应数据

### 5.3 AI 使用监控接口

从本地凭证文件和 API 获取 AI 工具使用情况：

| 接口 | 提供商 | 凭证来源 | API 端点 |
|------|--------|---------|---------|
| `/api/ai-usage/claude` | Claude Code | ~/.claude/.credentials.json | api.anthropic.com/api/oauth/usage |
| `/api/ai-usage/codex` | Codex CLI | ~/.codex/auth.json | chatgpt.com/backend-api/wham/usage |
| `/api/ai-usage/copilot` | GitHub Copilot | macOS Keychain | api.github.com/copilot_internal/user |
| `/api/ai-usage/cursor` | Cursor | SQLite DB | api2.cursor.sh/.../GetCurrentPeriodUsage |
| `/api/ai-usage/gemini` | Gemini CLI | ~/.gemini/oauth_creds.json | cloudcode-pa.googleapis.com/.../retrieveUserQuota |
| `/api/ai-usage/amp` | Amp Code | ~/.local/share/amp/secrets.json | ampcode.com/api/internal |
| `/api/ai-usage/factory` | Factory/Droid | ~/.factory/auth.json | api.factory.ai/.../usage |
| `/api/ai-usage/kimi` | Kimi Code | ~/.kimi/credentials/kimi-code.json | api.kimi.com/coding/v1/usages |
| `/api/ai-usage/jetbrains` | JetBrains AI | ~/Library/Application Support/JetBrains | 本地 XML 文件 |
| `/api/ai-usage/minimax` | MiniMax | 环境变量 | api.minimax.io/.../remains |
| `/api/ai-usage/zai` | Z.ai | 环境变量 | api.z.ai/.../quota/limit |
| `/api/ai-usage/antigravity` | Antigravity | ~/Library/Application Support/antigravity-usage | cloudcode-pa.googleapis.com/.../fetchAvailableModels |

**凭证发现优先级**：
1. 配置文件路径
2. macOS Keychain
3. 环境变量
4. SQLite 数据库

**缓存策略**：
- 内存缓存：5 分钟
- 持久化：data/ai-usage-cache.json
- 429 限流时返回过期缓存

### 5.4 外部 API 代理接口

通过服务器代理访问外部 API，解决 CORS 和安全问题：

| 接口 | 目标 API | 缓存 | 安全措施 |
|------|---------|------|---------|
| `/api/rss` | 任意 RSS/Atom 订阅 | 无 | SSRF 防护、大小限制 |
| `/api/calendar` | 任意 iCal 订阅 | 5 分钟 | SSRF 防护、解析验证 |
| `/api/quote` | zenquotes.io | 无 | 超时保护 |
| `/api/releases` | GitHub API | 1 小时 | 公开 API |
| `/api/lb-release` | GitHub API | 1 小时 | 公开 API |

**SSRF 防护措施**：
- 仅允许 http/https 协议
- 阻止私有 IP 地址（127.0.0.1, 10.x.x.x, 192.168.x.x 等）
- 阻止 localhost 和内网域名
- 验证重定向目标
- 响应大小限制
- 超时保护

### 5.5 模板系统接口

从本地文件系统管理模板：

| 接口 | 数据来源 | 说明 |
|------|---------|------|
| `/api/templates` | templates/ 目录扫描 | 模板列表 |
| `/api/templates/:id` | templates/:id/config.json | 模板配置 |
| `/api/templates/:id/preview` | templates/:id/preview.png | 预览图 |
| `/api/templates/import` | 本地文件 | 导入模板 |
| `/api/templates/export` | 当前配置 | 导出模板 |

**模板目录结构**：
```
templates/
├── minimal-layout/
│   ├── meta.json       # 元数据
│   ├── config.json     # 配置
│   └── preview.png     # 预览图
└── templates.json      # 索引文件
```

## 六、核心技术特性

### 6.1 安全机制

#### 6.1.1 敏感数据保护

**分离存储架构**：
```
config.json (公开)          secrets.json (私密)
├── widgets                 ├── widget-1
│   ├── id: widget-1       │   ├── apiKey: "sk-abc..."
│   ├── properties         │   └── icalUrl: "https://..."
│   │   ├── apiKey: "__SECRET__"
│   │   └── icalUrl: "__SECRET__"
```

**保护流程**：
1. 用户输入敏感数据
2. 服务器提取到 secrets.json
3. config.json 中标记为 `__SECRET__`
4. 返回前端时掩码为 `••••••••`
5. 小部件使用时从 secrets 读取

**敏感字段识别**：
- apiKey, api_key
- token, secret, password
- icalUrl（可能包含认证令牌）
- 私有 IP 地址的 URL

#### 6.1.2 SSRF 防护

**URL 验证规则**：
```javascript
function isPrivateHost(hostname) {
  const patterns = [
    /^127\./,                    // 127.0.0.1
    /^10\./,                     // 10.x.x.x
    /^172\.(1[6-9]|2\d|3[01])\./, // 172.16-31.x.x
    /^192\.168\./,               // 192.168.x.x
    /^169\.254\./,               // 169.254.x.x (link-local)
    /^0\./,                      // 0.x.x.x
    /^localhost$/i,              // localhost
    /^\[?::1\]?$/,               // IPv6 localhost
    /^\[?fc/i,                   // IPv6 ULA
    /^\[?fd/i                    // IPv6 ULA
  ];
  return patterns.some(p => p.test(hostname));
}
```

**应用场景**：
- RSS 订阅代理
- iCal 日历代理
- 图片 URL 加载
- 重定向验证

#### 6.1.3 认证与授权

**PIN 码保护**：
- 4-6 位数字
- SHA-256 哈希存储
- 修改需要当前 PIN
- 时间安全比较（防止时序攻击）

**公开模式**：
- 只读访问
- 禁止配置修改
- 禁止模板导出
- 禁止敏感数据操作

**会话管理**（预留）：
- 64 字符十六进制 token
- 可配置 TTL（默认 24 小时）
- 自动过期清理
- 登录失败限流（5 次/15 分钟）

### 6.2 远程监控加密

#### 6.2.1 ECDH 密钥交换

**握手流程**：
```
LobsterBoard                    Agent
    │                             │
    │  1. 生成 ECDH 密钥对         │
    │     (publicKey, privateKey)  │
    │                             │
    │  2. POST /handshake         │
    │     { clientId, publicKey } │
    ├──────────────────────────────>
    │                             │
    │                             │  3. 生成 ECDH 密钥对
    │                             │  4. 计算共享密钥
    │                             │
    │  5. { publicKey }           │
    <──────────────────────────────┤
    │                             │
    │  6. 计算共享密钥              │
    │     (privateKey + theirPublicKey)
    │                             │
    │  7. 保存共享密钥              │
    │     (base64 编码)            │
```

**加密算法**：
- 曲线：prime256v1 (NIST P-256)
- 对称加密：AES-256-GCM
- IV 长度：12 字节
- Auth Tag 长度：16 字节

#### 6.2.2 加密通信

**请求格式**：
```
Headers:
  X-API-Key: <agent-api-key>
  X-Client-ID: <client-id>

GET /stats
```

**响应格式**：
```json
{
  "encrypted": "base64(IV + AuthTag + Ciphertext)"
}
```

**解密流程**：
1. Base64 解码
2. 提取 IV（前 12 字节）
3. 提取 Auth Tag（接下来 16 字节）
4. 提取密文（剩余部分）
5. AES-256-GCM 解密
6. JSON 解析

**降级支持**：
- Agent 不支持加密时使用明文
- 自动检测响应格式
- 向后兼容旧版 agent

### 6.3 性能优化

#### 6.3.1 系统监控缓存策略

**分层刷新频率**：
```javascript
// CPU + 网络：2 秒
setInterval(async () => {
  const [cpu, net] = await Promise.all([
    si.currentLoad(),
    si.networkStats()
  ]);
  cachedStats.cpu = cpu;
  cachedStats.network = net;
  broadcastStats();
}, 2000);

// 内存：5 秒
setInterval(async () => {
  cachedStats.memory = await si.mem();
}, 5000);

// 磁盘：30 秒
setInterval(async () => {
  cachedStats.disk = await si.fsSize();
}, 30000);

// Docker：5 秒（可选）
setInterval(async () => {
  cachedStats.docker = await si.dockerContainers();
}, 5000);
```

**并发保护**：
```javascript
let _cpuNetRunning = false;

setInterval(async () => {
  if (_cpuNetRunning) return; // 防止重叠
  _cpuNetRunning = true;
  try {
    // 采集数据
  } finally {
    _cpuNetRunning = false;
  }
}, 2000);
```

**优势**：
- 减少系统调用开销
- 避免 systeminformation 库阻塞
- 平衡实时性和性能
- 防止并发调用堆积

#### 6.3.2 AI 使用数据缓存

**双层缓存**：
```javascript
// 内存缓存
const aiUsageCache = {
  claude: { data: null, timestamp: 0 },
  // ...
};

// 持久化缓存
const AI_CACHE_FILE = 'data/ai-usage-cache.json';
```

**缓存策略**：
- TTL：5 分钟
- 启动时加载持久化缓存
- 更新时同步到文件
- 429 限流时返回过期缓存

**Token 自动刷新**：
```javascript
// Claude OAuth token 刷新
if (resp.status === 401 && oauthData.refreshToken) {
  const refreshed = await refreshClaudeToken(
    oauthData.refreshToken,
    credPath
  );
  accessToken = refreshed.accessToken;
  // 重试请求
}
```

#### 6.3.3 SSE 连接管理

**连接池**：
```javascript
const sseClients = new Set();

// 限制并发连接
if (sseClients.size >= 10) {
  sendError(res, 'Too many SSE connections', 429);
  return;
}

// 自动清理
req.on('close', () => sseClients.delete(res));
```

**广播优化**：
```javascript
function broadcastStats() {
  const payload = `data: ${JSON.stringify(cachedStats)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch (_) {
      sseClients.delete(res); // 清理失败连接
    }
  }
}
```

#### 6.3.4 请求体大小限制

**分级限制**：
```javascript
const MAX_BODY = 1024 * 1024;        // 1 MB (配置)
const MAX_TODO_BODY = 256 * 1024;    // 256 KB (待办)
const MAX_NOTES_BODY = 512 * 1024;   // 512 KB (笔记)

let body = '';
let overflow = false;
req.on('data', chunk => {
  body += chunk.toString();
  if (body.length > MAX_BODY) {
    overflow = true;
    req.destroy(); // 立即终止
  }
});
```

### 6.4 扩展性设计

#### 6.4.1 自定义页面系统

**自动发现机制**：
```javascript
function loadPages() {
  const pages = [];
  const dirs = fs.readdirSync(PAGES_DIR);
  
  for (const dir of dirs) {
    if (dir.startsWith('_')) continue; // 跳过私有目录
    
    const metaPath = path.join(PAGES_DIR, dir, 'page.json');
    if (!fs.existsSync(metaPath)) continue;
    
    const meta = JSON.parse(fs.readFileSync(metaPath));
    
    // 加载 API 路由
    const apiPath = path.join(PAGES_DIR, dir, 'api.cjs');
    if (fs.existsSync(apiPath)) {
      const routes = require(apiPath)(ctx);
      pages.push({ ...meta, routes });
    }
  }
  
  return pages.sort((a, b) => a.order - b.order);
}
```

**路由匹配**：
```javascript
// 支持路径参数和通配符
'GET /tasks/:id'     → /api/pages/kanban/tasks/123
'POST /tasks'        → /api/pages/kanban/tasks
'DELETE /tasks/*'    → /api/pages/kanban/tasks/any/path
```

**上下文隔离**：
```javascript
const ctx = {
  dataDir: path.join(DATA_DIR, pageId),
  readData: (filename) => JSON.parse(
    fs.readFileSync(path.join(dataDir, filename))
  ),
  writeData: (filename, obj) => {
    fs.writeFileSync(
      path.join(dataDir, filename),
      JSON.stringify(obj, null, 2)
    );
  }
};
```

#### 6.4.2 小部件插件化

**小部件定义接口**：
```javascript
{
  type: 'my-widget',
  name: 'My Widget',
  icon: '🎨',
  category: 'Custom',
  defaultSize: { width: 200, height: 140 },
  
  // 属性定义
  properties: {
    title: { type: 'string', default: 'My Widget' },
    apiKey: { type: 'string', sensitive: true },
    refreshInterval: { type: 'number', default: 60 }
  },
  
  // 渲染函数
  render: (container, props) => {
    container.innerHTML = `<div>${props.title}</div>`;
  },
  
  // 更新函数（可选）
  update: (container, props) => {
    // 增量更新
  },
  
  // 清理函数（可选）
  cleanup: (container) => {
    // 清理定时器、事件监听器等
  }
}
```

**社区小部件**：
- 独立目录：`community-widgets/`
- 模板提供：`community-widgets/template/`
- 贡献指南：`CONTRIBUTING.md`
