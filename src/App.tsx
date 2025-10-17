// src/App.tsx
import React, { useState, useEffect, useRef} from 'react';
import { ThemeProvider, createTheme, useTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { Chat as ChatIcon, Code as CodeIcon } from '@mui/icons-material';
import { AppMode, useUIStore } from './store/uiStore';
import AuthControl from './components/AuthControl';
import AuthModal from './components/AuthModal'; 
import MainLayout from './components/MainLayout'; // Import our new layout component
import WorkspaceManager from './components/WorkspaceManager';
import './styles.css';
import Header from './components/Header';
import ProfilePanel from './components/ProfilePanel';
import { jwtDecode } from 'jwt-decode';


const darkTheme = createTheme({
  palette: {
    mode: 'light',
  },
});

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const { authModalState, openLoginModal, closeAuthModal } = useUIStore(); 
  const { activeMode } = useUIStore(); // 1. 从 store 获取当前的应用模式
  const headerRef = useRef<HTMLDivElement>(null); // 1. 创建一个 ref 用于引用 Header
  const [headerHeight, setHeaderHeight] = useState(0); // 2. 创建一个 state 存储测量到的高度
  const [userEmail, setUserEmail] = useState<string | null>(null)
  

  useEffect(() => {
    if (headerRef.current) {
      // offsetHeight 能获取包括 padding 和 border 在内的元素总高度
      setHeaderHeight(headerRef.current.offsetHeight);
    }
  }, []); // 空依赖数组意味着这个 effect 只在首次渲染后运行一次

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      try {
        // 4. 当 token 变化时，解码它并提取 email
        const decoded = jwtDecode<DecodedToken>(token);
        setUserEmail(decoded.sub);
      } catch (error) {
        console.error("Invalid token:", error);
        setToken(null); // 如果 token 无效，则清空
        setUserEmail(null);
      }
    } else {
      localStorage.removeItem('token');
      setUserEmail(null); // 清空 email
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
        {/* 将 ref 传递给 Header 组件 */}
        <Header
          ref={headerRef}
          isAuthenticated={!!token}
          onLoginClick={openLoginModal}
        />
        
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            // --- 核心修改：使用 top 属性进行布局切换 ---
            // 4. 根据模式和测量到的高度，动态设置 top 属性
            top: activeMode === 'CODING' ? headerHeight : 0,
            // 确保过渡动画平滑
            transition: 'top 0.3s ease-in-out',
          }}
        >
          <MainLayout />
        </Box>
        
        <WorkspaceManager />
        <ProfilePanel
          userEmail={userEmail}
          onLogout={handleLogout}
        />
        <AuthModal
          onLoginSuccess={handleLoginSuccess}
          />
      </Box>
    </ThemeProvider>
  );
}

export default App;