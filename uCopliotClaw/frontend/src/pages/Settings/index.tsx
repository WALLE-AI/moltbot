import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, HardDrive, Info, Trash2, ExternalLink, Check } from 'lucide-react';

interface LoginHistory {
  time: string;
  ip: string;
  device: string;
  status: 'success' | 'failed';
}

interface Backup {
  name: string;
  createdAt: string;
  size: string;
}

const mockLoginHistory: LoginHistory[] = [
  { time: '10:01:23', ip: '192.168.1.1', device: 'Chrome/Win', status: 'success' },
  { time: '昨天 09:30', ip: '192.168.1.1', device: 'Chrome/Win', status: 'success' },
  { time: '3天前 14:20', ip: '10.0.0.5', device: 'Safari/Mac', status: 'success' },
];

const mockBackups: Backup[] = [
  { name: 'pre-edit-20260316-1', createdAt: '10:01:23', size: '12KB' },
  { name: 'pre-edit-20260315-2', createdAt: '昨天 09:30', size: '11KB' },
  { name: 'pre-edit-20260314-1', createdAt: '3天前 14:20', size: '10KB' },
  { name: 'manual-20260313-0', createdAt: '3月13日', size: '15KB' },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'auth' | 'backup' | 'about'>('auth');
  const [tokenExpiry, setTokenExpiry] = useState('24');
  const [refreshPolicy, setRefreshPolicy] = useState<'auto' | 'manual'>('manual');
  const [autoBackup, setAutoBackup] = useState(true);
  const [backupCount, setBackupCount] = useState('10');

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-semibold">系统设置</h1>
          <p className="text-sm text-muted-foreground">认证、备份和系统信息</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={activeTab === 'auth' ? 'default' : 'outline'}
          onClick={() => setActiveTab('auth')}
        >
          <Shield className="mr-2 h-4 w-4" />
          认证设置
        </Button>
        <Button
          variant={activeTab === 'backup' ? 'default' : 'outline'}
          onClick={() => setActiveTab('backup')}
        >
          <HardDrive className="mr-2 h-4 w-4" />
          备份恢复
        </Button>
        <Button
          variant={activeTab === 'about' ? 'default' : 'outline'}
          onClick={() => setActiveTab('about')}
        >
          <Info className="mr-2 h-4 w-4" />
          关于
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'auth' && (
          <div className="space-y-4">
            {/* JWT Token Config */}
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-4">JWT Token 配置</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm w-24">Token 有效期:</span>
                  <input
                    type="number"
                    value={tokenExpiry}
                    onChange={(e) => setTokenExpiry(e.target.value)}
                    className="h-8 w-20 rounded-md border bg-background px-3 text-sm"
                  />
                  <span className="text-sm text-muted-foreground">小时</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm w-24">刷新策略:</span>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={refreshPolicy === 'auto'}
                        onChange={() => setRefreshPolicy('auto')}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">自动刷新</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={refreshPolicy === 'manual'}
                        onChange={() => setRefreshPolicy('manual')}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">手动刷新</span>
                    </label>
                  </div>
                </div>

                <div className="rounded-md border bg-muted/20 p-3">
                  <div className="text-sm font-medium mb-2">当前 Token:</div>
                  <div className="font-mono text-xs text-muted-foreground mb-2 break-all">
                    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
                  </div>
                  <div className="text-sm text-muted-foreground">
                    创建时间: 2026-03-16 08:00:00
                  </div>
                  <div className="text-sm text-muted-foreground">
                    过期时间: 2026-03-17 08:00:00
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm">撤销</Button>
                  <Button variant="outline" size="sm">刷新</Button>
                </div>
              </div>
            </Card>

            {/* Password Management */}
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-4">密码管理</h2>
              <div className="space-y-3 max-w-md">
                <div>
                  <label className="text-sm text-muted-foreground">当前密码</label>
                  <input
                    type="password"
                    className="mt-1 h-8 w-full rounded-md border bg-background px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">新密码</label>
                  <input
                    type="password"
                    className="mt-1 h-8 w-full rounded-md border bg-background px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">确认密码</label>
                  <input
                    type="password"
                    className="mt-1 h-8 w-full rounded-md border bg-background px-3 text-sm"
                  />
                </div>
                <Button size="sm">修改密码</Button>
              </div>
            </Card>

            {/* Login History */}
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-4">登录历史</h2>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2 text-left font-medium">时间</th>
                      <th className="px-4 py-2 text-left font-medium">IP 地址</th>
                      <th className="px-4 py-2 text-left font-medium">设备</th>
                      <th className="px-4 py-2 text-left font-medium">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockLoginHistory.map((login, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-4 py-2">{login.time}</td>
                        <td className="px-4 py-2 font-mono">{login.ip}</td>
                        <td className="px-4 py-2">{login.device}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1">
                            {login.status === 'success' ? (
                              <>
                                <Check className="h-4 w-4 text-success" />
                                <span>成功</span>
                              </>
                            ) : (
                              <span className="text-error">失败</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="space-y-4">
            {/* Config Backup */}
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-4">配置备份</h2>
              <div className="space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoBackup}
                    onChange={(e) => setAutoBackup(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">每次配置变更前自动备份</span>
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-sm">保留数量:</span>
                  <input
                    type="number"
                    value={backupCount}
                    onChange={(e) => setBackupCount(e.target.value)}
                    className="h-8 w-20 rounded-md border bg-background px-3 text-sm"
                  />
                  <span className="text-sm text-muted-foreground">个</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm">立即备份</Button>
                  <Button variant="outline" size="sm">导出配置</Button>
                </div>
              </div>
            </Card>

            {/* Backup History */}
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-4">备份历史</h2>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2 text-left font-medium">备份文件</th>
                      <th className="px-4 py-2 text-left font-medium">创建时间</th>
                      <th className="px-4 py-2 text-left font-medium">大小</th>
                      <th className="px-4 py-2 text-right font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockBackups.map((backup, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-4 py-2 font-mono">{backup.name}</td>
                        <td className="px-4 py-2 text-muted-foreground">{backup.createdAt}</td>
                        <td className="px-4 py-2">{backup.size}</td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm">恢复</Button>
                            <Button variant="ghost" size="sm" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Restore */}
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-4">恢复操作</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm">从文件恢复:</span>
                  <Button variant="outline" size="sm">选择文件...</Button>
                  <Button size="sm">上传并恢复</Button>
                </div>
                <div className="text-sm text-warning bg-warning/10 rounded p-2">
                  ⚠️ 恢复操作将覆盖当前配置，建议先备份
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="space-y-4">
            {/* Logo Card */}
            <Card className="p-8 text-center">
              <div className="text-4xl mb-4">🐱</div>
              <div className="text-xl font-semibold mb-2">OpenClaw Dashboard</div>
              <div className="text-muted-foreground">版本: v2026.3.1</div>
              <div className="text-muted-foreground">构建日期: 2026-03-15</div>
            </Card>

            {/* System Info */}
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-4">系统信息</h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Dashboard 版本</div>
                <div>v2026.3.1</div>
                <div className="text-muted-foreground">Gateway 版本</div>
                <div>v2026.3.1</div>
                <div className="text-muted-foreground">运行模式</div>
                <div>local</div>
                <div className="text-muted-foreground">监听端口</div>
                <div>19527 (Dashboard), 18789 (Gateway)</div>
                <div className="text-muted-foreground">运行时间</div>
                <div>3 天 2 小时 15 分钟</div>
                <div className="text-muted-foreground">Node.js 版本</div>
                <div>v22.1.0</div>
                <div className="text-muted-foreground">操作系统</div>
                <div>Linux (Ubuntu 22.04)</div>
                <div className="text-muted-foreground">CPU 架构</div>
                <div>x86_64</div>
                <div className="text-muted-foreground">内存使用</div>
                <div>128 MB / 16 GB</div>
                <div className="text-muted-foreground">磁盘空间</div>
                <div>45 GB 可用</div>
              </div>
            </Card>

            {/* Links */}
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-4">链接</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span>📖 文档:</span>
                  <a href="#" className="text-primary hover:underline flex items-center gap-1">
                    https://docs.openclaw.ai
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span>🐙 GitHub:</span>
                  <a href="#" className="text-primary hover:underline flex items-center gap-1">
                    https://github.com/openclaw/openclaw
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span>💬 Discord:</span>
                  <a href="#" className="text-primary hover:underline flex items-center gap-1">
                    https://discord.gg/openclaw
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span>🛒 ClawHub:</span>
                  <a href="#" className="text-primary hover:underline flex items-center gap-1">
                    https://clawhub.openclaw.ai
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </Card>

            {/* License */}
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-4">开源许可</h2>
              <div className="text-sm mb-3">
                OpenClaw Dashboard 以 MIT 许可证开源
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">查看完整许可协议</Button>
                <Button variant="outline" size="sm">查看第三方许可</Button>
              </div>
            </Card>

            <div className="flex justify-center pt-4">
              <Button>检查更新</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
