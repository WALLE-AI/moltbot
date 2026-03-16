import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  GatewayHealth,
  GatewayStatus,
  OpenClawConfig,
  Session,
  SessionUsage,
  MemoryStatus,
  SubagentRunRecord,
  UpdateInfo,
  SystemInfo,
} from '@/types';

// Health & Status
export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => api.get<GatewayHealth>('/health'),
    refetchInterval: 30000, // 30 seconds
  });
}

export function useStatus() {
  return useQuery({
    queryKey: ['status'],
    queryFn: () => api.get<GatewayStatus>('/status'),
    refetchInterval: 10000, // 10 seconds
  });
}

// Config
export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: () => api.get<OpenClawConfig>('/config'),
  });
}

export function useUpdateConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: OpenClawConfig) => api.put('/config', config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
    },
  });
}

export function usePatchConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ path, value }: { path: string; value: unknown }) =>
      api.patch('/config', { path, value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
    },
  });
}

// Sessions
export function useSessions(params?: {
  agent?: string;
  channel?: string;
  limit?: number;
  offset?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.agent) searchParams.set('agent', params.agent);
  if (params?.channel) searchParams.set('channel', params.channel);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));

  const query = searchParams.toString();
  return useQuery({
    queryKey: ['sessions', params],
    queryFn: () => api.get<{ sessions: Session[]; total: number }>(`/sessions${query ? `?${query}` : ''}`),
  });
}

export function useSessionUsage() {
  return useQuery({
    queryKey: ['sessions', 'usage'],
    queryFn: () => api.get<SessionUsage>('/sessions/usage'),
  });
}

// Memory
export function useMemoryStatus(agentId?: string) {
  return useQuery({
    queryKey: ['memory', 'status', agentId],
    queryFn: () => api.get<MemoryStatus>(`/memory/status${agentId ? `?agent=${agentId}` : ''}`),
    refetchInterval: 60000, // 1 minute
  });
}

// Subagents
export function useSubagentRuns(params?: {
  status?: 'pending' | 'running' | 'completed' | 'failed';
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const query = searchParams.toString();
  return useQuery({
    queryKey: ['subagents', params],
    queryFn: () => api.get<{ runs: SubagentRunRecord[]; total: number }>(`/subagents${query ? `?${query}` : ''}`),
    refetchInterval: 5000, // 5 seconds
  });
}

// Install/Update
export function useSystemInfo() {
  return useQuery({
    queryKey: ['system', 'info'],
    queryFn: () => api.get<SystemInfo>('/system/info'),
  });
}

export function useUpdateCheck() {
  return useQuery({
    queryKey: ['update', 'check'],
    queryFn: () => api.get<UpdateInfo>('/update/check'),
    refetchInterval: 3600000, // 1 hour
  });
}

export function useStartUpdate() {
  return useMutation({
    mutationFn: () => api.post('/update/start'),
  });
}

// Channels
export function useChannelLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (channelId: string) => api.post(`/channels/${channelId}/logout`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status'] });
    },
  });
}
