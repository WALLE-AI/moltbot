import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Plus, Edit, Trash2, Eye, ChevronDown, ChevronUp, X, Play, Check } from 'lucide-react';

interface BindingRule {
  id: string;
  comment: string;
  channel: string;
  sessionType: 'private' | 'group';
  targetId: string;
  agent: string;
  priority: number;
}

const mockRules: BindingRule[] = [
  {
    id: '1',
    comment: 'work-group',
    channel: 'QQ',
    sessionType: 'group',
    targetId: '123456',
    agent: 'work',
    priority: 1,
  },
  {
    id: '2',
    comment: 'discord-dev',
    channel: 'Discord',
    sessionType: 'group',
    targetId: 'dev',
    agent: 'main',
    priority: 2,
  },
  {
    id: '3',
    comment: 'telegram-admin',
    channel: 'Telegram',
    sessionType: 'private',
    targetId: 'admin',
    agent: 'admin',
    priority: 3,
  },
];

export function BindingsPage() {
  const [rules, setRules] = useState<BindingRule[]>(mockRules);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingRule, setEditingRule] = useState<BindingRule | null>(null);
  const [testInput, setTestInput] = useState('telegram:user:alice');
  const [testResult, setTestResult] = useState<{ matched: boolean; rule?: string; agent?: string } | null>(null);

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newRules = [...rules];
    const prev = newRules[index - 1]!;
    newRules[index - 1] = newRules[index]!;
    newRules[index] = prev;
    newRules.forEach((r, i) => (r.priority = i + 1));
    setRules(newRules);
  };

  const handleMoveDown = (index: number) => {
    if (index === rules.length - 1) return;
    const newRules = [...rules];
    const curr = newRules[index]!;
    newRules[index] = newRules[index + 1]!;
    newRules[index + 1] = curr;
    newRules.forEach((r, i) => (r.priority = i + 1));
    setRules(newRules);
  };

  const handleDelete = (id: string) => {
    console.log('Delete rule:', id);
  };

  const handleEdit = (rule: BindingRule) => {
    setEditingRule(rule);
    setShowDrawer(true);
  };

  const handleAdd = () => {
    setEditingRule(null);
    setShowDrawer(true);
  };

  const handleTest = () => {
    setTestResult({
      matched: true,
      rule: '默认路由',
      agent: 'main (默认 Agent)',
    });
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-semibold">路由绑定</h1>
          <p className="text-sm text-muted-foreground">配置消息路由绑定规则</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            添加规则
          </Button>
          <Button variant="outline">
            <Eye className="mr-2 h-4 w-4" />
            路由预览
          </Button>
          <Button variant="outline">测试</Button>
        </div>
      </div>

      {/* Rules Table */}
      <Card className="flex-1 overflow-auto p-4">
        <div className="mb-4 text-sm font-medium text-muted-foreground">绑定规则列表 (拖拽排序)</div>
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-sm">
              <th className="w-8 pb-3"></th>
              <th className="w-12 pb-3">#</th>
              <th className="w-40 pb-3">注释</th>
              <th className="pb-3">匹配条件</th>
              <th className="w-32 pb-3">目标 Agent</th>
              <th className="w-32 pb-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule, index) => (
              <tr key={rule.id} className="border-b">
                <td className="py-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </td>
                <td className="py-3 text-sm text-muted-foreground">{rule.priority}</td>
                <td className="py-3 text-sm font-medium">{rule.comment}</td>
                <td className="py-3 text-sm">
                  <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1">
                    {rule.channel} {rule.sessionType === 'group' ? '群' : '用户'} {rule.targetId}
                  </span>
                </td>
                <td className="py-3 text-sm font-mono">{rule.agent}</td>
                <td className="py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleMoveUp(index)} disabled={index === 0}>
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleMoveDown(index)} disabled={index === rules.length - 1}>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(rule)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(rule.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Route Preview */}
      <Card className="mt-4 p-4">
        <div className="mb-4 text-sm font-medium">路由预览</div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="mb-2 block text-sm text-muted-foreground">输入测试</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="telegram:user:alice"
                className="h-10 flex-1 rounded-md border bg-background px-3 text-sm font-mono"
              />
              <Button onClick={handleTest}>
                <Play className="mr-2 h-4 w-4" />
                模拟路由
              </Button>
            </div>
          </div>
          {testResult && (
            <div className="flex-1 rounded-md border bg-muted/30 p-4">
              <div className="mb-2 text-sm font-medium">匹配结果</div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span>规则: {testResult.rule}</span>
                </div>
                <div className="text-muted-foreground">
                  匹配: * → {testResult.agent}
                </div>
                <div className="text-xs text-muted-foreground">
                  原因: 未匹配任何特定规则，使用默认 Agent
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Rule Editor Drawer */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDrawer(false)} />
          <div className="relative z-10 h-full w-[480px] border-l bg-card shadow-xl">
            <div className="flex h-14 items-center justify-between border-b px-6">
              <h2 className="text-lg font-semibold">
                {editingRule ? '编辑绑定规则' : '添加绑定规则'}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowDrawer(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="h-[calc(100%-120px)] overflow-auto p-6">
              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="mb-4 font-medium">基本信息</h3>
                  <div className="grid gap-2">
                    <label className="text-sm text-muted-foreground">注释</label>
                    <input
                      type="text"
                      defaultValue={editingRule?.comment || ''}
                      placeholder="规则描述"
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                    />
                  </div>
                </div>

                {/* Match Conditions */}
                <div>
                  <h3 className="mb-4 font-medium">匹配条件</h3>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <label className="text-sm text-muted-foreground">通道</label>
                      <select
                        defaultValue={editingRule?.channel || 'Telegram'}
                        className="h-10 rounded-md border bg-background px-3 text-sm"
                      >
                        <option>Telegram</option>
                        <option>Discord</option>
                        <option>QQ</option>
                        <option>WhatsApp</option>
                        <option>飞书</option>
                        <option>钉钉</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm text-muted-foreground">会话类型</label>
                      <select
                        defaultValue={editingRule?.sessionType || 'private'}
                        className="h-10 rounded-md border bg-background px-3 text-sm"
                      >
                        <option value="private">私聊</option>
                        <option value="group">群聊</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm text-muted-foreground">目标 ID</label>
                      <input
                        type="text"
                        defaultValue={editingRule?.targetId || ''}
                        placeholder="用户ID 或 群组ID"
                        className="h-10 rounded-md border bg-background px-3 text-sm font-mono"
                      />
                    </div>
                    <Button variant="outline" size="sm" className="w-fit">
                      <Plus className="mr-2 h-4 w-4" />
                      添加条件
                    </Button>
                  </div>
                </div>

                {/* Target Agent */}
                <div>
                  <h3 className="mb-4 font-medium">目标 Agent</h3>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <label className="text-sm text-muted-foreground">Agent ID</label>
                      <select
                        defaultValue={editingRule?.agent || 'main'}
                        className="h-10 rounded-md border bg-background px-3 text-sm"
                      >
                        <option value="main">main</option>
                        <option value="work">work</option>
                        <option value="admin">admin</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm text-muted-foreground">优先级</label>
                      <select className="h-10 rounded-md border bg-background px-3 text-sm">
                        <option value="high">高</option>
                        <option value="medium">中</option>
                        <option value="low">低</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Role Filter */}
                <div>
                  <h3 className="mb-4 font-medium">角色过滤 (可选)</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="h-4 w-4 rounded border" />
                      <span className="text-sm">仅管理员</span>
                    </label>
                    <div className="grid gap-2">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="h-4 w-4 rounded border" />
                        <span className="text-sm">仅特定用户</span>
                      </label>
                      <input
                        type="text"
                        placeholder="user1,user2,..."
                        className="h-10 rounded-md border bg-background px-3 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-end gap-2 border-t bg-card p-4">
              <Button variant="outline" onClick={() => setShowDrawer(false)}>
                取消
              </Button>
              <Button>保存</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
