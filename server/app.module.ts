import { APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { PlatformModule } from '@lark-apaas/fullstack-nestjs-core';

import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { ViewModule } from './modules/view/view.module';
import { ScanModule } from './modules/scan/scan.module';
import { InfluencerModule } from './modules/influencer/influencer.module';
import { AuthModule } from './modules/auth/auth.module';
import { EmailTemplateModule } from './modules/email-template/email-template.module';
import { EmailSendModule } from './modules/email-send/email-send.module';
import { SendLogModule } from './modules/send-log/send-log.module';

@Module({
  imports: [
    // 平台 Module，提供平台能力
    PlatformModule.forRoot({ enableCsrf: false } as any),
    // ====== @route-section: business-modules START ======
    ScanModule,
    InfluencerModule,
    AuthModule,
    EmailTemplateModule,
    EmailSendModule,
    SendLogModule,
    // ====== @route-section: business-modules END ======

    // ⚠️ @route-order: last
    // ViewModule is the fallback route module, must be registered last.
    ViewModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
