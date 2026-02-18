import axios from 'axios';
import type { LoginSchema, TokenPairSchema } from './schemas';

const authApi = axios.create({
  baseURL: 'http://localhost:8080',
});

export const loginUser = async (data: LoginSchema): Promise<TokenPairSchema> => {
  const response = await authApi.post('/auth/login', data);
  return response.data;
};

export const refreshTokens = async (refreshToken: string): Promise<TokenPairSchema> => {
  const response = await authApi.post('/auth/refresh', { refresh_token: refreshToken });
  return response.data;
};

export const logoutUser = async (accessToken: string, refreshToken: string): Promise<void> => {
  await authApi.post(
    '/auth/logout',
    { refresh_token: refreshToken },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
};

export const logoutAllDevices = async (accessToken: string): Promise<void> => {
  await authApi.post('/auth/logout-all', {}, { headers: { Authorization: `Bearer ${accessToken}` } });
};

export const requestPasswordReset = async (email: string): Promise<void> => {
  await authApi.post('/auth/forgot-password', { email });
};

export const validateResetToken = async (token: string): Promise<{ valid: boolean }> => {
  const response = await authApi.post('/auth/validate-reset-token', { token });
  return response.data;
};

export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  await authApi.post('/auth/reset-password', { token, new_password: newPassword });
};
