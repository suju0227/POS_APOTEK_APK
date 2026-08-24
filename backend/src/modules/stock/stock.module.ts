import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { IdempotencyService } from '../sales/idempotency.service';
import { StockController } from './stock.controller';
import { StockMutationsController } from './stock-mutations.controller';
import { StockMutationsService } from './stock-mutations.service';
import { StockService } from './stock.service';

@Module({
  imports: [PrismaModule],
  controllers: [StockMutationsController, StockController],
  providers: [IdempotencyService, StockService, StockMutationsService],
})
export class StockModule {}
