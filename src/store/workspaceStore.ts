// src/store/workspaceStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Node, Edge } from 'reactflow';
import { v4 as uuidv4 } from 'uuid';
import { NodeData } from '../types';

export interface Workspace {
  id: string;
  name: string;
  nodes: Node<NodeData>[];
  edges: Edge[];
  lastModified: number;
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
  }
}

// Helper function to create a default workspace
const createDefaultWorkspace = (): Workspace => ({
  id: uuidv4(),
  name: 'Initial Workspace',
  nodes: [],
  edges: [],
  lastModified: Date.now(),
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
      }
    }),
    {
      name: 'headai-workspaces-storage', // The key in localStorage
      // We only persist the data, not the actions
      partialize: (state) => ({
        workspaces: state.workspaces,
        activeWorkspaceId: state.activeWorkspaceId,
      }),
      // This function runs after the state is loaded from storage
      onRehydrateStorage: () => (state, error) => {
        if (state) {
            // If after loading, there are no workspaces, create a default one.
            if (Object.keys(state.workspaces).length === 0) {
                const defaultWorkspace = createDefaultWorkspace();
                state.workspaces = { [defaultWorkspace.id]: defaultWorkspace };
                state.activeWorkspaceId = defaultWorkspace.id;
            }
            // If there's no active ID set, default to the first one
            else if (!state.activeWorkspaceId || !state.workspaces[state.activeWorkspaceId]) {
                state.activeWorkspaceId = Object.keys(state.workspaces)[0];
            }
        }
      }
    }
  )
);