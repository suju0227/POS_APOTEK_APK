import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { IdempotencyService } from '../sales/idempotency.service';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';

@Module({
  imports: [PrismaModule],
  controllers: [PurchasesController],
  providers: [IdempotencyService, PurchasesService],
})
export class PurchasesModule {}
