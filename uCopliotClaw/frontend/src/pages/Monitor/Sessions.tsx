import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Eye, Trash2, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Session {
  sessionKey: string;
  type: 'direct' | 'group';
  channel: string;
  agent: string;
  tokens: number;
  updatedAt: string;
}

const mockSessions: Session[] = [
  { sessionKey: 'main:telegram:alice', type: 'direct', channel: 'telegram', agent: 'main', tokens: 1234, updatedAt: '10:01:23' },
  { sessionKey: 'main:discord:bob', type: 'direct', channel: 'discord', agent: 'main', tokens: 5678, updatedAt: '09:55:12' },
  { sessionKey: 'work:telegram:work-group', type: 'group', channel: 'telegram', agent: 'work', tokens: 9012, updatedAt: '09:30:00' },
  { sessionKey: 'main:whatsapp:charlie', type: 'direct', channel: 'whatsapp', agent: 'main', tokens: 3456, updatedAt: '昨天' },
  { sessionKey: 'admin:feishu:admin-team', type: 'group', channel: 'feishu', agent: 'admin', tokens: 7890, updatedAt: '昨天' },
  { sessionKey: 'main:telegram:diana', type: 'direct', channel: 'telegram', agent: 'main', tokens: 2345, updatedAt: '2天前' },
  { sessionKey: 'work:discord:dev-channel', type: 'group', channel: 'discord', agent: 'work', tokens: 6789, updatedAt: '2天前' },
  { sessionKey: 'main:qq:eve', type: 'direct', channel: 'qq', agent: 'main', tokens: 123, updatedAt: '3天前' },
];

export function SessionsPage() {
  const [sessions] = useState<Session[]>(mockSessions);
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [selectedTime, setSelectedTime] = useState('7d');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredSessions = sessions.filter((s) => {
    if (selectedAgent !== 'all' && s.agent !== selectedAgent) return false;
    if (selectedChannel !== 'all' && s.channel !== selectedChannel) return false;
    if (searchQuery && !s.sessionKey.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredSessions.length / pageSize);
  const paginatedSessions = filteredSessions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-semibold">会话监控</h1>
          <p className="text-sm text-muted-foreground">会话列表和 Token 用量统计</p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Agent:</span>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-sm"
            >
              <option value="all">全部</option>
              <option value="main">main</option>
              <option value="work">work</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">通道:</span>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-sm"
            >
              <option value="all">全部</option>
              <option value="telegram">Telegram</option>
              <option value="discord">Discord</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="feishu">飞书</option>
              <option value="qq">QQ</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">时间:</span>
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-sm"
            >
              <option value="24h">最近24小时</option>
              <option value="7d">最近7天</option>
              <option value="30d">最近30天</option>
            </select>
          </div>
          <div className="flex-1 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索会话..."
              className="h-8 w-48 rounded-md border bg-background px-3 text-sm"
            />
          </div>
        </div>
      </Card>

      {/* Sessions Table */}
      <Card className="flex-1 overflow-auto p-4">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-sm">
              <th className="pb-3 font-medium">会话键</th>
              <th className="pb-3 font-medium">类型</th>
              <th className="pb-3 font-medium">通道</th>
              <th className="pb-3 font-medium">Agent</th>
              <th className="pb-3 font-medium text-right">Token</th>
              <th className="pb-3 font-medium">更新时间</th>
              <th className="pb-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {paginatedSessions.map((session, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm">{session.sessionKey}</span>
                  </div>
                </td>
                <td className="py-3">
                  <span className={cn(
                    'rounded px-2 py-0.5 text-xs',
                    session.type === 'direct' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'
                  )}>
                    {session.type === 'direct' ? '私聊' : '群聊'}
                  </span>
                </td>
                <td className="py-3 text-sm">{session.channel}</td>
                <td className="py-3 font-mono text-sm">{session.agent}</td>
                <td className="py-3 text-right font-mono text-sm">{formatTokens(session.tokens)}</td>
                <td className="py-3 text-sm text-muted-foreground">{session.updatedAt}</td>
                <td className="py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                      详情
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {paginatedSessions.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">
            没有匹配的会话
          </div>
        )}
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-4">
        <div className="text-sm text-muted-foreground">
          共 {filteredSessions.length} 个会话
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            {currentPage} / {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
