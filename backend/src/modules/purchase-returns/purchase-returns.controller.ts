import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/auth-user';
import { CreatePurchaseReturnDto } from './dto/create-purchase-return.dto';
import { PurchaseReturnsService } from './purchase-returns.service';

@Controller('purchase-returns')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MANAGER')
export class PurchaseReturnsController {
  constructor(private readonly purchaseReturnsService: PurchaseReturnsService) {}

  @Get()
  findAll() {
    return this.purchaseReturnsService.findAll();
  }

  @Post()
  create(
    @Body() dto: CreatePurchaseReturnDto,
    @CurrentUser() user: AuthUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.purchaseReturnsService.create(dto, user, idempotencyKey);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchaseReturnsService.findOne(id);
  }
}
