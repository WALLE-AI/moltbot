import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Circle, Plus, Settings, LogOut, LogIn, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Channel {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'unconfigured';
  account?: string;
  messages?: number;
}

const mockChannels: Channel[] = [
  { id: 'telegram', name: 'Telegram', status: 'online', account: '@mybot', messages: 1234 },
  { id: 'discord', name: 'Discord', status: 'online', account: 'Bot#1234', messages: 567 },
  { id: 'whatsapp', name: 'WhatsApp', status: 'offline', account: '未登录' },
  { id: 'feishu', name: '飞书', status: 'online', account: '开发助手', messages: 890 },
  { id: 'dingtalk', name: '钉钉', status: 'unconfigured' },
  { id: 'wecom', name: '企业微信', status: 'unconfigured' },
];

export function ChannelsManagePage() {
  const [channels] = useState<Channel[]>(mockChannels);

  const getStatusColor = (status: Channel['status']) => {
    switch (status) {
      case 'online':
        return 'fill-success text-success';
      case 'offline':
        return 'fill-muted-foreground text-muted-foreground';
      case 'unconfigured':
        return 'fill-warning text-warning';
    }
  };

  const getStatusLabel = (status: Channel['status']) => {
    switch (status) {
      case 'online':
        return '在线';
      case 'offline':
        return '离线';
      case 'unconfigured':
        return '未配置';
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-semibold">通道管理</h1>
          <p className="text-sm text-muted-foreground">管理消息通道连接状态</p>
        </div>
        <div className="flex gap-2">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            添加通道
          </Button>
          <Button variant="outline">
            <Store className="mr-2 h-4 w-4" />
            插件市场
          </Button>
        </div>
      </div>

      {/* Channel Cards Grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {channels.map((channel) => (
            <Card key={channel.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{channel.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Circle className={cn('h-2 w-2', getStatusColor(channel.status))} />
                    <span className="text-sm text-muted-foreground">
                      {getStatusLabel(channel.status)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="text-sm">
                  <span className="text-muted-foreground">账号: </span>
                  <span className={channel.account ? '' : 'text-muted-foreground'}>
                    {channel.account || '-'}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">消息: </span>
                  <span>{channel.messages ? channel.messages.toLocaleString() : '-'}</span>
                </div>
              </div>

              <div className="flex gap-2">
                {channel.status === 'online' && (
                  <>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Settings className="mr-2 h-4 w-4" />
                      配置
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <LogOut className="mr-2 h-4 w-4" />
                      登出
                    </Button>
                  </>
                )}
                {channel.status === 'offline' && (
                  <Button size="sm" className="flex-1">
                    <LogIn className="mr-2 h-4 w-4" />
                    登录
                  </Button>
                )}
                {channel.status === 'unconfigured' && (
                  <Button variant="outline" size="sm" className="flex-1">
                    <Settings className="mr-2 h-4 w-4" />
                    配置
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
