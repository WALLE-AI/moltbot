// Gateway Types
export interface GatewayHealth {
  ok: boolean;
  version: string;
  uptime: number;
  gatewayMode: string;
}

export interface GatewayStatus {
  gateway: {
    running: boolean;
    mode: string;
    port: number;
    pid?: number;
  };
  channels: ChannelStatus[];
  agents: AgentStatus[];
}

export interface ChannelStatus {
  channel: string;
  online: boolean;
  accountId?: string;
  accountName?: string;
  error?: string;
  lastActivity?: number;
}

export interface AgentStatus {
  agentId: string;
  running: boolean;
  model?: string;
  workspaceDir?: string;
}

// Config Types
export interface OpenClawConfig {
  models?: ModelConfig;
  channels?: Record<string, ChannelConfig>;
  agents?: Record<string, AgentConfig>;
  bindings?: BindingConfig[];
  tools?: ToolsConfig;
}

export interface ModelConfig {
  providers: Provider[];
  fallbackOrder?: string[];
}

export interface Provider {
  name: string;
  apiKey: string;
  baseUrl?: string;
  models: Model[];
  compat?: {
    supportsDeveloperRole?: boolean;
  };
}

export interface Model {
  id: string;
  label: string;
  contextWindow?: number;
  pricing?: {
    input: number;
    output: number;
  };
}

export interface ChannelConfig {
  enabled: boolean;
  [key: string]: unknown;
}

export interface AgentConfig {
  workspaceDir?: string;
  agentDir?: string;
  model?: string;
  fallbackModel?: string;
}

export interface BindingConfig {
  channel?: string;
  accountId?: string;
  agentId: string;
  priority?: number;
  roles?: string[];
  guildId?: string;
  teamId?: string;
  sender?: string;
  peer?: string;
}

export interface ToolsConfig {
  sandbox?: {
    allowedBins?: string[];
    allowedDirs?: string[];
    networkPolicy?: 'allow' | 'deny' | 'ask';
  };
  toolDirs?: string[];
}

// Session Types
export interface Session {
  sessionKey: string;
  agentId: string;
  channel: string;
  type: 'direct' | 'group';
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
}

export interface SessionUsage {
  totalSessions: number;
  totalMessages: number;
  totalTokens: {
    input: number;
    output: number;
    total: number;
  };
  byAgent: Record<string, {
    sessions: number;
    tokens: { input: number; output: number; total: number };
  }>;
  byChannel: Record<string, {
    sessions: number;
    tokens: { input: number; output: number; total: number };
  }>;
}

// Memory Types
export interface MemoryStatus {
  agentId: string;
  provider?: {
    type: string;
    basePath: string;
  };
  embedding: {
    ok: boolean;
    model?: string;
    error?: string;
  };
  files?: {
    memory: number;
    sessions: number;
    total: number;
  };
  chunks?: number;
  vectorAvailable?: boolean;
  cacheSize?: number;
}

// Subagent Types
export interface SubagentRunRecord {
  runId: string;
  childSessionKey: string;
  requesterSessionKey: string;
  requesterDisplayKey: string;
  task: string;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  outcome?: 'success' | 'error' | 'timeout' | 'cancelled';
  status: 'pending' | 'running' | 'completed' | 'failed';
  model?: string;
  workspaceDir?: string;
}

// Log Types
export interface LogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  source: string;
  message: string;
  data?: Record<string, unknown>;
}

// Install/Update Types
export interface InstallProgress {
  step: 'checking' | 'downloading' | 'verifying' | 'installing' | 'configuring' | 'starting' | 'done' | 'error';
  progress: number;
  message: string;
  logs: string[];
}

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseDate?: string;
  releaseNotes?: string;
  changelog?: string[];
}

export interface SystemInfo {
  os: string;
  arch: string;
  nodeVersion: string;
  memory: number;
  diskSpace: number;
  openclawVersion?: string;
  openclawPath?: string;
}
