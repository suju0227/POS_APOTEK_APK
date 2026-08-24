import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { CashierProductsController } from './cashier-products.controller';
import { DiscountService } from './discount.service';
import { FefoService } from './fefo.service';
import { IdempotencyService } from './idempotency.service';
import { PaymentService } from './payment.service';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [PrismaModule],
  controllers: [CashierProductsController, SalesController],
  providers: [
    DiscountService,
    FefoService,
    IdempotencyService,
    PaymentService,
    SalesService,
  ],
  exports: [
    DiscountService,
    FefoService,
    IdempotencyService,
    PaymentService,
    SalesService,
  ],
})
export class SalesModule {}
