import { Circle } from 'lucide-react';

export function Footer() {
  return (
    <footer className="flex h-8 items-center justify-between border-t bg-card px-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        {/* Gateway Status */}
        <div className="flex items-center gap-1.5">
          <Circle className="h-2 w-2 fill-success text-success" />
          <span>Gateway 运行中</span>
        </div>
        
        {/* Channels Status */}
        <div className="flex items-center gap-1.5">
          <span>5/8 通道在线</span>
        </div>
        
        {/* Resource Usage */}
        <div className="flex items-center gap-1.5">
          <span>内存 128MB</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>CPU 12%</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <span>v2026.2.26</span>
      </div>
    </footer>
  );
}
