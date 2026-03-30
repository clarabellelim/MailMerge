import {
  Controller,
  Get,
  Query,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type {
  AuthStatusResp,
  AuthConfigStatusResp,
  AuthUrlResp,
  AuthCallbackResp,
} from '@shared/api.interface';
import type { Request } from 'express';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private getUserIdOrLocal(req: Request): string {
    return req.userContext?.userId || 'local-dev';
  }

  @Get('status')
  async getStatus(@Req() req: Request): Promise<AuthStatusResp> {
    // Local dev: allow status check without platform login.
    return this.authService.getAuthStatus(this.getUserIdOrLocal(req));
  }

  @Get('config-status')
  getConfigStatus(): AuthConfigStatusResp {
    return this.authService.getAuthConfigStatus();
  }

  @Get('url')
  getAuthUrl(): AuthUrlResp {
    return this.authService.getAuthUrl();
  }

  @Get('callback')
  async handleCallback(
    @Query('code') code: string,
    @Req() req: Request,
  ): Promise<AuthCallbackResp> {
    if (!code) {
      throw new BadRequestException('缺少授权码');
    }

    const success = await this.authService.handleCallback(code, this.getUserIdOrLocal(req));
    return { success };
  }
}
