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

export interface UserFile {
  id: string; // A unique ID generated on the frontend
  name: string;
  type: string; // e.g., 'application/pdf', 'text/plain'
  content: string | null; // The extracted plain text content
  status: 'pending' | 'processing' | 'ready' | 'error';
  isAssociated: boolean; // Is this file currently active as context?
}

interface ContextState {
  selectedEnvironment: Environment | null;
  dbSchema: DbSchema | null;
  selectedTables: Record<string, boolean>; // e.g., { "dfs://db1.tb1": true }

  userFiles: UserFile[];
  
  selectEnvironment: (env: Environment | null) => void;
  setDbSchema: (schema: DbSchema | null) => void;
  toggleTableSelection: (tableKey: string) => void;
  clearSelections: () => void;

  addFile: (fileData: Omit<UserFile, 'content' | 'isAssociated'>) => void; // This will trigger the processing
  updateFileStatus: (id: string, status: UserFile['status'], content?: string) => void;
  toggleFileAssociation: (id:string) => void;
  removeFile: (id: string) => void;

  addProcessedFile: (file: UserFile) => void;
}

export const useContextStore = create<ContextState>((set) => ({
  selectedEnvironment: null,
  dbSchema: null,
  selectedTables: {},
  userFiles: [],

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

  addFile: (fileData: Omit<UserFile, 'content' | 'isAssociated'>) => {
    const newFile: UserFile = {
      ...fileData,
      content: null, // Default content
      isAssociated: false, // Default association
    };
    set(state => ({ userFiles: [...state.userFiles, newFile] }));
  },

  updateFileStatus: (id, status, content) => set(state => ({
    userFiles: state.userFiles.map(f => 
      f.id === id ? { ...f, status, content: content !== undefined ? content : f.content } : f
    )
  })),

  toggleFileAssociation: (id) => set(state => ({
    userFiles: state.userFiles.map(f =>
      f.id === id ? { ...f, isAssociated: !f.isAssociated } : f
    )
  })),

  removeFile: (id) => set(state => ({
    userFiles: state.userFiles.filter(f => f.id !== id)
  })),

  addProcessedFile: (file) => set(state => ({ userFiles: [...state.userFiles, file] })),
}));