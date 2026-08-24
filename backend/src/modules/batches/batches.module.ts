import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { BatchesController } from './batches.controller';
import { BatchesService } from './batches.service';

@Module({
  imports: [PrismaModule],
  controllers: [BatchesController],
  providers: [BatchesService],
})
export class BatchesModule {}
