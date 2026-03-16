import { Routes as RouterRoutes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { DashboardPage } from '@/pages/Dashboard';
import { InstallWizard } from '@/pages/Install/InstallWizard';
import { UpdateManager } from '@/pages/Install/UpdateManager';
import { ModelsPage } from '@/pages/Config/Models';
import { ChannelsConfigPage } from '@/pages/Config/Channels';
import { AgentsPage } from '@/pages/Config/Agents';
import { BindingsPage } from '@/pages/Config/Bindings';
import { ToolsPage } from '@/pages/Config/Tools';
import { HealthPage } from '@/pages/Monitor/Health';
import { SessionsPage } from '@/pages/Monitor/Sessions';
import { MemoryPage } from '@/pages/Monitor/Memory';
import { SubagentsPage } from '@/pages/Monitor/Subagents';
import { LogsPage } from '@/pages/Monitor/Logs';
import { ChannelsManagePage } from '@/pages/Channels';
import { SkillsPage } from '@/pages/Skills';
import { SettingsPage } from '@/pages/Settings';

export function Routes() {
  return (
    <RouterRoutes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        
        {/* 一键部署 */}
        <Route path="install">
          <Route path="wizard" element={<InstallWizard />} />
          <Route path="update" element={<UpdateManager />} />
        </Route>
        
        {/* 配置中心 */}
        <Route path="config">
          <Route path="models" element={<ModelsPage />} />
          <Route path="channels" element={<ChannelsConfigPage />} />
          <Route path="agents" element={<AgentsPage />} />
          <Route path="bindings" element={<BindingsPage />} />
          <Route path="tools" element={<ToolsPage />} />
        </Route>
        
        {/* 监控中心 */}
        <Route path="monitor">
          <Route path="health" element={<HealthPage />} />
          <Route path="sessions" element={<SessionsPage />} />
          <Route path="memory" element={<MemoryPage />} />
          <Route path="subagents" element={<SubagentsPage />} />
          <Route path="logs" element={<LogsPage />} />
        </Route>
        
        {/* 通道管理 */}
        <Route path="channels" element={<ChannelsManagePage />} />
        
        {/* 技能中心 */}
        <Route path="skills" element={<SkillsPage />} />
        
        {/* 系统设置 */}
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </RouterRoutes>
  );
}
