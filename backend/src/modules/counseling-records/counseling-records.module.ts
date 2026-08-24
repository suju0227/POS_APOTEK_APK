import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { CounselingRecordsController } from './counseling-records.controller';
import { CounselingRecordsService } from './counseling-records.service';

@Module({
  imports: [PrismaModule],
  controllers: [CounselingRecordsController],
  providers: [CounselingRecordsService],
})
export class CounselingRecordsModule {}
