import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Circle, RefreshCw, Check, Database, FileText, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IndexSource {
  name: string;
  files: number;
  chunks: number;
  lastUpdate: string;
  status: 'synced' | 'syncing' | 'error';
}

const mockIndexSources: IndexSource[] = [
  { name: 'memory', files: 3, chunks: 456, lastUpdate: '10:00:00', status: 'synced' },
  { name: 'sessions', files: 9, chunks: 778, lastUpdate: '09:55:00', status: 'synced' },
];

export function MemoryPage() {
  const [sources] = useState<IndexSource[]>(mockIndexSources);
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    await new Promise((r) => setTimeout(r, 2000));
    setSyncing(false);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-semibold">记忆状态</h1>
          <p className="text-sm text-muted-foreground">向量索引和记忆存储监控</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={cn('mr-2 h-4 w-4', syncing && 'animate-spin')} />
            {syncing ? '同步中...' : '重新同步'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-4">
        {/* Status Cards */}
        <div className="grid grid-cols-3 gap-4">
          {/* Vectorization Service */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Database className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">向量化服务</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Circle className="h-2 w-2 fill-success text-success" />
              <span className="text-lg font-semibold">可用</span>
            </div>
            <div className="text-sm text-muted-foreground font-mono">
              openai/text-embedding-3-small
            </div>
          </Card>

          {/* Memory Files */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">记忆文件</span>
            </div>
            <div className="text-2xl font-bold mb-1">12 个文件</div>
            <div className="text-sm text-muted-foreground">
              MEMORY.md x3, sessions x9
            </div>
          </Card>

          {/* Vector Index */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Search className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">向量索引</span>
            </div>
            <div className="text-2xl font-bold mb-1">1,234 块</div>
            <div className="text-sm text-muted-foreground">
              维度: 1536 | 状态: ✅ 正常
            </div>
          </Card>
        </div>

        {/* Index Details */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">索引详情</h2>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">来源</th>
                  <th className="px-4 py-2 text-left font-medium">文件数</th>
                  <th className="px-4 py-2 text-left font-medium">块数</th>
                  <th className="px-4 py-2 text-left font-medium">最后更新</th>
                  <th className="px-4 py-2 text-left font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-4 py-2 font-mono">{source.name}</td>
                    <td className="px-4 py-2">{source.files}</td>
                    <td className="px-4 py-2">{source.chunks}</td>
                    <td className="px-4 py-2 text-muted-foreground">{source.lastUpdate}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        {source.status === 'synced' ? (
                          <>
                            <Check className="h-4 w-4 text-success" />
                            <span>已同步</span>
                          </>
                        ) : source.status === 'syncing' ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                            <span>同步中</span>
                          </>
                        ) : (
                          <span className="text-error">错误</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Search Functionality */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">搜索功能</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-md border p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">FTS (全文搜索)</span>
                <Check className="h-4 w-4 text-success" />
              </div>
              <span className="text-sm text-muted-foreground">可用</span>
            </div>
            <div className="rounded-md border p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Vector (向量搜索)</span>
                <Check className="h-4 w-4 text-success" />
              </div>
              <span className="text-sm text-muted-foreground">可用</span>
            </div>
            <div className="rounded-md border p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Cache (向量缓存)</span>
                <span className="text-sm font-mono">456 / 1000</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary w-[45%]" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
