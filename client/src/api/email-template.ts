import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  EmailTemplate,
  EmailTemplateCreateReq,
  EmailTemplateCreateResp,
  EmailTemplateDeleteResp,
} from '@shared/api.interface';

export async function getTemplates(): Promise<EmailTemplate[]> {
  try {
    const response = await axiosForBackend({
      url: '/api/email-templates',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取模板列表失败', error);
    throw error;
  }
}

export async function createTemplate(
  data: EmailTemplateCreateReq,
): Promise<EmailTemplateCreateResp> {
  try {
    const response = await axiosForBackend({
      url: '/api/email-templates',
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('创建模板失败', error);
    throw error;
  }
}

export async function deleteTemplate(id: string): Promise<EmailTemplateDeleteResp> {
  try {
    const response = await axiosForBackend({
      url: `/api/email-templates/${id}`,
      method: 'DELETE',
    });
    return response.data;
  } catch (error) {
    logger.error('删除模板失败', error);
    throw error;
  }
}
