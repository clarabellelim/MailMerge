"use strict";
var InfluencerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InfluencerService = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const fullstack_nestjs_core_1 = require("@lark-apaas/fullstack-nestjs-core");
const schema_1 = require("../../database/schema");
const drizzle_orm_1 = require("drizzle-orm");
const XLSX = tslib_1.__importStar(require("xlsx"));
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let InfluencerService = InfluencerService_1 = class InfluencerService {
    db;
    logger = new common_1.Logger(InfluencerService_1.name);
    memInfluencers = new Map();
    constructor(db) {
        this.db = db;
    }
    isDbAvailable() {
        // When DEPRECATED_SKIP_INIT_DB_CONNECTION=1, db is a stub and lacks query methods.
        return !!this.db && typeof this.db.select === 'function';
    }
    async getInfluencers(page = 1, pageSize = 20, verified) {
        if (!this.isDbAvailable()) {
            const all = Array.from(this.memInfluencers.values())
                .filter((x) => (verified === undefined ? true : x.verified === verified))
                .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
            const offset = (page - 1) * pageSize;
            return {
                items: all.slice(offset, offset + pageSize),
                total: all.length,
            };
        }
        const offset = (page - 1) * pageSize;
        // 构建查询条件
        const conditions = [];
        if (verified !== undefined) {
            conditions.push((0, drizzle_orm_1.eq)(schema_1.influencer.verified, verified));
        }
        // 获取总数
        const totalResult = await this.db
            .select({ count: (0, drizzle_orm_1.count)() })
            .from(schema_1.influencer)
            .where(conditions.length > 0 ? (0, drizzle_orm_1.and)(...conditions) : undefined);
        const total = totalResult[0]?.count || 0;
        // 获取列表
        const query = conditions.length > 0
            ? this.db.select().from(schema_1.influencer).where((0, drizzle_orm_1.and)(...conditions))
            : this.db.select().from(schema_1.influencer);
        const items = await query
            .orderBy((0, drizzle_orm_1.desc)(schema_1.influencer.createdAt))
            .limit(pageSize)
            .offset(offset);
        return {
            items: items.map(this.mapToInfluencer),
            total,
        };
    }
    async getInfluencersByIds(ids) {
        if (!ids || ids.length === 0)
            return [];
        if (!this.isDbAvailable()) {
            const map = this.memInfluencers;
            const out = [];
            for (const id of ids) {
                const item = map.get(id);
                if (item)
                    out.push(item);
            }
            return out;
        }
        const items = await this.db
            .select()
            .from(schema_1.influencer)
            .where((0, drizzle_orm_1.inArray)(schema_1.influencer.id, ids));
        return items.map(this.mapToInfluencer);
    }
    async updateInfluencer(id, data) {
        // 验证邮箱格式
        if (data.manualEmail && !EMAIL_REGEX.test(data.manualEmail)) {
            throw new common_1.BadRequestException('邮箱格式不正确');
        }
        if (!this.isDbAvailable()) {
            const existing = this.memInfluencers.get(id);
            if (!existing)
                throw new common_1.BadRequestException('记录不存在');
            const next = {
                ...existing,
                manualEmail: data.manualEmail !== undefined ? data.manualEmail : existing.manualEmail,
                verified: data.verified !== undefined ? data.verified : existing.verified,
                updatedAt: new Date().toISOString(),
            };
            this.memInfluencers.set(id, next);
            return { id, manualEmail: next.manualEmail || '', verified: next.verified };
        }
        const updateData = {};
        if (data.manualEmail !== undefined) {
            updateData.manualEmail = data.manualEmail;
        }
        if (data.verified !== undefined) {
            updateData.verified = data.verified;
        }
        const result = await this.db
            .update(schema_1.influencer)
            .set(updateData)
            .where((0, drizzle_orm_1.eq)(schema_1.influencer.id, id))
            .returning();
        if (result.length === 0) {
            throw new common_1.BadRequestException('记录不存在');
        }
        return {
            id: result[0].id,
            manualEmail: result[0].manualEmail || '',
            verified: result[0].verified,
        };
    }
    async uploadCsv(csvContent) {
        const lines = csvContent.trim().split('\n');
        if (lines.length < 2) {
            throw new common_1.BadRequestException('CSV文件格式不正确');
        }
        const headers = this.parseCsvLine(lines[0]);
        const handleIndex = headers.indexOf('Handle');
        const platformIndex = headers.indexOf('Platform');
        const followersIndex = headers.indexOf('Followers');
        const emailIndex = headers.indexOf('Email_Found');
        const linkIndex = headers.indexOf('Contact_Link_Fallback');
        if (handleIndex === -1 || platformIndex === -1) {
            throw new common_1.BadRequestException('CSV文件缺少必要的列');
        }
        let successCount = 0;
        let failedCount = 0;
        for (let i = 1; i < lines.length; i++) {
            try {
                const values = this.parseCsvLine(lines[i]);
                if (values.length < Math.max(handleIndex, platformIndex) + 1) {
                    failedCount++;
                    continue;
                }
                const handle = (values[handleIndex] || '').trim();
                const platform = (values[platformIndex] || '').trim();
                if (!handle || !platform) {
                    failedCount++;
                    continue;
                }
                const followers = followersIndex > -1 ? parseInt(values[followersIndex]) || 0 : 0;
                const emailFound = emailIndex > -1 ? (values[emailIndex] || '').trim() || null : null;
                const contactLinkFallback = linkIndex > -1 ? (values[linkIndex] || '').trim() || null : null;
                if (!this.isDbAvailable()) {
                    const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
                    const now = new Date().toISOString();
                    this.memInfluencers.set(id, {
                        id,
                        handle,
                        platform,
                        followers,
                        engagementRate: 0,
                        bio: '',
                        emailFound: emailFound || '',
                        contactLinkFallback: contactLinkFallback || '',
                        verified: false,
                        manualEmail: '',
                        scanStatus: 'complete',
                        createdAt: now,
                        updatedAt: now,
                    });
                }
                else {
                    await this.db.insert(schema_1.influencer).values({
                        handle,
                        platform,
                        followers,
                        emailFound,
                        contactLinkFallback,
                        scanStatus: 'complete',
                    });
                }
                successCount++;
            }
            catch (error) {
                this.logger.error(`解析CSV行失败: ${lines[i]}`, error);
                failedCount++;
            }
        }
        return { successCount, failedCount };
    }
    async uploadFile(file) {
        const name = (file.originalname || '').toLowerCase();
        if (name.endsWith('.csv')) {
            const csv = file.buffer.toString('utf-8');
            return this.uploadCsv(csv);
        }
        if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
            const wb = XLSX.read(file.buffer, { type: 'buffer' });
            const sheetName = wb.SheetNames[0];
            if (!sheetName)
                throw new common_1.BadRequestException('Excel文件中没有工作表');
            const ws = wb.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
            return this.uploadRows(rows);
        }
        throw new common_1.BadRequestException('仅支持 .csv / .xlsx 文件');
    }
    async uploadRows(rows) {
        if (!rows || rows.length === 0) {
            throw new common_1.BadRequestException('文件内容为空');
        }
        // Accept either CSV/Excel export headers
        const get = (row, key) => {
            const v = row[key];
            return v === undefined || v === null ? '' : String(v).trim();
        };
        let successCount = 0;
        let failedCount = 0;
        for (const row of rows) {
            try {
                const handle = get(row, 'Handle');
                const platform = get(row, 'Platform');
                if (!handle || !platform) {
                    failedCount++;
                    continue;
                }
                const followersRaw = get(row, 'Followers');
                const followers = followersRaw ? parseInt(followersRaw.replace(/,/g, ''), 10) || 0 : 0;
                const emailFound = get(row, 'Email_Found') || null;
                const contactLinkFallback = get(row, 'Contact_Link_Fallback') || null;
                if (!this.isDbAvailable()) {
                    const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
                    const now = new Date().toISOString();
                    this.memInfluencers.set(id, {
                        id,
                        handle,
                        platform,
                        followers,
                        engagementRate: 0,
                        bio: '',
                        emailFound: emailFound || '',
                        contactLinkFallback: contactLinkFallback || '',
                        verified: false,
                        manualEmail: '',
                        scanStatus: 'complete',
                        createdAt: now,
                        updatedAt: now,
                    });
                }
                else {
                    await this.db.insert(schema_1.influencer).values({
                        handle,
                        platform,
                        followers,
                        emailFound,
                        contactLinkFallback,
                        scanStatus: 'complete',
                    });
                }
                successCount++;
            }
            catch (error) {
                this.logger.error('解析上传行失败', error);
                failedCount++;
            }
        }
        return { successCount, failedCount };
    }
    parseCsvLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                }
                else {
                    inQuotes = !inQuotes;
                }
            }
            else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            }
            else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }
    mapToInfluencer(item) {
        return {
            id: item.id,
            handle: item.handle,
            platform: item.platform,
            followers: item.followers,
            engagementRate: item.engagementRate || 0,
            bio: item.bio || '',
            emailFound: item.emailFound || '',
            contactLinkFallback: item.contactLinkFallback || '',
            verified: item.verified,
            manualEmail: item.manualEmail || '',
            scanStatus: item.scanStatus,
            createdAt: item.createdAt?.toISOString() || '',
            updatedAt: item.updatedAt?.toISOString() || '',
        };
    }
};
exports.InfluencerService = InfluencerService;
exports.InfluencerService = InfluencerService = InfluencerService_1 = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__param(0, (0, common_1.Inject)(fullstack_nestjs_core_1.DRIZZLE_DATABASE)),
    tslib_1.__metadata("design:paramtypes", [Function])
], InfluencerService);
