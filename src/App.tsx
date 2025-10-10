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
      {/* 
        使用 Box 和 flex 布局来创建一个 Header + Main Content 的垂直结构。
        app-container 的样式也需要做相应调整。
      */}
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <Header
          isAuthenticated={!!token}
          onLoginClick={() => setIsLoginModalOpen(true)}
          onLogoutClick={handleLogout}
        />
        
        {/* WorkspaceManager 是一个无UI的逻辑组件，可以放在这里 */}
        <WorkspaceManager />
        
        <LoginModal
          open={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
        
        {/* 主布局现在会占据所有剩余空间 */}
        <Box sx={{ flex: 1, position: 'relative', minHeight: 0  }}>
          <MainLayout />
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;