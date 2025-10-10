// src/store/uiStore.ts
import {create} from 'zustand';
import type { Environment } from './contextStore';

// Defines the possible tools that can be active in the sidebar.
export type ActiveTool = 'ENVIRONMENTS' | 'USER_SPACE' | 'MARKETPLACE' | null;
export type AppMode = 'CHAT' | 'CODING';

interface UIState {
  activeTool: ActiveTool;
  workspaceMenuAnchorEl: HTMLElement | null; 
  activeCodeServerEnv: Environment | null;
  activeMode: AppMode;
  toggleActiveTool: (tool: ActiveTool) => void;
  setWorkspaceMenuAnchorEl: (el: HTMLElement | null) => void; 
  setActiveCodeServerEnv: (env: Environment | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Let's start with the Environments panel open by default.
  activeTool: 'ENVIRONMENTS', 
  workspaceMenuAnchorEl: null,
  activeCodeServerEnv: null,
  activeMode: 'CHAT',


  // This function allows toggling a panel open and closed.
  toggleActiveTool: (tool) => set((state) => ({
    activeTool: state.activeTool === tool ? null : tool,
  })),

  setWorkspaceMenuAnchorEl: (el) => set({ workspaceMenuAnchorEl: el }),
  setActiveCodeServerEnv: (env) => set({ activeCodeServerEnv: env }),
  setActiveMode: (mode: any) => set({ activeMode: mode }),
}));