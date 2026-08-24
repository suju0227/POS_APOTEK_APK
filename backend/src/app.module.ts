import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { envSchema } from './config/env.schema';
import { CacheModule } from './common/modules/cache.module';
import { PrismaModule } from './database/prisma.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { AuthModule } from './modules/auth/auth.module';
import { BatchesModule } from './modules/batches/batches.module';
import { CounselingRecordsModule } from './modules/counseling-records/counseling-records.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ExportsModule } from './modules/exports/exports.module';
import { HealthModule } from './modules/health/health.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { PrescriptionsModule } from './modules/prescriptions/prescriptions.module';
import { ProductsModule } from './modules/products/products.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { PurchaseReturnsModule } from './modules/purchase-returns/purchase-returns.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RolesModule } from './modules/roles/roles.module';
import { SalesReturnsModule } from './modules/sales-returns/sales-returns.module';
import { SalesModule } from './modules/sales/sales.module';
import { SettingsModule } from './modules/settings/settings.module';
import { StockModule } from './modules/stock/stock.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { UnitsModule } from './modules/units/units.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
      validationSchema: envSchema,
    }),
    CacheModule,
    HealthModule,
    PrismaModule,
    AuditLogsModule,
    AuthModule,
    RolesModule,
    UsersModule,
    CategoriesModule,
    SuppliersModule,
    UnitsModule,
    ProductsModule,
    PurchaseOrdersModule,
    PurchaseReturnsModule,
    BatchesModule,
    PurchasesModule,
    ReportsModule,
    StockModule,
    PrescriptionsModule,
    CounselingRecordsModule,
    DashboardModule,
    ExportsModule,
    SettingsModule,
    SalesModule,
    SalesReturnsModule,
  ],
})
export class AppModule {}
