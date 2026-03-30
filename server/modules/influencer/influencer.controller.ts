import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { InfluencerService } from './influencer.service';
import type {
  InfluencerListResp,
  InfluencerUpdateReq,
  InfluencerUpdateResp,
  InfluencerUploadResp,
} from '@shared/api.interface';

@Controller('api/influencers')
export class InfluencerController {
  constructor(private readonly influencerService: InfluencerService) {}

  @Get()
  async getInfluencers(
    @Query('page') pageStr?: string,
    @Query('pageSize') pageSizeStr?: string,
    @Query('verified') verifiedStr?: string,
  ): Promise<InfluencerListResp> {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const pageSize = pageSizeStr ? parseInt(pageSizeStr, 10) : 20;
    const verified = verifiedStr !== undefined
      ? verifiedStr === 'true'
      : undefined;

    if (isNaN(page) || page < 1) {
      throw new BadRequestException('页码必须是正整数');
    }
    if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new BadRequestException('每页数量必须是1-100之间的整数');
    }

    return this.influencerService.getInfluencers(page, pageSize, verified);
  }

  @Patch(':id')
  async updateInfluencer(
    @Param('id') id: string,
    @Body() body: InfluencerUpdateReq,
  ): Promise<InfluencerUpdateResp> {
    if (!id) {
      throw new BadRequestException('请提供记录ID');
    }
    return this.influencerService.updateInfluencer(id, body);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    }),
  )
  async uploadFile(
    @UploadedFile() file?: any,
    @Body('csv') csvContent?: string,
  ): Promise<InfluencerUploadResp> {
    // Backward-compatible: allow sending raw CSV text
    if (!file) {
      if (!csvContent || typeof csvContent !== 'string') {
        throw new BadRequestException('请上传 .csv 或 .xlsx 文件（或提供csv文本）');
      }
      return this.influencerService.uploadCsv(csvContent);
    }

    return this.influencerService.uploadFile(file);
  }
}
