import { create } from 'zustand';
import type { GatewayHealth, GatewayStatus, ChannelStatus } from '@/types';

interface MonitorState {
  health: GatewayHealth | null;
  status: GatewayStatus | null;
  channels: ChannelStatus[];
  isLoading: boolean;
  error: string | null;
  setHealth: (health: GatewayHealth) => void;
  setStatus: (status: GatewayStatus) => void;
  setChannels: (channels: ChannelStatus[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useMonitorStore = create<MonitorState>((set) => ({
  health: null,
  status: null,
  channels: [],
  isLoading: false,
  error: null,
  setHealth: (health) => set({ health }),
  setStatus: (status) => set({ status, channels: status.channels }),
  setChannels: (channels) => set({ channels }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
