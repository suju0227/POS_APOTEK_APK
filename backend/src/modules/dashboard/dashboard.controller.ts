import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/auth-user';
import {
  DashboardDaysQueryDto,
  DashboardLimitQueryDto,
  DashboardPeriodQueryDto,
  DashboardTopProductsQueryDto,
} from './dto/dashboard-query.dto';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('KASIR', 'APOTEKER', 'MANAGER', 'PEMILIK')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  summary(@CurrentUser() user: AuthUser) {
    return this.dashboardService.summary(user);
  }

  @Get('low-stock')
  lowStock(@Query() query: DashboardLimitQueryDto) {
    return this.dashboardService.lowStock(query.limit);
  }

  @Get('expired-batches')
  expiredBatches(@Query() query: DashboardLimitQueryDto) {
    return this.dashboardService.expiredBatches(query.limit);
  }

  @Get('recent-transactions')
  recentTransactions(@Query() query: DashboardLimitQueryDto) {
    return this.dashboardService.recentTransactions(query.limit);
  }

  @Get('trends')
  @Roles('MANAGER', 'PEMILIK')
  trends(@Query() query: DashboardDaysQueryDto) {
    return this.dashboardService.trends(query.days);
  }

  @Get('revenue-trend')
  revenueTrend(@Query() query: DashboardPeriodQueryDto) {
    return this.dashboardService.revenueTrend(query.period);
  }

  @Get('profit-trend')
  @Roles('MANAGER', 'PEMILIK')
  profitTrend(@Query() query: DashboardPeriodQueryDto) {
    return this.dashboardService.profitTrend(query.period);
  }

  @Get('latest-sales')
  latestSales(@Query() query: DashboardLimitQueryDto) {
    return this.dashboardService.recentTransactions(query.limit);
  }

  @Get('expiring-batches')
  expiringBatches(@Query() query: DashboardLimitQueryDto) {
    return this.dashboardService.expiredBatches(query.limit);
  }

  @Get('purchase-order-summary')
  @Roles('APOTEKER', 'MANAGER', 'PEMILIK')
  purchaseOrderSummary() {
    return this.dashboardService.purchaseOrderSummary();
  }

  @Get('prescription-summary')
  @Roles('KASIR', 'APOTEKER', 'MANAGER', 'PEMILIK')
  prescriptionSummary() {
    return this.dashboardService.prescriptionSummary();
  }

  @Get('recent-activities')
  @Roles('MANAGER', 'PEMILIK')
  recentActivities(@Query() query: DashboardLimitQueryDto) {
    return this.dashboardService.recentActivities(query.limit);
  }

  @Get('top-products')
  @Roles('MANAGER', 'PEMILIK')
  topProducts(@Query() query: DashboardTopProductsQueryDto) {
    return this.dashboardService.topProducts(query.days, query.limit);
  }

  @Get('payment-methods')
  @Roles('MANAGER', 'PEMILIK')
  paymentMethods(@Query() query: DashboardDaysQueryDto) {
    return this.dashboardService.paymentMethods(query.days);
  }
}
