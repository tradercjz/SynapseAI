// src/App.tsx
import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { Chat as ChatIcon, Code as CodeIcon } from '@mui/icons-material';
import { AppMode, useUIStore } from './store/uiStore';
import AuthControl from './components/AuthControl';
import LoginModal from './components/LoginModal';
import MainLayout from './components/MainLayout'; // Import our new layout component
import WorkspaceManager from './components/WorkspaceManager';
import './styles.css';
import Header from './components/Header';


const darkTheme = createTheme({
  palette: {
    mode: 'light',
  },
});

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  const handleLoginSuccess = (newToken: string) => {
    setToken(newToken);
  };

  const handleLogout = () => {
    setToken(null);
  };

 return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ height: '100vh', width: '100vw', position: 'relative' }}>
        {/* MainLayout 现在先渲染，作为背景 */}
        <MainLayout />
        
        {/* Header 后渲染，凭借其 position:fixed 和更高的 zIndex 浮在上面 */}
        <Header
          isAuthenticated={!!token}
          onLoginClick={() => setIsLoginModalOpen(true)}
          onLogoutClick={handleLogout}
        />
        
        {/* 其他逻辑组件，它们没有UI，可以放在任何位置 */}
        <WorkspaceManager />
        <LoginModal
          open={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      </Box>
    </ThemeProvider>
  );
}

export default App;