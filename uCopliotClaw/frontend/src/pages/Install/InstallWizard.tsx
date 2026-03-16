import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Check, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Step = 'checking' | 'selecting' | 'installing' | 'starting' | 'configuring' | 'done';

const STEPS: { id: Step; label: string }[] = [
  { id: 'checking', label: '环境检测' },
  { id: 'selecting', label: '镜像选择' },
  { id: 'installing', label: '安装执行' },
  { id: 'starting', label: '服务启动' },
  { id: 'configuring', label: '引导配置' },
];

export function InstallWizard() {
  const [currentStep, setCurrentStep] = useState<Step>('checking');
  const [installProgress, setInstallProgress] = useState(0);

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">OpenClaw Dashboard 安装向导</h1>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex flex-col items-center">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border-2',
                index < currentStepIndex && 'border-primary bg-primary text-primary-foreground',
                index === currentStepIndex && 'border-primary text-primary',
                index > currentStepIndex && 'border-muted-foreground/30 text-muted-foreground/30'
              )}
            >
              {index < currentStepIndex ? (
                <Check className="h-4 w-4" />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            <span
              className={cn(
                'mt-1 text-xs',
                index <= currentStepIndex ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card className="p-6">
        {currentStep === 'checking' && <CheckingStep onNext={() => setCurrentStep('selecting')} />}
        {currentStep === 'selecting' && (
          <SelectingStep
            onNext={() => {
              setCurrentStep('installing');
              simulateInstall(setInstallProgress, () => setCurrentStep('starting'));
            }}
            onBack={() => setCurrentStep('checking')}
          />
        )}
        {currentStep === 'installing' && (
          <InstallingStep progress={installProgress} />
        )}
        {currentStep === 'starting' && (
          <StartingStep onNext={() => setCurrentStep('configuring')} />
        )}
        {currentStep === 'configuring' && (
          <ConfiguringStep onNext={() => setCurrentStep('done')} />
        )}
        {currentStep === 'done' && <DoneStep />}
      </Card>
    </div>
  );
}

function CheckingStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">步骤 1: 环境检测</h2>

      {/* System Info */}
      <div>
        <h3 className="mb-2 font-medium">系统信息</h3>
        <div className="grid gap-2">
          <CheckItem label="操作系统" value="Linux (Ubuntu 22.04)" status="success" />
          <CheckItem label="CPU 架构" value="x86_64" status="success" />
          <CheckItem label="内存" value="16 GB" status="success" />
          <CheckItem label="磁盘空间" value="50 GB 可用" status="success" />
        </div>
      </div>

      {/* Dependencies */}
      <div>
        <h3 className="mb-2 font-medium">依赖检查</h3>
        <div className="grid gap-2">
          <CheckItem label="Node.js" value="v22.1.0" status="success" />
          <CheckItem label="Docker" value="v24.0.5" status="success" />
          <CheckItem label="端口 19527" value="可用" status="success" />
          <CheckItem label="端口 18789" value="可用" status="success" />
        </div>
      </div>

      {/* OpenClaw Detection */}
      <div>
        <h3 className="mb-2 font-medium">OpenClaw 检测</h3>
        <div className="grid gap-2">
          <CheckItem label="OpenClaw 状态" value="已安装" status="success" />
          <CheckItem label="当前版本" value="v2026.2.26" status="info" />
          <CheckItem label="安装路径" value="~/.openclaw" status="info" />
        </div>
      </div>

      {/* Repo Check */}
      <div>
        <h3 className="mb-2 font-medium">仓库更新检测</h3>
        <div className="grid gap-2">
          <CheckItem label="远程仓库" value="可达" status="success" />
          <CheckItem label="最新版本" value="v2026.3.1 (有更新)" status="warning" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline">重新检测</Button>
        <Button onClick={onNext}>下一步 →</Button>
      </div>
    </div>
  );
}

function SelectingStep({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<'lite' | 'pro' | 'docker'>('lite');

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">步骤 2: 选择安装版本</h2>

      <div className="grid gap-4">
        <VersionCard
          name="ClawPanel Lite"
          description="内置 OpenClaw，开箱即用"
          suitable="个人开发者、快速体验"
          size="~120MB"
          recommended
          selected={selected === 'lite'}
          onSelect={() => setSelected('lite')}
        />
        <VersionCard
          name="ClawPanel Pro"
          description="独立面板，支持外部接管 OpenClaw"
          suitable="企业运维、自定义环境"
          size="~80MB"
          selected={selected === 'pro'}
          onSelect={() => setSelected('pro')}
        />
        <VersionCard
          name="Docker 镜像"
          description="容器化部署，支持多架构"
          suitable="生产环境、集群部署"
          size="~120MB"
          selected={selected === 'docker'}
          onSelect={() => setSelected('docker')}
        />
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          ← 上一步
        </Button>
        <Button onClick={onNext}>下一步 →</Button>
      </div>
    </div>
  );
}

function InstallingStep({ progress }: { progress: number }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">步骤 3: 安装执行</h2>

      <div>
        <div className="mb-2 flex justify-between text-sm">
          <span>安装进度</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} />
      </div>

      <div className="rounded-md bg-muted p-4">
        <p className="text-sm text-muted-foreground">
          当前任务: {progress < 30 ? '创建安装目录...' : progress < 60 ? '下载二进制文件...' : '安装依赖...'}
        </p>
      </div>

      <div className="flex justify-center pt-4">
        <Button variant="outline" disabled>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          安装中...
        </Button>
      </div>
    </div>
  );
}

function StartingStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">步骤 4: 服务启动</h2>

      <div className="grid gap-2">
        <CheckItem label="Dashboard 服务" value="运行中 - PID: 12345" status="success" />
        <CheckItem label="OpenClaw Gateway" value="运行中 - PID: 12346" status="success" />
        <CheckItem label="Dashboard API" value="响应正常 - 延迟: 12ms" status="success" />
        <CheckItem label="Gateway WebSocket" value="连接成功 - 延迟: 8ms" status="success" />
      </div>

      <div className="rounded-md bg-success/10 p-4 text-success">
        ✅ 所有服务启动成功！
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={onNext}>下一步 →</Button>
      </div>
    </div>
  );
}

function ConfiguringStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">步骤 5: 初始配置</h2>

      <div className="space-y-4">
        <div>
          <h3 className="mb-2 font-medium">1. 创建管理员账户</h3>
          <div className="grid gap-2">
            <input
              type="password"
              placeholder="管理员密码"
              className="rounded-md border border-input bg-background px-3 py-2"
            />
            <input
              type="password"
              placeholder="确认密码"
              className="rounded-md border border-input bg-background px-3 py-2"
            />
          </div>
        </div>

        <div>
          <h3 className="mb-2 font-medium">2. 配置模型提供商 (可选)</h3>
          <div className="grid gap-2">
            <input
              type="text"
              placeholder="OpenAI API Key"
              className="rounded-md border border-input bg-background px-3 py-2"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={onNext}>完成安装 ✓</Button>
      </div>
    </div>
  );
}

function DoneStep() {
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success">
        <Check className="h-8 w-8 text-white" />
      </div>
      <h2 className="text-xl font-semibold">安装完成！</h2>
      <p className="text-muted-foreground">
        OpenClaw Dashboard 已成功安装并启动。
      </p>
      <Button>进入 Dashboard</Button>
    </div>
  );
}

function CheckItem({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: 'success' | 'warning' | 'error' | 'info';
}) {
  return (
    <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{value}</span>
        <Circle
          className={cn(
            'h-2 w-2',
            status === 'success' && 'fill-success text-success',
            status === 'warning' && 'fill-warning text-warning',
            status === 'error' && 'fill-error text-error',
            status === 'info' && 'fill-info text-info'
          )}
        />
      </div>
    </div>
  );
}

function VersionCard({
  name,
  description,
  suitable,
  size,
  recommended,
  selected,
  onSelect,
}: {
  name: string;
  description: string;
  suitable: string;
  size: string;
  recommended?: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'cursor-pointer rounded-md border p-4 transition-colors',
        selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Circle
            className={cn(
              'h-4 w-4',
              selected ? 'fill-primary text-primary' : 'fill-muted text-muted'
            )}
          />
          <span className="font-medium">{name}</span>
        </div>
        {recommended && (
          <span className="rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground">
            推荐
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <p className="mt-1 text-xs text-muted-foreground">适合: {suitable}</p>
      <p className="mt-1 text-xs text-muted-foreground">大小: {size}</p>
    </div>
  );
}

function simulateInstall(
  setProgress: (p: number) => void,
  onComplete: () => void
) {
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      setTimeout(onComplete, 500);
    }
    setProgress(Math.round(progress));
  }, 200);
}
