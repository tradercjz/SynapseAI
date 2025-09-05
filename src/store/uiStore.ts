// src/store/uiStore.ts
import {create} from 'zustand';

// Defines the possible tools that can be active in the sidebar.
export type ActiveTool = 'ENVIRONMENTS' | 'USER_SPACE' | 'MARKETPLACE' | null;

interface UIState {
  activeTool: ActiveTool;
  workspaceMenuAnchorEl: HTMLElement | null; 
  toggleActiveTool: (tool: ActiveTool) => void;
  setWorkspaceMenuAnchorEl: (el: HTMLElement | null) => void; 
}

export const useUIStore = create<UIState>((set) => ({
  // Let's start with the Environments panel open by default.
  activeTool: 'ENVIRONMENTS', 
  workspaceMenuAnchorEl: null,

  // This function allows toggling a panel open and closed.
  toggleActiveTool: (tool) => set((state) => ({
    activeTool: state.activeTool === tool ? null : tool,
  })),

  setWorkspaceMenuAnchorEl: (el) => set({ workspaceMenuAnchorEl: el }),
}));