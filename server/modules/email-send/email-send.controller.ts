import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  BadRequestException,
  NotFoundException,
  Req,
} from '@nestjs/common';
import { EmailSendService } from './email-send.service';
import type {
  EmailSendReq,
  EmailSendResp,
  EmailSendStatusResp,
} from '@shared/api.interface';
import type { Request } from 'express';

@Controller('api/email')
export class EmailSendController {
  constructor(private readonly emailSendService: EmailSendService) {}

  @Post('send')
  async startSend(
    @Body() body: EmailSendReq,
    @Req() req: Request,
  ): Promise<EmailSendResp> {
    // In local MVP/dev mode we allow starting without platform login.
    // Use the same fallback userId as /api/auth/status so memTokens can be found.
    const userId = req.userContext?.userId || 'local-dev';
    // Sending can still fail later if Feishu OAuth isn't configured for this userId.

    if (!body.influencerIds || !Array.isArray(body.influencerIds) || body.influencerIds.length === 0) {
      throw new BadRequestException('请提供有效的网红ID列表');
    }

    if (!body.templateId) {
      throw new BadRequestException('请提供邮件模板ID');
    }

    return this.emailSendService.startSend(body.influencerIds, body.templateId, userId || '');
  }

  @Get('send-status')
  async getSendStatus(
    @Query('taskId') taskId: string,
  ): Promise<EmailSendStatusResp> {
    if (!taskId) {
      throw new BadRequestException('请提供任务ID');
    }

    const status = this.emailSendService.getSendStatus(taskId);
    if (!status) {
      throw new NotFoundException('任务不存在');
    }

    return status;
  }
}
