import { SendLogService } from './send-log.service';
import type { SendLogListResp, SendLogResendResp } from '@shared/api.interface';
import type { Request, Response } from 'express';
export declare class SendLogController {
    private readonly sendLogService;
    constructor(sendLogService: SendLogService);
    getSendLogs(pageStr?: string, pageSizeStr?: string, status?: string, startTime?: string, endTime?: string): Promise<SendLogListResp>;
    resendEmail(id: string, req: Request): Promise<SendLogResendResp>;
    exportLogs(res: Response, status?: string, startTime?: string, endTime?: string): Promise<void>;
}
