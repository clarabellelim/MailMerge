import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  ScanStartReq,
  ScanKeywordStartReq,
  ScanStartResp,
  ScanStatusResp,
} from '@shared/api.interface';

export async function startScan(data: ScanStartReq): Promise<ScanStartResp> {
  try {
    const response = await axiosForBackend({
      url: '/api/scan/start',
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('启动扫描任务失败', error);
    throw error;
  }
}

export async function startKeywordScan(
  data: ScanKeywordStartReq,
): Promise<ScanStartResp> {
  try {
    const response = await axiosForBackend({
      url: '/api/scan/start-keyword',
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('启动关键词扫描任务失败', error);
    throw error;
  }
}

export async function getScanStatus(taskId: string): Promise<ScanStatusResp> {
  try {
    const response = await axiosForBackend({
      url: '/api/scan/status',
      method: 'GET',
      params: { taskId },
    });
    return response.data;
  } catch (error) {
    logger.error('获取扫描状态失败', error);
    throw error;
  }
}

export async function downloadScanResult(taskId: string): Promise<Blob> {
  try {
    const response = await axiosForBackend({
      url: '/api/scan/download',
      method: 'GET',
      params: { taskId },
      responseType: 'blob',
    });
    return response.data;
  } catch (error) {
    logger.error('下载扫描结果失败', error);
    throw error;
  }
}

export function saveExcelFile(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// Backward-compatible alias (if any older UI still imports it)
export function saveCsvFile(blob: Blob, filename: string): void {
  saveExcelFile(blob, filename);
}
