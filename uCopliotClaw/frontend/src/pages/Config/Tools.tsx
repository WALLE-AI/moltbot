import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, FolderOpen, Shield, Folder, Globe, Terminal } from 'lucide-react';

interface SandboxConfig {
  enabled: boolean;
  allowedDirs: string[];
  deniedDirs: string[];
  networkPolicy: 'allow-all' | 'ask' | 'deny-all';
  allowedDomains: string[];
  allowedBinaries: string[];
}

interface ToolDirectory {
  path: string;
}

const defaultConfig: SandboxConfig = {
  enabled: true,
  allowedDirs: ['~/.openclaw/workspace', '/data/projects'],
  deniedDirs: ['/etc', '~/.ssh'],
  networkPolicy: 'ask',
  allowedDomains: ['*.wikipedia.org', 'api.openai.com'],
  allowedBinaries: ['git', 'npm', 'node'],
};

const defaultToolDirs: ToolDirectory[] = [
  { path: '~/.openclaw/tools' },
  { path: '/opt/openclaw/tools' },
];

type PresetKey = 'standard' | 'strict' | 'dev' | 'custom';

export function ToolsPage() {
  const [config, setConfig] = useState<SandboxConfig>(defaultConfig);
  const [toolDirs, setToolDirs] = useState<ToolDirectory[]>(defaultToolDirs);
  const [activePreset, setActivePreset] = useState<PresetKey>('standard');
  const [newAllowedDir, setNewAllowedDir] = useState('');
  const [newDeniedDir, setNewDeniedDir] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newBinary, setNewBinary] = useState('');
  const [newToolDir, setNewToolDir] = useState('');

  const presets: Record<PresetKey, { label: string; description: string }> = {
    standard: { label: '标准策略', description: '允许常见开发工具，网络按需询问' },
    strict: { label: '严格策略', description: '最小权限，仅允许必要目录' },
    dev: { label: '开发策略', description: '宽松权限，适合开发环境' },
    custom: { label: '自定义', description: '手动配置所有策略' },
  };

  const addAllowedDir = () => {
    if (newAllowedDir.trim()) {
      setConfig({ ...config, allowedDirs: [...config.allowedDirs, newAllowedDir.trim()] });
      setNewAllowedDir('');
    }
  };

  const addDeniedDir = () => {
    if (newDeniedDir.trim()) {
      setConfig({ ...config, deniedDirs: [...config.deniedDirs, newDeniedDir.trim()] });
      setNewDeniedDir('');
    }
  };

  const addDomain = () => {
    if (newDomain.trim()) {
      setConfig({ ...config, allowedDomains: [...config.allowedDomains, newDomain.trim()] });
      setNewDomain('');
    }
  };

  const addBinary = () => {
    if (newBinary.trim()) {
      setConfig({ ...config, allowedBinaries: [...config.allowedBinaries, newBinary.trim()] });
      setNewBinary('');
    }
  };

  const addToolDir = () => {
    if (newToolDir.trim()) {
      setToolDirs([...toolDirs, { path: newToolDir.trim() }]);
      setNewToolDir('');
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-semibold">工具配置</h1>
          <p className="text-sm text-muted-foreground">配置沙箱策略和工具目录</p>
        </div>
        <div className="flex gap-2">
          <Button>保存</Button>
          <Button variant="outline">重置</Button>
          <Button variant="outline">应用</Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-4">
        {/* Sandbox Policy */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">沙箱策略</h2>
          </div>

          <div className="space-y-6">
            {/* Enable Sandbox */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="h-4 w-4 rounded border"
              />
              <span className="text-sm font-medium">启用沙箱</span>
            </label>

            {/* File System Policy */}
            <div>
              <h3 className="mb-3 font-medium flex items-center gap-2">
                <Folder className="h-4 w-4" />
                文件系统策略
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Allowed Directories */}
                <div className="rounded-md border p-3">
                  <div className="text-sm text-muted-foreground mb-2">允许的目录</div>
                  <div className="space-y-1 mb-2">
                    {config.allowedDirs.map((dir, i) => (
                      <div key={i} className="flex items-center justify-between text-sm bg-muted/30 rounded px-2 py-1">
                        <span className="font-mono">{dir}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Trash2 className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newAllowedDir}
                      onChange={(e) => setNewAllowedDir(e.target.value)}
                      placeholder="添加目录"
                      className="h-8 flex-1 rounded border bg-background px-2 text-sm"
                    />
                    <Button variant="outline" size="sm" onClick={addAllowedDir}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Denied Directories */}
                <div className="rounded-md border p-3">
                  <div className="text-sm text-muted-foreground mb-2">禁止的目录</div>
                  <div className="space-y-1 mb-2">
                    {config.deniedDirs.map((dir, i) => (
                      <div key={i} className="flex items-center justify-between text-sm bg-muted/30 rounded px-2 py-1">
                        <span className="font-mono">{dir}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Trash2 className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newDeniedDir}
                      onChange={(e) => setNewDeniedDir(e.target.value)}
                      placeholder="添加目录"
                      className="h-8 flex-1 rounded border bg-background px-2 text-sm"
                    />
                    <Button variant="outline" size="sm" onClick={addDeniedDir}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Network Policy */}
            <div>
              <h3 className="mb-3 font-medium flex items-center gap-2">
                <Globe className="h-4 w-4" />
                网络策略
              </h3>
              <div className="space-y-3">
                <div className="flex gap-4">
                  {(['allow-all', 'ask', 'deny-all'] as const).map((policy) => (
                    <label key={policy} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="networkPolicy"
                        checked={config.networkPolicy === policy}
                        onChange={() => setConfig({ ...config, networkPolicy: policy })}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">
                        {policy === 'allow-all' ? '允许所有' : policy === 'ask' ? '按需询问' : '完全禁止'}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-sm text-muted-foreground mb-2">允许的域名</div>
                  <div className="space-y-1 mb-2">
                    {config.allowedDomains.map((domain, i) => (
                      <div key={i} className="flex items-center justify-between text-sm bg-muted/30 rounded px-2 py-1">
                        <span className="font-mono">{domain}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Trash2 className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      placeholder="*.example.com"
                      className="h-8 flex-1 rounded border bg-background px-2 text-sm"
                    />
                    <Button variant="outline" size="sm" onClick={addDomain}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Allowed Binaries */}
            <div>
              <h3 className="mb-3 font-medium flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                允许的二进制文件
              </h3>
              <div className="rounded-md border p-3">
                <div className="space-y-1 mb-2">
                  {config.allowedBinaries.map((binary, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-muted/30 rounded px-2 py-1">
                      <span className="font-mono">{binary}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBinary}
                    onChange={(e) => setNewBinary(e.target.value)}
                    placeholder="命令名称"
                    className="h-8 flex-1 rounded border bg-background px-2 text-sm"
                  />
                  <Button variant="outline" size="sm" onClick={addBinary}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Tool Directories */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">工具目录</h2>
          </div>
          <div className="space-y-2 mb-3">
            {toolDirs.map((dir, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-muted/30 rounded px-3 py-2">
                <span className="font-mono">{dir.path}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm">浏览</Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newToolDir}
              onChange={(e) => setNewToolDir(e.target.value)}
              placeholder="添加工具目录"
              className="h-8 flex-1 rounded border bg-background px-2 text-sm"
            />
            <Button variant="outline" size="sm" onClick={addToolDir}>
              <Plus className="mr-2 h-4 w-4" />
              添加目录
            </Button>
          </div>
        </Card>

        {/* Preset Policies */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">预设策略</h2>
          <div className="flex gap-2 mb-3">
            {(Object.keys(presets) as PresetKey[]).map((key) => (
              <Button
                key={key}
                variant={activePreset === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActivePreset(key)}
              >
                {presets[key].label}
              </Button>
            ))}
          </div>
          <div className="text-sm text-muted-foreground">
            {presets[activePreset].description}
          </div>
        </Card>
      </div>
    </div>
  );
}
