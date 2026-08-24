import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { IdempotencyService } from '../sales/idempotency.service';
import { SalesReturnsController } from './sales-returns.controller';
import { SalesReturnsService } from './sales-returns.service';

@Module({
  imports: [PrismaModule],
  controllers: [SalesReturnsController],
  providers: [IdempotencyService, SalesReturnsService],
})
export class SalesReturnsModule {}
