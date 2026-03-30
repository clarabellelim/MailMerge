import { Injectable, Inject, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { influencer, sendLog, emailTemplate } from '../../database/schema';
import { inArray, eq } from 'drizzle-orm';
import { firstValueFrom } from 'rxjs';
import type {
  EmailSendResp,
  EmailSendStatusResp,
} from '@shared/api.interface';
import { AuthService } from '../auth/auth.service';
import { InfluencerService } from '../influencer/influencer.service';
import { EmailTemplateService } from '../email-template/email-template.service';
import { memSendLogAppend } from '../../common/mem-send-log-store';

interface SendTask {
  taskId: string;
  influencerIds: string[];
  templateId: string;
  success: number;
  failed: number;
  skipped: number;
  status: 'running' | 'completed';
  logs: string[];
}

const BATCH_SIZE = 30;
const DELAY_BETWEEN_EMAILS = 15000; // 15秒

function isFakeSendEnabled(): boolean {
  return process.env.DEV_FAKE_EMAIL_SEND === '1';
}

function base64UrlEncode(input: string): string {
  // Feishu requires base64url (RFC 4648 URL-safe) for mail content.
  const b64 = Buffer.from(input, 'utf8').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

@Injectable()
export class EmailSendService {
  private readonly logger = new Logger(EmailSendService.name);
  private tasks: Map<string, SendTask> = new Map();

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly httpService: HttpService,
    private readonly authService: AuthService,
    private readonly influencerService: InfluencerService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  private isDbAvailable(): boolean {
    return !!this.db && typeof (this.db as any).select === 'function';
  }

  async startSend(
    influencerIds: string[],
    templateId: string,
    userId: string,
  ): Promise<EmailSendResp> {
    const taskId = `send_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const task: SendTask = {
      taskId,
      influencerIds,
      templateId,
      success: 0,
      failed: 0,
      skipped: 0,
      status: 'running',
      logs: [],
    };

    this.tasks.set(taskId, task);

    // 异步执行发送
    this.runSend(task, userId).catch((error) => {
      this.logger.error(`发送任务 ${taskId} 失败:`, error);
      task.status = 'completed';
    });

    return { taskId };
  }

  getSendStatus(taskId: string): EmailSendStatusResp | null {
    const task = this.tasks.get(taskId);
    if (!task) {
      return null;
    }

    return {
      success: task.success,
      failed: task.failed,
      skipped: task.skipped,
      total: task.influencerIds.length,
      status: task.status,
    };
  }

  private async runSend(task: SendTask, userId: string): Promise<void> {
    // 获取模板信息
    const template = this.isDbAvailable()
      ? (await this.db
          .select()
          .from(emailTemplate)
          .where(eq(emailTemplate.id, task.templateId))
          .limit(1))[0]
      : await this.emailTemplateService.getTemplateById(task.templateId);

    if (!template) {
      this.logger.error('模板不存在');
      task.status = 'completed';
      return;
    }

    // 分批处理
    for (let i = 0; i < task.influencerIds.length; i += BATCH_SIZE) {
      const batch = task.influencerIds.slice(i, i + BATCH_SIZE);

      // 获取网红信息
      const influencers = this.isDbAvailable()
        ? await this.db
            .select()
            .from(influencer)
            .where(inArray(influencer.id, batch))
        : await this.influencerService.getInfluencersByIds(batch);

      // Preserve influencerIds order for pacing calculations.
      const infMap = new Map((influencers as any[]).map((inf) => [inf.id, inf]));
      const ordered = batch.map((id) => infMap.get(id)).filter((x) => !!x) as any[];

      for (let localIndex = 0; localIndex < ordered.length; localIndex++) {
        const inf = ordered[localIndex];
        const manualEmail = (inf.manualEmail || '').trim();
        const emailFound = (inf.emailFound || '').trim();
        // 确定邮箱优先级：manual_email > email_found
        const recipientEmail = manualEmail || emailFound;

        if (!recipientEmail) {
          task.skipped++;
          task.logs.push(`跳过 ${inf.handle}: 无有效邮箱`);
          if (this.isDbAvailable()) {
            await this.db.insert(sendLog).values({
              influencerId: inf.id,
              templateId: task.templateId,
              recipientEmail: '',
              sendStatus: 'skipped',
              errorReason: 'no valid email',
              sendTime: new Date(),
            });
          } else {
            memSendLogAppend({
              influencerId: inf.id,
              influencerHandle: inf.handle,
              templateId: task.templateId,
              recipientEmail: '',
              sendStatus: 'skipped',
              errorReason: 'no valid email',
            });
          }
          continue;
        }

        try {
          // 替换模板变量
          const subject = template.subject.replace(/\{\{name\}\}/g, inf.handle);
          const content = template.content.replace(/\{\{name\}\}/g, inf.handle);

          // 发送邮件
          await this.sendEmail(userId, recipientEmail, subject, content);

          // 记录成功日志
          if (this.isDbAvailable()) {
            await this.db.insert(sendLog).values({
              influencerId: inf.id,
              templateId: task.templateId,
              recipientEmail,
              sendStatus: 'success',
              sendTime: new Date(),
            });
          } else {
            memSendLogAppend({
              influencerId: inf.id,
              influencerHandle: inf.handle,
              templateId: task.templateId,
              recipientEmail,
              sendStatus: 'success',
            });
          }

          task.success++;
        } catch (error) {
          this.logger.error(`发送邮件失败给 ${inf.handle}:`, error);

          // 记录失败日志
          if (this.isDbAvailable()) {
            await this.db.insert(sendLog).values({
              influencerId: inf.id,
              templateId: task.templateId,
              recipientEmail,
              sendStatus: 'failed',
              errorReason: error instanceof Error ? error.message : '未知错误',
              sendTime: new Date(),
            });
          } else {
            memSendLogAppend({
              influencerId: inf.id,
              influencerHandle: inf.handle,
              templateId: task.templateId,
              recipientEmail,
              sendStatus: 'failed',
              errorReason: error instanceof Error ? error.message : '未知错误',
            });
          }

          task.failed++;
        }

        // 间隔15秒
        const globalIndex = i + localIndex;
        if (!isFakeSendEnabled() && globalIndex < task.influencerIds.length - 1) {
          await this.sleep(DELAY_BETWEEN_EMAILS);
        }
      }
    }

    task.status = 'completed';
  }

  private async sendEmail(
    userId: string,
    to: string,
    subject: string,
    content: string,
  ): Promise<void> {
    if (isFakeSendEnabled()) {
      this.logger.warn(
        `[DEV_FAKE_EMAIL_SEND=1] Skip Feishu API; to="${to}", subject="${subject}"`,
      );
      return;
    }

    // 获取飞书access_token
    if (!userId) {
      throw new Error('未登录/未绑定用户，无法获取飞书授权令牌');
    }
    const accessToken = await this.authService.getAccessToken(userId);
    if (!accessToken) {
      throw new Error('未授权飞书账号（请先在“授权配置”完成Feishu OAuth）');
    }

    // 调用飞书邮件API发送邮件
    const url = 'https://open.feishu.cn/open-apis/mail/v1/user_mailboxes/me/messages/send';
    const body = {
      subject,
      to: [{ mail_address: to }],
      // Tiptap content is HTML; Feishu expects base64url-encoded mail content.
      body_html: base64UrlEncode(content),
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, body, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=utf-8',
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
