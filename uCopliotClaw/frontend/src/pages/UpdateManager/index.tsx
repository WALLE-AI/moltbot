import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download, Check, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseDate: string;
  releaseNotes: string[];
}

const mockUpdateInfo: UpdateInfo = {
  currentVersion: 'v2026.3.1',
  latestVersion: 'v2026.3.2',
  hasUpdate: true,
  releaseDate: '2026-03-16',
  releaseNotes: [
    '修复了通道连接稳定性问题',
    '优化了内存使用效率',
    '新增批量消息处理功能',
    '改进了日志搜索性能',
  ],
};

interface UpdateChannel {
  name: string;
  description: string;
}

const updateChannels: UpdateChannel[] = [
  { name: 'stable', description: '稳定版 - 仅发布经过验证的版本' },
  { name: 'beta', description: '测试版 - 提前体验新功能' },
  { name: 'dev', description: '开发版 - 最新代码，可能不稳定' },
];

export function UpdateManagerPage() {
  const [checking, setChecking] = useState(false);
  const [updateInfo] = useState<UpdateInfo>(mockUpdateInfo);
  const [selectedChannel, setSelectedChannel] = useState('stable');
  const [autoCheck, setAutoCheck] = useState(true);
  const [autoUpdate, setAutoUpdate] = useState(false);

  const handleCheckUpdate = async () => {
    setChecking(true);
    await new Promise((r) => setTimeout(r, 2000));
    setChecking(false);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-semibold">更新管理</h1>
          <p className="text-sm text-muted-foreground">检查和安装系统更新</p>
        </div>
        <Button variant="outline" onClick={handleCheckUpdate} disabled={checking}>
          <RefreshCw className={cn('mr-2 h-4 w-4', checking && 'animate-spin')} />
          {checking ? '检查中...' : '检查更新'}
        </Button>
      </div>

      <div className="flex-1 overflow-auto space-y-4">
        {/* Current Version */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">当前版本</h2>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold">{updateInfo.currentVersion}</div>
            {updateInfo.hasUpdate ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-warning/10 text-warning">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">有新版本可用</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-success/10 text-success">
                <Check className="h-4 w-4" />
                <span className="text-sm">已是最新版本</span>
              </div>
            )}
          </div>
        </Card>

        {/* Update Available */}
        {updateInfo.hasUpdate && (
          <Card className="p-4 border-warning/50">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">新版本可用</h2>
                <div className="text-sm text-muted-foreground">
                  {updateInfo.latestVersion} · 发布于 {updateInfo.releaseDate}
                </div>
              </div>
              <Button>
                <Download className="mr-2 h-4 w-4" />
                立即更新
              </Button>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">更新内容:</h3>
              <ul className="space-y-1">
                {updateInfo.releaseNotes.map((note, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-muted-foreground">•</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-sm text-muted-foreground bg-muted/30 rounded p-2">
              <Info className="inline h-4 w-4 mr-1" />
              更新过程中系统将短暂重启，请确保没有正在进行的任务
            </div>
          </Card>
        )}

        {/* Update Channel */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">更新通道</h2>
          <div className="space-y-2">
            {updateChannels.map((channel) => (
              <label
                key={channel.name}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors',
                  selectedChannel === channel.name ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'
                )}
              >
                <input
                  type="radio"
                  name="channel"
                  value={channel.name}
                  checked={selectedChannel === channel.name}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">{channel.name}</div>
                  <div className="text-sm text-muted-foreground">{channel.description}</div>
                </div>
              </label>
            ))}
          </div>
        </Card>

        {/* Update Settings */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">更新设置</h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="font-medium">自动检查更新</div>
                <div className="text-sm text-muted-foreground">每天自动检查是否有新版本</div>
              </div>
              <input
                type="checkbox"
                checked={autoCheck}
                onChange={(e) => setAutoCheck(e.target.checked)}
                className="h-5 w-5"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="font-medium">自动安装更新</div>
                <div className="text-sm text-muted-foreground">发现新版本时自动下载并安装</div>
              </div>
              <input
                type="checkbox"
                checked={autoUpdate}
                onChange={(e) => setAutoUpdate(e.target.checked)}
                className="h-5 w-5"
              />
            </label>
          </div>
        </Card>

        {/* Update History */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">更新历史</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm pb-3 border-b">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                <span className="font-mono">v2026.3.1</span>
              </div>
              <span className="text-muted-foreground">2026-03-15 安装</span>
            </div>
            <div className="flex items-center justify-between text-sm pb-3 border-b">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                <span className="font-mono">v2026.3.0</span>
              </div>
              <span className="text-muted-foreground">2026-03-01 安装</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                <span className="font-mono">v2026.2.0</span>
              </div>
              <span className="text-muted-foreground">2026-02-15 安装</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
