import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request = require('supertest');
import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';

describe('Dashboard API', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let managerToken: string;
  let cashierToken: string;
  let ownerToken: string;
  let cashierUserId: string;
  const suffix = Date.now().toString();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    prisma = moduleRef.get(PrismaService);
    await app.init();
    await seedUsers();

    managerToken = await login('manager_dashboard');
    cashierToken = await login('cashier_dashboard');
    ownerToken = await login('owner_dashboard');
    cashierUserId = (
      await prisma.user.findUniqueOrThrow({
        where: { username: 'cashier_dashboard' },
      })
    ).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns manager summary using sales history corrected by returns', async () => {
    const before = await getSummary();
    const sale = await createSaleWithReturn('summary');
    const after = await getSummary();

    expect(after.today.transactionCount - before.today.transactionCount).toBe(1);
    expect(after.today.returnCount - before.today.returnCount).toBe(1);
    expect(after.today.salesTotal - before.today.salesTotal).toBe(1000);
    expect(after.today.salesReturnTotal - before.today.salesReturnTotal).toBe(250);
    expect(after.today.netRevenue - before.today.netRevenue).toBe(750);
    expect(after.today.totalProfit - before.today.totalProfit).toBeCloseTo(
      400.12345678,
      8,
    );
    expect(after.today.profitReversed - before.today.profitReversed).toBeCloseTo(
      100.11111111,
      8,
    );
    expect(after.today.netProfit - before.today.netProfit).toBeCloseTo(
      300.01234567,
      8,
    );

    const recent = await request(app.getHttpServer())
      .get('/api/dashboard/recent-transactions')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(recent.body[0]).toMatchObject({
      id: sale.id,
      saleNumber: sale.saleNumber,
      grandTotal: 1000,
      returnTotal: 250,
      netTotal: 750,
    });
    for (const row of recent.body) {
      expect(row).not.toHaveProperty('totalHpp');
      expect(row).not.toHaveProperty('totalProfit');
      expect(row).not.toHaveProperty('profitAmount');
      expect(row).not.toHaveProperty('hppBaseSnapshot');
    }

    const trends = await request(app.getHttpServer())
      .get('/api/dashboard/trends?days=7')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    const trendRow = trends.body.find(
      (row: { netRevenue: number; netProfit: number }) =>
        row.netRevenue >= 750 && row.netProfit >= 300.01234567,
    );
    expect(trends.body).toHaveLength(7);
    expect(trendRow).toMatchObject({
      transactionCount: expect.any(Number),
      returnCount: expect.any(Number),
      netRevenue: expect.any(Number),
      netProfit: expect.any(Number),
    });
    expect(trendRow.transactionCount).toBeGreaterThanOrEqual(1);
    expect(trendRow.returnCount).toBeGreaterThanOrEqual(1);
    expect(trendRow.netRevenue).toBeGreaterThanOrEqual(750);
    expect(trendRow.netProfit).toBeGreaterThanOrEqual(300.01234567);

    const topProducts = await request(app.getHttpServer())
      .get('/api/dashboard/top-products?days=7&limit=20')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(topProducts.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          productId: sale.productId,
          productName: sale.productName,
          qtyBase: expect.any(Number),
          revenue: expect.any(Number),
        }),
      ]),
    );

    const paymentMethods = await request(app.getHttpServer())
      .get('/api/dashboard/payment-methods?days=7')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(paymentMethods.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          paymentMethod: 'CASH',
          transactionCount: expect.any(Number),
          returnCount: expect.any(Number),
          netRevenue: expect.any(Number),
        }),
      ]),
    );
    const cashRow = paymentMethods.body.find(
      (row: { paymentMethod: string }) => row.paymentMethod === 'CASH',
    );
    expect(cashRow.netRevenue).toBeGreaterThanOrEqual(750);
  });

  it('returns low stock based on active non-expired batch stock only', async () => {
    const critical = await createProductWithBatch('critical', {
      minStockBase: 10,
      stockBase: 4,
      expiredDays: 40,
    });
    const enough = await createProductWithBatch('enough', {
      minStockBase: 2,
      stockBase: 5,
      expiredDays: 40,
    });
    const expiredOnly = await createProductWithBatch('expired-only', {
      minStockBase: 1,
      stockBase: 9,
      expiredDays: -1,
    });

    const response = await request(app.getHttpServer())
      .get('/api/dashboard/low-stock')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    const productIds = response.body.map((item: { productId: string }) => item.productId);
    expect(productIds).toContain(critical.product.id);
    expect(productIds).toContain(expiredOnly.product.id);
    expect(productIds).not.toContain(enough.product.id);

    const criticalRow = response.body.find(
      (item: { productId: string }) => item.productId === critical.product.id,
    );
    expect(criticalRow).toMatchObject({
      minStockBase: 10,
      stockAvailableBase: 4,
    });
  });

  it('returns active batches that are close to expired', async () => {
    const active = await createProductWithBatch('expired-alert-active', {
      minStockBase: 0,
      stockBase: 3,
      expiredDays: 10,
    });
    const inactive = await createProductWithBatch('expired-alert-inactive', {
      minStockBase: 0,
      stockBase: 3,
      expiredDays: 10,
      isActive: false,
    });
    const far = await createProductWithBatch('expired-alert-far', {
      minStockBase: 0,
      stockBase: 3,
      expiredDays: 60,
    });

    const response = await request(app.getHttpServer())
      .get('/api/dashboard/expired-batches')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    const batchIds = response.body.map((item: { batchId: string }) => item.batchId);
    expect(batchIds).toContain(active.batch.id);
    expect(batchIds).not.toContain(inactive.batch.id);
    expect(batchIds).toContain(far.batch.id);
  });

  it('sanitizes operational dashboard data for cashier role', async () => {
    const cashierSummary = await request(app.getHttpServer())
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${cashierToken}`)
      .expect(200);

    expect(cashierSummary.body.today).not.toHaveProperty('totalHpp');
    expect(cashierSummary.body.today).not.toHaveProperty('hppReversed');
    expect(cashierSummary.body.today).not.toHaveProperty('netHpp');
    expect(cashierSummary.body.today).not.toHaveProperty('totalProfit');
    expect(cashierSummary.body.today).not.toHaveProperty('profitReversed');
    expect(cashierSummary.body.today).not.toHaveProperty('netProfit');

    await request(app.getHttpServer())
      .get('/api/dashboard/low-stock')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const revenueTrend = await request(app.getHttpServer())
      .get('/api/dashboard/revenue-trend?period=7d')
      .set('Authorization', `Bearer ${cashierToken}`)
      .expect(200);

    expect(revenueTrend.body[0]).toHaveProperty('netRevenue');
    expect(revenueTrend.body[0]).not.toHaveProperty('netProfit');
    expect(revenueTrend.body[0]).not.toHaveProperty('totalHpp');

    await request(app.getHttpServer())
      .get('/api/dashboard/profit-trend?period=7d')
      .set('Authorization', `Bearer ${cashierToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/dashboard/top-products')
      .set('Authorization', `Bearer ${cashierToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/dashboard/payment-methods')
      .set('Authorization', `Bearer ${cashierToken}`)
      .expect(403);
  });

  it('returns dashboard v2 endpoint shapes with bounded lists', async () => {
    await request(app.getHttpServer())
      .get('/api/dashboard/latest-sales?limit=5')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.length).toBeLessThanOrEqual(5);
      });

    await request(app.getHttpServer())
      .get('/api/dashboard/expiring-batches?limit=10')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.length).toBeLessThanOrEqual(10);
      });

    await request(app.getHttpServer())
      .get('/api/dashboard/purchase-order-summary')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          draft: expect.any(Number),
          sent: expect.any(Number),
          partiallyReceived: expect.any(Number),
          received: expect.any(Number),
          purchasesToday: expect.any(Number),
        });
      });

    await request(app.getHttpServer())
      .get('/api/dashboard/prescription-summary')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          newPrescriptions: expect.any(Number),
          readyForPayment: expect.any(Number),
          completed: expect.any(Number),
          counselingToday: expect.any(Number),
        });
      });

    await request(app.getHttpServer())
      .get('/api/dashboard/recent-activities?limit=5')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.length).toBeLessThanOrEqual(5);
      });
  });

  async function getSummary() {
    const response = await request(app.getHttpServer())
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    return response.body;
  }

  async function createSaleWithReturn(label: string) {
    const fixture = await createProductWithBatch(`sale-${label}`, {
      minStockBase: 0,
      stockBase: 5,
      expiredDays: 60,
    });

    const sale = await prisma.sale.create({
      data: {
        cashierId: cashierUserId,
        saleNumber: `DASH-SALE-${label}-${suffix}`,
        paymentMethod: 'CASH',
        subtotal: 1200,
        discountTotal: 200,
        grandTotal: 1000,
        paidAmount: 1000,
        changeAmount: 0,
        totalHpp: 599.87654322,
        totalProfit: 400.12345678,
        items: {
          create: {
            productId: fixture.product.id,
            productUnitId: fixture.productUnit.id,
            productName: fixture.product.name,
            unitName: fixture.unit.name,
            qtySale: 1,
            conversionSnapshot: 1,
            qtyBase: 1,
            sellingPrice: 1200,
            subtotal: 1200,
            discountAmount: 200,
            totalAfterDiscount: 1000,
            allocations: {
              create: {
                batchId: fixture.batch.id,
                batchNumber: fixture.batch.batchNumber,
                expiredDate: fixture.batch.expiredDate,
                qtyBase: 1,
                hppBaseSnapshot: 599.87654322,
                subtotal: 1200,
                discountAmount: 200,
                profitAmount: 400.12345678,
              },
            },
          },
        },
      },
    });

    await prisma.salesReturn.create({
      data: {
        saleId: sale.id,
        cashierId: cashierUserId,
        returnNumber: `DASH-RET-${label}-${suffix}`,
        reason: 'Retur untuk dashboard',
        totalRefund: 250,
        totalHppReversed: 149.88888889,
        totalProfitReversed: 100.11111111,
      },
    });

    return {
      ...sale,
      productId: fixture.product.id,
      productName: fixture.product.name,
    };
  }

  async function createProductWithBatch(
    label: string,
    options: {
      minStockBase: number;
      stockBase: number;
      expiredDays: number;
      isActive?: boolean;
    },
  ) {
    const category = await prisma.category.create({
      data: { name: `Dashboard Category ${label} ${suffix}` },
    });
    const unit = await prisma.unit.create({
      data: {
        name: `dashboard unit ${label} ${suffix}`,
        symbol: `du${label.slice(0, 2)}${suffix.slice(-2)}`,
      },
    });
    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        baseUnitId: unit.id,
        code: `DASH-${label}-${suffix}`,
        name: `Dashboard Product ${label} ${suffix}`,
        minStockBase: options.minStockBase,
      },
    });
    const productUnit = await prisma.productUnit.create({
      data: {
        productId: product.id,
        unitId: unit.id,
        conversionToBase: 1,
        isDefaultSaleUnit: true,
        isSaleUnit: true,
      },
    });
    const batch = await prisma.productBatch.create({
      data: {
        productId: product.id,
        batchNumber: `DASH-BATCH-${label}-${suffix}`,
        expiredDate: futureDate(options.expiredDays),
        initialStockBase: options.stockBase,
        currentStockBase: options.stockBase,
        hppBase: 100,
        isActive: options.isActive ?? true,
        prices: {
          create: {
            productUnitId: productUnit.id,
            sellingPrice: 150,
          },
        },
      },
    });

    return { category, unit, product, productUnit, batch };
  }

  async function login(username: string) {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ usernameOrEmail: username, password: 'ChangeMe123!' })
      .expect(201);
    return response.body.accessToken as string;
  }

  async function seedUsers() {
    await prisma.refreshToken.deleteMany();

    const managerRole = await prisma.role.upsert({
      where: { name: 'MANAGER' },
      update: {},
      create: {
        name: 'MANAGER',
        description: 'Manager apotek untuk dashboard.',
      },
    });
    const cashierRole = await prisma.role.upsert({
      where: { name: 'KASIR' },
      update: {},
      create: {
        name: 'KASIR',
        description: 'Kasir apotek untuk transaksi.',
      },
    });
    const ownerRole = await prisma.role.upsert({
      where: { name: 'PEMILIK' },
      update: {},
      create: {
        name: 'PEMILIK',
        description: 'Pemilik opsional.',
      },
    });
    const passwordHash = await bcrypt.hash('ChangeMe123!', 12);

    await prisma.user.upsert({
      where: { username: 'manager_dashboard' },
      update: { passwordHash, roleId: managerRole.id, isActive: true },
      create: {
        username: 'manager_dashboard',
        email: 'manager-dashboard@example.com',
        name: 'Manager Dashboard',
        passwordHash,
        roleId: managerRole.id,
      },
    });
    await prisma.user.upsert({
      where: { username: 'cashier_dashboard' },
      update: { passwordHash, roleId: cashierRole.id, isActive: true },
      create: {
        username: 'cashier_dashboard',
        email: 'cashier-dashboard@example.com',
        name: 'Cashier Dashboard',
        passwordHash,
        roleId: cashierRole.id,
      },
    });
    await prisma.user.upsert({
      where: { username: 'owner_dashboard' },
      update: { passwordHash, roleId: ownerRole.id, isActive: true },
      create: {
        username: 'owner_dashboard',
        email: 'owner-dashboard@example.com',
        name: 'Owner Dashboard',
        passwordHash,
        roleId: ownerRole.id,
      },
    });
  }

  function futureDate(days: number) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return date;
  }
});
