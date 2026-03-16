import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, GripVertical, Plus, Trash2, Star, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModelProvider {
  id: string;
  name: string;
  defaultModel: string;
  configured: boolean;
  apiKey?: string;
  baseUrl?: string;
  models: { id: string; label: string }[];
}

const mockProviders: ModelProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    defaultModel: 'gpt-4o',
    configured: true,
    apiKey: 'sk-****...****',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    defaultModel: 'claude-sonnet-4-5',
    configured: true,
    apiKey: 'sk-ant-****...****',
    models: [
      { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
      { id: 'claude-3-5-haiku', label: 'Claude 3.5 Haiku' },
    ],
  },
  {
    id: 'google',
    name: 'Google',
    defaultModel: 'gemini-2.0-flash',
    configured: true,
    apiKey: 'AIza****...****',
    models: [
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    ],
  },
  {
    id: 'ollama',
    name: 'Ollama',
    defaultModel: 'llama3.2',
    configured: false,
    baseUrl: 'http://localhost:11434',
    models: [],
  },
];

export function ModelsPage() {
  const [providers] = useState<ModelProvider[]>(mockProviders);
  const [selectedId, setSelectedId] = useState<string>('openai');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const selected = providers.find((p) => p.id === selectedId);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    await new Promise((r) => setTimeout(r, 1500));
    setTestResult('success');
    setTesting(false);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-semibold">模型配置</h1>
          <p className="text-sm text-muted-foreground">管理模型提供商和模型配置</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            添加提供商
          </Button>
          <Button variant="outline">故障转移设置</Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Provider List */}
        <Card className="w-64 shrink-0 overflow-auto p-2">
          <div className="space-y-1">
            {providers.map((provider, index) => (
              <div
                key={provider.id}
                onClick={() => setSelectedId(provider.id)}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md p-3 transition-colors',
                  selectedId === provider.id
                    ? 'bg-primary/10 border-primary border'
                    : 'hover:bg-accent'
                )}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{provider.name}</span>
                    {index === 0 && <Star className="h-3 w-3 fill-warning text-warning" />}
                  </div>
                  <div className="text-xs text-muted-foreground">{provider.defaultModel}</div>
                </div>
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    provider.configured ? 'bg-success' : 'bg-muted-foreground'
                  )}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Config Form */}
        {selected && (
          <Card className="flex-1 overflow-auto p-6">
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="mb-4 text-lg font-medium">基本信息</h3>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">名称</label>
                    <input
                      type="text"
                      defaultValue={selected.name}
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">API Key</label>
                    <div className="flex gap-2">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        defaultValue={selected.apiKey || ''}
                        placeholder="sk-..."
                        className="h-10 flex-1 rounded-md border bg-background px-3 text-sm font-mono"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      支持环境变量引用：{'${OPENAI_API_KEY}'}
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Base URL (可选)</label>
                    <input
                      type="text"
                      defaultValue={selected.baseUrl || ''}
                      placeholder="https://api.openai.com/v1"
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Model List */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-medium">模型列表</h3>
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    添加模型
                  </Button>
                </div>
                {selected.models.length > 0 ? (
                  <div className="space-y-2">
                    {selected.models.map((model) => (
                      <div
                        key={model.id}
                        className="flex items-center justify-between rounded-md border bg-muted/30 p-3"
                      >
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-sm">{model.id}</span>
                          <span className="text-sm text-muted-foreground">{model.label}</span>
                        </div>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
                    暂无配置的模型
                  </div>
                )}
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

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button>保存</Button>
                <Button variant="outline" onClick={handleTest} disabled={testing}>
                  {testing ? '测试中...' : '测试连接'}
                </Button>
                <Button variant="ghost">重置</Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
