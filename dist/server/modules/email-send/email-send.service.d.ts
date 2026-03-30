import { HttpService } from '@nestjs/axios';
import { type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import type { EmailSendResp, EmailSendStatusResp } from '@shared/api.interface';
import { AuthService } from '../auth/auth.service';
import { InfluencerService } from '../influencer/influencer.service';
import { EmailTemplateService } from '../email-template/email-template.service';
export declare class EmailSendService {
    private readonly db;
    private readonly httpService;
    private readonly authService;
    private readonly influencerService;
    private readonly emailTemplateService;
    private readonly logger;
    private tasks;
    constructor(db: PostgresJsDatabase, httpService: HttpService, authService: AuthService, influencerService: InfluencerService, emailTemplateService: EmailTemplateService);
    private isDbAvailable;
    startSend(influencerIds: string[], templateId: string, userId: string): Promise<EmailSendResp>;
    getSendStatus(taskId: string): EmailSendStatusResp | null;
    private runSend;
    private sendEmail;
    private sleep;
}
