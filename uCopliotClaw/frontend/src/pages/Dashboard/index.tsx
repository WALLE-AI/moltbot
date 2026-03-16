import { useHealth, useStatus } from '@/hooks/useApi';
import { Card } from '@/components/ui/card';
import { Circle } from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';

export function DashboardPage() {
  const { data: health } = useHealth();
  const { data: status } = useStatus();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">系统概览</h1>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="系统健康"
          value={health?.ok ? '正常' : '异常'}
          icon={<Circle className="h-4 w-4" />}
          status={health?.ok ? 'success' : 'error'}
        />
        <StatCard
          title="消息/分"
          value={formatNumber(1234)}
          icon={<Circle className="h-4 w-4" />}
        />
        <StatCard
          title="平均延迟"
          value="1.2s"
          icon={<Circle className="h-4 w-4" />}
        />
        <StatCard
          title="错误率"
          value="0.02%"
          icon={<Circle className="h-4 w-4" />}
          status="success"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* System Health */}
        <Card className="p-4">
          <h2 className="mb-4 text-lg font-medium">系统健康状态</h2>
          <div className="space-y-2">
            <StatusItem
              label="Gateway"
              status={health?.ok ? 'online' : 'offline'}
              detail={health?.version}
            />
            <StatusItem
              label="通道"
              status="online"
              detail={`${status?.channels.filter((c) => c.online).length ?? 0}/${status?.channels.length ?? 0} 在线`}
            />
            <StatusItem label="配置" status="online" detail="正常" />
            <StatusItem label="磁盘空间" status="online" detail="充足" />
          </div>
        </Card>

        {/* Recent Events */}
        <Card className="p-4">
          <h2 className="mb-4 text-lg font-medium">最近事件</h2>
          <div className="space-y-2 text-sm">
            <EventItem time="10:01" source="telegram" message="收到消息" />
            <EventItem time="10:00" source="discord" message="发送回复" />
            <EventItem time="09:58" source="openclaw" message="工具调用" />
            <EventItem time="09:55" source="telegram" message="收到消息" />
          </div>
        </Card>

        {/* Channel Status */}
        <Card className="p-4">
          <h2 className="mb-4 text-lg font-medium">通道状态概览</h2>
          <div className="space-y-2">
            {status?.channels.slice(0, 5).map((channel) => (
              <StatusItem
                key={channel.channel}
                label={channel.channel}
                status={channel.online ? 'online' : 'offline'}
              />
            ))}
          </div>
        </Card>

        {/* Token Usage */}
        <Card className="p-4">
          <h2 className="mb-4 text-lg font-medium">Token 用量趋势</h2>
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            📊 图表区域 (最近 7 天)
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  status,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  status?: 'success' | 'warning' | 'error';
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        <span
          className={cn(
            status === 'success' && 'text-success',
            status === 'warning' && 'text-warning',
            status === 'error' && 'text-error'
          )}
        >
          {icon}
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </Card>
  );
}

function StatusItem({
  label,
  status,
  detail,
}: {
  label: string;
  status: 'online' | 'offline' | 'warning';
  detail?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
      <div className="flex items-center gap-2">
        <Circle
          className={cn(
            'h-2 w-2',
            status === 'online' && 'fill-success text-success',
            status === 'offline' && 'fill-muted-foreground text-muted-foreground',
            status === 'warning' && 'fill-warning text-warning'
          )}
        />
        <span>{label}</span>
      </div>
      <span className="text-sm text-muted-foreground">{detail}</span>
    </div>
  );
}

function EventItem({
  time,
  source,
  message,
}: {
  time: string;
  source: string;
  message: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
      <span className="text-muted-foreground">{time}</span>
      <span className="text-primary">[{source}]</span>
      <span>{message}</span>
    </div>
  );
}
