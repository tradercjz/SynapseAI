// src/CustomNode.tsx
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import type { NodeData } from './types';
import AgentNodeContent from './AgentNodeContent'; // 引入新组件

const CustomNode: React.FC<NodeProps<NodeData>> = ({ data, selected }) => {
  return (
    <div className="custom-node">
      <Handle type="target" position={Position.Top} />
      
      <div className="custom-node-label">{data.label}</div>
      
      {/* 如果有 agentResponse，则渲染它 */}
      {data.agentResponse && <AgentNodeContent content={data.agentResponse} />}

      {/* 如果正在加载，显示一个提示 */}
      {data.isLoading && <div className="loading-indicator">Agent is working...</div>}

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default memo(CustomNode);