"use strict";
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const fullstack_nestjs_core_1 = require("@lark-apaas/fullstack-nestjs-core");
const schema_1 = require("../../database/schema");
const drizzle_orm_1 = require("drizzle-orm");
const rxjs_1 = require("rxjs");
// 飞书OAuth2配置 - 实际部署时需要从环境变量读取
const FEISHU_CLIENT_ID = process.env.FEISHU_CLIENT_ID || '';
const FEISHU_CLIENT_SECRET = process.env.FEISHU_CLIENT_SECRET || '';
const FEISHU_REDIRECT_URI = process.env.FEISHU_REDIRECT_URI || '';
let AuthService = AuthService_1 = class AuthService {
    db;
    httpService;
    logger = new common_1.Logger(AuthService_1.name);
    memTokens = new Map();
    constructor(db, httpService) {
        this.db = db;
        this.httpService = httpService;
    }
    isDbAvailable() {
        return !!this.db && typeof this.db.select === 'function';
    }
    getAuthConfigStatus() {
        const missingConfigs = [];
        if (!FEISHU_CLIENT_ID) {
            missingConfigs.push('FEISHU_CLIENT_ID');
        }
        if (!FEISHU_CLIENT_SECRET) {
            missingConfigs.push('FEISHU_CLIENT_SECRET');
        }
        if (!FEISHU_REDIRECT_URI) {
            missingConfigs.push('FEISHU_REDIRECT_URI');
        }
        return {
            isConfigured: missingConfigs.length === 0,
            missingConfigs,
        };
    }
    async getAuthStatus(userId) {
        try {
            if (!this.isDbAvailable()) {
                const cfg = this.memTokens.get(userId);
                if (!cfg)
                    return { isAuthorized: false, expiresAt: '' };
                const isExpired = new Date() > cfg.expiresAt;
                return { isAuthorized: !isExpired, expiresAt: cfg.expiresAt.toISOString() };
            }
            const result = await this.db
                .select()
                .from(schema_1.authConfig)
                .where((0, drizzle_orm_1.sql) `((owner).user_id) = ${userId}`)
                .limit(1);
            if (result.length === 0) {
                return {
                    isAuthorized: false,
                    expiresAt: '',
                };
            }
            const config = result[0];
            const isExpired = new Date() > new Date(config.expiresAt);
            // 如果过期了，尝试刷新token
            if (isExpired && config.refreshToken) {
                try {
                    await this.refreshToken(config.id, config.refreshToken);
                    // 刷新后重新获取
                    const refreshed = await this.db
                        .select()
                        .from(schema_1.authConfig)
                        .where((0, drizzle_orm_1.eq)(schema_1.authConfig.id, config.id))
                        .limit(1);
                    if (refreshed.length > 0) {
                        return {
                            isAuthorized: true,
                            expiresAt: refreshed[0].expiresAt.toISOString(),
                        };
                    }
                }
                catch (error) {
                    this.logger.error('刷新token失败:', error);
                    return {
                        isAuthorized: false,
                        expiresAt: '',
                    };
                }
            }
            return {
                isAuthorized: !isExpired,
                expiresAt: config.expiresAt.toISOString(),
            };
        }
        catch (error) {
            this.logger.error('获取授权状态失败:', error);
            return {
                isAuthorized: false,
                expiresAt: '',
            };
        }
    }
    getAuthUrl() {
        // 检查配置是否完整
        const configStatus = this.getAuthConfigStatus();
        if (!configStatus.isConfigured) {
            throw new Error(`飞书OAuth配置不完整，缺少: ${configStatus.missingConfigs.join(', ')}`);
        }
        const state = Math.random().toString(36).substring(7);
        // Web authorization (user consent) endpoint.
        // Docs: https://open.feishu.cn/document/common-capabilities/sso/web-application-end-user-consent/guide
        // Note: scope must be URL-encoded (spaces -> %20).
        const scope = encodeURIComponent('offline_access auth:user.id:read');
        const url = `https://accounts.feishu.cn/open-apis/authen/v1/authorize` +
            `?client_id=${encodeURIComponent(FEISHU_CLIENT_ID)}` +
            `&redirect_uri=${encodeURIComponent(FEISHU_REDIRECT_URI)}` +
            `&response_type=code` +
            `&state=${encodeURIComponent(state)}` +
            `&scope=${scope}`;
        return { url };
    }
    async handleCallback(code, userId) {
        try {
            // 使用code换取access_token
            const tokenResp = await this.exchangeCodeForToken(code);
            // 计算过期时间
            const expiresAt = new Date();
            expiresAt.setSeconds(expiresAt.getSeconds() + tokenResp.expires_in);
            if (!this.isDbAvailable()) {
                this.memTokens.set(userId, {
                    accessToken: tokenResp.access_token,
                    refreshToken: tokenResp.refresh_token || '',
                    expiresAt,
                });
                return true;
            }
            // 保存或更新授权配置
            const existing = await this.db
                .select({ id: schema_1.authConfig.id })
                .from(schema_1.authConfig)
                .where((0, drizzle_orm_1.sql) `((owner).user_id) = ${userId}`)
                .limit(1);
            if (existing.length > 0) {
                // 更新
                await this.db
                    .update(schema_1.authConfig)
                    .set({
                    accessToken: tokenResp.access_token,
                    refreshToken: tokenResp.refresh_token || '',
                    expiresAt,
                })
                    .where((0, drizzle_orm_1.eq)(schema_1.authConfig.id, existing[0].id));
            }
            else {
                // 新建
                await this.db.insert(schema_1.authConfig).values({
                    accessToken: tokenResp.access_token,
                    refreshToken: tokenResp.refresh_token || '',
                    expiresAt,
                    owner: userId,
                });
            }
            return true;
        }
        catch (error) {
            this.logger.error('处理授权回调失败:', error);
            return false;
        }
    }
    async getAccessToken(userId) {
        try {
            if (!this.isDbAvailable()) {
                const cfg = this.memTokens.get(userId);
                if (!cfg)
                    return null;
                // No refresh in mem mode for MVP
                if (new Date() > cfg.expiresAt)
                    return null;
                return cfg.accessToken;
            }
            const result = await this.db
                .select()
                .from(schema_1.authConfig)
                .where((0, drizzle_orm_1.sql) `((owner).user_id) = ${userId}`)
                .limit(1);
            if (result.length === 0) {
                return null;
            }
            const config = result[0];
            const isExpired = new Date() > new Date(config.expiresAt);
            if (isExpired && config.refreshToken) {
                try {
                    await this.refreshToken(config.id, config.refreshToken);
                    // 刷新后重新获取
                    const refreshed = await this.db
                        .select({ accessToken: schema_1.authConfig.accessToken })
                        .from(schema_1.authConfig)
                        .where((0, drizzle_orm_1.eq)(schema_1.authConfig.id, config.id))
                        .limit(1);
                    return refreshed[0]?.accessToken || null;
                }
                catch (error) {
                    this.logger.error('刷新token失败:', error);
                    return null;
                }
            }
            return config.accessToken;
        }
        catch (error) {
            this.logger.error('获取access_token失败:', error);
            return null;
        }
    }
    async exchangeCodeForToken(code) {
        const url = 'https://open.feishu.cn/open-apis/authen/v2/oauth/token';
        const body = {
            grant_type: 'authorization_code',
            code,
            client_id: FEISHU_CLIENT_ID,
            client_secret: FEISHU_CLIENT_SECRET,
            redirect_uri: FEISHU_REDIRECT_URI,
        };
        const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, body));
        if (response.data?.code !== 0) {
            throw new Error(`飞书API错误: ${response.data?.msg || 'unknown'}`);
        }
        return response.data;
    }
    async refreshToken(configId, refreshToken) {
        const url = 'https://open.feishu.cn/open-apis/authen/v2/oauth/token';
        const body = {
            grant_type: 'refresh_token',
            client_id: FEISHU_CLIENT_ID,
            client_secret: FEISHU_CLIENT_SECRET,
            refresh_token: refreshToken,
        };
        const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, body));
        if (response.data?.code !== 0) {
            throw new Error(`刷新token失败: ${response.data?.msg || 'unknown'}`);
        }
        const tokenData = response.data;
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);
        await this.db
            .update(schema_1.authConfig)
            .set({
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token || refreshToken,
            expiresAt,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.authConfig.id, configId));
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__param(0, (0, common_1.Inject)(fullstack_nestjs_core_1.DRIZZLE_DATABASE)),
    tslib_1.__metadata("design:paramtypes", [Function, axios_1.HttpService])
], AuthService);
