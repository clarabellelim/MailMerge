import { EmailSendService } from './email-send.service';
import type { EmailSendReq, EmailSendResp, EmailSendStatusResp } from '@shared/api.interface';
import type { Request } from 'express';
export declare class EmailSendController {
    private readonly emailSendService;
    constructor(emailSendService: EmailSendService);
    startSend(body: EmailSendReq, req: Request): Promise<EmailSendResp>;
    getSendStatus(taskId: string): Promise<EmailSendStatusResp>;
}
