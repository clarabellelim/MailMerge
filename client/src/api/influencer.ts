import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  InfluencerListResp,
  InfluencerUpdateReq,
  InfluencerUpdateResp,
  InfluencerUploadResp,
} from '@shared/api.interface';

export async function getInfluencers(
  page: number = 1,
  pageSize: number = 20,
  verified?: boolean,
): Promise<InfluencerListResp> {
  try {
    const response = await axiosForBackend({
      url: '/api/influencers',
      method: 'GET',
      params: { page, pageSize, verified },
    });
    return response.data;
  } catch (error) {
    logger.error('获取网红列表失败', error);
    throw error;
  }
}

export async function updateInfluencer(
  id: string,
  data: InfluencerUpdateReq,
): Promise<InfluencerUpdateResp> {
  try {
    const response = await axiosForBackend({
      url: `/api/influencers/${id}`,
      method: 'PATCH',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('更新网红信息失败', error);
    throw error;
  }
}

export async function uploadCsv(csvContent: string): Promise<InfluencerUploadResp> {
  try {
    const response = await axiosForBackend({
      url: '/api/influencers/upload',
      method: 'POST',
      data: { csv: csvContent },
    });
    return response.data;
  } catch (error) {
    logger.error('上传CSV失败', error);
    throw error;
  }
}

export async function uploadInfluencerFile(file: File): Promise<InfluencerUploadResp> {
  try {
    const form = new FormData();
    form.append('file', file);
    const response = await axiosForBackend({
      url: '/api/influencers/upload',
      method: 'POST',
      data: form,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    logger.error('上传文件失败', error);
    throw error;
  }
}
