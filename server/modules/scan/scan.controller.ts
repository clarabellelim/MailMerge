import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Res,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { ScanService } from './scan.service';
import type {
  ScanStartReq,
  ScanKeywordStartReq,
  ScanStartResp,
  ScanStatusResp,
  CsvExportRow,
} from '@shared/api.interface';
import * as XLSX from 'xlsx';

@Controller('api/scan')
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  @Post('start')
  async startScan(@Body() body: ScanStartReq): Promise<ScanStartResp> {
    const urls = body.urls?.filter((u) => typeof u === 'string' && u.trim() !== '').map((u) => u.trim());
    if (!urls || urls.length === 0) {
      throw new BadRequestException('请提供至少一个有效URL');
    }
    if (urls.length > 500) {
      throw new BadRequestException('单次任务最多支持500个URL');
    }

    return this.scanService.startScan(urls);
  }

  @Post('start-keyword')
  async startKeywordScan(@Body() body: ScanKeywordStartReq): Promise<ScanStartResp> {
    const keyword = (body.keyword || '').trim();
    if (!keyword) {
      throw new BadRequestException('请提供有效关键词');
    }
    const platform = body.platform;
    if (!platform || !['tiktok', 'instagram', 'youtube'].includes(platform)) {
      throw new BadRequestException('请选择有效平台');
    }
    const maxResults = Number(body.maxResults || 0);
    if (!Number.isFinite(maxResults) || maxResults < 1 || maxResults > 500) {
      throw new BadRequestException('maxResults 必须是 1-500 之间的数字');
    }

    return this.scanService.startKeywordScan({ keyword, platform, maxResults });
  }

  @Get('status')
  async getStatus(@Query('taskId') taskId: string): Promise<ScanStatusResp> {
    if (!taskId) {
      throw new BadRequestException('请提供任务ID');
    }

    const status = this.scanService.getScanStatus(taskId);
    if (!status) {
      throw new NotFoundException('任务不存在');
    }

    return status;
  }

  @Get('download')
  async downloadExcel(
    @Query('taskId') taskId: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!taskId) {
      throw new BadRequestException('请提供任务ID');
    }

    const results = this.scanService.getScanResults(taskId);
    if (!results) {
      throw new NotFoundException('任务不存在');
    }

    const xlsxBuffer = this.generateExcel(results);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="scan_result_${taskId}.xlsx"`,
    );
    res.send(xlsxBuffer);
  }

  private generateExcel(rows: CsvExportRow[]): Buffer {
    const headers = [
      'Handle',
      'Platform',
      'Followers',
      'Email_Found',
      'Contact_Link_Fallback',
      'Video_Link',
    ];

    const sheetData = rows.map((row) => ({
      Handle: row.Handle,
      Platform: row.Platform,
      Followers: row.Followers,
      Email_Found: row.Email_Found || '',
      Contact_Link_Fallback: row.Contact_Link_Fallback || '',
      Video_Link: row.Video_Link || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(sheetData, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Scan Results');

    return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  }
}
