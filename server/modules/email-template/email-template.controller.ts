import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { EmailTemplateService } from './email-template.service';
import type {
  EmailTemplate,
  EmailTemplateCreateReq,
  EmailTemplateCreateResp,
  EmailTemplateDeleteResp,
} from '@shared/api.interface';

@Controller('api/email-templates')
export class EmailTemplateController {
  constructor(private readonly emailTemplateService: EmailTemplateService) {}

  @Get()
  async getTemplates(): Promise<EmailTemplate[]> {
    return this.emailTemplateService.getTemplates();
  }

  @Post()
  async createTemplate(
    @Body() body: EmailTemplateCreateReq,
  ): Promise<EmailTemplateCreateResp> {
    return this.emailTemplateService.createTemplate(body);
  }

  @Delete(':id')
  async deleteTemplate(
    @Param('id') id: string,
  ): Promise<EmailTemplateDeleteResp> {
    if (!id) {
      throw new BadRequestException('请提供模板ID');
    }
    return this.emailTemplateService.deleteTemplate(id);
  }
}
