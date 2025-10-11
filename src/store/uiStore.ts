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
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
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

  isLoginModalOpen: false,
  openLoginModal: () => set({ isLoginModalOpen: true }),
  closeLoginModal: () => set({ isLoginModalOpen: false }),

  // This function allows toggling a panel open and closed.
  toggleActiveTool: (tool) => set((state) => ({
    activeTool: state.activeTool === tool ? null : tool,
  })),

  setWorkspaceMenuAnchorEl: (el) => set({ workspaceMenuAnchorEl: el }),
  setActiveCodeServerEnv: (env) => set({ activeCodeServerEnv: env }),
  setActiveMode: (mode: AppMode) => set((state) => {
    // 如果目标模式是“编码模式”，则强制关闭所有侧边面板
    if (mode === 'CODING') {
      return { activeMode: mode, activeTool: null };
    }
    
    // 如果目标模式是“对话模式”，则恢复默认展开环境面板
    if (mode === 'CHAT') {
      return { activeMode: mode, activeTool: 'ENVIRONMENTS' };
    }

    // 其他情况（为了代码健壮性），只切换模式
    return { activeMode: mode };
  }),
}));