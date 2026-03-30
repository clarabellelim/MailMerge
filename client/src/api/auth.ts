import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  AuthStatusResp,
  AuthConfigStatusResp,
  AuthUrlResp,
  AuthCallbackResp,
} from '@shared/api.interface';

export async function getAuthStatus(): Promise<AuthStatusResp> {
  try {
    const response = await axiosForBackend({
      url: '/api/auth/status',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取授权状态失败', error);
    throw error;
  }
}

export async function getAuthConfigStatus(): Promise<AuthConfigStatusResp> {
  try {
    const response = await axiosForBackend({
      url: '/api/auth/config-status',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取授权配置状态失败', error);
    throw error;
  }
}

export async function getAuthUrl(): Promise<AuthUrlResp> {
  try {
    const response = await axiosForBackend({
      url: '/api/auth/url',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取授权链接失败', error);
    throw error;
  }
}

export async function handleAuthCallback(code: string): Promise<AuthCallbackResp> {
  try {
    const response = await axiosForBackend({
      url: '/api/auth/callback',
      method: 'GET',
      params: { code },
    });
    return response.data;
  } catch (error) {
    logger.error('处理授权回调失败', error);
    throw error;
  }
}
