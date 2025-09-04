// src/App.tsx
import React, { useState, useEffect } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import FlowCanvas from './FlowCanvas';
import AuthControl from './components/AuthControl';
import LoginModal from './components/LoginModal';
import './styles.css';

// 创建一个基础的 MUI 主题
const darkTheme = createTheme({
  palette: {
    mode: 'light', // or 'dark'
  },
});

function App() {
  // 从 localStorage 初始化 token，以保持登录状态
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // 当 token 状态改变时，同步到 localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  const handleLoginSuccess = (newToken) => {
    setToken(newToken);
  };

  const handleLogout = () => {
    setToken(null);
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="app-container">
        <AuthControl
          isAuthenticated={!!token}
          onLoginClick={() => setIsLoginModalOpen(true)}
          onLogoutClick={handleLogout}
        />

        <LoginModal
          open={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />

        <ReactFlowProvider>
          <FlowCanvas />
        </ReactFlowProvider>
      </div>
    </ThemeProvider>
  );
}

export default App;