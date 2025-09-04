// src/CustomNode.tsx
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import type { NodeData } from './types';

const CustomNode: React.FC<NodeProps<NodeData>> = ({ data, selected }) => {
  return (
    // Add a class if the node has content, for potential future styling
    <div className={`custom-node ${data.content ? 'has-content' : ''}`}>
      <Handle type="target" position={Position.Top} />
      
      <div>
        <div className="custom-node-label">{data.label}</div>
        {/* ADDED: Conditionally render the content block */}
        {data.content && (
          <pre className="custom-node-content">{data.content}</pre>
        )}
      </div>

      {selected && (
        <button 
          className="agent-button" 
          onClick={() => data.onAgentClick(data.id, data.label)}
        >
          ✨ Ask Agent
        </button>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default memo(CustomNode);