import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request = require('supertest');
import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';

describe('Sales API', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let managerToken: string;
  let cashierToken: string;
  let ownerToken: string;
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

    managerToken = await login('manager_sales');
    cashierToken = await login('cashier_sales');
    ownerToken = await login('owner_sales');
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns cashier-safe products without HPP or profit data', async () => {
    const fixture = await createProductFixture('cashier-products');
    await createBatchWithPrice(fixture.product.id, fixture.baseProductUnit.id, {
      batchNumber: `CASHIER-PRODUCT-${suffix}`,
      expiredDays: 30,
      stockBase: 8,
      hppBase: 500,
      sellingPrice: 1000,
    });

    const response = await request(app.getHttpServer())
      .get(`/api/cashier/products?q=${fixture.product.code}`)
      .set('Authorization', `Bearer ${cashierToken}`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      id: fixture.product.id,
      stockAvailableBase: 8,
    });
    expect(response.body[0].units[0]).toMatchObject({
      productUnitId: fixture.baseProductUnit.id,
      minSaleQty: 1,
      sellingPrice: 1000,
    });
    expect(JSON.stringify(response.body)).not.toContain('hpp');
    expect(JSON.stringify(response.body)).not.toContain('profit');
  });

  it('hides non-sale units from cashier products', async () => {
    const fixture = await createProductFixture('hidden-unit');
    const hiddenUnit = await prisma.unit.create({
      data: {
        name: `sales hidden unit ${suffix}`,
        symbol: `shu${suffix.slice(-3)}`,
      },
    });
    const hiddenProductUnit = await prisma.productUnit.create({
      data: {
        productId: fixture.product.id,
        unitId: hiddenUnit.id,
        conversionToBase: 2,
        isSaleUnit: false,
      },
    });
    await createBatchWithPrice(fixture.product.id, fixture.baseProductUnit.id, {
      batchNumber: `VISIBLE-UNIT-${suffix}`,
      expiredDays: 30,
      stockBase: 8,
      hppBase: 500,
      sellingPrice: 1000,
    });
    await prisma.batchUnitPrice.create({
      data: {
        batchId: (
          await prisma.productBatch.findFirstOrThrow({
            where: { batchNumber: `VISIBLE-UNIT-${suffix}` },
          })
        ).id,
        productUnitId: hiddenProductUnit.id,
        sellingPrice: 2000,
      },
    });

    const response = await request(app.getHttpServer())
      .get(`/api/cashier/products?q=${fixture.product.code}`)
      .set('Authorization', `Bearer ${cashierToken}`)
      .expect(200);

    expect(response.body[0].units).toHaveLength(1);
    expect(response.body[0].units[0].productUnitId).toBe(
      fixture.baseProductUnit.id,
    );
  });

  it('creates a one-batch sale, decreases stock, records SALE_OUT, and sanitizes cashier response', async () => {
    const fixture = await createProductFixture('single-sale');
    const batch = await createBatchWithPrice(
      fixture.product.id,
      fixture.baseProductUnit.id,
      {
        batchNumber: `SINGLE-SALE-${suffix}`,
        expiredDays: 60,
        stockBase: 10,
        hppBase: 1000,
        sellingPrice: 1500,
      },
    );

    const sale = await postSale(
      cashierToken,
      `sale-single-${suffix}`,
      {
        paymentMethod: 'CASH',
        paidAmount: 5000,
        discountType: 'NONE',
        discountValue: 0,
        items: [
          {
            productId: fixture.product.id,
            productUnitId: fixture.baseProductUnit.id,
            qtySaleUnit: 2,
          },
        ],
      },
    );

    expect(sale).toMatchObject({
      subtotal: 3000,
      discountTotal: 0,
      grandTotal: 3000,
      paidAmount: 5000,
      changeAmount: 2000,
    });
    expect(sale.totalHpp).toBeUndefined();
    expect(sale.totalProfit).toBeUndefined();
    expect(sale.items[0].allocations).toBeUndefined();

    const storedBatch = await prisma.productBatch.findUniqueOrThrow({
      where: { id: batch.id },
    });
    expect(storedBatch.currentStockBase.toNumber()).toBe(8);

    const allocation = await prisma.saleBatchAllocation.findFirstOrThrow({
      where: { batchId: batch.id },
    });
    expect(allocation.qtyBase.toNumber()).toBe(2);
    expect(allocation.hppBaseSnapshot.toNumber()).toBe(1000);

    const mutation = await prisma.stockMutation.findFirstOrThrow({
      where: { referenceId: sale.id, mutationType: 'SALE_OUT' },
    });
    expect(mutation).toMatchObject({
      referenceType: 'SALE',
      productId: fixture.product.id,
      batchId: batch.id,
    });
    expect(mutation.qtyBefore.toNumber()).toBe(10);
    expect(mutation.qtyChange.toNumber()).toBe(-2);
    expect(mutation.qtyAfter.toNumber()).toBe(8);

    const managerDetail = await request(app.getHttpServer())
      .get(`/api/sales/${sale.id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(managerDetail.body.totalHpp).toBe(2000);
    expect(managerDetail.body.totalProfit).toBe(1000);
    expect(managerDetail.body.items[0].allocations[0]).toMatchObject({
      batchNumber: batch.batchNumber,
      hppBaseSnapshot: 1000,
      profitAmount: 1000,
    });
  });

  it('splits sale by FEFO across batches and allocates discount proportionally', async () => {
    const fixture = await createProductFixture('split-sale');
    const firstBatch = await createBatchWithPrice(
      fixture.product.id,
      fixture.baseProductUnit.id,
      {
        batchNumber: `SPLIT-FIRST-${suffix}`,
        expiredDays: 10,
        stockBase: 3,
        hppBase: 500,
        sellingPrice: 1000,
      },
    );
    const secondBatch = await createBatchWithPrice(
      fixture.product.id,
      fixture.baseProductUnit.id,
      {
        batchNumber: `SPLIT-SECOND-${suffix}`,
        expiredDays: 40,
        stockBase: 5,
        hppBase: 600,
        sellingPrice: 1200,
      },
    );

    const sale = await postSale(
      managerToken,
      `sale-split-${suffix}`,
      {
        paymentMethod: 'CASH',
        paidAmount: 10000,
        discountType: 'NOMINAL',
        discountValue: 500,
        items: [
          {
            productId: fixture.product.id,
            productUnitId: fixture.baseProductUnit.id,
            qtySaleUnit: 5,
          },
        ],
      },
    );

    expect(sale).toMatchObject({
      subtotal: 5400,
      discountTotal: 500,
      grandTotal: 4900,
    });
    expect(sale.items[0].allocations).toHaveLength(2);
    expect(sale.items[0].allocations[0]).toMatchObject({
      batchId: firstBatch.id,
      qtyBase: 3,
      subtotal: 3000,
    });
    expect(sale.items[0].allocations[1]).toMatchObject({
      batchId: secondBatch.id,
      qtyBase: 2,
      subtotal: 2400,
    });
    const allocatedDiscount = sale.items[0].allocations.reduce(
      (sum: number, allocation: { discountAmount: number }) =>
        sum + allocation.discountAmount,
      0,
    );
    expect(allocatedDiscount).toBe(500);

    await expect(
      prisma.productBatch.findUniqueOrThrow({ where: { id: firstBatch.id } }),
    ).resolves.toMatchObject({ currentStockBase: expect.anything() });
    const storedFirst = await prisma.productBatch.findUniqueOrThrow({
      where: { id: firstBatch.id },
    });
    const storedSecond = await prisma.productBatch.findUniqueOrThrow({
      where: { id: secondBatch.id },
    });
    expect(storedFirst.currentStockBase.toNumber()).toBe(0);
    expect(storedSecond.currentStockBase.toNumber()).toBe(3);
  });

  it('rejects invalid sale and rolls back stock changes', async () => {
    const fixture = await createProductFixture('invalid-sale');
    const batch = await createBatchWithPrice(
      fixture.product.id,
      fixture.baseProductUnit.id,
      {
        batchNumber: `INVALID-SALE-${suffix}`,
        expiredDays: 30,
        stockBase: 2,
        hppBase: 500,
        sellingPrice: 1000,
      },
    );

    await postSale(
      cashierToken,
      `sale-invalid-stock-${suffix}`,
      {
        paymentMethod: 'CASH',
        paidAmount: 30000,
        discountType: 'NONE',
        discountValue: 0,
        items: [
          {
            productId: fixture.product.id,
            productUnitId: fixture.baseProductUnit.id,
            qtySaleUnit: 20,
          },
        ],
      },
      400,
    );

    const storedBatch = await prisma.productBatch.findUniqueOrThrow({
      where: { id: batch.id },
    });
    expect(storedBatch.currentStockBase.toNumber()).toBe(2);

    await postSale(
      cashierToken,
      `sale-invalid-cash-${suffix}`,
      {
        paymentMethod: 'CASH',
        paidAmount: 100,
        discountType: 'NONE',
        discountValue: 0,
        items: [
          {
            productId: fixture.product.id,
            productUnitId: fixture.baseProductUnit.id,
            qtySaleUnit: 1,
          },
        ],
      },
      400,
    );

    await postSale(
      cashierToken,
      `sale-invalid-discount-${suffix}`,
      {
        paymentMethod: 'CASH',
        paidAmount: 10000,
        discountType: 'PERCENT',
        discountValue: 101,
        items: [
          {
            productId: fixture.product.id,
            productUnitId: fixture.baseProductUnit.id,
            qtySaleUnit: 1,
          },
        ],
      },
      400,
    );
  });

  it('keeps batch stock non-negative when concurrent checkouts exceed available stock', async () => {
    const fixture = await createProductFixture('concurrent-sale');
    const batch = await createBatchWithPrice(
      fixture.product.id,
      fixture.baseProductUnit.id,
      {
        batchNumber: `CONCURRENT-SALE-${suffix}`,
        expiredDays: 30,
        stockBase: 3,
        hppBase: 500,
        sellingPrice: 1000,
      },
    );
    const payload = {
      paymentMethod: 'CASH',
      paidAmount: 5000,
      discountType: 'NONE',
      discountValue: 0,
      items: [
        {
          productId: fixture.product.id,
          productUnitId: fixture.baseProductUnit.id,
          qtySaleUnit: 2,
        },
      ],
    };

    const results = await Promise.allSettled([
      postSale(cashierToken, `sale-concurrent-a-${suffix}`, payload),
      postSale(cashierToken, `sale-concurrent-b-${suffix}`, payload),
    ]);
    const fulfilled = results.filter(
      (result): result is PromiseFulfilledResult<unknown> =>
        result.status === 'fulfilled',
    );
    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(String(rejected[0].reason.message)).toContain('expected 201');

    const storedBatch = await prisma.productBatch.findUniqueOrThrow({
      where: { id: batch.id },
    });
    expect(storedBatch.currentStockBase.toNumber()).toBe(1);
    expect(storedBatch.currentStockBase.toNumber()).toBeGreaterThanOrEqual(0);

    const allocations = await prisma.saleBatchAllocation.findMany({
      where: { batchId: batch.id },
    });
    const allocatedQty = allocations.reduce(
      (sum, allocation) => sum + allocation.qtyBase.toNumber(),
      0,
    );
    expect(allocatedQty).toBe(2);
  });

  it('accepts non-cash payments without change and rejects invalid payment method', async () => {
    const fixture = await createProductFixture('non-cash-payment');
    await createBatchWithPrice(fixture.product.id, fixture.baseProductUnit.id, {
      batchNumber: `NON-CASH-PAYMENT-${suffix}`,
      expiredDays: 30,
      stockBase: 10,
      hppBase: 500,
      sellingPrice: 1000,
    });

    const sale = await postSale(
      cashierToken,
      `sale-non-cash-${suffix}`,
      {
        paymentMethod: 'QRIS',
        paidAmount: 0,
        discountType: 'NONE',
        discountValue: 0,
        items: [
          {
            productId: fixture.product.id,
            productUnitId: fixture.baseProductUnit.id,
            qtySaleUnit: 2,
          },
        ],
      },
    );

    expect(sale).toMatchObject({
      paymentMethod: 'QRIS',
      paidAmount: 0,
      changeAmount: 0,
      grandTotal: 2000,
    });

    await postSale(
      cashierToken,
      `sale-invalid-payment-${suffix}`,
      {
        paymentMethod: 'GATEWAY',
        paidAmount: 2000,
        discountType: 'NONE',
        discountValue: 0,
        items: [
          {
            productId: fixture.product.id,
            productUnitId: fixture.baseProductUnit.id,
            qtySaleUnit: 1,
          },
        ],
      },
      400,
    );
  });

  it('rejects checkout with non-sale unit or qty below minimum sale qty', async () => {
    const fixture = await createProductFixture('sale-unit-rules');
    const blockedUnit = await prisma.unit.create({
      data: {
        name: `sales blocked unit ${suffix}`,
        symbol: `sbu${suffix.slice(-3)}`,
      },
    });
    const blockedProductUnit = await prisma.productUnit.create({
      data: {
        productId: fixture.product.id,
        unitId: blockedUnit.id,
        conversionToBase: 1,
        isSaleUnit: false,
      },
    });
    await prisma.productUnit.update({
      where: { id: fixture.baseProductUnit.id },
      data: { minSaleQty: 2 },
    });
    const batch = await createBatchWithPrice(
      fixture.product.id,
      fixture.baseProductUnit.id,
      {
        batchNumber: `SALE-UNIT-RULES-${suffix}`,
        expiredDays: 30,
        stockBase: 10,
        hppBase: 500,
        sellingPrice: 1000,
      },
    );
    await prisma.batchUnitPrice.create({
      data: {
        batchId: batch.id,
        productUnitId: blockedProductUnit.id,
        sellingPrice: 1000,
      },
    });

    await postSale(
      cashierToken,
      `sale-non-sale-unit-${suffix}`,
      {
        paymentMethod: 'CASH',
        paidAmount: 5000,
        discountType: 'NONE',
        discountValue: 0,
        items: [
          {
            productId: fixture.product.id,
            productUnitId: blockedProductUnit.id,
            qtySaleUnit: 2,
          },
        ],
      },
      400,
    );

    await postSale(
      cashierToken,
      `sale-min-qty-${suffix}`,
      {
        paymentMethod: 'CASH',
        paidAmount: 5000,
        discountType: 'NONE',
        discountValue: 0,
        items: [
          {
            productId: fixture.product.id,
            productUnitId: fixture.baseProductUnit.id,
            qtySaleUnit: 1,
          },
        ],
      },
      400,
    );
  });

  it('keeps precise HPP and profit internally while sale price stays rounded', async () => {
    const fixture = await createProductFixture('precision-sale');
    const batch = await createBatchWithPrice(
      fixture.product.id,
      fixture.baseProductUnit.id,
      {
        batchNumber: `PRECISION-SALE-${suffix}`,
        expiredDays: 30,
        stockBase: 10,
        hppBase: 333.33333333,
        sellingPrice: 1000,
      },
    );

    const sale = await postSale(
      managerToken,
      `sale-precision-${suffix}`,
      {
        paymentMethod: 'CASH',
        paidAmount: 5000,
        discountType: 'NONE',
        discountValue: 0,
        items: [
          {
            productId: fixture.product.id,
            productUnitId: fixture.baseProductUnit.id,
            qtySaleUnit: 3,
          },
        ],
      },
    );

    expect(sale.subtotal).toBe(3000);
    expect(sale.totalHpp).toBe(999.99999999);
    expect(sale.totalProfit).toBe(2000.00000001);
    expect(sale.items[0].sellingPrice).toBe(1000);
    expect(sale.items[0].allocations[0]).toMatchObject({
      batchId: batch.id,
      hppBaseSnapshot: 333.33333333,
      profitAmount: 2000.00000001,
    });
  });

  it('handles idempotent retries and rejects reused keys with different payloads', async () => {
    const fixture = await createProductFixture('idempotency-sale');
    await createBatchWithPrice(fixture.product.id, fixture.baseProductUnit.id, {
      batchNumber: `IDEMPOTENCY-SALE-${suffix}`,
      expiredDays: 30,
      stockBase: 10,
      hppBase: 200,
      sellingPrice: 500,
    });

    const payload = {
      paymentMethod: 'CASH',
      paidAmount: 5000,
      discountType: 'NONE',
      discountValue: 0,
      items: [
        {
          productId: fixture.product.id,
          productUnitId: fixture.baseProductUnit.id,
          qtySaleUnit: 2,
        },
      ],
    };

    const beforeCount = await prisma.sale.count();
    const first = await postSale(managerToken, `sale-idem-${suffix}`, payload);
    const second = await postSale(managerToken, `sale-idem-${suffix}`, payload);
    expect(second.id).toBe(first.id);
    await expect(prisma.sale.count()).resolves.toBe(beforeCount + 1);

    await postSale(
      managerToken,
      `sale-idem-${suffix}`,
      {
        ...payload,
        paidAmount: 6000,
      },
      409,
    );
  });

  it('rejects roles outside cashier and manager', async () => {
    await request(app.getHttpServer())
      .get('/api/cashier/products')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/sales')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(403);
  });

  async function createProductFixture(label: string) {
    const category = await prisma.category.create({
      data: { name: `Sales Category ${label} ${suffix}` },
    });
    const unit = await prisma.unit.create({
      data: {
        name: `sales unit ${label} ${suffix}`,
        symbol: `su${label.slice(0, 2)}`,
      },
    });
    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        baseUnitId: unit.id,
        code: `SALE-${label}-${suffix}`,
        name: `Sales Product ${label} ${suffix}`,
      },
    });
    const baseProductUnit = await prisma.productUnit.create({
      data: {
        productId: product.id,
        unitId: unit.id,
        conversionToBase: 1,
        isDefaultSaleUnit: true,
        isSaleUnit: true,
      },
    });

    return { category, unit, product, baseProductUnit };
  }

  function createBatchWithPrice(
    productId: string,
    productUnitId: string,
    input: {
      batchNumber: string;
      expiredDays: number;
      stockBase: number;
      hppBase: number;
      sellingPrice: number;
    },
  ) {
    return prisma.productBatch.create({
      data: {
        productId,
        batchNumber: input.batchNumber,
        expiredDate: futureDate(input.expiredDays),
        initialStockBase: input.stockBase,
        currentStockBase: input.stockBase,
        hppBase: input.hppBase,
        prices: {
          create: {
            productUnitId,
            sellingPrice: input.sellingPrice,
          },
        },
      },
    });
  }

  async function postSale(
    token: string,
    idempotencyKey: string,
    payload: object,
    status = 201,
  ) {
    const response = await request(app.getHttpServer())
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', idempotencyKey)
      .send(payload)
      .expect(status);
    return response.body;
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
        description: 'Manager apotek untuk pengelolaan data dan laporan.',
      },
    });
    const cashierRole = await prisma.role.upsert({
      where: { name: 'KASIR' },
      update: {},
      create: {
        name: 'KASIR',
        description: 'Kasir apotek untuk transaksi penjualan.',
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
      where: { username: 'manager_sales' },
      update: {
        roleId: managerRole.id,
        passwordHash,
        isActive: true,
        deletedAt: null,
      },
      create: {
        roleId: managerRole.id,
        name: 'Manager Sales',
        username: 'manager_sales',
        email: 'manager-sales@risyah.local',
        passwordHash,
        isActive: true,
      },
    });
    await prisma.user.upsert({
      where: { username: 'cashier_sales' },
      update: {
        roleId: cashierRole.id,
        passwordHash,
        isActive: true,
        deletedAt: null,
      },
      create: {
        roleId: cashierRole.id,
        name: 'Cashier Sales',
        username: 'cashier_sales',
        email: 'cashier-sales@risyah.local',
        passwordHash,
        isActive: true,
      },
    });
    await prisma.user.upsert({
      where: { username: 'owner_sales' },
      update: {
        roleId: ownerRole.id,
        passwordHash,
        isActive: true,
        deletedAt: null,
      },
      create: {
        roleId: ownerRole.id,
        name: 'Owner Sales',
        username: 'owner_sales',
        email: 'owner-sales@risyah.local',
        passwordHash,
        isActive: true,
      },
    });
  }

  function futureDate(days: number) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return date;
  }
});
