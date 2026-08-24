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
import { CreateSalesReturnDto } from './dto/create-sales-return.dto';
import { SalesReturnsService } from './sales-returns.service';

@Controller('sales-returns')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('KASIR', 'MANAGER')
export class SalesReturnsController {
  constructor(private readonly salesReturnsService: SalesReturnsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.salesReturnsService.findAll(user);
  }

  @Post()
  create(
    @Body() dto: CreateSalesReturnDto,
    @CurrentUser() user: AuthUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.salesReturnsService.create(dto, user, idempotencyKey);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.salesReturnsService.findOne(id, user);
  }
}
