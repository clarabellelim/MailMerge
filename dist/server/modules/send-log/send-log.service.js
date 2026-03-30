"use strict";
var SendLogService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendLogService = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const fullstack_nestjs_core_1 = require("@lark-apaas/fullstack-nestjs-core");
const schema_1 = require("../../database/schema");
const drizzle_orm_1 = require("drizzle-orm");
const rxjs_1 = require("rxjs");
const auth_service_1 = require("../auth/auth.service");
const mem_send_log_store_1 = require("../../common/mem-send-log-store");
let SendLogService = SendLogService_1 = class SendLogService {
    db;
    httpService;
    authService;
    logger = new common_1.Logger(SendLogService_1.name);
    constructor(db, httpService, authService) {
        this.db = db;
        this.httpService = httpService;
        this.authService = authService;
    }
    isDbAvailable() {
        return !!this.db && typeof this.db.select === 'function';
    }
    async getSendLogs(page = 1, pageSize = 20, status, startTime, endTime) {
        if (!this.isDbAvailable()) {
            const all = (0, mem_send_log_store_1.memSendLogList)()
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
            conditions.push((0, drizzle_orm_1.eq)(schema_1.sendLog.sendStatus, status));
        }
        if (startTime) {
            conditions.push((0, drizzle_orm_1.gte)(schema_1.sendLog.sendTime, new Date(startTime)));
        }
        if (endTime) {
            conditions.push((0, drizzle_orm_1.lte)(schema_1.sendLog.sendTime, new Date(endTime)));
        }
        // 获取总数
        const totalResult = await this.db
            .select({ count: (0, drizzle_orm_1.count)() })
            .from(schema_1.sendLog)
            .where(conditions.length > 0 ? (0, drizzle_orm_1.and)(...conditions) : undefined);
        const total = totalResult[0]?.count || 0;
        // 获取列表，关联网红信息
        const query = conditions.length > 0
            ? this.db.select({
                log: schema_1.sendLog,
                handle: schema_1.influencer.handle,
            }).from(schema_1.sendLog)
                .leftJoin(schema_1.influencer, (0, drizzle_orm_1.eq)(schema_1.sendLog.influencerId, schema_1.influencer.id))
                .where((0, drizzle_orm_1.and)(...conditions))
            : this.db.select({
                log: schema_1.sendLog,
                handle: schema_1.influencer.handle,
            }).from(schema_1.sendLog)
                .leftJoin(schema_1.influencer, (0, drizzle_orm_1.eq)(schema_1.sendLog.influencerId, schema_1.influencer.id));
        const items = await query
            .orderBy((0, drizzle_orm_1.desc)(schema_1.sendLog.sendTime))
            .limit(pageSize)
            .offset(offset);
        return {
            items: items.map((item) => this.mapToSendLog(item.log, item.handle)),
            total,
        };
    }
    async resendEmail(logId, userId) {
        if (!this.isDbAvailable()) {
            throw new common_1.BadRequestException('本地模式未启用数据库：暂不支持重发');
        }
        // 获取日志记录
        const logResult = await this.db
            .select()
            .from(schema_1.sendLog)
            .where((0, drizzle_orm_1.eq)(schema_1.sendLog.id, logId))
            .limit(1);
        if (logResult.length === 0) {
            throw new common_1.BadRequestException('日志记录不存在');
        }
        const log = logResult[0];
        // 只能重发失败的邮件
        if (log.sendStatus !== 'failed') {
            throw new common_1.BadRequestException('只能重发失败的邮件');
        }
        // 获取模板信息
        if (!log.templateId) {
            throw new common_1.BadRequestException('原邮件模板不存在');
        }
        const templateResult = await this.db
            .select()
            .from(schema_1.emailTemplate)
            .where((0, drizzle_orm_1.eq)(schema_1.emailTemplate.id, log.templateId))
            .limit(1);
        if (templateResult.length === 0) {
            throw new common_1.BadRequestException('邮件模板不存在');
        }
        const template = templateResult[0];
        // 获取网红信息
        const influencerResult = await this.db
            .select()
            .from(schema_1.influencer)
            .where((0, drizzle_orm_1.eq)(schema_1.influencer.id, log.influencerId))
            .limit(1);
        if (influencerResult.length === 0) {
            throw new common_1.BadRequestException('网红信息不存在');
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
                .update(schema_1.sendLog)
                .set({
                sendStatus: 'success',
                errorReason: null,
                sendTime: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.sendLog.id, logId));
            return { success: true };
        }
        catch (error) {
            // 更新失败原因
            await this.db
                .update(schema_1.sendLog)
                .set({
                errorReason: error instanceof Error ? error.message : '未知错误',
                sendTime: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.sendLog.id, logId));
            throw error;
        }
    }
    async exportLogs(status, startTime, endTime) {
        if (!this.isDbAvailable()) {
            const all = (0, mem_send_log_store_1.memSendLogList)()
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
            conditions.push((0, drizzle_orm_1.eq)(schema_1.sendLog.sendStatus, status));
        }
        if (startTime) {
            conditions.push((0, drizzle_orm_1.gte)(schema_1.sendLog.sendTime, new Date(startTime)));
        }
        if (endTime) {
            conditions.push((0, drizzle_orm_1.lte)(schema_1.sendLog.sendTime, new Date(endTime)));
        }
        // 获取所有记录
        const query = conditions.length > 0
            ? this.db.select({
                log: schema_1.sendLog,
                handle: schema_1.influencer.handle,
            }).from(schema_1.sendLog)
                .leftJoin(schema_1.influencer, (0, drizzle_orm_1.eq)(schema_1.sendLog.influencerId, schema_1.influencer.id))
                .where((0, drizzle_orm_1.and)(...conditions))
            : this.db.select({
                log: schema_1.sendLog,
                handle: schema_1.influencer.handle,
            }).from(schema_1.sendLog)
                .leftJoin(schema_1.influencer, (0, drizzle_orm_1.eq)(schema_1.sendLog.influencerId, schema_1.influencer.id));
        const items = await query.orderBy((0, drizzle_orm_1.desc)(schema_1.sendLog.sendTime));
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
    async sendEmail(userId, to, subject, content) {
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
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, body, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }));
            if (response.data.code !== 0) {
                throw new Error(`飞书API错误: ${response.data.msg}`);
            }
        }
        catch (error) {
            this.logger.error('调用飞书邮件API失败:', error);
            throw error;
        }
    }
    mapToSendLog(log, handle) {
        return {
            id: log.id,
            influencerHandle: handle || '',
            recipientEmail: log.recipientEmail,
            sendStatus: log.sendStatus,
            errorReason: log.errorReason || '',
            sendTime: log.sendTime?.toISOString() || '',
        };
    }
    escapeCsv(value) {
        if (!value)
            return '';
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }
};
exports.SendLogService = SendLogService;
exports.SendLogService = SendLogService = SendLogService_1 = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__param(0, (0, common_1.Inject)(fullstack_nestjs_core_1.DRIZZLE_DATABASE)),
    tslib_1.__metadata("design:paramtypes", [Function, axios_1.HttpService,
        auth_service_1.AuthService])
], SendLogService);
