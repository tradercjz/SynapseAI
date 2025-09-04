// src/store/contextStore.ts
import {create} from 'zustand';

export interface Environment {
  id: string;
  [key: string]: any; // Allow other properties
}

// Define the shape of our schema data
interface TableColumn {
  name: string;
  type: string;
}
export interface DbSchema {
  [dbName: string]: {
    [tableName: string]: TableColumn[];
  };
}

interface ContextState {
  selectedEnvironment: Environment | null;
  dbSchema: DbSchema | null;
  selectedTables: Record<string, boolean>; // e.g., { "dfs://db1.tb1": true }
  
  selectEnvironment: (env: Environment | null) => void;
  setDbSchema: (schema: DbSchema | null) => void;
  toggleTableSelection: (tableKey: string) => void;
  clearSelections: () => void;
}

export const useContextStore = create<ContextState>((set) => ({
  selectedEnvironment: null,
  dbSchema: null,
  selectedTables: {},

  selectEnvironment: (env) => set({ 
    selectedEnvironment: env, 
    dbSchema: null, // Clear old schema when environment changes
    selectedTables: {} // Clear old selections
  }),

  setDbSchema: (schema) => set({ dbSchema: schema }),

  toggleTableSelection: (tableKey) => set((state) => ({
    selectedTables: {
      ...state.selectedTables,
      [tableKey]: !state.selectedTables[tableKey],
    }
  })),

  clearSelections: () => set({ selectedTables: {} }),
}));