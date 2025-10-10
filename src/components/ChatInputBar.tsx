import React, { useState } from 'react';
import { Box, TextField, IconButton, CircularProgress } from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';

interface ChatInputBarProps {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
}

const ChatInputBar: React.FC<ChatInputBarProps> = ({ onSubmit, isLoading }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = () => {
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt.trim());
      setPrompt('');
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Box
      component="form"
      sx={{
        display: 'flex',
        alignItems: 'center',
        p: 1.5,
        borderTop: 1,
        borderColor: 'divider',
        backgroundColor: 'background.paper',
      }}
      onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
    >
      <TextField
        fullWidth
        multiline
        maxRows={5}
        variant="outlined"
        size="small"
        placeholder="在这里输入您的问题..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        autoFocus
        sx={{
            '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
            }
        }}
      />
      <IconButton
        color="primary"
        type="submit"
        disabled={isLoading || !prompt.trim()}
        sx={{ ml: 1.5 }}
      >
        {isLoading ? <CircularProgress size={24} /> : <SendIcon />}
      </IconButton>
    </Box>
  );
};

export default ChatInputBar;