// src/types.ts
export type NodeData = {
  id: string;
  label: string;
  content?: string; // ADDED: Optional content for AI responses
  onAgentClick: (id: string, label: string) => void;
};