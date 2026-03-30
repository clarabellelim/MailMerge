import { Injectable, Inject, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { authConfig } from '../../database/schema';
import { eq, sql } from 'drizzle-orm';
import { firstValueFrom } from 'rxjs';
import type {
  AuthStatusResp,
  AuthConfigStatusResp,
  AuthUrlResp,
} from '@shared/api.interface';

interface FeishuTokenResp {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

// 飞书OAuth2配置 - 实际部署时需要从环境变量读取
const FEISHU_CLIENT_ID = process.env.FEISHU_CLIENT_ID || '';
const FEISHU_CLIENT_SECRET = process.env.FEISHU_CLIENT_SECRET || '';
const FEISHU_REDIRECT_URI = process.env.FEISHU_REDIRECT_URI || '';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly memTokens = new Map<
    string,
    { accessToken: string; refreshToken: string; expiresAt: Date }
  >();

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly httpService: HttpService,
  ) {}

  private isDbAvailable(): boolean {
    return !!this.db && typeof (this.db as any).select === 'function';
  }

  getAuthConfigStatus(): AuthConfigStatusResp {
    const missingConfigs: string[] = [];

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

  async getAuthStatus(userId: string): Promise<AuthStatusResp> {
    try {
      if (!this.isDbAvailable()) {
        const cfg = this.memTokens.get(userId);
        if (!cfg) return { isAuthorized: false, expiresAt: '' };
        const isExpired = new Date() > cfg.expiresAt;
        return { isAuthorized: !isExpired, expiresAt: cfg.expiresAt.toISOString() };
      }

      const result = await this.db
        .select()
        .from(authConfig)
        .where(sql`((owner).user_id) = ${userId}`)
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
            .from(authConfig)
            .where(eq(authConfig.id, config.id))
            .limit(1);
          if (refreshed.length > 0) {
            return {
              isAuthorized: true,
              expiresAt: refreshed[0].expiresAt.toISOString(),
            };
          }
        } catch (error) {
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
    } catch (error) {
      this.logger.error('获取授权状态失败:', error);
      return {
        isAuthorized: false,
        expiresAt: '',
      };
    }
  }

  getAuthUrl(): AuthUrlResp {
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
    const url =
      `https://accounts.feishu.cn/open-apis/authen/v1/authorize` +
      `?client_id=${encodeURIComponent(FEISHU_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(FEISHU_REDIRECT_URI)}` +
      `&response_type=code` +
      `&state=${encodeURIComponent(state)}` +
      `&scope=${scope}`;
    return { url };
  }

  async handleCallback(code: string, userId: string): Promise<boolean> {
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
        .select({ id: authConfig.id })
        .from(authConfig)
        .where(sql`((owner).user_id) = ${userId}`)
        .limit(1);

      if (existing.length > 0) {
        // 更新
        await this.db
          .update(authConfig)
          .set({
            accessToken: tokenResp.access_token,
            refreshToken: tokenResp.refresh_token || '',
            expiresAt,
          })
          .where(eq(authConfig.id, existing[0].id));
      } else {
        // 新建
        await this.db.insert(authConfig).values({
          accessToken: tokenResp.access_token,
          refreshToken: tokenResp.refresh_token || '',
          expiresAt,
          owner: userId,
        });
      }

      return true;
    } catch (error) {
      this.logger.error('处理授权回调失败:', error);
      return false;
    }
  }

  async getAccessToken(userId: string): Promise<string | null> {
    try {
      if (!this.isDbAvailable()) {
        const cfg = this.memTokens.get(userId);
        if (!cfg) return null;
        // No refresh in mem mode for MVP
        if (new Date() > cfg.expiresAt) return null;
        return cfg.accessToken;
      }

      const result = await this.db
        .select()
        .from(authConfig)
        .where(sql`((owner).user_id) = ${userId}`)
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
            .select({ accessToken: authConfig.accessToken })
            .from(authConfig)
            .where(eq(authConfig.id, config.id))
            .limit(1);
          return refreshed[0]?.accessToken || null;
        } catch (error) {
          this.logger.error('刷新token失败:', error);
          return null;
        }
      }

      return config.accessToken;
    } catch (error) {
      this.logger.error('获取access_token失败:', error);
      return null;
    }
  }

  private async exchangeCodeForToken(code: string): Promise<FeishuTokenResp> {
    const url = 'https://open.feishu.cn/open-apis/authen/v2/oauth/token';
    const body = {
      grant_type: 'authorization_code',
      code,
      client_id: FEISHU_CLIENT_ID,
      client_secret: FEISHU_CLIENT_SECRET,
      redirect_uri: FEISHU_REDIRECT_URI,
    };

    const response = await firstValueFrom(
      this.httpService.post(url, body),
    );

    if (response.data?.code !== 0) {
      throw new Error(`飞书API错误: ${response.data?.msg || 'unknown'}`);
    }

    return response.data as FeishuTokenResp;
  }

  private async refreshToken(configId: string, refreshToken: string): Promise<void> {
    const url = 'https://open.feishu.cn/open-apis/authen/v2/oauth/token';
    const body = {
      grant_type: 'refresh_token',
      client_id: FEISHU_CLIENT_ID,
      client_secret: FEISHU_CLIENT_SECRET,
      refresh_token: refreshToken,
    };

    const response = await firstValueFrom(
      this.httpService.post(url, body),
    );

    if (response.data?.code !== 0) {
      throw new Error(`刷新token失败: ${response.data?.msg || 'unknown'}`);
    }

    const tokenData: FeishuTokenResp = response.data as FeishuTokenResp;
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

    await this.db
      .update(authConfig)
      .set({
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || refreshToken,
        expiresAt,
      })
      .where(eq(authConfig.id, configId));
  }
}
