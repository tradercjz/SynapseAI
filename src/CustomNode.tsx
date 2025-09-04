// src/CustomNode.tsx
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import type { NodeData } from './types';
import AgentNodeContent from './AgentNodeContent'; // 引入新组件

const CustomNode: React.FC<NodeProps<NodeData>> = ({ data }) => {
  const isAI = data.nodeType === 'AI_RESPONSE';

  return (
    <div className="custom-node">
      <Handle type="target" position={Position.Top} />
      
      <div className="custom-node-label">{data.label}</div>
      
      {isAI && data.agentResponse && <AgentNodeContent content={data.agentResponse} />}
      {isAI && data.isLoading && <div className="loading-indicator">Agent is working...</div>}
      
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default memo(CustomNode);