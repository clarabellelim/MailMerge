import { HttpService } from '@nestjs/axios';
import { type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import type { SendLogListResp, SendLogResendResp } from '@shared/api.interface';
import { AuthService } from '../auth/auth.service';
export declare class SendLogService {
    private readonly db;
    private readonly httpService;
    private readonly authService;
    private readonly logger;
    constructor(db: PostgresJsDatabase, httpService: HttpService, authService: AuthService);
    private isDbAvailable;
    getSendLogs(page?: number, pageSize?: number, status?: string, startTime?: string, endTime?: string): Promise<SendLogListResp>;
    resendEmail(logId: string, userId: string): Promise<SendLogResendResp>;
    exportLogs(status?: string, startTime?: string, endTime?: string): Promise<string>;
    private sendEmail;
    private mapToSendLog;
    private escapeCsv;
}
