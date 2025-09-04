// src/components/AuthControl.tsx
import React from 'react';
import { Button, Avatar, Tooltip, IconButton } from '@mui/material';
import { Logout as LogoutIcon } from '@mui/icons-material';

interface AuthControlProps {
  isAuthenticated: boolean;
  onLoginClick: () => void;
  onLogoutClick: () => void;
}

const AuthControl: React.FC<AuthControlProps> = ({ isAuthenticated, onLoginClick, onLogoutClick }) => {
  return (
    <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
      {isAuthenticated ? (
        <Tooltip title="Logout">
          <IconButton onClick={onLogoutClick}>
            <Avatar sx={{ bgcolor: 'secondary.main' }}>U</Avatar>
          </IconButton>
        </Tooltip>
      ) : (
        <Button variant="contained" onClick={onLoginClick}>
          Login
        </Button>
      )}
    </div>
  );
};

export default AuthControl;