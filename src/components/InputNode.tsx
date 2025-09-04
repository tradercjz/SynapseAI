// src/components/InputNode.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { TextField, Paper } from '@mui/material';
import { NodeData } from '../types';

interface InputNodeProps extends NodeProps<NodeData> {
  data: NodeData & {
    onSubmit: (prompt: string, nodeId: string) => void;
  }
}

const InputNode: React.FC<InputNodeProps> = ({ data, id }) => {
  const [prompt, setPrompt] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus when the node is created
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (prompt.trim()) {
        data.onSubmit(prompt.trim(), id);
      }
    }
  };

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        padding: '10px 15px', 
        borderRadius: '8px', 
        border: '2px dashed #007bff',
        background: '#f0f7ff'
      }}
    >
      <Handle type="target" position={Position.Top} />
      <TextField
        inputRef={inputRef}
        fullWidth
        variant="standard" // Use a lighter variant
        placeholder="Type your question..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        InputProps={{ disableUnderline: true }} // Clean look
      />
      {/* Input nodes don't have a source handle initially */}
    </Paper>
  );
};

export default InputNode;