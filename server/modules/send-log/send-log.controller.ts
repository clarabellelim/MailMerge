import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  BadRequestException,
  NotFoundException,
  Req,
  Res,
} from '@nestjs/common';
import { SendLogService } from './send-log.service';
import type {
  SendLogListResp,
  SendLogResendResp,
} from '@shared/api.interface';
import type { Request, Response } from 'express';

@Controller('api/send-logs')
export class SendLogController {
  constructor(private readonly sendLogService: SendLogService) {}

  @Get()
  async getSendLogs(
    @Query('page') pageStr?: string,
    @Query('pageSize') pageSizeStr?: string,
    @Query('status') status?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ): Promise<SendLogListResp> {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const pageSize = pageSizeStr ? parseInt(pageSizeStr, 10) : 20;

    if (isNaN(page) || page < 1) {
      throw new BadRequestException('页码必须是正整数');
    }
    if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new BadRequestException('每页数量必须是1-100之间的整数');
    }

    return this.sendLogService.getSendLogs(page, pageSize, status, startTime, endTime);
  }

  @Post(':id/resend')
  async resendEmail(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<SendLogResendResp> {
    if (!id) {
      throw new BadRequestException('请提供日志ID');
    }

    const userId = req.userContext?.userId;
    if (!userId) {
      throw new BadRequestException('未登录');
    }

    return this.sendLogService.resendEmail(id, userId);
  }

  @Get('export')
  async exportLogs(
    @Res() res: Response,
    @Query('status') status?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ): Promise<void> {
    const csv = await this.sendLogService.exportLogs(status, startTime, endTime);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="send_logs_${Date.now()}.csv"`);
    res.send(csv);
  }
}
