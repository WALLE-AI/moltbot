import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Play, Pause, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogEntry {
  time: string;
  level: 'INFO' | 'DEBUG' | 'WARN' | 'ERROR';
  source: string;
  message: string;
}

const mockLogs: LogEntry[] = [
  { time: '10:01:23', level: 'INFO', source: 'telegram', message: '收到消息: alice: 你好' },
  { time: '10:01:24', level: 'DEBUG', source: 'openclaw', message: '路由匹配: main' },
  { time: '10:01:25', level: 'INFO', source: 'openclaw', message: 'Agent main 开始处理' },
  { time: '10:01:26', level: 'DEBUG', source: 'openclaw', message: '工具调用: memory_search' },
  { time: '10:01:28', level: 'INFO', source: 'openclaw', message: '工具返回: 3 条结果' },
  { time: '10:01:30', level: 'WARN', source: 'openclaw', message: 'API 响应延迟: 2.5s' },
  { time: '10:01:32', level: 'INFO', source: 'discord', message: '发送回复: 你好！有什么可以帮助你的？' },
  { time: '10:01:35', level: 'ERROR', source: 'telegram', message: '发送失败: 连接超时' },
  { time: '10:01:40', level: 'INFO', source: 'openclaw', message: '重试发送消息...' },
  { time: '10:01:42', level: 'INFO', source: 'telegram', message: '消息发送成功' },
  { time: '10:01:45', level: 'DEBUG', source: 'openclaw', message: '会话状态更新' },
  { time: '10:01:50', level: 'INFO', source: 'whatsapp', message: '新连接建立' },
];

const levelColors: Record<LogEntry['level'], string> = {
  INFO: 'text-info',
  DEBUG: 'text-muted-foreground',
  WARN: 'text-warning',
  ERROR: 'text-error',
};

const levelBgColors: Record<LogEntry['level'], string> = {
  INFO: 'bg-info/10',
  DEBUG: 'bg-muted/30',
  WARN: 'bg-warning/10',
  ERROR: 'bg-error/10',
};

export function LogsPage() {
  const [logs] = useState<LogEntry[]>(mockLogs);
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    if (selectedLevel !== 'all' && log.level !== selectedLevel) return false;
    if (selectedSource !== 'all' && log.source !== selectedSource) return false;
    if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleExport = () => {
    const content = filteredLogs.map((l) => `${l.time} [${l.level}] [${l.source}] ${l.message}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openclaw-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-semibold">日志查看</h1>
          <p className="text-sm text-muted-foreground">实时日志流和日志导出</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">级别:</span>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-sm"
            >
              <option value="all">全部</option>
              <option value="INFO">INFO</option>
              <option value="DEBUG">DEBUG</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">来源:</span>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-sm"
            >
              <option value="all">全部</option>
              <option value="openclaw">openclaw</option>
              <option value="telegram">telegram</option>
              <option value="discord">discord</option>
              <option value="whatsapp">whatsapp</option>
            </select>
          </div>
          <div className="flex-1 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索日志..."
              className="h-8 w-48 rounded-md border bg-background px-3 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={autoScroll ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
            >
              {autoScroll ? (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  暂停滚动
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  实时滚动
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              导出
            </Button>
          </div>
        </div>
      </Card>

      {/* Log Stream */}
      <Card className="flex-1 overflow-hidden p-4">
        <div
          ref={logContainerRef}
          className="h-full overflow-auto rounded-md border bg-muted/20 p-3 font-mono text-sm"
        >
          {filteredLogs.map((log, i) => (
            <div
              key={i}
              className={cn(
                'mb-1 flex items-start gap-2 rounded px-2 py-1 hover:bg-muted/30',
                levelBgColors[log.level]
              )}
            >
              <span className="text-muted-foreground shrink-0">{log.time}</span>
              <span className={cn('shrink-0 font-medium', levelColors[log.level])}>
                [{log.level}]
              </span>
              <span className="text-primary shrink-0">[{log.source}]</span>
              <span className="flex-1">{log.message}</span>
            </div>
          ))}
          {filteredLogs.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              没有匹配的日志
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
