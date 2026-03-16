# OpenClaw Dashboard 详细执行方案

## 一、项目概述

### 1.1 目标

基于 `OpenClaw-Dashboard-Product-Solution.md` 产品方案，构建完整的 Dashboard 管理平台：
- **前端**: `uCopliotClaw/frontend` - React 18 + TypeScript + TailwindCSS + Vite
- **后端**: `uCopliotClaw/backend` - Node.js + Express + WebSocket 代理

### 1.2 技术栈选型

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | React 18 + TypeScript | 组件化开发 |
| 样式方案 | TailwindCSS + shadcn/ui | 现代化 UI |
| 构建工具 | Vite | 快速 HMR |
| 状态管理 | Zustand + React Query | 轻量级 |
| 后端框架 | Node.js + Express | REST API |
| 实时通信 | WebSocket | Gateway 代理 |
| 认证 | JWT | Token 认证 |

---

## 二、项目结构

### 2.1 前端目录结构

```
uCopliotClaw/frontend/
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── index.html
├── src/
│   ├── main.tsx                    # 入口文件
│   ├── App.tsx                     # 根组件
│   ├── routes/
│   │   ├── index.tsx               # 路由配置
│   │   └── layouts/
│   │       └── MainLayout.tsx      # 主布局
│   ├── pages/
│   │   ├── Dashboard/              # 首页仪表盘
│   │   ├── Config/                 # 配置中心
│   │   │   ├── Models.tsx          # 模型配置
│   │   │   ├── Channels.tsx        # 通道配置
│   │   │   ├── Agents.tsx          # 多智能体
│   │   │   ├── Tools.tsx           # 工具配置
│   │   │   └── Bindings.tsx        # 路由绑定
│   │   ├── Monitor/                # 监控中心
│   │   │   ├── Health.tsx          # 系统健康
│   │   │   ├── Sessions.tsx        # 会话监控
│   │   │   ├── Memory.tsx          # 记忆监控
│   │   │   ├── Subagents.tsx       # 多智能体协作
│   │   │   └── Logs.tsx            # 日志查看
│   │   ├── Channels/               # 通道管理
│   │   ├── Skills/                 # 技能中心
│   │   └── Settings/               # 系统设置
│   ├── components/
│   │   ├── ui/                     # shadcn/ui 组件
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   ├── config/
│   │   │   ├── ProviderForm.tsx
│   │   │   ├── ChannelForm.tsx
│   │   │   └── AgentForm.tsx
│   │   ├── monitor/
│   │   │   ├── HealthCard.tsx
│   │   │   ├── SessionTable.tsx
│   │   │   ├── LogStream.tsx
│   │   │   └── MetricChart.tsx
│   │   └── common/
│   │       ├── CodeEditor.tsx
│   │       ├── ConfirmDialog.tsx
│   │       └── LoadingSpinner.tsx
│   ├── hooks/
│   │   ├── useGateway.ts           # Gateway RPC 调用
│   │   ├── useWebSocket.ts         # WebSocket 连接
│   │   ├── useConfig.ts            # 配置管理
│   │   └── useAuth.ts              # 认证
│   ├── lib/
│   │   ├── gateway-client.ts       # Gateway RPC 客户端
│   │   ├── api.ts                  # REST API 客户端
│   │   └── utils.ts                # 工具函数
│   ├── stores/
│   │   ├── auth.ts                 # 认证状态
│   │   ├── config.ts               # 配置状态
│   │   └── monitor.ts              # 监控状态
│   └── types/
│       ├── gateway.ts              # Gateway 接口类型
│       ├── config.ts               # 配置类型
│       └── monitor.ts              # 监控类型
└── public/
    └── favicon.ico
```

### 2.2 后端目录结构

```
uCopliotClaw/backend/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # 入口文件
│   ├── app.ts                      # Express 应用
│   ├── config/
│   │   ├── index.ts                # 配置加载
│   │   └── constants.ts            # 常量定义
│   ├── routes/
│   │   ├── auth.ts                 # 认证路由
│   │   ├── config.ts               # 配置路由
│   │   ├── agents.ts               # 多智能体路由
│   │   ├── channels.ts             # 通道路由
│   │   ├── monitor.ts              # 监控路由
│   │   ├── skills.ts               # 技能路由
│   │   ├── plugins.ts              # 插件路由
│   │   └── system.ts               # 系统路由
│   ├── services/
│   │   ├── gateway-proxy.ts        # Gateway RPC 代理
│   │   ├── config-manager.ts       # 配置管理
│   │   ├── process-manager.ts      # 进程管理
│   │   ├── file-watcher.ts         # 文件监听
│   │   └── backup.ts               # 备份恢复
│   ├── middleware/
│   │   ├── auth.ts                 # JWT 认证
│   │   ├── error.ts                # 错误处理
│   │   └── rate-limit.ts           # 限流
│   ├── websocket/
│   │   ├── gateway-bridge.ts       # Gateway WebSocket 桥接
│   │   └── event-broadcaster.ts    # 事件广播
│   └── types/
│       ├── index.ts                # 类型定义
│       └── gateway.ts              # Gateway 类型
└── .env.example
```

---

## 三、核心模块设计

### 3.1 Gateway RPC 客户端

前端通过后端代理连接 OpenClaw Gateway：

```typescript
// src/lib/gateway-client.ts
interface GatewayClient {
  // 连接管理
  connect(token: string): Promise<void>;
  disconnect(): void;
  
  // RPC 调用
  call<T>(method: string, params?: Record<string, unknown>): Promise<T>;
  
  // 事件订阅
  subscribe(event: string, handler: (data: unknown) => void): () => void;
}

// 支持的方法
const GATEWAY_METHODS = {
  // 健康与状态
  health: { scope: 'read' },
  status: { scope: 'read' },
  
  // 配置管理
  'config.get': { scope: 'read' },
  'config.apply': { scope: 'write' },
  'config.patch': { scope: 'write' },
  
  // 通道管理
  'channels.status': { scope: 'read' },
  'channels.logout': { scope: 'write' },
  
  // 会话管理
  'sessions.list': { scope: 'read' },
  'sessions.get': { scope: 'read' },
  'sessions.usage': { scope: 'read' },
  
  // 智能体管理
  'agents.list': { scope: 'read' },
  'agents.files.get': { scope: 'read' },
  'agents.files.set': { scope: 'write' },
  
  // 记忆监控
  'doctor.memory.status': { scope: 'read' },
  
  // 日志
  'logs.tail': { scope: 'read' },
  
  // 定时任务
  'cron.list': { scope: 'read' },
  'cron.status': { scope: 'read' },
  'cron.runs': { scope: 'read' },
  
  // 节点管理
  'node.list': { scope: 'read' },
  'node.describe': { scope: 'read' },
  
  // 用量统计
  'usage.status': { scope: 'read' },
} as const;
```

### 3.2 后端 Gateway 代理

```typescript
// src/services/gateway-proxy.ts
class GatewayProxyService {
  private ws: WebSocket | null = null;
  private pendingCalls: Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }> = new Map();
  
  // 连接 Gateway
  async connect(gatewayUrl: string, token: string): Promise<void>;
  
  // RPC 调用代理
  async callMethod<T>(
    method: string, 
    params: Record<string, unknown>
  ): Promise<T>;
  
  // WebSocket 事件转发
  broadcastToClients(event: string, data: unknown): void;
}
```

### 3.3 配置管理服务

```typescript
// src/services/config-manager.ts
interface ConfigManager {
  // 读取配置
  readConfig(): Promise<OpenClawConfig>;
  
  // 写入配置
  writeConfig(config: OpenClawConfig): Promise<void>;
  
  // 部分更新
  patchConfig(path: string, value: unknown): Promise<void>;
  
  // 备份管理
  createBackup(): Promise<string>;
  restoreBackup(backupName: string): Promise<void>;
  listBackups(): Promise<BackupInfo[]>;
  
  // 文件监听
  watchConfig(callback: (config: OpenClawConfig) => void): () => void;
}
```

---

## 四、页面功能设计

### 4.1 Dashboard 首页

**功能**:
- 系统健康度概览
- 实时指标卡片 (消息吞吐量、响应延迟、错误率)
- 通道状态概览
- 最近事件日志
- 快捷操作入口

**数据源**:
- `health` - 系统健康快照
- `status` - 运行状态摘要
- `channels.status` - 通道状态
- `logs.tail` - 实时日志

### 4.2 配置中心

**子页面**:

| 页面 | 功能 | 数据源 |
|------|------|--------|
| 模型配置 | 提供商管理、模型选择、故障转移 | `config.get` models |
| 通道配置 | 通道启用/禁用、账号配置 | `config.get` channels |
| 多智能体 | Agent 创建/编辑/删除、核心文件管理 | `agents.list`, `agents.files.*` |
| 路由绑定 | Binding 规则配置、路由预览 | `config.get` bindings |
| 工具配置 | 沙箱策略、网络策略、工具目录 | `config.get` tools |

### 4.3 监控中心

**子页面**:

| 页面 | 功能 | 数据源 |
|------|------|--------|
| 系统健康 | Gateway 状态、心跳监控、队列状态 | `health`, `status` |
| 会话监控 | 会话列表、Token 用量、成本分析 | `sessions.list`, `sessions.usage` |
| 记忆监控 | 记忆索引状态、向量化服务、FTS/向量搜索 | `doctor.memory.status` |
| 多智能体协作 | 子智能体状态、任务层级、路由绑定 | 内部函数 (待 RPC 化) |
| 日志查看 | 实时日志流、搜索过滤、错误追踪 | `logs.tail` |

### 4.4 通道管理

**功能**:
- 通道状态总览
- 通道启用/禁用
- 账号配置与登录
- 连接探测
- 活动统计

**数据源**:
- `channels.status` - 通道状态
- `channels.logout` - 通道登出

### 4.5 技能中心

**功能**:
- 已安装技能列表
- 技能启用/禁用
- ClawHub 市场搜索
- 技能安装/卸载
- 技能配置

**数据源**:
- `skills.list` - 技能列表
- `skills.toggle` - 技能开关

---

## 五、实施计划

### 5.1 阶段一：基础框架 (Week 1-2)

**前端**:
- [ ] 初始化 Vite + React + TypeScript 项目
- [ ] 配置 TailwindCSS + shadcn/ui
- [ ] 实现路由框架和主布局
- [ ] 实现 Gateway RPC 客户端
- [ ] 实现认证流程

**后端**:
- [ ] 初始化 Express 项目
- [ ] 实现 JWT 认证中间件
- [ ] 实现 Gateway WebSocket 代理
- [ ] 实现基础 REST API 路由
- [ ] 实现配置文件读写服务

### 5.2 阶段二：核心功能 (Week 3-4)

**前端**:
- [ ] Dashboard 首页
- [ ] 配置中心 - 模型配置页面
- [ ] 配置中心 - 通道配置页面
- [ ] 监控中心 - 系统健康页面
- [ ] 监控中心 - 会话监控页面

**后端**:
- [ ] 配置管理 API 完整实现
- [ ] 通道管理 API
- [ ] 会话监控 API
- [ ] WebSocket 事件广播

### 5.3 阶段三：高级功能 (Week 5-6)

**前端**:
- [ ] 配置中心 - 多智能体页面
- [ ] 配置中心 - 路由绑定页面
- [ ] 监控中心 - 记忆监控页面
- [ ] 监控中心 - 多智能体协作页面
- [ ] 监控中心 - 日志查看页面

**后端**:
- [ ] 多智能体管理 API
- [ ] 文件编辑服务
- [ ] 备份恢复服务
- [ ] 进程管理服务

### 5.4 阶段四：完善优化 (Week 7-8)

**前端**:
- [ ] 技能中心页面
- [ ] 通道管理页面完善
- [ ] 系统设置页面
- [ ] 性能优化
- [ ] 错误处理完善

**后端**:
- [ ] 技能管理 API
- [ ] 插件管理 API
- [ ] 系统诊断 API
- [ ] 更新检查 API
- [ ] 文档完善

---

## 六、接口映射表

### 6.1 REST API → Gateway RPC 映射

| REST API | Gateway RPC | 说明 |
|----------|-------------|------|
| `GET /api/health` | `health` | 系统健康 |
| `GET /api/status` | `status` | 运行状态 |
| `GET /api/config` | `config.get` | 读取配置 |
| `PUT /api/config` | `config.apply` | 写入配置 |
| `PATCH /api/config` | `config.patch` | 部分更新 |
| `GET /api/channels` | `channels.status` | 通道状态 |
| `POST /api/channels/:id/logout` | `channels.logout` | 通道登出 |
| `GET /api/sessions` | `sessions.list` | 会话列表 |
| `GET /api/sessions/usage` | `sessions.usage` | 会话用量 |
| `GET /api/agents` | `agents.list` | 智能体列表 |
| `GET /api/agents/:id/files` | `agents.files.get` | 文件读取 |
| `PUT /api/agents/:id/files` | `agents.files.set` | 文件写入 |
| `GET /api/memory/status` | `doctor.memory.status` | 记忆状态 |
| `GET /api/logs` | `logs.tail` | 日志流 |
| `GET /api/cron` | `cron.list` | 定时任务 |
| `GET /api/nodes` | `node.list` | 节点列表 |
| `GET /api/usage` | `usage.status` | 用量统计 |

### 6.2 WebSocket 事件映射

| 前端事件 | Gateway 事件 | 说明 |
|----------|--------------|------|
| `health:update` | health 变化 | 健康状态更新 |
| `session:update` | sessions 变化 | 会话状态更新 |
| `log:entry` | logs.tail 流 | 日志条目 |
| `channel:status` | channels.status 变化 | 通道状态变化 |

---

## 七、依赖清单

### 7.1 前端依赖

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0",
    "@tanstack/react-query": "^5.51.0",
    "zustand": "^4.5.0",
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-*": "latest",
    "lucide-react": "^0.400.0",
    "recharts": "^2.12.0",
    "react-hook-form": "^7.52.0",
    "zod": "^3.23.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.4.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "eslint": "^9.0.0",
    "prettier": "^3.3.0"
  }
}
```

### 7.2 后端依赖

```json
{
  "dependencies": {
    "express": "^4.21.0",
    "ws": "^8.18.0",
    "jsonwebtoken": "^9.0.0",
    "dotenv": "^16.4.0",
    "chokidar": "^3.6.0",
    "json5": "^2.2.0",
    "cors": "^2.8.0",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.4.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/express": "^4.17.0",
    "@types/ws": "^8.5.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/cors": "^2.8.0",
    "tsx": "^4.16.0"
  }
}
```

---

## 八、配置示例

### 8.1 环境变量

```env
# Gateway 配置
GATEWAY_URL=ws://localhost:18789/ws
GATEWAY_TOKEN=your-gateway-token

# Dashboard 配置
DASHBOARD_PORT=19527
DASHBOARD_TOKEN=your-admin-password
JWT_SECRET=your-jwt-secret

# OpenClaw 配置路径
OPENCLAW_CONFIG_PATH=~/.openclaw/openclaw.json
OPENCLAW_WORKSPACE=~/.openclaw/workspace
```

### 8.2 Vite 配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:19527',
      '/ws': {
        target: 'ws://localhost:19527',
        ws: true,
      },
    },
  },
});
```

---

## 九、安全考虑

### 9.1 认证流程

1. 用户使用 `DASHBOARD_TOKEN` 登录
2. 后端验证后签发 JWT Token
3. 前端存储 Token 在 localStorage
4. 后续请求携带 Token 进行认证

### 9.2 权限控制

- `read` scope: 只读操作 (health, status, sessions.list 等)
- `write` scope: 写入操作 (config.apply, agents.files.set 等)
- `admin` scope: 管理操作 (system.restart, backup.restore 等)

### 9.3 安全措施

- JWT Token 有效期 24 小时
- 敏感配置 (API Key) 脱敏显示
- 配置修改需二次确认
- 备份文件自动清理

---

*文档版本: 1.0.0*
*创建日期: 2026-03-16*
