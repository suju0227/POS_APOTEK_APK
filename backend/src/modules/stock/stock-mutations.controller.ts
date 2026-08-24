import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StockMutationsService } from './stock-mutations.service';

@Controller('stock/mutations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MANAGER')
export class StockMutationsController {
  constructor(private readonly stockMutationsService: StockMutationsService) {}

  @Get()
  findAll() {
    return this.stockMutationsService.findAll();
  }
}
