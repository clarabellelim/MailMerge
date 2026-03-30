import { Module } from '@nestjs/common';
import { EmailSendController } from './email-send.controller';
import { EmailSendService } from './email-send.service';
import { HttpModule } from '@nestjs/axios';
import { AuthModule } from '../auth/auth.module';
import { InfluencerModule } from '../influencer/influencer.module';
import { EmailTemplateModule } from '../email-template/email-template.module';

@Module({
  imports: [HttpModule, AuthModule, InfluencerModule, EmailTemplateModule],
  controllers: [EmailSendController],
  providers: [EmailSendService],
})
export class EmailSendModule {}
