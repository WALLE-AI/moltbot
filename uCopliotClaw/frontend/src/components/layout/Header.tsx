import { Bell, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  return (
    <header className="flex h-12 items-center justify-between border-b bg-card px-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">OpenClaw Dashboard</span>
      </div>
      
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Button variant="ghost" size="icon">
          <Bell className="h-4 w-4" />
        </Button>
        
        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <User className="h-4 w-4" />
              <span>Admin</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>我的账户</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>个人设置</DropdownMenuItem>
            <DropdownMenuItem>切换主题</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
