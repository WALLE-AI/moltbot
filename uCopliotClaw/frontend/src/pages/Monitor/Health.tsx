import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Server, Users, HardDrive, Circle, RefreshCw, RotateCw, Check, AlertTriangle, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HealthMetric {
  label: string;
  value: string;
  status: 'good' | 'warning' | 'error';
}

interface Heartbeat {
  time: string;
  status: 'normal' | 'warning';
  latency: number;
}

interface ChannelHealth {
  name: string;
  status: 'online' | 'offline';
  lastActive: string;
  errors: number;
}

const mockGateway = {
  status: 'running' as const,
  pid: 12345,
  port: 18789,
  mode: 'local',
  heartbeat: 'normal',
  queue: 0,
  uptime: '3d',
  version: '2026.3.1',
};

const mockMetrics: HealthMetric[] = [
  { label: 'CPU', value: '12%', status: 'good' },
  { label: '内存', value: '128MB', status: 'good' },
  { label: '磁盘', value: '45GB', status: 'good' },
];

const mockHeartbeats: Heartbeat[] = [
  { time: '10:01:23', status: 'normal', latency: 12 },
  { time: '10:01:22', status: 'normal', latency: 15 },
  { time: '10:01:21', status: 'normal', latency: 11 },
  { time: '10:01:20', status: 'warning', latency: 250 },
];

const mockChannels: ChannelHealth[] = [
  { name: 'Telegram', status: 'online', lastActive: '10:01:23', errors: 0 },
  { name: 'Discord', status: 'online', lastActive: '10:00:45', errors: 2 },
  { name: 'WhatsApp', status: 'offline', lastActive: '09:30:00', errors: 15 },
  { name: '飞书', status: 'online', lastActive: '09:55:12', errors: 0 },
  { name: 'QQ', status: 'offline', lastActive: '昨天', errors: 0 },
];

const mockDiagnostics = [
  { status: 'good', message: '配置文件有效' },
  { status: 'good', message: 'Gateway 连接正常' },
  { status: 'warning', message: 'WhatsApp 通道连接失败: 认证过期' },
  { status: 'good', message: '磁盘空间充足' },
];

export function HealthPage() {
  const [diagnosing, setDiagnosing] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const runDiagnostics = async () => {
    setDiagnosing(true);
    await new Promise((r) => setTimeout(r, 2000));
    setShowDiagnostics(true);
    setDiagnosing(false);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-semibold">系统健康</h1>
          <p className="text-sm text-muted-foreground">Gateway 状态和系统健康监控</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新
          </Button>
          <Button variant="outline" onClick={runDiagnostics} disabled={diagnosing}>
            <Wrench className="mr-2 h-4 w-4" />
            {diagnosing ? '诊断中...' : '诊断'}
          </Button>
          <Button variant="outline">
            <RotateCw className="mr-2 h-4 w-4" />
            重启
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-4">
        {/* Core Metrics */}
        <div className="grid grid-cols-3 gap-4">
          {/* Gateway Status */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Server className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Gateway</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Circle className={cn(
                'h-3 w-3',
                mockGateway.status === 'running' ? 'fill-success text-success' : 'fill-error text-error'
              )} />
              <span className="text-lg font-semibold">
                {mockGateway.status === 'running' ? '运行中' : '已停止'}
              </span>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>运行时间: {mockGateway.uptime}</div>
              <div>版本: {mockGateway.version}</div>
            </div>
          </Card>

          {/* Channel Status */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">通道状态</span>
            </div>
            <div className="text-2xl font-bold mb-1">5/8 在线</div>
            <div className="text-sm text-muted-foreground">3 离线/未配置</div>
          </Card>

          {/* Resource Usage */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <HardDrive className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">资源使用</span>
            </div>
            <div className="space-y-2">
              {mockMetrics.map((m) => (
                <div key={m.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{m.label}</span>
                  <span className={cn(
                    m.status === 'good' ? 'text-success' : m.status === 'warning' ? 'text-warning' : 'text-error'
                  )}>{m.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Gateway Details */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">Gateway 详情</h2>
          <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
            <div className="flex gap-2">
              <span className="text-muted-foreground">状态:</span>
              <div className="flex items-center gap-1">
                <Circle className="h-2 w-2 fill-success text-success" />
                <span>运行中</span>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground">PID:</span>
              <span className="font-mono">{mockGateway.pid}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground">端口:</span>
              <span className="font-mono">{mockGateway.port}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground">模式:</span>
              <span>{mockGateway.mode}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground">心跳:</span>
              <span>正常</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground">队列:</span>
              <span>{mockGateway.queue} 待处理</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">最近心跳</h3>
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {mockHeartbeats.map((hb, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2 font-mono text-muted-foreground">{hb.time}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          {hb.status === 'normal' ? (
                            <Check className="h-4 w-4 text-success" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-warning" />
                          )}
                          <span>{hb.status === 'normal' ? '正常' : '延迟高'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">延迟 {hb.latency}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        {/* Channel Health */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">通道健康</h2>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">通道</th>
                  <th className="px-4 py-2 text-left font-medium">状态</th>
                  <th className="px-4 py-2 text-left font-medium">最后活动</th>
                  <th className="px-4 py-2 text-left font-medium">错误数</th>
                  <th className="px-4 py-2 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {mockChannels.map((ch, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-4 py-2 font-medium">{ch.name}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        <Circle className={cn(
                          'h-2 w-2',
                          ch.status === 'online' ? 'fill-success text-success' : 'fill-muted-foreground text-muted-foreground'
                        )} />
                        <span>{ch.status === 'online' ? '在线' : '离线'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{ch.lastActive}</td>
                    <td className="px-4 py-2">
                      <span className={cn(ch.errors > 0 ? 'text-warning' : '')}>{ch.errors}</span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm">探测</Button>
                        <Button variant="ghost" size="sm">
                          {ch.status === 'online' ? '重启' : '登录'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Diagnostics */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">诊断命令</h2>
          <div className="flex gap-2 mb-4">
            <Button variant="outline" size="sm">检查配置</Button>
            <Button variant="outline" size="sm">测试连接</Button>
            <Button variant="outline" size="sm">导出日志</Button>
            <Button variant="outline" size="sm">清理缓存</Button>
            <Button variant="outline" size="sm">完整诊断</Button>
          </div>

          {showDiagnostics && (
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="text-sm font-medium mb-2">诊断结果:</div>
              <div className="space-y-1">
                {mockDiagnostics.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {d.status === 'good' ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-warning" />
                    )}
                    <span>{d.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
