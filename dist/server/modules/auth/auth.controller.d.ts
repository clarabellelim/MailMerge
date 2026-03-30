import { AuthService } from './auth.service';
import type { AuthStatusResp, AuthConfigStatusResp, AuthUrlResp, AuthCallbackResp } from '@shared/api.interface';
import type { Request } from 'express';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    private getUserIdOrLocal;
    getStatus(req: Request): Promise<AuthStatusResp>;
    getConfigStatus(): AuthConfigStatusResp;
    getAuthUrl(): AuthUrlResp;
    handleCallback(code: string, req: Request): Promise<AuthCallbackResp>;
}
