import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { emailTemplate } from '../../database/schema';
import { eq, desc } from 'drizzle-orm';
import type {
  EmailTemplate,
  EmailTemplateCreateReq,
  EmailTemplateCreateResp,
  EmailTemplateDeleteResp,
} from '@shared/api.interface';

@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);
  private readonly memTemplates = new Map<string, EmailTemplate>();

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  private isDbAvailable(): boolean {
    // When DEPRECATED_SKIP_INIT_DB_CONNECTION=1, db is a stub and lacks query methods.
    return !!this.db && typeof (this.db as any).select === 'function';
  }

  async getTemplates(): Promise<EmailTemplate[]> {
    if (!this.isDbAvailable()) {
      return Array.from(this.memTemplates.values()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    }
    const result = await this.db
      .select()
      .from(emailTemplate)
      .orderBy(desc(emailTemplate.createdAt));

    return result.map(this.mapToTemplate);
  }

  async createTemplate(
    data: EmailTemplateCreateReq,
  ): Promise<EmailTemplateCreateResp> {
    // 验证必填字段
    if (!data.name || !data.subject || !data.content) {
      throw new BadRequestException('模板名称、主题和内容不能为空');
    }

    if (!this.isDbAvailable()) {
      // In-memory fallback (dev mode without DB)
      if (data.isDefault) {
        for (const [id, t] of this.memTemplates.entries()) {
          if (t.isDefault) this.memTemplates.set(id, { ...t, isDefault: false });
        }
      }

      const id = data.id || globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const existing = this.memTemplates.get(id);
      const createdAt = existing?.createdAt || new Date().toISOString();
      const next: EmailTemplate = {
        id,
        name: data.name,
        subject: data.subject,
        content: data.content,
        isDefault: !!data.isDefault,
        createdAt,
      };
      this.memTemplates.set(id, next);
      return { id, name: next.name };
    }

    // 如果设置为默认，先取消其他默认模板
    if (data.isDefault) {
      await this.db
        .update(emailTemplate)
        .set({ isDefault: false })
        .where(eq(emailTemplate.isDefault, true));
    }

    if (data.id) {
      // 更新现有模板
      const result = await this.db
        .update(emailTemplate)
        .set({
          name: data.name,
          subject: data.subject,
          content: data.content,
          isDefault: data.isDefault || false,
        })
        .where(eq(emailTemplate.id, data.id))
        .returning();

      if (result.length === 0) {
        throw new BadRequestException('模板不存在');
      }

      return { id: result[0].id, name: result[0].name };
    } else {
      // 创建新模板
      const result = await this.db
        .insert(emailTemplate)
        .values({
          name: data.name,
          subject: data.subject,
          content: data.content,
          isDefault: data.isDefault || false,
        })
        .returning();

      return { id: result[0].id, name: result[0].name };
    }
  }

  async deleteTemplate(id: string): Promise<EmailTemplateDeleteResp> {
    if (!this.isDbAvailable()) {
      const existed = this.memTemplates.delete(id);
      if (!existed) throw new BadRequestException('模板不存在');
      return { success: true };
    }
    const result = await this.db
      .delete(emailTemplate)
      .where(eq(emailTemplate.id, id))
      .returning();

    if (result.length === 0) {
      throw new BadRequestException('模板不存在');
    }

    return { success: true };
  }

  async getDefaultTemplate(): Promise<EmailTemplate | null> {
    if (!this.isDbAvailable()) {
      return Array.from(this.memTemplates.values()).find((t) => t.isDefault) || null;
    }
    const result = await this.db
      .select()
      .from(emailTemplate)
      .where(eq(emailTemplate.isDefault, true))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapToTemplate(result[0]);
  }

  async getTemplateById(id: string): Promise<EmailTemplate | null> {
    if (!this.isDbAvailable()) {
      return this.memTemplates.get(id) || null;
    }
    const result = await this.db
      .select()
      .from(emailTemplate)
      .where(eq(emailTemplate.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapToTemplate(result[0]);
  }

  private mapToTemplate(item: typeof emailTemplate.$inferSelect): EmailTemplate {
    return {
      id: item.id,
      name: item.name,
      subject: item.subject,
      content: item.content,
      isDefault: item.isDefault,
      createdAt: item.createdAt?.toISOString() || '',
    };
  }
}
