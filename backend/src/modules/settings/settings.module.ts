import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
