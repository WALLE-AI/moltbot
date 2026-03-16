import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Circle, Square, Check, Clock, Users, Inbox, CheckCircle } from 'lucide-react';

interface Task {
  runId: string;
  parentSession: string;
  task: string;
  status: 'running' | 'waiting' | 'completed';
  runtime: string;
}

interface TaskNode {
  id: string;
  task: string;
  status: 'running' | 'waiting' | 'completed';
  children?: TaskNode[];
}

const mockTasks: Task[] = [
  { runId: 'run_abc123', parentSession: 'main:telegram', task: '分析代码', status: 'running', runtime: '00:02:34' },
  { runId: 'run_def456', parentSession: 'main:discord', task: '搜索文档', status: 'running', runtime: '00:01:12' },
  { runId: 'run_ghi789', parentSession: 'work:qq', task: '生成报告', status: 'waiting', runtime: '00:00:00' },
];

const mockTaskTree: TaskNode = {
  id: 'main:telegram:alice',
  task: 'main:telegram:alice',
  status: 'running',
  children: [
    {
      id: 'run_abc123',
      task: '分析代码',
      status: 'running',
      children: [
        { id: 'run_jkl012', task: '代码审查', status: 'completed' },
      ],
    },
    { id: 'run_mno345', task: '生成总结', status: 'waiting' },
  ],
};

export function SubagentsPage() {
  const [tasks] = useState<Task[]>(mockTasks);
  const [taskTree] = useState<TaskNode>(mockTaskTree);

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'running':
        return <Circle className="h-4 w-4 fill-primary text-primary animate-pulse" />;
      case 'waiting':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'completed':
        return <Check className="h-4 w-4 text-success" />;
    }
  };

  const getStatusLabel = (status: Task['status']) => {
    switch (status) {
      case 'running':
        return '运行';
      case 'waiting':
        return '等待';
      case 'completed':
        return '完成';
    }
  };

  const renderTreeNode = (node: TaskNode, depth = 0) => {
    const indent = depth * 24;
    const isRoot = depth === 0;

    return (
      <div key={node.id}>
        <div
          className="flex items-center gap-2 py-1.5 px-2 hover:bg-muted/30 rounded"
          style={{ paddingLeft: indent + 8 }}
        >
          {isRoot ? (
            <span className="font-mono text-sm">{node.task}</span>
          ) : (
            <>
              <span className="text-muted-foreground">├──</span>
              <span className="font-mono text-sm">{node.id}</span>
              <span className="text-sm text-muted-foreground">({node.task})</span>
              {getStatusIcon(node.status)}
              <span className="text-sm">
                {node.status === 'running' ? '运行中' : node.status === 'waiting' ? '等待中' : '完成'}
              </span>
            </>
          )}
        </div>
        {node.children?.map((child) => renderTreeNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-semibold">协作监控</h1>
          <p className="text-sm text-muted-foreground">多智能体协作任务监控</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-4">
        {/* Status Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">活跃子智能体</span>
            </div>
            <div className="text-3xl font-bold">3</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Inbox className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">待处理任务</span>
            </div>
            <div className="text-3xl font-bold">2</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">已完成任务</span>
            </div>
            <div className="text-3xl font-bold">156</div>
          </Card>
        </div>

        {/* Active Tasks */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">活跃任务</h2>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">Run ID</th>
                  <th className="px-4 py-2 text-left font-medium">父会话</th>
                  <th className="px-4 py-2 text-left font-medium">任务</th>
                  <th className="px-4 py-2 text-left font-medium">状态</th>
                  <th className="px-4 py-2 text-left font-medium">运行时间</th>
                  <th className="px-4 py-2 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.runId} className="border-b last:border-0">
                    <td className="px-4 py-2 font-mono">{task.runId}</td>
                    <td className="px-4 py-2 font-mono">{task.parentSession}</td>
                    <td className="px-4 py-2">{task.task}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        {getStatusIcon(task.status)}
                        <span>{getStatusLabel(task.status)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 font-mono text-muted-foreground">{task.runtime}</td>
                    <td className="px-4 py-2 text-right">
                      {task.status === 'running' && (
                        <Button variant="ghost" size="sm" className="text-destructive">
                          <Square className="mr-2 h-4 w-4" />
                          终止
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Task Hierarchy */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">任务层级</h2>
          <div className="rounded-md border bg-muted/20 p-3 font-mono text-sm">
            {renderTreeNode(taskTree)}
          </div>
        </Card>
      </div>
    </div>
  );
}
