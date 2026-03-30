import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { sendLog, influencer, emailTemplate } from '../../database/schema';
import { eq, desc, and, gte, lte, count } from 'drizzle-orm';
import { firstValueFrom } from 'rxjs';
import type {
  SendLogListResp,
  SendLogResendResp,
  SendLog,
} from '@shared/api.interface';
import { AuthService } from '../auth/auth.service';
import { memSendLogList } from '../../common/mem-send-log-store';

@Injectable()
export class SendLogService {
  private readonly logger = new Logger(SendLogService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly httpService: HttpService,
    private readonly authService: AuthService,
  ) {}

  private isDbAvailable(): boolean {
    return !!this.db && typeof (this.db as any).select === 'function';
  }

  async getSendLogs(
    page: number = 1,
    pageSize: number = 20,
    status?: string,
    startTime?: string,
    endTime?: string,
  ): Promise<SendLogListResp> {
    if (!this.isDbAvailable()) {
      const all = memSendLogList()
        .filter((x) => (status ? x.sendStatus === status : true))
        .filter((x) => (startTime ? x.sendTime >= new Date(startTime) : true))
        .filter((x) => (endTime ? x.sendTime <= new Date(endTime) : true))
        .sort((a, b) => b.sendTime.getTime() - a.sendTime.getTime());

      const offset = (page - 1) * pageSize;
      const slice = all.slice(offset, offset + pageSize);
      return {
        items: slice.map((x) => ({
          id: x.id,
          influencerHandle: x.influencerHandle,
          recipientEmail: x.recipientEmail,
          sendStatus: x.sendStatus,
          errorReason: x.errorReason || '',
          sendTime: x.sendTime.toISOString(),
        })),
        total: all.length,
      };
    }

    const offset = (page - 1) * pageSize;

    // 构建查询条件
    const conditions = [];
    if (status) {
      conditions.push(eq(sendLog.sendStatus, status));
    }
    if (startTime) {
      conditions.push(gte(sendLog.sendTime, new Date(startTime)));
    }
    if (endTime) {
      conditions.push(lte(sendLog.sendTime, new Date(endTime)));
    }

    // 获取总数
    const totalResult = await this.db
      .select({ count: count() })
      .from(sendLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    const total = totalResult[0]?.count || 0;

    // 获取列表，关联网红信息
    const query = conditions.length > 0
      ? this.db.select({
          log: sendLog,
          handle: influencer.handle,
        }).from(sendLog)
          .leftJoin(influencer, eq(sendLog.influencerId, influencer.id))
          .where(and(...conditions))
      : this.db.select({
          log: sendLog,
          handle: influencer.handle,
        }).from(sendLog)
          .leftJoin(influencer, eq(sendLog.influencerId, influencer.id));

    const items = await query
      .orderBy(desc(sendLog.sendTime))
      .limit(pageSize)
      .offset(offset);

    return {
      items: items.map((item) => this.mapToSendLog(item.log, item.handle)),
      total,
    };
  }

  async resendEmail(logId: string, userId: string): Promise<SendLogResendResp> {
    if (!this.isDbAvailable()) {
      throw new BadRequestException('本地模式未启用数据库：暂不支持重发');
    }
    // 获取日志记录
    const logResult = await this.db
      .select()
      .from(sendLog)
      .where(eq(sendLog.id, logId))
      .limit(1);

    if (logResult.length === 0) {
      throw new BadRequestException('日志记录不存在');
    }

    const log = logResult[0];

    // 只能重发失败的邮件
    if (log.sendStatus !== 'failed') {
      throw new BadRequestException('只能重发失败的邮件');
    }

    // 获取模板信息
    if (!log.templateId) {
      throw new BadRequestException('原邮件模板不存在');
    }

    const templateResult = await this.db
      .select()
      .from(emailTemplate)
      .where(eq(emailTemplate.id, log.templateId))
      .limit(1);

    if (templateResult.length === 0) {
      throw new BadRequestException('邮件模板不存在');
    }

    const template = templateResult[0];

    // 获取网红信息
    const influencerResult = await this.db
      .select()
      .from(influencer)
      .where(eq(influencer.id, log.influencerId))
      .limit(1);

    if (influencerResult.length === 0) {
      throw new BadRequestException('网红信息不存在');
    }

    const inf = influencerResult[0];

    // 替换模板变量
    const subject = template.subject.replace(/\{\{name\}\}/g, inf.handle);
    const content = template.content.replace(/\{\{name\}\}/g, inf.handle);

    try {
      // 发送邮件
      await this.sendEmail(userId, log.recipientEmail, subject, content);

      // 更新日志状态
      await this.db
        .update(sendLog)
        .set({
          sendStatus: 'success',
          errorReason: null,
          sendTime: new Date(),
        })
        .where(eq(sendLog.id, logId));

      return { success: true };
    } catch (error) {
      // 更新失败原因
      await this.db
        .update(sendLog)
        .set({
          errorReason: error instanceof Error ? error.message : '未知错误',
          sendTime: new Date(),
        })
        .where(eq(sendLog.id, logId));

      throw error;
    }
  }

  async exportLogs(
    status?: string,
    startTime?: string,
    endTime?: string,
  ): Promise<string> {
    if (!this.isDbAvailable()) {
      const all = memSendLogList()
        .filter((x) => (status ? x.sendStatus === status : true))
        .filter((x) => (startTime ? x.sendTime >= new Date(startTime) : true))
        .filter((x) => (endTime ? x.sendTime <= new Date(endTime) : true))
        .sort((a, b) => b.sendTime.getTime() - a.sendTime.getTime());

      const headers = ['Handle', 'Recipient_Email', 'Status', 'Error_Reason', 'Send_Time'];
      const lines = [headers.join(',')];
      for (const item of all) {
        const values = [
          this.escapeCsv(item.influencerHandle || ''),
          this.escapeCsv(item.recipientEmail),
          this.escapeCsv(item.sendStatus),
          this.escapeCsv(item.errorReason || ''),
          this.escapeCsv(item.sendTime.toISOString()),
        ];
        lines.push(values.join(','));
      }
      return lines.join('\n');
    }

    // 构建查询条件
    const conditions = [];
    if (status) {
      conditions.push(eq(sendLog.sendStatus, status));
    }
    if (startTime) {
      conditions.push(gte(sendLog.sendTime, new Date(startTime)));
    }
    if (endTime) {
      conditions.push(lte(sendLog.sendTime, new Date(endTime)));
    }

    // 获取所有记录
    const query = conditions.length > 0
      ? this.db.select({
          log: sendLog,
          handle: influencer.handle,
        }).from(sendLog)
          .leftJoin(influencer, eq(sendLog.influencerId, influencer.id))
          .where(and(...conditions))
      : this.db.select({
          log: sendLog,
          handle: influencer.handle,
        }).from(sendLog)
          .leftJoin(influencer, eq(sendLog.influencerId, influencer.id));

    const items = await query.orderBy(desc(sendLog.sendTime));

    // 生成CSV
    const headers = ['Handle', 'Recipient_Email', 'Status', 'Error_Reason', 'Send_Time'];
    const lines = [headers.join(',')];

    for (const item of items) {
      const values = [
        this.escapeCsv(item.handle || ''),
        this.escapeCsv(item.log.recipientEmail),
        this.escapeCsv(item.log.sendStatus),
        this.escapeCsv(item.log.errorReason || ''),
        this.escapeCsv(item.log.sendTime?.toISOString() || ''),
      ];
      lines.push(values.join(','));
    }

    return lines.join('\n');
  }

  private async sendEmail(
    userId: string,
    to: string,
    subject: string,
    content: string,
  ): Promise<void> {
    // 获取飞书access_token
    const accessToken = await this.authService.getAccessToken(userId);
    if (!accessToken) {
      throw new Error('未授权飞书账号');
    }

    // 调用飞书邮件API发送邮件
    const url = 'https://open.feishu.cn/open-apis/mail/v1/messages';
    const body = {
      to: [{ email: to }],
      subject,
      body: {
        content,
        content_type: 'html',
      },
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, body, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );

      if (response.data.code !== 0) {
        throw new Error(`飞书API错误: ${response.data.msg}`);
      }
    } catch (error) {
      this.logger.error('调用飞书邮件API失败:', error);
      throw error;
    }
  }

  private mapToSendLog(
    log: typeof sendLog.$inferSelect,
    handle: string | null,
  ): SendLog {
    return {
      id: log.id,
      influencerHandle: handle || '',
      recipientEmail: log.recipientEmail,
      sendStatus: log.sendStatus as 'pending' | 'success' | 'failed' | 'skipped',
      errorReason: log.errorReason || '',
      sendTime: log.sendTime?.toISOString() || '',
    };
  }

  private escapeCsv(value: string): string {
    if (!value) return '';
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
