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
import { CreateSaleFromPrescriptionDto } from '../prescriptions/dto/create-sale-from-prescription.dto';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SalesService } from './sales.service';

@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('KASIR', 'MANAGER')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.salesService.findAll(user);
  }

  @Post()
  create(
    @Body() dto: CreateSaleDto,
    @CurrentUser() user: AuthUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.salesService.create(dto, user, idempotencyKey);
  }

  @Post('from-prescription/:prescriptionId')
  createFromPrescription(
    @Param('prescriptionId') prescriptionId: string,
    @Body() dto: CreateSaleFromPrescriptionDto,
    @CurrentUser() user: AuthUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.salesService.createFromPrescription(
      prescriptionId,
      dto,
      user,
      idempotencyKey,
    );
  }

  @Get(':id/returnable-items')
  returnableItems(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.salesService.returnableItems(id, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.salesService.findOne(id, user);
  }
}
