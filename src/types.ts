import { AggregatedAiMessage } from "./agent";

export type NodeType = 'USER_QUERY' | 'AI_RESPONSE' | 'INPUT';

// src/types.ts
export type NodeData = {
  id: string;
  label: string; // 用户的原始问题或想法
  nodeType: NodeType;
  
  // 新增: 用于存储和展示AI响应的核心数据结构
  agentResponse?: AggregatedAiMessage; 
  
  // 新增: 节点级别的加载状态
  isLoading?: boolean;

  taskStatus?: 'success' | 'error';

  // onAgentClick 签名保持不变
  onAgentClick?: (id: string, label: string) => void;
  onSubmit?:  (prompt: string, nodeId: string) => void;
};