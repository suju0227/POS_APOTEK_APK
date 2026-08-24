import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ProfitReportQueryDto } from './dto/profit-report-query.dto';
import { SalesReportQueryDto } from './dto/sales-report-query.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MANAGER')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  sales(@Query() query: SalesReportQueryDto) {
    return this.reportsService.sales(query);
  }

  @Get('profit')
  profit(@Query() query: ProfitReportQueryDto) {
    return this.reportsService.profit(query);
  }
}
