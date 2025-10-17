// src/authService.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://183.134.101.139:8001/api/v1';

export const login = async (username: string, password: string): Promise<string> => {
  // FastAPI 的 OAuth2PasswordRequestForm 需要 application/x-www-form-urlencoded 格式
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  const response = await axios.post(`${API_BASE_URL}/auth/token`, formData);

  // 成功后返回 access_token
  return response.data.access_token;
};

export const register = async (email: string, password: string): Promise<any> => {
  const response = await axios.post(`${API_BASE_URL}/auth/register`, { email, password });
  return response.data;
};

export const verifyEmail = async (email: string, code: string): Promise<any> => {
  const response = await axios.post(`${API_BASE_URL}/auth/verify-email`, { email, code });
  return response.data;
};

export const resendVerificationCode = async (email: string): Promise<any> => {
  const response = await axios.post(`${API_BASE_URL}/auth/resend-verification-email`, { email });
  return response.data;
};