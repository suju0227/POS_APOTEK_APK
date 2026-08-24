import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SalesService } from './sales.service';

@Controller('cashier/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('KASIR', 'MANAGER')
export class CashierProductsController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  findAll(@Query('q') q?: string) {
    return this.salesService.findCashierProducts(q);
  }
}
