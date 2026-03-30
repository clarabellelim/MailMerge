/**
 * Deep-Scan Influencer Outreach MVP
 * 前后端共享接口类型定义
 */

// ==================== Influencer 网红信息 ====================

export interface Influencer {
  id: string;
  handle: string;
  platform: string;
  followers: number;
  engagementRate: number;
  bio: string;
  emailFound: string;
  contactLinkFallback: string;
  verified: boolean;
  manualEmail: string;
  scanStatus: 'complete' | 'partial' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface InfluencerListResp {
  items: Influencer[];
  total: number;
}

export interface InfluencerUpdateReq {
  manualEmail?: string;
  verified?: boolean;
}

export interface InfluencerUpdateResp {
  id: string;
  manualEmail: string;
  verified: boolean;
}

export interface InfluencerUploadResp {
  successCount: number;
  failedCount: number;
}

// ==================== Scan 扫描任务 ====================

export interface ScanStartReq {
  urls: string[]; // max 500 per task
}

export interface ScanKeywordStartReq {
  keyword: string;
  platform: 'tiktok' | 'instagram' | 'youtube';
  maxResults: number; // max unique creators to collect
}

export interface ScanStartResp {
  taskId: string;
}

export interface ScanStatusResp {
  completed: number;
  total: number;
  currentVideo?: string;
  retryCount: number;
  failedSubPages: number;
  status: 'running' | 'completed' | 'failed';
}

// ==================== EmailTemplate 邮件模板 ====================

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  isDefault: boolean;
  createdAt: string;
}

export interface EmailTemplateCreateReq {
  id?: string;
  name: string;
  subject: string;
  content: string;
  isDefault?: boolean;
}

export interface EmailTemplateCreateResp {
  id: string;
  name: string;
}

export interface EmailTemplateDeleteResp {
  success: boolean;
}

// ==================== Auth 授权配置 ====================

export interface AuthStatusResp {
  isAuthorized: boolean;
  expiresAt: string;
}

export interface AuthConfigStatusResp {
  isConfigured: boolean;
  missingConfigs: string[];
}

export interface AuthUrlResp {
  url: string;
}

export interface AuthCallbackResp {
  success: boolean;
}

// ==================== EmailSend 邮件发送 ====================

export interface EmailSendReq {
  influencerIds: string[];
  templateId: string;
}

export interface EmailSendResp {
  taskId: string;
}

export interface EmailSendStatusResp {
  success: number;
  failed: number;
  skipped: number;
  total: number;
  status: 'running' | 'completed';
}

// ==================== SendLog 发送日志 ====================

export interface SendLog {
  id: string;
  influencerHandle: string;
  recipientEmail: string;
  sendStatus: 'pending' | 'success' | 'failed' | 'skipped';
  errorReason: string;
  sendTime: string;
}

export interface SendLogListResp {
  items: SendLog[];
  total: number;
}

export interface SendLogResendResp {
  success: boolean;
}

// ==================== CSV 导出 ====================

export interface CsvExportRow {
  Handle: string;
  Platform: string;
  Followers: number;
  Email_Found: string;
  Contact_Link_Fallback: string;
  Video_Link: string;
}

// ==================== Query Params ====================

export interface InfluencerListParams {
  page?: number;
  pageSize?: number;
  verified?: boolean;
}

export interface SendLogListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  startTime?: string;
  endTime?: string;
}
