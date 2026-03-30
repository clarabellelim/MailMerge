"use strict";
var EmailTemplateService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailTemplateService = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const fullstack_nestjs_core_1 = require("@lark-apaas/fullstack-nestjs-core");
const schema_1 = require("../../database/schema");
const drizzle_orm_1 = require("drizzle-orm");
let EmailTemplateService = EmailTemplateService_1 = class EmailTemplateService {
    db;
    logger = new common_1.Logger(EmailTemplateService_1.name);
    memTemplates = new Map();
    constructor(db) {
        this.db = db;
    }
    isDbAvailable() {
        // When DEPRECATED_SKIP_INIT_DB_CONNECTION=1, db is a stub and lacks query methods.
        return !!this.db && typeof this.db.select === 'function';
    }
    async getTemplates() {
        if (!this.isDbAvailable()) {
            return Array.from(this.memTemplates.values()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        }
        const result = await this.db
            .select()
            .from(schema_1.emailTemplate)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.emailTemplate.createdAt));
        return result.map(this.mapToTemplate);
    }
    async createTemplate(data) {
        // 验证必填字段
        if (!data.name || !data.subject || !data.content) {
            throw new common_1.BadRequestException('模板名称、主题和内容不能为空');
        }
        if (!this.isDbAvailable()) {
            // In-memory fallback (dev mode without DB)
            if (data.isDefault) {
                for (const [id, t] of this.memTemplates.entries()) {
                    if (t.isDefault)
                        this.memTemplates.set(id, { ...t, isDefault: false });
                }
            }
            const id = data.id || globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const existing = this.memTemplates.get(id);
            const createdAt = existing?.createdAt || new Date().toISOString();
            const next = {
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
                .update(schema_1.emailTemplate)
                .set({ isDefault: false })
                .where((0, drizzle_orm_1.eq)(schema_1.emailTemplate.isDefault, true));
        }
        if (data.id) {
            // 更新现有模板
            const result = await this.db
                .update(schema_1.emailTemplate)
                .set({
                name: data.name,
                subject: data.subject,
                content: data.content,
                isDefault: data.isDefault || false,
            })
                .where((0, drizzle_orm_1.eq)(schema_1.emailTemplate.id, data.id))
                .returning();
            if (result.length === 0) {
                throw new common_1.BadRequestException('模板不存在');
            }
            return { id: result[0].id, name: result[0].name };
        }
        else {
            // 创建新模板
            const result = await this.db
                .insert(schema_1.emailTemplate)
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
    async deleteTemplate(id) {
        if (!this.isDbAvailable()) {
            const existed = this.memTemplates.delete(id);
            if (!existed)
                throw new common_1.BadRequestException('模板不存在');
            return { success: true };
        }
        const result = await this.db
            .delete(schema_1.emailTemplate)
            .where((0, drizzle_orm_1.eq)(schema_1.emailTemplate.id, id))
            .returning();
        if (result.length === 0) {
            throw new common_1.BadRequestException('模板不存在');
        }
        return { success: true };
    }
    async getDefaultTemplate() {
        if (!this.isDbAvailable()) {
            return Array.from(this.memTemplates.values()).find((t) => t.isDefault) || null;
        }
        const result = await this.db
            .select()
            .from(schema_1.emailTemplate)
            .where((0, drizzle_orm_1.eq)(schema_1.emailTemplate.isDefault, true))
            .limit(1);
        if (result.length === 0) {
            return null;
        }
        return this.mapToTemplate(result[0]);
    }
    async getTemplateById(id) {
        if (!this.isDbAvailable()) {
            return this.memTemplates.get(id) || null;
        }
        const result = await this.db
            .select()
            .from(schema_1.emailTemplate)
            .where((0, drizzle_orm_1.eq)(schema_1.emailTemplate.id, id))
            .limit(1);
        if (result.length === 0) {
            return null;
        }
        return this.mapToTemplate(result[0]);
    }
    mapToTemplate(item) {
        return {
            id: item.id,
            name: item.name,
            subject: item.subject,
            content: item.content,
            isDefault: item.isDefault,
            createdAt: item.createdAt?.toISOString() || '',
        };
    }
};
exports.EmailTemplateService = EmailTemplateService;
exports.EmailTemplateService = EmailTemplateService = EmailTemplateService_1 = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__param(0, (0, common_1.Inject)(fullstack_nestjs_core_1.DRIZZLE_DATABASE)),
    tslib_1.__metadata("design:paramtypes", [Function])
], EmailTemplateService);
