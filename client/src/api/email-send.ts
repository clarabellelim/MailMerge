import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  EmailSendReq,
  EmailSendResp,
  EmailSendStatusResp,
} from '@shared/api.interface';

export async function startSend(data: EmailSendReq): Promise<EmailSendResp> {
  try {
    const response = await axiosForBackend({
      url: '/api/email/send',
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('启动邮件发送失败', error);
    throw error;
  }
}

export async function getSendStatus(taskId: string): Promise<EmailSendStatusResp> {
  try {
    const response = await axiosForBackend({
      url: '/api/email/send-status',
      method: 'GET',
      params: { taskId },
    });
    return response.data;
  } catch (error) {
    logger.error('获取发送状态失败', error);
    throw error;
  }
}
