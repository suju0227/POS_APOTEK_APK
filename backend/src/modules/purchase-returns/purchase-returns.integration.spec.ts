import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request = require('supertest');
import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';

describe('Purchase Returns API', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let managerToken: string;
  let cashierToken: string;
  let pharmacistToken: string;
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

    managerToken = await login('manager_purchase_returns');
    cashierToken = await login('cashier_purchase_returns');
    pharmacistToken = await login('pharmacist_purchase_returns');
  });

  afterAll(async () => {
    await app.close();
  });

  it('lets manager create purchase return, decreases stock, and records PURCHASE_RETURN_OUT', async () => {
    const fixture = await createFixture('valid');

    const response = await postPurchaseReturn(
      managerToken,
      `purchase-return-valid-${suffix}`,
      {
        purchaseId: fixture.purchase.id,
        reason: 'Barang dikembalikan ke supplier',
        items: [
          {
            batchId: fixture.batch.id,
            qtyBaseReturned: 2,
          },
        ],
      },
    );

    expect(response).toMatchObject({
      purchaseId: fixture.purchase.id,
      purchaseNumber: fixture.purchase.purchaseNumber,
      totalAmount: 246.913578,
      status: 'FINAL',
    });
    expect(response.items[0]).toMatchObject({
      productId: fixture.product.id,
      batchId: fixture.batch.id,
      qtyBaseReturned: 2,
      hppBaseSnapshot: 123.456789,
      totalAmount: 246.913578,
    });

    const storedBatch = await prisma.productBatch.findUniqueOrThrow({
      where: { id: fixture.batch.id },
    });
    expect(storedBatch.currentStockBase.toNumber()).toBe(8);

    const mutation = await prisma.stockMutation.findFirstOrThrow({
      where: {
        referenceId: response.id,
        mutationType: 'PURCHASE_RETURN_OUT',
      },
    });
    expect(mutation).toMatchObject({
      referenceType: 'PURCHASE_RETURN',
      productId: fixture.product.id,
      batchId: fixture.batch.id,
    });
    expect(mutation.qtyBefore.toNumber()).toBe(10);
    expect(mutation.qtyChange.toNumber()).toBe(-2);
    expect(mutation.qtyAfter.toNumber()).toBe(8);
  });

  it('rejects invalid qty, empty reason, invalid batch, and over-return without stock changes', async () => {
    const fixture = await createFixture('invalid');

    await postPurchaseReturn(
      managerToken,
      `purchase-return-over-${suffix}`,
      {
        reason: 'Melebihi stok',
        items: [{ batchId: fixture.batch.id, qtyBaseReturned: 20 }],
      },
      400,
    );

    await postPurchaseReturn(
      managerToken,
      `purchase-return-empty-reason-${suffix}`,
      {
        reason: '   ',
        items: [{ batchId: fixture.batch.id, qtyBaseReturned: 1 }],
      },
      400,
    );

    await postPurchaseReturn(
      managerToken,
      `purchase-return-zero-${suffix}`,
      {
        reason: 'Qty nol',
        items: [{ batchId: fixture.batch.id, qtyBaseReturned: 0 }],
      },
      400,
    );

    await postPurchaseReturn(
      managerToken,
      `purchase-return-invalid-batch-${suffix}`,
      {
        reason: 'Batch tidak valid',
        items: [
          {
            batchId: '00000000-0000-0000-0000-000000000000',
            qtyBaseReturned: 1,
          },
        ],
      },
      400,
    );

    const storedBatch = await prisma.productBatch.findUniqueOrThrow({
      where: { id: fixture.batch.id },
    });
    expect(storedBatch.currentStockBase.toNumber()).toBe(10);
  });

  it('handles idempotent retries and rejects reused keys with different payloads', async () => {
    const fixture = await createFixture('idempotency');
    const payload = {
      reason: 'Retur idempotent',
      items: [{ batchId: fixture.batch.id, qtyBaseReturned: 1 }],
    };
    const beforeCount = await prisma.purchaseReturn.count();

    const first = await postPurchaseReturn(
      managerToken,
      `purchase-return-idem-${suffix}`,
      payload,
    );
    const second = await postPurchaseReturn(
      managerToken,
      `purchase-return-idem-${suffix}`,
      payload,
    );

    expect(second.id).toBe(first.id);
    await expect(prisma.purchaseReturn.count()).resolves.toBe(beforeCount + 1);

    await postPurchaseReturn(
      managerToken,
      `purchase-return-idem-${suffix}`,
      {
        ...payload,
        reason: 'Payload berbeda',
      },
      409,
    );
  });

  it('restricts purchase returns to manager only', async () => {
    const fixture = await createFixture('rbac');

    await request(app.getHttpServer())
      .get('/api/purchase-returns')
      .set('Authorization', `Bearer ${cashierToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/purchase-returns')
      .set('Authorization', `Bearer ${pharmacistToken}`)
      .set('Idempotency-Key', `purchase-return-pharmacist-${suffix}`)
      .send({
        reason: 'Apoteker ditolak',
        items: [{ batchId: fixture.batch.id, qtyBaseReturned: 1 }],
      })
      .expect(403);
  });

  async function createFixture(label: string) {
    const category = await prisma.category.create({
      data: { name: `Purchase Return Category ${label} ${suffix}` },
    });
    const supplier = await prisma.supplier.create({
      data: { name: `Purchase Return Supplier ${label} ${suffix}` },
    });
    const unit = await prisma.unit.create({
      data: {
        name: `purchase return unit ${label} ${suffix}`,
        symbol: `pr${label.slice(0, 2)}`,
      },
    });
    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        baseUnitId: unit.id,
        code: `PRET-${label}-${suffix}`,
        name: `Purchase Return Product ${label} ${suffix}`,
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
    const purchase = await prisma.purchase.create({
      data: {
        supplierId: supplier.id,
        createdById: await managerUserId(),
        purchaseNumber: `PUR-RET-${label}-${suffix}`,
        purchaseDate: futureDate(0),
        subtotal: 1234.56789,
        calculatedTotal: 1234.56789,
      },
    });
    const batch = await prisma.productBatch.create({
      data: {
        productId: product.id,
        supplierId: supplier.id,
        batchNumber: `PRET-BATCH-${label}-${suffix}`,
        expiredDate: futureDate(30),
        initialStockBase: 10,
        currentStockBase: 10,
        hppBase: 123.456789,
      },
    });
    await prisma.purchaseItem.create({
      data: {
        purchaseId: purchase.id,
        productId: product.id,
        productUnitId: productUnit.id,
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        expiredDate: batch.expiredDate,
        qtyPurchase: 10,
        qtyReceived: 10,
        conversionSnapshot: 1,
        qtyBase: 10,
        purchasePrice: 1234.56789,
        grossTotal: 1234.56789,
        netTotal: 1234.56789,
        hppBase: 123.456789,
        totalPrice: 1234.56789,
      },
    });

    return { category, supplier, unit, product, productUnit, purchase, batch };
  }

  async function postPurchaseReturn(
    token: string,
    idempotencyKey: string,
    payload: object,
    status = 201,
  ) {
    const response = await request(app.getHttpServer())
      .post('/api/purchase-returns')
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

  async function managerUserId() {
    const user = await prisma.user.findUniqueOrThrow({
      where: { username: 'manager_purchase_returns' },
    });
    return user.id;
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
    const pharmacistRole = await prisma.role.upsert({
      where: { name: 'APOTEKER' },
      update: {},
      create: {
        name: 'APOTEKER',
        description: 'Apoteker untuk PO, resep, dan konseling.',
      },
    });
    const passwordHash = await bcrypt.hash('ChangeMe123!', 12);

    await prisma.user.upsert({
      where: { username: 'manager_purchase_returns' },
      update: {
        roleId: managerRole.id,
        passwordHash,
        isActive: true,
        deletedAt: null,
      },
      create: {
        roleId: managerRole.id,
        name: 'Manager Purchase Returns',
        username: 'manager_purchase_returns',
        email: 'manager-purchase-returns@risyah.local',
        passwordHash,
        isActive: true,
      },
    });
    await prisma.user.upsert({
      where: { username: 'cashier_purchase_returns' },
      update: {
        roleId: cashierRole.id,
        passwordHash,
        isActive: true,
        deletedAt: null,
      },
      create: {
        roleId: cashierRole.id,
        name: 'Cashier Purchase Returns',
        username: 'cashier_purchase_returns',
        email: 'cashier-purchase-returns@risyah.local',
        passwordHash,
        isActive: true,
      },
    });
    await prisma.user.upsert({
      where: { username: 'pharmacist_purchase_returns' },
      update: {
        roleId: pharmacistRole.id,
        passwordHash,
        isActive: true,
        deletedAt: null,
      },
      create: {
        roleId: pharmacistRole.id,
        name: 'Pharmacist Purchase Returns',
        username: 'pharmacist_purchase_returns',
        email: 'pharmacist-purchase-returns@risyah.local',
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
