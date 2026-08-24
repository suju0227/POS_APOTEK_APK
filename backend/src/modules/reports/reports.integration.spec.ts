import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request = require('supertest');
import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';

describe('Reports API', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let managerToken: string;
  let cashierToken: string;
  let pharmacistToken: string;
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

    managerToken = await login('manager_reports');
    cashierToken = await login('cashier_reports');
    pharmacistToken = await login('pharmacist_reports');
    cashierUserId = (
      await prisma.user.findUniqueOrThrow({
        where: { username: 'cashier_reports' },
      })
    ).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns filtered sales report with returns and pagination', async () => {
    const fixture = await createReportFixture('sales-filter');
    await createHistoricalSale(fixture, {
      label: 'cash-one',
      productKey: 'a',
      paymentMethod: 'CASH',
      subtotal: 1000,
      discountTotal: 100,
      grandTotal: 900,
      totalHpp: 400.12345678,
      totalProfit: 499.87654322,
      returnRefund: 300,
      returnHpp: 120.12345678,
      returnProfit: 179.87654322,
    });
    await createHistoricalSale(fixture, {
      label: 'cash-two',
      productKey: 'a',
      paymentMethod: 'CASH',
      subtotal: 500,
      discountTotal: 0,
      grandTotal: 500,
      totalHpp: 200,
      totalProfit: 300,
    });
    await createHistoricalSale(fixture, {
      label: 'qris-other-product',
      productKey: 'b',
      paymentMethod: 'QRIS',
      subtotal: 2000,
      discountTotal: 0,
      grandTotal: 2000,
      totalHpp: 900,
      totalProfit: 1100,
    });

    const response = await request(app.getHttpServer())
      .get('/api/reports/sales')
      .query({
        startDate: todayString(),
        endDate: todayString(),
        paymentMethod: 'CASH',
        cashierId: cashierUserId,
        productId: fixture.productA.id,
        page: 1,
        limit: 1,
      })
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(response.body.summary).toMatchObject({
      transactionCount: 2,
      returnCount: 1,
      subtotal: 1500,
      discountTotal: 100,
      grandTotal: 1400,
      returnTotal: 300,
      netRevenue: 1100,
    });
    expect(response.body.pagination).toMatchObject({
      page: 1,
      limit: 1,
      total: 2,
      totalPages: 2,
    });
    expect(response.body.charts.daily).toEqual([
      {
        date: todayString(),
        transactionCount: 2,
        grossRevenue: 1500,
        discountTotal: 100,
        returnTotal: 300,
        netRevenue: 1100,
      },
    ]);
    expect(response.body.charts.paymentMethods).toEqual([
      {
        paymentMethod: 'CASH',
        transactionCount: 2,
        netRevenue: 1100,
      },
    ]);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      paymentMethod: 'CASH',
      returnStatus: expect.any(String),
    });
  });

  it('returns profit report from historical allocation snapshots corrected by returns', async () => {
    const fixture = await createReportFixture('profit');
    const { batch, price } = await createHistoricalSale(fixture, {
      label: 'profit-sale',
      productKey: 'a',
      paymentMethod: 'CASH',
      subtotal: 1000,
      discountTotal: 100,
      grandTotal: 900,
      totalHpp: 400.12345678,
      totalProfit: 499.87654322,
      returnRefund: 300,
      returnHpp: 120.12345678,
      returnProfit: 179.87654322,
    });

    await prisma.productBatch.update({
      where: { id: batch.id },
      data: { hppBase: 999.99999999 },
    });
    await prisma.batchUnitPrice.update({
      where: { id: price.id },
      data: { sellingPrice: 9999 },
    });

    const response = await request(app.getHttpServer())
      .get('/api/reports/profit')
      .query({
        startDate: todayString(),
        endDate: todayString(),
        productId: fixture.productA.id,
        categoryId: fixture.categoryA.id,
        batchId: batch.id,
      })
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(response.body.summary).toMatchObject({
      allocationCount: 1,
      grossRevenue: 1000,
      totalDiscount: 100,
      totalHpp: 400.12345678,
      grossProfit: 499.87654322,
      returnRevenue: 300,
      returnHpp: 120.12345678,
      returnProfit: 179.87654322,
      netRevenue: 700,
      netHpp: 280,
      netProfit: 320,
      profitDisplay: 320,
    });
    expect(response.body.data[0]).toMatchObject({
      productId: fixture.productA.id,
      batchId: batch.id,
      hppBaseSnapshot: 400.12345678,
      grossProfit: 499.87654322,
      netProfit: 320,
      profitDisplay: 320,
    });
    expect(JSON.stringify(response.body)).not.toContain('9999');
    expect(JSON.stringify(response.body)).not.toContain('999.99999999');
  });

  it('filters profit report by category and paginates allocations', async () => {
    const fixture = await createReportFixture('profit-page');
    await createHistoricalSale(fixture, {
      label: 'page-a-one',
      productKey: 'a',
      paymentMethod: 'DEBIT',
      subtotal: 600,
      discountTotal: 0,
      grandTotal: 600,
      totalHpp: 250,
      totalProfit: 350,
    });
    await createHistoricalSale(fixture, {
      label: 'page-a-two',
      productKey: 'a',
      paymentMethod: 'TRANSFER',
      subtotal: 700,
      discountTotal: 0,
      grandTotal: 700,
      totalHpp: 300,
      totalProfit: 400,
    });
    await createHistoricalSale(fixture, {
      label: 'page-b',
      productKey: 'b',
      paymentMethod: 'CASH',
      subtotal: 900,
      discountTotal: 0,
      grandTotal: 900,
      totalHpp: 400,
      totalProfit: 500,
    });

    const response = await request(app.getHttpServer())
      .get('/api/reports/profit')
      .query({
        startDate: todayString(),
        endDate: todayString(),
        categoryId: fixture.categoryA.id,
        page: 2,
        limit: 1,
      })
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(response.body.summary).toMatchObject({
      allocationCount: 2,
      grossRevenue: 1300,
      grossProfit: 750,
      netProfit: 750,
    });
    expect(response.body.pagination).toMatchObject({
      page: 2,
      limit: 1,
      total: 2,
      totalPages: 2,
    });
    expect(response.body.charts.daily).toEqual([
      {
        date: todayString(),
        grossRevenue: 1300,
        netRevenue: 1300,
        netHpp: 550,
        netProfit: 750,
        returnProfit: 0,
      },
    ]);
    expect(response.body.charts.topProducts).toEqual([
      {
        productId: fixture.productA.id,
        productName: fixture.productA.name,
        netRevenue: 1300,
        netProfit: 750,
      },
    ]);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].categoryId).toBe(fixture.categoryA.id);
  });

  it('rejects invalid date ranges and non-manager roles', async () => {
    await request(app.getHttpServer())
      .get('/api/reports/sales')
      .query({ startDate: todayString(), endDate: yesterdayString() })
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(400);

    await request(app.getHttpServer())
      .get('/api/reports/profit')
      .set('Authorization', `Bearer ${cashierToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/reports/sales')
      .set('Authorization', `Bearer ${pharmacistToken}`)
      .expect(403);
  });

  async function createReportFixture(label: string) {
    const categoryA = await prisma.category.create({
      data: { name: `Reports Category A ${label} ${suffix}` },
    });
    const categoryB = await prisma.category.create({
      data: { name: `Reports Category B ${label} ${suffix}` },
    });
    const unit = await prisma.unit.create({
      data: {
        name: `reports unit ${label} ${suffix}`,
        symbol: `ru${label.slice(0, 2)}${suffix.slice(-2)}`,
      },
    });
    const productA = await prisma.product.create({
      data: {
        categoryId: categoryA.id,
        baseUnitId: unit.id,
        code: `REP-A-${label}-${suffix}`,
        name: `Reports Product A ${label} ${suffix}`,
      },
    });
    const productB = await prisma.product.create({
      data: {
        categoryId: categoryB.id,
        baseUnitId: unit.id,
        code: `REP-B-${label}-${suffix}`,
        name: `Reports Product B ${label} ${suffix}`,
      },
    });
    const productUnitA = await prisma.productUnit.create({
      data: {
        productId: productA.id,
        unitId: unit.id,
        conversionToBase: 1,
        isDefaultSaleUnit: true,
        isSaleUnit: true,
      },
    });
    const productUnitB = await prisma.productUnit.create({
      data: {
        productId: productB.id,
        unitId: unit.id,
        conversionToBase: 1,
        isDefaultSaleUnit: true,
        isSaleUnit: true,
      },
    });

    return {
      categoryA,
      categoryB,
      unit,
      productA,
      productB,
      productUnitA,
      productUnitB,
    };
  }

  async function createHistoricalSale(
    fixture: Awaited<ReturnType<typeof createReportFixture>>,
    input: {
      label: string;
      productKey: 'a' | 'b';
      paymentMethod: string;
      subtotal: number;
      discountTotal: number;
      grandTotal: number;
      totalHpp: number;
      totalProfit: number;
      returnRefund?: number;
      returnHpp?: number;
      returnProfit?: number;
    },
  ) {
    const product = input.productKey === 'a' ? fixture.productA : fixture.productB;
    const productUnit =
      input.productKey === 'a' ? fixture.productUnitA : fixture.productUnitB;
    const batch = await prisma.productBatch.create({
      data: {
        productId: product.id,
        batchNumber: `REP-BATCH-${input.label}-${suffix}`,
        expiredDate: futureDate(60),
        initialStockBase: 10,
        currentStockBase: 10,
        hppBase: input.totalHpp,
        prices: {
          create: {
            productUnitId: productUnit.id,
            sellingPrice: input.subtotal,
          },
        },
      },
      include: { prices: true },
    });

    const sale = await prisma.sale.create({
      data: {
        cashierId: cashierUserId,
        saleNumber: `REP-SALE-${input.label}-${suffix}`,
        paymentMethod: input.paymentMethod,
        subtotal: input.subtotal,
        discountTotal: input.discountTotal,
        grandTotal: input.grandTotal,
        paidAmount: input.grandTotal,
        changeAmount: 0,
        totalHpp: input.totalHpp,
        totalProfit: input.totalProfit,
        items: {
          create: {
            productId: product.id,
            productUnitId: productUnit.id,
            productName: product.name,
            unitName: fixture.unit.name,
            qtySale: 1,
            conversionSnapshot: 1,
            qtyBase: 1,
            sellingPrice: input.subtotal,
            subtotal: input.subtotal,
            discountAmount: input.discountTotal,
            totalAfterDiscount: input.grandTotal,
            allocations: {
              create: {
                batchId: batch.id,
                batchNumber: batch.batchNumber,
                expiredDate: batch.expiredDate,
                qtyBase: 1,
                hppBaseSnapshot: input.totalHpp,
                subtotal: input.subtotal,
                discountAmount: input.discountTotal,
                profitAmount: input.totalProfit,
              },
            },
          },
        },
      },
      include: {
        items: {
          include: {
            allocations: true,
          },
        },
      },
    });

    const allocation = sale.items[0].allocations[0];
    if (input.returnRefund !== undefined) {
      await prisma.salesReturn.create({
        data: {
          saleId: sale.id,
          cashierId: cashierUserId,
          returnNumber: `REP-RETURN-${input.label}-${suffix}`,
          reason: 'Retur laporan',
          totalRefund: input.returnRefund,
          totalHppReversed: input.returnHpp ?? 0,
          totalProfitReversed: input.returnProfit ?? 0,
          items: {
            create: {
              saleBatchAllocationId: allocation.id,
              productId: product.id,
              batchId: batch.id,
              qtyBaseReturned: 0.3,
              refundAmount: input.returnRefund,
              hppReversed: input.returnHpp ?? 0,
              profitReversed: input.returnProfit ?? 0,
            },
          },
        },
      });
    }

    return { sale, batch, price: batch.prices[0], allocation };
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
      create: { name: 'MANAGER', description: 'Manager laporan.' },
    });
    const cashierRole = await prisma.role.upsert({
      where: { name: 'KASIR' },
      update: {},
      create: { name: 'KASIR', description: 'Kasir laporan.' },
    });
    const pharmacistRole = await prisma.role.upsert({
      where: { name: 'APOTEKER' },
      update: {},
      create: { name: 'APOTEKER', description: 'Apoteker laporan.' },
    });
    const passwordHash = await bcrypt.hash('ChangeMe123!', 12);

    await prisma.user.upsert({
      where: { username: 'manager_reports' },
      update: { passwordHash, roleId: managerRole.id, isActive: true },
      create: {
        username: 'manager_reports',
        email: 'manager-reports@example.com',
        name: 'Manager Reports',
        passwordHash,
        roleId: managerRole.id,
      },
    });
    await prisma.user.upsert({
      where: { username: 'cashier_reports' },
      update: { passwordHash, roleId: cashierRole.id, isActive: true },
      create: {
        username: 'cashier_reports',
        email: 'cashier-reports@example.com',
        name: 'Cashier Reports',
        passwordHash,
        roleId: cashierRole.id,
      },
    });
    await prisma.user.upsert({
      where: { username: 'pharmacist_reports' },
      update: { passwordHash, roleId: pharmacistRole.id, isActive: true },
      create: {
        username: 'pharmacist_reports',
        email: 'pharmacist-reports@example.com',
        name: 'Pharmacist Reports',
        passwordHash,
        roleId: pharmacistRole.id,
      },
    });
  }

  function todayString() {
    return new Date().toISOString().slice(0, 10);
  }

  function yesterdayString() {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
  }

  function futureDate(days: number) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return date;
  }
});
