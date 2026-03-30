import { Module } from '@nestjs/common';
import { SendLogController } from './send-log.controller';
import { SendLogService } from './send-log.service';
import { HttpModule } from '@nestjs/axios';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [HttpModule, AuthModule],
  controllers: [SendLogController],
  providers: [SendLogService],
})
export class SendLogModule {}
