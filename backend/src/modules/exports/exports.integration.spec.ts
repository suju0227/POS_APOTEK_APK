import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import ExcelJS from 'exceljs';
import request = require('supertest');
import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';

describe('Exports API', () => {
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

    managerToken = await login('manager_exports');
    cashierToken = await login('cashier_exports');
    pharmacistToken = await login('pharmacist_exports');
    cashierUserId = (
      await prisma.user.findUniqueOrThrow({
        where: { username: 'cashier_exports' },
      })
    ).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('exports filtered sales report to xlsx', async () => {
    const fixture = await createFixture('sales-xlsx');
    const included = await createSale(fixture, {
      label: 'included',
      productKey: 'a',
      paymentMethod: 'CASH',
      subtotal: 1000,
      discountTotal: 100,
      grandTotal: 900,
      hpp: 400,
      profit: 500,
      returnRefund: 200,
      returnHpp: 80,
      returnProfit: 120,
    });
    await createSale(fixture, {
      label: 'excluded',
      productKey: 'b',
      paymentMethod: 'QRIS',
      subtotal: 2000,
      discountTotal: 0,
      grandTotal: 2000,
      hpp: 900,
      profit: 1100,
    });

    const response = await binaryGet('/api/exports/reports/sales.xlsx', {
      startDate: todayString(),
      endDate: todayString(),
      paymentMethod: 'CASH',
      productId: fixture.productA.id,
    });

    expect(response.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(response.headers['content-disposition']).toContain(
      'attachment; filename="laporan-penjualan-',
    );
    expect(response.body.length).toBeGreaterThan(1000);

    const values = await workbookValues(response.body);
    expect(values).toContain('Laporan Penjualan');
    expect(values).toContain(included.sale.saleNumber);
    expect(values).toContain('netRevenue');
    expect(values).toContain('700');
    expect(values).not.toContain('REP-EXPORT-excluded');
  });

  it('exports profit report to xlsx from historical snapshots', async () => {
    const fixture = await createFixture('profit-xlsx');
    const { batch, price, sale } = await createSale(fixture, {
      label: 'profit',
      productKey: 'a',
      paymentMethod: 'CASH',
      subtotal: 1000,
      discountTotal: 100,
      grandTotal: 900,
      hpp: 400.12345678,
      profit: 499.87654322,
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

    const response = await binaryGet('/api/exports/reports/profit.xlsx', {
      startDate: todayString(),
      endDate: todayString(),
      batchId: batch.id,
    });

    expect(response.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    const values = await workbookValues(response.body);
    expect(values).toContain('Laporan Laba');
    expect(values).toContain(sale.saleNumber);
    expect(values).toContain('400.12345678');
    expect(values).toContain('320');
    expect(values).not.toContain('9999');
    expect(values).not.toContain('999.99999999');
  });

  it('exports sales and profit reports to pdf', async () => {
    const fixture = await createFixture('pdf');
    await createSale(fixture, {
      label: 'pdf',
      productKey: 'a',
      paymentMethod: 'DEBIT',
      subtotal: 800,
      discountTotal: 0,
      grandTotal: 800,
      hpp: 350,
      profit: 450,
    });

    const salesPdf = await binaryGet('/api/exports/reports/sales.pdf', {
      startDate: todayString(),
      endDate: todayString(),
      paymentMethod: 'DEBIT',
    });
    expect(salesPdf.headers['content-type']).toContain('application/pdf');
    expect(salesPdf.headers['content-disposition']).toContain(
      'attachment; filename="laporan-penjualan-',
    );
    expect(salesPdf.body.subarray(0, 4).toString()).toBe('%PDF');
    expect(salesPdf.body.length).toBeGreaterThan(1000);

    const profitPdf = await binaryGet('/api/exports/reports/profit.pdf', {
      startDate: todayString(),
      endDate: todayString(),
      productId: fixture.productA.id,
    });
    expect(profitPdf.headers['content-type']).toContain('application/pdf');
    expect(profitPdf.headers['content-disposition']).toContain(
      'attachment; filename="laporan-laba-',
    );
    expect(profitPdf.body.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('rejects export endpoints for non-manager roles', async () => {
    await request(app.getHttpServer())
      .get('/api/exports/reports/sales.xlsx')
      .set('Authorization', `Bearer ${cashierToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/exports/reports/profit.pdf')
      .set('Authorization', `Bearer ${pharmacistToken}`)
      .expect(403);
  });

  async function binaryGet(path: string, query: Record<string, string>) {
    return request(app.getHttpServer())
      .get(path)
      .query(query)
      .set('Authorization', `Bearer ${managerToken}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);
  }

  async function workbookValues(buffer: Buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(
      buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
    );
    const values: string[] = [];
    workbook.eachSheet((sheet) => {
      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          values.push(String(cell.value ?? ''));
        });
      });
    });
    return values;
  }

  async function createFixture(label: string) {
    const categoryA = await prisma.category.create({
      data: { name: `Export Category A ${label} ${suffix}` },
    });
    const categoryB = await prisma.category.create({
      data: { name: `Export Category B ${label} ${suffix}` },
    });
    const unit = await prisma.unit.create({
      data: {
        name: `export unit ${label} ${suffix}`,
        symbol: `eu${label.slice(0, 2)}${suffix.slice(-2)}`,
      },
    });
    const productA = await prisma.product.create({
      data: {
        categoryId: categoryA.id,
        baseUnitId: unit.id,
        code: `EXP-A-${label}-${suffix}`,
        name: `Export Product A ${label} ${suffix}`,
      },
    });
    const productB = await prisma.product.create({
      data: {
        categoryId: categoryB.id,
        baseUnitId: unit.id,
        code: `EXP-B-${label}-${suffix}`,
        name: `Export Product B ${label} ${suffix}`,
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

  async function createSale(
    fixture: Awaited<ReturnType<typeof createFixture>>,
    input: {
      label: string;
      productKey: 'a' | 'b';
      paymentMethod: string;
      subtotal: number;
      discountTotal: number;
      grandTotal: number;
      hpp: number;
      profit: number;
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
        batchNumber: `EXP-BATCH-${input.label}-${suffix}`,
        expiredDate: futureDate(60),
        initialStockBase: 10,
        currentStockBase: 10,
        hppBase: input.hpp,
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
        saleNumber: `REP-EXPORT-${input.label}-${suffix}`,
        paymentMethod: input.paymentMethod,
        subtotal: input.subtotal,
        discountTotal: input.discountTotal,
        grandTotal: input.grandTotal,
        paidAmount: input.grandTotal,
        changeAmount: 0,
        totalHpp: input.hpp,
        totalProfit: input.profit,
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
                hppBaseSnapshot: input.hpp,
                subtotal: input.subtotal,
                discountAmount: input.discountTotal,
                profitAmount: input.profit,
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
          returnNumber: `REP-EXPORT-RETURN-${input.label}-${suffix}`,
          reason: 'Retur export',
          totalRefund: input.returnRefund,
          totalHppReversed: input.returnHpp ?? 0,
          totalProfitReversed: input.returnProfit ?? 0,
          items: {
            create: {
              saleBatchAllocationId: allocation.id,
              productId: product.id,
              batchId: batch.id,
              qtyBaseReturned: 0.25,
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
      create: { name: 'MANAGER', description: 'Manager export.' },
    });
    const cashierRole = await prisma.role.upsert({
      where: { name: 'KASIR' },
      update: {},
      create: { name: 'KASIR', description: 'Kasir export.' },
    });
    const pharmacistRole = await prisma.role.upsert({
      where: { name: 'APOTEKER' },
      update: {},
      create: { name: 'APOTEKER', description: 'Apoteker export.' },
    });
    const passwordHash = await bcrypt.hash('ChangeMe123!', 12);

    await prisma.user.upsert({
      where: { username: 'manager_exports' },
      update: { passwordHash, roleId: managerRole.id, isActive: true },
      create: {
        username: 'manager_exports',
        email: 'manager-exports@example.com',
        name: 'Manager Exports',
        passwordHash,
        roleId: managerRole.id,
      },
    });
    await prisma.user.upsert({
      where: { username: 'cashier_exports' },
      update: { passwordHash, roleId: cashierRole.id, isActive: true },
      create: {
        username: 'cashier_exports',
        email: 'cashier-exports@example.com',
        name: 'Cashier Exports',
        passwordHash,
        roleId: cashierRole.id,
      },
    });
    await prisma.user.upsert({
      where: { username: 'pharmacist_exports' },
      update: { passwordHash, roleId: pharmacistRole.id, isActive: true },
      create: {
        username: 'pharmacist_exports',
        email: 'pharmacist-exports@example.com',
        name: 'Pharmacist Exports',
        passwordHash,
        roleId: pharmacistRole.id,
      },
    });
  }

  function todayString() {
    return new Date().toISOString().slice(0, 10);
  }

  function futureDate(days: number) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return date;
  }
});
