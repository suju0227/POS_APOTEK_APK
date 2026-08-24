import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request = require('supertest');
import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';

describe('Sales Returns API', () => {
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

    managerToken = await login('manager_returns');
    cashierToken = await login('cashier_returns');
    ownerToken = await login('owner_returns');
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns cashier-safe returnable items for a sale', async () => {
    const fixture = await createSaleFixture('returnable-items');

    const response = await request(app.getHttpServer())
      .get(`/api/sales/${fixture.sale.id}/returnable-items`)
      .set('Authorization', `Bearer ${cashierToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      saleId: fixture.sale.id,
      saleNumber: fixture.sale.saleNumber,
    });
    expect(response.body.items[0]).toMatchObject({
      saleBatchAllocationId: fixture.allocation.id,
      productId: fixture.product.id,
      batchId: fixture.batch.id,
      qtyBase: 3,
      returnedQtyBase: 0,
      returnableQtyBase: 3,
      refundableAmount: 3000,
    });
    expect(JSON.stringify(response.body)).not.toContain('hpp');
    expect(JSON.stringify(response.body)).not.toContain('profit');
  });

  it('creates a partial sales return, restores stock, records mutation, and sanitizes cashier response', async () => {
    const fixture = await createSaleFixture('partial-return');

    const response = await postSalesReturn(
      cashierToken,
      `return-partial-${suffix}`,
      {
        saleId: fixture.sale.id,
        reason: 'Barang dikembalikan pelanggan',
        items: [
          {
            saleBatchAllocationId: fixture.allocation.id,
            qtyBaseReturned: 1,
          },
        ],
      },
    );

    expect(response).toMatchObject({
      saleId: fixture.sale.id,
      saleNumber: fixture.sale.saleNumber,
      totalRefund: 1000,
      status: 'FINAL',
    });
    expect(response.totalHppReversed).toBeUndefined();
    expect(response.totalProfitReversed).toBeUndefined();
    expect(response.items[0]).toMatchObject({
      saleBatchAllocationId: fixture.allocation.id,
      qtyBaseReturned: 1,
      refundAmount: 1000,
    });
    expect(response.items[0].hppReversed).toBeUndefined();
    expect(response.items[0].profitReversed).toBeUndefined();

    const storedAllocation = await prisma.saleBatchAllocation.findUniqueOrThrow({
      where: { id: fixture.allocation.id },
    });
    expect(storedAllocation.returnedQtyBase.toNumber()).toBe(1);

    const storedBatch = await prisma.productBatch.findUniqueOrThrow({
      where: { id: fixture.batch.id },
    });
    expect(storedBatch.currentStockBase.toNumber()).toBe(8);

    const mutation = await prisma.stockMutation.findFirstOrThrow({
      where: {
        referenceId: response.id,
        mutationType: 'SALES_RETURN_IN',
      },
    });
    expect(mutation).toMatchObject({
      referenceType: 'SALES_RETURN',
      productId: fixture.product.id,
      batchId: fixture.batch.id,
    });
    expect(mutation.qtyBefore.toNumber()).toBe(7);
    expect(mutation.qtyChange.toNumber()).toBe(1);
    expect(mutation.qtyAfter.toNumber()).toBe(8);
  });

  it('returns manager detail with HPP and profit correction', async () => {
    const fixture = await createSaleFixture('manager-detail');
    const salesReturn = await postSalesReturn(
      managerToken,
      `return-manager-${suffix}`,
      {
        saleId: fixture.sale.id,
        reason: 'Retur detail manager',
        items: [
          {
            saleBatchAllocationId: fixture.allocation.id,
            qtyBaseReturned: 2,
          },
        ],
      },
    );

    const response = await request(app.getHttpServer())
      .get(`/api/sales-returns/${salesReturn.id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(response.body.totalRefund).toBe(2000);
    expect(response.body.totalHppReversed).toBe(800);
    expect(response.body.totalProfitReversed).toBe(1200);
    expect(response.body.items[0]).toMatchObject({
      hppReversed: 800,
      profitReversed: 1200,
    });
  });

  it('rejects over-return and invalid payloads without changing stock', async () => {
    const fixture = await createSaleFixture('invalid-return');

    await postSalesReturn(
      cashierToken,
      `return-over-${suffix}`,
      {
        saleId: fixture.sale.id,
        reason: 'Retur berlebih',
        items: [
          {
            saleBatchAllocationId: fixture.allocation.id,
            qtyBaseReturned: 4,
          },
        ],
      },
      400,
    );

    await postSalesReturn(
      cashierToken,
      `return-empty-reason-${suffix}`,
      {
        saleId: fixture.sale.id,
        reason: '   ',
        items: [
          {
            saleBatchAllocationId: fixture.allocation.id,
            qtyBaseReturned: 1,
          },
        ],
      },
      400,
    );

    await postSalesReturn(
      cashierToken,
      `return-zero-${suffix}`,
      {
        saleId: fixture.sale.id,
        reason: 'Qty nol',
        items: [
          {
            saleBatchAllocationId: fixture.allocation.id,
            qtyBaseReturned: 0,
          },
        ],
      },
      400,
    );

    const storedAllocation = await prisma.saleBatchAllocation.findUniqueOrThrow({
      where: { id: fixture.allocation.id },
    });
    const storedBatch = await prisma.productBatch.findUniqueOrThrow({
      where: { id: fixture.batch.id },
    });
    expect(storedAllocation.returnedQtyBase.toNumber()).toBe(0);
    expect(storedBatch.currentStockBase.toNumber()).toBe(7);
  });

  it('handles idempotent retries and rejects reused return keys with different payloads', async () => {
    const fixture = await createSaleFixture('idempotency-return');
    const payload = {
      saleId: fixture.sale.id,
      reason: 'Retur idempotent',
      items: [
        {
          saleBatchAllocationId: fixture.allocation.id,
          qtyBaseReturned: 1,
        },
      ],
    };

    const beforeCount = await prisma.salesReturn.count();
    const first = await postSalesReturn(
      cashierToken,
      `return-idem-${suffix}`,
      payload,
    );
    const second = await postSalesReturn(
      cashierToken,
      `return-idem-${suffix}`,
      payload,
    );

    expect(second.id).toBe(first.id);
    await expect(prisma.salesReturn.count()).resolves.toBe(beforeCount + 1);

    await postSalesReturn(
      cashierToken,
      `return-idem-${suffix}`,
      {
        ...payload,
        reason: 'Payload berbeda',
      },
      409,
    );
  });

  it('rejects roles outside cashier and manager', async () => {
    const fixture = await createSaleFixture('rbac-return');

    await request(app.getHttpServer())
      .get(`/api/sales/${fixture.sale.id}/returnable-items`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/sales-returns')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('Idempotency-Key', `return-owner-${suffix}`)
      .send({
        saleId: fixture.sale.id,
        reason: 'Owner ditolak',
        items: [
          {
            saleBatchAllocationId: fixture.allocation.id,
            qtyBaseReturned: 1,
          },
        ],
      })
      .expect(403);
  });

  async function createSaleFixture(label: string) {
    const category = await prisma.category.create({
      data: { name: `Return Category ${label} ${suffix}` },
    });
    const unit = await prisma.unit.create({
      data: {
        name: `return unit ${label} ${suffix}`,
        symbol: `ru${label.slice(0, 2)}`,
      },
    });
    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        baseUnitId: unit.id,
        code: `RET-${label}-${suffix}`,
        name: `Return Product ${label} ${suffix}`,
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
        batchNumber: `RET-BATCH-${label}-${suffix}`,
        expiredDate: futureDate(30),
        initialStockBase: 10,
        currentStockBase: 10,
        hppBase: 400,
        prices: {
          create: {
            productUnitId: productUnit.id,
            sellingPrice: 1000,
          },
        },
      },
    });

    const sale = await postSale(managerToken, `return-sale-${label}-${suffix}`, {
      paymentMethod: 'CASH',
      paidAmount: 5000,
      discountType: 'NONE',
      discountValue: 0,
      items: [
        {
          productId: product.id,
          productUnitId: productUnit.id,
          qtySaleUnit: 3,
        },
      ],
    });

    const allocation = await prisma.saleBatchAllocation.findFirstOrThrow({
      where: {
        batchId: batch.id,
        saleItem: { saleId: sale.id },
      },
    });

    return { category, unit, product, productUnit, batch, sale, allocation };
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

  async function postSalesReturn(
    token: string,
    idempotencyKey: string,
    payload: object,
    status = 201,
  ) {
    const response = await request(app.getHttpServer())
      .post('/api/sales-returns')
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
      where: { username: 'manager_returns' },
      update: {
        roleId: managerRole.id,
        passwordHash,
        isActive: true,
        deletedAt: null,
      },
      create: {
        roleId: managerRole.id,
        name: 'Manager Returns',
        username: 'manager_returns',
        email: 'manager-returns@risyah.local',
        passwordHash,
        isActive: true,
      },
    });
    await prisma.user.upsert({
      where: { username: 'cashier_returns' },
      update: {
        roleId: cashierRole.id,
        passwordHash,
        isActive: true,
        deletedAt: null,
      },
      create: {
        roleId: cashierRole.id,
        name: 'Cashier Returns',
        username: 'cashier_returns',
        email: 'cashier-returns@risyah.local',
        passwordHash,
        isActive: true,
      },
    });
    await prisma.user.upsert({
      where: { username: 'owner_returns' },
      update: {
        roleId: ownerRole.id,
        passwordHash,
        isActive: true,
        deletedAt: null,
      },
      create: {
        roleId: ownerRole.id,
        name: 'Owner Returns',
        username: 'owner_returns',
        email: 'owner-returns@risyah.local',
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
