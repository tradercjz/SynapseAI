// FILE: ./src/components/AuthModal.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  Box, CircularProgress, Alert, Typography, Link
} from '@mui/material';
import { useUIStore, AuthModalState } from '../store/uiStore';
import { login, register, verifyEmail, resendVerificationCode } from '../authService';

interface AuthModalProps {
  onLoginSuccess: (token: string) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onLoginSuccess }) => {
  const { authModalState, emailForVerification, closeAuthModal, openLoginModal, openRegisterModal, openVerificationModal } = useUIStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [resendCooldown, setResendCooldown] = useState(0);

  // 当模态框状态改变时，清空旧状态
  useEffect(() => {
    setError(null);
    setSuccessMessage(null);
    setIsLoading(false);
    setCode('');
    // 如果是验证视图，预填 email
    if (authModalState === 'VERIFY_EMAIL' && emailForVerification) {
        setEmail(emailForVerification);
    }
  }, [authModalState, emailForVerification]);

  // 冷却计时器
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleLogin = async () => {
    setIsLoading(true); setError(null);
    try {
      const token = await login(email, password);
      onLoginSuccess(token);
      closeAuthModal();
    } catch (err) {
      setError('Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    setIsLoading(true); setError(null);setSuccessMessage(null);
    try {
      await register(email, password);
      setSuccessMessage('Registration successful! Please check your email for a verification code.');
      // 切换到验证视图
      openVerificationModal(email);
    } catch (err: any) {
      let errorMessage = 'Registration failed. An unknown error occurred.'; // 1. 设置一个通用后备错误信息

      // 2. 安全地检查 FastAPI 返回的详细错误结构是否存在
      if (err.response?.data?.detail && Array.isArray(err.response.data.detail) && err.response.data.detail.length > 0) {
        
        // 3. 提取第一个具体的错误信息对象
        const firstError = err.response.data.detail[0];
        
        // 4. 从中提取人类可读的 'msg'
        const message = firstError.msg || 'Invalid input.';
        
        // 5. (优化) 从 'loc' 中提取字段名，让错误更具体
        if (firstError.loc && firstError.loc.length > 1) {
          const fieldName = String(firstError.loc[1]); // e.g., 'password'
          const capitalizedFieldName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
          errorMessage = `${capitalizedFieldName}: ${message}`; // 最终会变成 "Password: String should have at least 8 characters"
        } else {
          errorMessage = message;
        }

      } else if (err.response?.data?.detail) {
        // 6. 处理其他类型的错误，比如邮箱已存在 (detail 是一个字符串)
        errorMessage = err.response.data.detail;
      }
      
      // 7. 将处理好的、保证是字符串的错误信息设置到 state 中
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    setIsLoading(true); setError(null);
    try {
      await verifyEmail(email, code);
      setSuccessMessage('Account activated successfully! You can now log in.');
      // 激活成功后，切换回登录视图
      openLoginModal();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true); setError(null); setSuccessMessage(null);
    try {
      await resendVerificationCode(email);
      setSuccessMessage('A new verification code has been sent.');
      setResendCooldown(60); // 启动60秒冷却
    } catch (err: any) {
       setError(err.response?.data?.detail || 'Failed to resend code.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    switch (authModalState) {
      case 'LOGIN':
        return (
          <>
            <DialogTitle>Login to Continue</DialogTitle>
            <DialogContent>
              <TextField label="Email" fullWidth margin="normal" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
              <TextField label="Password" type="password" fullWidth margin="normal" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </DialogContent>
            <DialogActions sx={{ p: '16px 24px', justifyContent: 'space-between' }}>
              <Link component="button" variant="body2" onClick={openRegisterModal}>Don't have an account? Sign Up</Link>
              <Box>
                <Button onClick={closeAuthModal} disabled={isLoading}>Cancel</Button>
                <Button onClick={handleLogin} variant="contained" disabled={isLoading}>{isLoading ? <CircularProgress size={24} /> : 'Login'}</Button>
              </Box>
            </DialogActions>
          </>
        );
      case 'REGISTER':
        return (
          <>
            <DialogTitle>Create an Account</DialogTitle>
            <DialogContent>
              <TextField label="Email" fullWidth margin="normal" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
              <TextField label="Password (min. 8 characters)" type="password" fullWidth margin="normal" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRegister()} />
            </DialogContent>
            <DialogActions sx={{ p: '16px 24px', justifyContent: 'space-between' }}>
              <Link component="button" variant="body2" onClick={openLoginModal}>Already have an account? Log In</Link>
              <Box>
                <Button onClick={closeAuthModal} disabled={isLoading}>Cancel</Button>
                <Button onClick={handleRegister} variant="contained" disabled={isLoading}>{isLoading ? <CircularProgress size={24} /> : 'Register'}</Button>
              </Box>
            </DialogActions>
          </>
        );
      case 'VERIFY_EMAIL':
        return (
          <>
            <DialogTitle>Verify Your Email</DialogTitle>
            <DialogContent>
              <Typography variant="body2" sx={{mb: 2}}>A 6-digit verification code has been sent to <strong>{emailForVerification}</strong>.</Typography>
              <TextField label="Verification Code" fullWidth margin="normal" value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleVerify()} autoFocus />
            </DialogContent>
            <DialogActions sx={{ p: '16px 24px', justifyContent: 'space-between' }}>
              <Link component="button" variant="body2" onClick={handleResend} disabled={isLoading || resendCooldown > 0}>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
              </Link>
              <Box>
                <Button onClick={closeAuthModal} disabled={isLoading}>Cancel</Button>
                <Button onClick={handleVerify} variant="contained" disabled={isLoading}>{isLoading ? <CircularProgress size={24} /> : 'Verify'}</Button>
              </Box>
            </DialogActions>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={authModalState !== 'CLOSED'} onClose={closeAuthModal} fullWidth maxWidth="xs">
        {error && <Alert severity="error" sx={{ m: 2, mb: 0 }}>{error}</Alert>}
        {successMessage && <Alert severity="success" sx={{ m: 2, mb: 0 }}>{successMessage}</Alert>}
        {renderContent()}
    </Dialog>
  );
};

export default AuthModal;