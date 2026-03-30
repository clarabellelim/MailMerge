import { HttpService } from '@nestjs/axios';
import { type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import type { AuthStatusResp, AuthConfigStatusResp, AuthUrlResp } from '@shared/api.interface';
export declare class AuthService {
    private readonly db;
    private readonly httpService;
    private readonly logger;
    private readonly memTokens;
    constructor(db: PostgresJsDatabase, httpService: HttpService);
    private isDbAvailable;
    getAuthConfigStatus(): AuthConfigStatusResp;
    getAuthStatus(userId: string): Promise<AuthStatusResp>;
    getAuthUrl(): AuthUrlResp;
    handleCallback(code: string, userId: string): Promise<boolean>;
    getAccessToken(userId: string): Promise<string | null>;
    private exchangeCodeForToken;
    private refreshToken;
}
