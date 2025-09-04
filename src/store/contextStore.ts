// src/store/contextStore.ts
import { create } from 'zustand';

// A simplified interface for our environment objects
export interface Environment {
  id: string;
  // In a real app, you'd have more properties like name, status, etc.
  // For now, the ID is what matters.
}

interface ContextState {
  selectedEnvironment: Environment | null;
  selectEnvironment: (env: Environment | null) => void;
}

// Create the store
export const useContextStore = create<ContextState>((set) => ({
  selectedEnvironment: null,
  selectEnvironment: (env) => set({ selectedEnvironment: env }),
}));