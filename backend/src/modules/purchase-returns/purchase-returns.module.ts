import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { IdempotencyService } from '../sales/idempotency.service';
import { PurchaseReturnsController } from './purchase-returns.controller';
import { PurchaseReturnsService } from './purchase-returns.service';

@Module({
  imports: [PrismaModule],
  controllers: [PurchaseReturnsController],
  providers: [IdempotencyService, PurchaseReturnsService],
})
export class PurchaseReturnsModule {}
