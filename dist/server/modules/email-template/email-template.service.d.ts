import { type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import type { EmailTemplate, EmailTemplateCreateReq, EmailTemplateCreateResp, EmailTemplateDeleteResp } from '@shared/api.interface';
export declare class EmailTemplateService {
    private readonly db;
    private readonly logger;
    private readonly memTemplates;
    constructor(db: PostgresJsDatabase);
    private isDbAvailable;
    getTemplates(): Promise<EmailTemplate[]>;
    createTemplate(data: EmailTemplateCreateReq): Promise<EmailTemplateCreateResp>;
    deleteTemplate(id: string): Promise<EmailTemplateDeleteResp>;
    getDefaultTemplate(): Promise<EmailTemplate | null>;
    getTemplateById(id: string): Promise<EmailTemplate | null>;
    private mapToTemplate;
}
