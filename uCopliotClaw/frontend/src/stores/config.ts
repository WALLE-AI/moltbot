import { create } from 'zustand';
import type { OpenClawConfig } from '@/types';

interface ConfigState {
  config: OpenClawConfig | null;
  isLoading: boolean;
  error: string | null;
  isDirty: boolean;
  setConfig: (config: OpenClawConfig) => void;
  updateConfig: (path: string, value: unknown) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  markDirty: (dirty: boolean) => void;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: null,
  isLoading: false,
  error: null,
  isDirty: false,
  setConfig: (config) => set({ config, isDirty: false }),
  updateConfig: (path, value) => {
    const current = get().config;
    if (!current) return;
    // Simple path-based update (e.g., "models.providers.0.apiKey")
    const keys = path.split('.');
    const updated = { ...current };
    let obj: Record<string, unknown> = updated;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (key && obj[key] !== undefined) {
        obj[key] = { ...(obj[key] as Record<string, unknown>) };
        obj = obj[key] as Record<string, unknown>;
      }
    }
    const lastKey = keys[keys.length - 1];
    if (lastKey) {
      obj[lastKey] = value;
    }
    set({ config: updated, isDirty: true });
  },
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  markDirty: (isDirty) => set({ isDirty }),
}));
