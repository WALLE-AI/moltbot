import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Star, Settings, RefreshCw, Trash2, Search, Store, Sliders } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InstalledSkill {
  id: string;
  name: string;
  version: string;
  installedAt: string;
  source: string;
  description: string;
  enabled: boolean;
}

interface MarketSkill {
  id: string;
  name: string;
  description: string;
  rating: number;
  reviews: number;
}

const mockInstalledSkills: InstalledSkill[] = [
  { id: 'memory-tools', name: 'memory-tools', version: '1.2.0', installedAt: '2026-03-01', source: 'ClawHub', description: '记忆搜索、存储和管理工具', enabled: true },
  { id: 'web-search', name: 'web-search', version: '2.0.1', installedAt: '2026-02-15', source: 'ClawHub', description: '网络搜索工具，支持多搜索引擎', enabled: true },
  { id: 'code-interpreter', name: 'code-interpreter', version: '1.0.0', installedAt: '2026-01-20', source: '本地', description: '代码执行和图表生成', enabled: false },
  { id: 'file-manager', name: 'file-manager', version: '1.5.0', installedAt: '2026-02-01', source: 'ClawHub', description: '文件读写和管理操作', enabled: true },
  { id: 'shell-exec', name: 'shell-exec', version: '2.1.0', installedAt: '2026-01-15', source: '本地', description: 'Shell 命令执行工具', enabled: true },
];

const mockMarketSkills: MarketSkill[] = [
  { id: 'image-gen', name: 'image-gen', description: '图像生成', rating: 4.8, reviews: 123 },
  { id: 'data-analysis', name: 'data-analysis', description: '数据分析', rating: 4.6, reviews: 89 },
  { id: 'doc-writer', name: 'doc-writer', description: '文档写作', rating: 4.5, reviews: 56 },
  { id: 'calendar', name: 'calendar', description: '日历管理', rating: 4.7, reviews: 45 },
  { id: 'email-assist', name: 'email-assist', description: '邮件助手', rating: 4.4, reviews: 34 },
  { id: 'translation', name: 'translation', description: '翻译工具', rating: 4.3, reviews: 28 },
];

export function SkillsPage() {
  const [installedSkills] = useState<InstalledSkill[]>(mockInstalledSkills);
  const [marketSkills] = useState<MarketSkill[]>(mockMarketSkills);
  const [activeTab, setActiveTab] = useState<'installed' | 'market'>('installed');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredMarketSkills = marketSkills.filter((s) => {
    if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-semibold">技能中心</h1>
          <p className="text-sm text-muted-foreground">管理和发现技能</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'installed' ? 'default' : 'outline'}
            onClick={() => setActiveTab('installed')}
          >
            <Package className="mr-2 h-4 w-4" />
            已安装
          </Button>
          <Button
            variant={activeTab === 'market' ? 'default' : 'outline'}
            onClick={() => setActiveTab('market')}
          >
            <Store className="mr-2 h-4 w-4" />
            ClawHub 市场
          </Button>
          <Button variant="outline">
            <Sliders className="mr-2 h-4 w-4" />
            设置
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'installed' ? (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground mb-2">
              已安装技能 ({installedSkills.length})
            </div>
            {installedSkills.map((skill) => (
              <Card key={skill.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{skill.name}</span>
                        <span className={cn(
                          'rounded px-2 py-0.5 text-xs',
                          skill.enabled ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                        )}>
                          {skill.enabled ? '启用' : '禁用'}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mb-1">
                        版本: {skill.version} | 安装: {skill.installedAt} | 来源: {skill.source}
                      </div>
                      <div className="text-sm">{skill.description}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Settings className="mr-2 h-4 w-4" />
                      配置
                    </Button>
                    <Button variant="outline" size="sm">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      更新
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      卸载
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Search Bar */}
            <Card className="p-3">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索技能..."
                    className="h-8 flex-1 rounded-md border bg-background px-3 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">分类:</span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="h-8 rounded-md border bg-background px-2 text-sm"
                  >
                    <option value="all">全部</option>
                    <option value="productivity">生产力</option>
                    <option value="development">开发</option>
                    <option value="communication">沟通</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Market Skills Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMarketSkills.map((skill) => (
                <Card key={skill.id} className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-semibold">{skill.name}</div>
                      <div className="text-sm text-muted-foreground">{skill.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4 text-warning fill-warning" />
                      <span>{skill.rating}</span>
                      <span className="text-muted-foreground">({skill.reviews})</span>
                    </div>
                    <Button size="sm">安装</Button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                显示 1-{filteredMarketSkills.length} / 共 45 个技能
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>{'<'}</Button>
                <span className="text-sm">1</span>
                <Button variant="outline" size="sm">{'>'}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
