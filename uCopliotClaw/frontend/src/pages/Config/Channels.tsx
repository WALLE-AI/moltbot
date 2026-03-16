import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Circle, Eye, EyeOff, Plus, Check, AlertCircle, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChannelConfig {
  id: string;
  name: string;
  enabled: boolean;
  configured: boolean;
  botToken?: string;
  envVar?: string;
  privatePolicy: 'pairing' | 'allowlist' | 'all';
  groupPolicy: 'pairing' | 'allowlist' | 'all';
  allowedUsers: string[];
  allowedGroups: string[];
  maxRetries: number;
  timeout: number;
  proxy?: string;
}

const mockChannels: ChannelConfig[] = [
  {
    id: 'telegram',
    name: 'Telegram',
    enabled: true,
    configured: true,
    botToken: '123456:ABC***',
    envVar: '${TELEGRAM_BOT_TOKEN}',
    privatePolicy: 'pairing',
    groupPolicy: 'pairing',
    allowedUsers: [],
    allowedGroups: ['-1001234'],
    maxRetries: 3,
    timeout: 30,
  },
  {
    id: 'discord',
    name: 'Discord',
    enabled: true,
    configured: true,
    botToken: 'MTK***',
    privatePolicy: 'all',
    groupPolicy: 'allowlist',
    allowedUsers: [],
    allowedGroups: ['123456789'],
    maxRetries: 3,
    timeout: 30,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    enabled: false,
    configured: false,
    privatePolicy: 'pairing',
    groupPolicy: 'pairing',
    allowedUsers: [],
    allowedGroups: [],
    maxRetries: 3,
    timeout: 30,
  },
  {
    id: 'feishu',
    name: '飞书',
    enabled: false,
    configured: false,
    privatePolicy: 'pairing',
    groupPolicy: 'pairing',
    allowedUsers: [],
    allowedGroups: [],
    maxRetries: 3,
    timeout: 30,
  },
  {
    id: 'dingtalk',
    name: '钉钉',
    enabled: false,
    configured: false,
    privatePolicy: 'pairing',
    groupPolicy: 'pairing',
    allowedUsers: [],
    allowedGroups: [],
    maxRetries: 3,
    timeout: 30,
  },
];

export function ChannelsConfigPage() {
  const [channels] = useState<ChannelConfig[]>(mockChannels);
  const [selectedId, setSelectedId] = useState<string>('telegram');
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const selected = channels.find((c) => c.id === selectedId);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    await new Promise((r) => setTimeout(r, 1500));
    setTestResult('success');
    setTesting(false);
  };

  const getStatusLabel = (channel: ChannelConfig) => {
    if (!channel.configured) return '未配置';
    return channel.enabled ? '已启用' : '已禁用';
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-semibold">通道配置</h1>
          <p className="text-sm text-muted-foreground">配置消息通道参数</p>
        </div>
        <div className="flex gap-2">
          <Button>保存</Button>
          <Button variant="outline">重置</Button>
          <Button variant="outline" onClick={handleTest} disabled={testing}>
            {testing ? '测试中...' : '测试连接'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Channel List */}
        <Card className="w-56 shrink-0 overflow-auto p-2">
          <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">已配置通道</div>
          <div className="space-y-1">
            {channels.map((channel) => (
              <div
                key={channel.id}
                onClick={() => setSelectedId(channel.id)}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md p-3 transition-colors',
                  selectedId === channel.id
                    ? 'bg-primary/10 border-primary border'
                    : 'hover:bg-accent'
                )}
              >
                <Circle
                  className={cn(
                    'h-2 w-2',
                    channel.enabled && channel.configured
                      ? 'fill-success text-success'
                      : channel.configured
                        ? 'fill-muted-foreground text-muted-foreground'
                        : 'fill-warning text-warning'
                  )}
                />
                <div className="flex-1">
                  <div className="font-medium">{channel.name}</div>
                  <div className="text-xs text-muted-foreground">{getStatusLabel(channel)}</div>
                </div>
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="mt-2 w-full">
            <Plus className="mr-2 h-4 w-4" />
            添加通道
          </Button>
        </Card>

        {/* Config Form */}
        {selected && (
          <Card className="flex-1 overflow-auto p-6">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">{selected.name} 配置</h2>
              </div>

              {/* Basic Settings */}
              <div>
                <h3 className="mb-4 font-medium">基本设置</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    defaultChecked={selected.enabled}
                    className="h-4 w-4 rounded border"
                  />
                  <label className="text-sm">启用通道</label>
                </div>
              </div>

              {/* Credentials */}
              <div>
                <h3 className="mb-4 font-medium">凭证配置</h3>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm text-muted-foreground">Bot Token</label>
                    <div className="flex gap-2">
                      <input
                        type={showToken ? 'text' : 'password'}
                        defaultValue={selected.botToken || ''}
                        placeholder="输入 Bot Token"
                        className="h-10 flex-1 rounded-md border bg-background px-3 text-sm font-mono"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowToken(!showToken)}
                      >
                        {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  {selected.envVar && (
                    <div className="rounded-md bg-muted/50 p-3 text-sm">
                      <span className="text-muted-foreground">环境变量: </span>
                      <code className="font-mono">{selected.envVar}</code>
                    </div>
                  )}
                </div>
              </div>

              {/* Policy Settings */}
              <div>
                <h3 className="mb-4 font-medium">策略配置</h3>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm text-muted-foreground">私聊策略</label>
                    <select
                      defaultValue={selected.privatePolicy}
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="pairing">配对模式</option>
                      <option value="allowlist">白名单模式</option>
                      <option value="all">全部允许</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm text-muted-foreground">群聊策略</label>
                    <select
                      defaultValue={selected.groupPolicy}
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="pairing">配对模式</option>
                      <option value="allowlist">白名单模式</option>
                      <option value="all">全部允许</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm text-muted-foreground">允许的用户</label>
                    <input
                      type="text"
                      defaultValue={selected.allowedUsers.join(',')}
                      placeholder="user1,user2,..."
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm text-muted-foreground">允许的群组</label>
                    <input
                      type="text"
                      defaultValue={selected.allowedGroups.join(',')}
                      placeholder="-1001234,..."
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Advanced Settings */}
              <div>
                <h3 className="mb-4 font-medium">高级设置</h3>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm text-muted-foreground">最大重试</label>
                    <input
                      type="number"
                      defaultValue={selected.maxRetries}
                      className="h-10 w-32 rounded-md border bg-background px-3 text-sm"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm text-muted-foreground">超时时间 (秒)</label>
                    <input
                      type="number"
                      defaultValue={selected.timeout}
                      className="h-10 w-32 rounded-md border bg-background px-3 text-sm"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm text-muted-foreground">代理地址</label>
                    <input
                      type="text"
                      defaultValue={selected.proxy || ''}
                      placeholder="http://proxy:8080"
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Test Result */}
              {testResult && (
                <div
                  className={cn(
                    'flex items-center gap-2 rounded-md p-3',
                    testResult === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                  )}
                >
                  {testResult === 'success' ? (
                    <>
                      <Check className="h-4 w-4" />
                      连接测试成功
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4" />
                      连接测试失败
                    </>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
