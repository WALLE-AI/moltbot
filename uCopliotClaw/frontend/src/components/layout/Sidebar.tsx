import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Download,
  Settings2,
  Activity,
  Radio,
  Puzzle,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  path?: string;
  icon: React.ElementType;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    label: '概览',
    path: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: '一键部署',
    icon: Download,
    children: [
      { label: '安装向导', path: '/install/wizard', icon: Download },
      { label: '更新管理', path: '/install/update', icon: Download },
    ],
  },
  {
    label: '配置中心',
    icon: Settings2,
    children: [
      { label: '模型配置', path: '/config/models', icon: Settings2 },
      { label: '通道配置', path: '/config/channels', icon: Settings2 },
      { label: '多智能体', path: '/config/agents', icon: Settings2 },
      { label: '路由绑定', path: '/config/bindings', icon: Settings2 },
      { label: '工具配置', path: '/config/tools', icon: Settings2 },
    ],
  },
  {
    label: '监控中心',
    icon: Activity,
    children: [
      { label: '系统健康', path: '/monitor/health', icon: Activity },
      { label: '会话监控', path: '/monitor/sessions', icon: Activity },
      { label: '记忆状态', path: '/monitor/memory', icon: Activity },
      { label: '协作监控', path: '/monitor/subagents', icon: Activity },
      { label: '日志查看', path: '/monitor/logs', icon: Activity },
    ],
  },
  {
    label: '通道管理',
    path: '/channels',
    icon: Radio,
  },
  {
    label: '技能中心',
    path: '/skills',
    icon: Puzzle,
  },
  {
    label: '系统设置',
    path: '/settings',
    icon: Settings,
  },
];

export function Sidebar() {
  return (
    <aside className="flex h-full w-[200px] flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-12 items-center border-b px-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-primary" />
          <span className="font-semibold">OpenClaw</span>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 overflow-auto py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => (
            <NavItem key={item.label} item={item} />
          ))}
        </ul>
      </nav>
    </aside>
  );
}

function NavItem({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const [isOpen, setIsOpen] = useState(depth === 0);
  const hasChildren = item.children && item.children.length > 0;
  
  if (hasChildren) {
    return (
      <li>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            depth > 0 && 'pl-6'
          )}
        >
          <div className="flex items-center gap-2">
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </div>
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        {isOpen && (
          <ul className="mt-1 space-y-1">
            {item.children!.map((child) => (
              <NavItem key={child.path} item={child} depth={depth + 1} />
            ))}
          </ul>
        )}
      </li>
    );
  }
  
  return (
    <li>
      <NavLink
        to={item.path!}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
            isActive
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            depth > 0 && 'pl-6'
          )
        }
      >
        <item.icon className="h-4 w-4" />
        <span>{item.label}</span>
      </NavLink>
    </li>
  );
}
