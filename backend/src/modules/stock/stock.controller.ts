import { Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/auth-user';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';
import { StockService } from './stock.service';

@Controller('stock')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MANAGER')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  findAll() {
    return this.stockService.findAll();
  }

  @Get(':productId')
  findOne(@Param('productId') productId: string) {
    return this.stockService.findOne(productId);
  }

  @Post('adjustments')
  adjustStock(
    @Body() dto: CreateStockAdjustmentDto,
    @CurrentUser() user: AuthUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.stockService.adjustStock(
      dto.batchId,
      dto.newQtyBase,
      dto.reason,
      user.id,
      idempotencyKey,
    );
  }
}
