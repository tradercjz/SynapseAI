// src/store/workspaceStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Node, Edge } from 'reactflow';
import { v4 as uuidv4 } from 'uuid';
import { NodeData } from '../types';
import { Message } from '../agent'; 

export interface Workspace {
  id: string;
  name: string;
  nodes: Node<NodeData>[];
  edges: Edge[];
  lastModified: number;
  codingConversation: Message[];
}

interface WorkspaceState {
  workspaces: Record<string, Workspace>;
  activeWorkspaceId: string | null;
  
  // Actions
  actions: {
    createWorkspace: (name: string) => void;
    switchWorkspace: (id: string) => void;
    deleteWorkspace: (id: string) => void;
    updateActiveWorkspaceGraph: (graph: { nodes: Node<NodeData>[], edges: Edge[] }) => void;
    addMessageToCodingConversation: (message: Message) => void;
    updateLastMessageInCodingConversation: (updateFn: (lastMessage: Message) => Message) => void;
    clearCodingConversation: () => void;
  }
}

// Helper function to create a default workspace
const createDefaultWorkspace = (): Workspace => ({
  id: uuidv4(),
  name: 'Initial Workspace',
  nodes: [],
  edges: [],
  lastModified: Date.now(),
  codingConversation: [],
});

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: {},
      activeWorkspaceId: null,

      actions: {
        createWorkspace: (name) => {
          const newWorkspace: Workspace = {
            id: uuidv4(),
            name,
            nodes: [],
            edges: [],
            lastModified: Date.now(),
            codingConversation: [],
          };
          set((state) => ({
            workspaces: {
              ...state.workspaces,
              [newWorkspace.id]: newWorkspace,
            },
            activeWorkspaceId: newWorkspace.id, // Automatically switch to the new one
          }));
        },

        switchWorkspace: (id) => {
          if (get().workspaces[id]) {
            set({ activeWorkspaceId: id });
          }
        },
        
        deleteWorkspace: (id) => {
            const currentWorkspaces = { ...get().workspaces };
            delete currentWorkspaces[id];
            
            let nextActiveId = get().activeWorkspaceId;
            // If we deleted the active workspace, find a new one
            if (nextActiveId === id) {
                const remainingIds = Object.keys(currentWorkspaces);
                nextActiveId = remainingIds.length > 0 ? remainingIds[0] : null;
            }

            set({ workspaces: currentWorkspaces, activeWorkspaceId: nextActiveId });
        },

        updateActiveWorkspaceGraph: ({ nodes, edges }) => {
          const activeId = get().activeWorkspaceId;
          if (!activeId) return;

          set((state) => ({
            workspaces: {
              ...state.workspaces,
              [activeId]: {
                ...state.workspaces[activeId],
                nodes,
                edges,
                lastModified: Date.now(),
              },
            },
          }));
        },
           addMessageToCodingConversation: (message) => {
          const activeId = get().activeWorkspaceId;
          if (!activeId) return;
          set((state) => ({
            workspaces: {
              ...state.workspaces,
              [activeId]: {
                ...state.workspaces[activeId],
                codingConversation: [...state.workspaces[activeId].codingConversation, message],
              },
            },
          }));
        },

        updateLastMessageInCodingConversation: (updateFn) => {
            const activeId = get().activeWorkspaceId;
            if (!activeId) return;
            set((state) => {
                const activeWs = state.workspaces[activeId];
                const conversation = activeWs.codingConversation;
                if (conversation.length === 0) return state; // 如果没有消息，则不执行任何操作

                const lastMessage = conversation[conversation.length - 1];
                const updatedMessage = updateFn(lastMessage);

                return {
                    workspaces: {
                        ...state.workspaces,
                        [activeId]: {
                            ...activeWs,
                            codingConversation: [...conversation.slice(0, -1), updatedMessage],
                        },
                    },
                };
            });
        },

        clearCodingConversation: () => {
          const activeId = get().activeWorkspaceId;
          if (!activeId) return;
           set((state) => ({
            workspaces: {
              ...state.workspaces,
              [activeId]: {
                ...state.workspaces[activeId],
                codingConversation: [],
              },
            },
          }));
        }
      }
    }),
    {
      name: 'headai-workspaces-storage',
      partialize: (state) => ({
        workspaces: state.workspaces,
        activeWorkspaceId: state.activeWorkspaceId,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (state) {
            if (Object.keys(state.workspaces).length === 0) {
                const defaultWorkspace = createDefaultWorkspace();
                state.workspaces = { [defaultWorkspace.id]: defaultWorkspace };
                state.activeWorkspaceId = defaultWorkspace.id;
            }
            else if (!state.activeWorkspaceId || !state.workspaces[state.activeWorkspaceId]) {
                state.activeWorkspaceId = Object.keys(state.workspaces)[0];
            }
            // 确保旧版工作区数据也能兼容
            for (const wsId in state.workspaces) {
              if (!state.workspaces[wsId].codingConversation) {
                state.workspaces[wsId].codingConversation = [];
              }
            }
        }
      }
    }
  )
);