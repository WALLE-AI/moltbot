import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Circle, FolderOpen, FileText, Edit, Trash2, Eye, Plus, X, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Agent {
  id: string;
  displayName: string;
  workDir: string;
  agentDir?: string;
  model: string;
  fallbackModel?: string;
  status: 'running' | 'stopped';
  isDefault: boolean;
  coreFiles: string[];
}

const mockAgents: Agent[] = [
  {
    id: 'main',
    displayName: '主智能体',
    workDir: '~/.openclaw/workspace',
    model: 'openai/gpt-4o',
    fallbackModel: 'anthropic/claude-sonnet-4-5',
    status: 'running',
    isDefault: true,
    coreFiles: ['AGENTS.md', 'SOUL.md', 'TOOLS.md', 'MEMORY.md'],
  },
  {
    id: 'work',
    displayName: '工作助手',
    workDir: '/data/work',
    model: 'anthropic/claude-sonnet-4-5',
    status: 'stopped',
    isDefault: false,
    coreFiles: ['AGENTS.md', 'TOOLS.md'],
  },
  {
    id: 'admin',
    displayName: '管理员',
    workDir: '~/.openclaw/admin',
    model: 'google/gemini-2.0-flash',
    status: 'stopped',
    isDefault: false,
    coreFiles: ['AGENTS.md', 'SOUL.md'],
  },
];

export function AgentsPage() {
  const [agents] = useState<Agent[]>(mockAgents);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAgents = agents.filter(
    (a) =>
      a.id.includes(searchQuery.toLowerCase()) ||
      a.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowDrawer(true);
  };

  const handleSetDefault = (agent: Agent) => {
    console.log('Set default:', agent.id);
  };

  const handleDelete = (agent: Agent) => {
    console.log('Delete:', agent.id);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-semibold">多智能体管理</h1>
          <p className="text-sm text-muted-foreground">管理 Agent 配置和核心文件</p>
        </div>
        <div className="flex gap-2">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            创建 Agent
          </Button>
          <Button variant="outline">路由预览</Button>
        </div>
      </div>

      {/* Search */}
      <div className="pb-4">
        <input
          type="text"
          placeholder="搜索 Agent..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-10 w-64 rounded-md border bg-background px-3 text-sm"
        />
      </div>

      {/* Agent List */}
      <Card className="flex-1 overflow-auto p-4">
        <div className="space-y-2">
          {filteredAgents.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center justify-between rounded-lg border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {agent.isDefault ? (
                    <Star className="h-5 w-5 fill-warning text-warning" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{agent.id}</span>
                      {agent.isDefault && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                          默认
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">{agent.displayName}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <FolderOpen className="h-4 w-4" />
                  <span className="max-w-[200px] truncate">{agent.workDir}</span>
                </div>
                <div className="font-mono">{agent.model}</div>
                <div className="flex items-center gap-1.5">
                  <Circle
                    className={cn(
                      'h-2 w-2',
                      agent.status === 'running' ? 'fill-success text-success' : 'fill-muted-foreground text-muted-foreground'
                    )}
                  />
                  <span>{agent.status === 'running' ? '运行中' : '未启动'}</span>
                </div>

                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(agent)}>
                    <Edit className="h-4 w-4" />
                    编辑
                  </Button>
                  <Button variant="ghost" size="sm">
                    <FileText className="h-4 w-4" />
                    核心文件
                  </Button>
                  <Button variant="ghost" size="sm">
                    会话
                  </Button>
                  {agent.isDefault ? (
                    <Button variant="ghost" size="sm" disabled>
                      已是默认
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => handleSetDefault(agent)}>
                      设为默认
                    </Button>
                  )}
                  {!agent.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(agent)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Agent Detail Drawer */}
      {showDrawer && selectedAgent && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDrawer(false)} />
          <div className="relative z-10 h-full w-[480px] border-l bg-card shadow-xl">
            <div className="flex h-14 items-center justify-between border-b px-6">
              <h2 className="text-lg font-semibold">编辑 Agent: {selectedAgent.id}</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowDrawer(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="h-[calc(100%-120px)] overflow-auto p-6">
              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="mb-4 font-medium">基本信息</h3>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <label className="text-sm text-muted-foreground">Agent ID</label>
                      <input
                        type="text"
                        value={selectedAgent.id}
                        readOnly
                        className="h-10 rounded-md border bg-muted px-3 text-sm"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm text-muted-foreground">显示名称</label>
                      <input
                        type="text"
                        defaultValue={selectedAgent.displayName}
                        className="h-10 rounded-md border bg-background px-3 text-sm"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm text-muted-foreground">工作目录</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          defaultValue={selectedAgent.workDir}
                          className="h-10 flex-1 rounded-md border bg-background px-3 text-sm font-mono"
                        />
                        <Button variant="outline" size="icon">
                          <Folder className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm text-muted-foreground">Agent 目录 (可选)</label>
                      <input
                        type="text"
                        defaultValue={selectedAgent.agentDir || ''}
                        className="h-10 rounded-md border bg-background px-3 text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Model Config */}
                <div>
                  <h3 className="mb-4 font-medium">模型配置</h3>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <label className="text-sm text-muted-foreground">主模型</label>
                      <select
                        defaultValue={selectedAgent.model}
                        className="h-10 rounded-md border bg-background px-3 text-sm"
                      >
                        <option value="openai/gpt-4o">openai/gpt-4o</option>
                        <option value="anthropic/claude-sonnet-4-5">anthropic/claude-sonnet-4-5</option>
                        <option value="google/gemini-2.0-flash">google/gemini-2.0-flash</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm text-muted-foreground">备用模型</label>
                      <select
                        defaultValue={selectedAgent.fallbackModel || ''}
                        className="h-10 rounded-md border bg-background px-3 text-sm"
                      >
                        <option value="">无</option>
                        <option value="openai/gpt-4o">openai/gpt-4o</option>
                        <option value="anthropic/claude-sonnet-4-5">anthropic/claude-sonnet-4-5</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Core Files */}
                <div>
                  <h3 className="mb-4 font-medium">核心文件</h3>
                  <div className="space-y-2">
                    {selectedAgent.coreFiles.map((file) => (
                      <div
                        key={file}
                        className="flex items-center justify-between rounded-md border bg-muted/30 p-3"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm">{file}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-end gap-2 border-t bg-card p-4">
              <Button variant="outline" onClick={() => setShowDrawer(false)}>
                取消
              </Button>
              <Button>保存</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
