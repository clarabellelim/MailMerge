import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  SendLogListResp,
  SendLogResendResp,
} from '@shared/api.interface';

export async function getSendLogs(
  page: number = 1,
  pageSize: number = 20,
  status?: string,
  startTime?: string,
  endTime?: string,
): Promise<SendLogListResp> {
  try {
    const response = await axiosForBackend({
      url: '/api/send-logs',
      method: 'GET',
      params: { page, pageSize, status, startTime, endTime },
    });
    return response.data;
  } catch (error) {
    logger.error('获取发送日志失败', error);
    throw error;
  }
}

export async function resendLog(id: string): Promise<SendLogResendResp> {
  try {
    const response = await axiosForBackend({
      url: `/api/send-logs/${id}/resend`,
      method: 'POST',
    });
    return response.data;
  } catch (error) {
    logger.error('重发邮件失败', error);
    throw error;
  }
}

export async function exportLogs(): Promise<Blob> {
  try {
    const response = await axiosForBackend({
      url: '/api/send-logs/export',
      method: 'GET',
      responseType: 'blob',
    });
    return response.data;
  } catch (error) {
    logger.error('导出日志失败', error);
    throw error;
  }
}
