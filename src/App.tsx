// src/App.tsx
import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import AuthControl from './components/AuthControl';
import LoginModal from './components/LoginModal';
import MainLayout from './components/MainLayout'; // Import our new layout component
import './styles.css';

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
      <div className="app-container">
        {/* Auth controls can now float on top of the main layout */}
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
        
        {/* The MainLayout is now the primary component */}
        <MainLayout />
      </div>
    </ThemeProvider>
  );
}

export default App;