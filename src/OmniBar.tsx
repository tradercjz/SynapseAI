// src/OmniBar.tsx
import React, { useState } from 'react';
import { Paper, TextField, Typography } from '@mui/material';
import { useContextStore } from './store/contextStore';

interface OmniBarProps {
  onCreateNode: (label: string) => void;
}

export default function OmniBar({ onCreateNode }: OmniBarProps) {
  const [value, setValue] = useState('');
  const { selectedEnvironment } = useContextStore();

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && value.trim() !== '') {
      if (!selectedEnvironment) {
        // This check is a fallback, the input should be disabled anyway.
        alert('Please select an environment from the sidebar first.');
        return;
      }
      onCreateNode(value.trim());
      setValue('');
    }
  };
  
  const placeholderText = `Ask a question...`;

  return (
    <Paper
      elevation={4}
      sx={{
        position: 'absolute',
        bottom: 30,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        p: '8px 16px', // Adjusted padding
        display: 'flex',
        alignItems: 'center',
        width: '50%',
        maxWidth: '700px',
        borderRadius: '12px'
      }}
    >
      {/* Display the selected context as read-only text */}
      {selectedEnvironment && (
        <>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ mr: 1 }}>
            Context:
          </Typography>
          <Typography fontFamily="monospace" fontSize="0.9rem" noWrap sx={{ mr: 2 }}>
            {selectedEnvironment.id}
          </Typography>
        </>
      )}

      <TextField
        fullWidth
        variant="standard"
        placeholder={placeholderText}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        InputProps={{
          disableUnderline: true,
          sx: { fontSize: '1.1rem' }
        }}
        autoFocus
      />
    </Paper>
  );
}