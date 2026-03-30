import { EmailTemplateService } from './email-template.service';
import type { EmailTemplate, EmailTemplateCreateReq, EmailTemplateCreateResp, EmailTemplateDeleteResp } from '@shared/api.interface';
export declare class EmailTemplateController {
    private readonly emailTemplateService;
    constructor(emailTemplateService: EmailTemplateService);
    getTemplates(): Promise<EmailTemplate[]>;
    createTemplate(body: EmailTemplateCreateReq): Promise<EmailTemplateCreateResp>;
    deleteTemplate(id: string): Promise<EmailTemplateDeleteResp>;
}
