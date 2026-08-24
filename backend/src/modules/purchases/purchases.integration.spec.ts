import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request = require('supertest');
import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';

describe('Purchases API', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let managerToken: string;
  let cashierToken: string;
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

    managerToken = await login('manager_purchase');
    cashierToken = await login('cashier_purchase');
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a purchase, purchase item, batch prices, and PURCHASE_IN mutation', async () => {
    const fixture = await createProductFixture('create');

    const purchase = await postManager('/api/purchases', {
      supplierId: fixture.supplier.id,
      purchaseDate: today(),
      invoiceNumber: `INV-${suffix}`,
      items: [
        {
          productId: fixture.product.id,
          productUnitId: fixture.boxProductUnit.id,
          batchNumber: `PUR-BATCH-${suffix}`,
          expiredDate: futureDate(365),
          qtyPurchase: 2,
          purchasePrice: 10000,
          sellingPrices: [
            { productUnitId: fixture.baseProductUnit.id, sellingPrice: 1500 },
            { productUnitId: fixture.boxProductUnit.id, sellingPrice: 14000 },
          ],
        },
      ],
    });

    expect(purchase.purchaseNumber).toEqual(expect.stringMatching(/^PUR-/));
    expect(purchase.subtotal).toBe(20000);
    expect(purchase.items).toHaveLength(1);
    expect(purchase.items[0]).toMatchObject({
      qtyPurchase: 2,
      conversionSnapshot: 10,
      qtyBase: 20,
      purchasePrice: 10000,
      hppBase: 1000,
      totalPrice: 20000,
    });

    const detail = await getManager(`/api/purchases/${purchase.id}`);
    expect(detail.id).toBe(purchase.id);

    const batch = await prisma.productBatch.findUnique({
      where: { id: purchase.items[0].batchId },
      include: { prices: true },
    });
    expect(batch?.initialStockBase.toNumber()).toBe(20);
    expect(batch?.currentStockBase.toNumber()).toBe(20);
    expect(batch?.prices).toHaveLength(2);

    const mutations = await getManager('/api/stock/mutations');
    const mutation = mutations.find(
      (item: { referenceId: string }) => item.referenceId === purchase.id,
    );
    expect(mutation).toMatchObject({
      mutationType: 'PURCHASE_IN',
      referenceType: 'PURCHASE',
      qtyBefore: 0,
      qtyChange: 20,
      qtyAfter: 20,
    });
  });

  it('adds stock to an existing active batch instead of creating a duplicate', async () => {
    const fixture = await createProductFixture('existing');
    const batchNumber = `EXISTING-BATCH-${suffix}`;

    const firstPurchase = await postManager('/api/purchases', {
      supplierId: fixture.supplier.id,
      purchaseDate: today(),
      items: [
        {
          productId: fixture.product.id,
          productUnitId: fixture.baseProductUnit.id,
          batchNumber,
          expiredDate: futureDate(180),
          qtyPurchase: 5,
          purchasePrice: 1000,
          sellingPrices: [
            { productUnitId: fixture.baseProductUnit.id, sellingPrice: 1500 },
          ],
        },
      ],
    });

    const secondPurchase = await postManager('/api/purchases', {
      supplierId: fixture.supplier.id,
      purchaseDate: today(),
      items: [
        {
          productId: fixture.product.id,
          productUnitId: fixture.baseProductUnit.id,
          batchNumber,
          expiredDate: futureDate(180),
          qtyPurchase: 7,
          purchasePrice: 1200,
          sellingPrices: [
            { productUnitId: fixture.baseProductUnit.id, sellingPrice: 1600 },
          ],
        },
      ],
    });

    expect(secondPurchase.items[0].batchId).toBe(firstPurchase.items[0].batchId);

    const batch = await prisma.productBatch.findUniqueOrThrow({
      where: { id: firstPurchase.items[0].batchId },
      include: { prices: { where: { deletedAt: null } } },
    });
    expect(batch.initialStockBase.toNumber()).toBe(5);
    expect(batch.currentStockBase.toNumber()).toBe(12);
    expect(batch.prices).toHaveLength(1);
    expect(batch.prices[0].sellingPrice.toNumber()).toBe(1600);

    const mutations = await getManager('/api/stock/mutations');
    const secondMutation = mutations.find(
      (item: { referenceId: string }) => item.referenceId === secondPurchase.id,
    );
    expect(secondMutation).toMatchObject({
      qtyBefore: 5,
      qtyChange: 7,
      qtyAfter: 12,
    });
  });

  it('rolls back the whole purchase if one item is invalid', async () => {
    const fixture = await createProductFixture('rollback');
    const otherFixture = await createProductFixture('wrong-unit');
    const beforeCount = await prisma.purchase.count();

    await postManager(
      '/api/purchases',
      {
        supplierId: fixture.supplier.id,
        purchaseDate: today(),
        items: [
          {
            productId: fixture.product.id,
            productUnitId: fixture.baseProductUnit.id,
            batchNumber: `ROLLBACK-VALID-${suffix}`,
            expiredDate: futureDate(100),
            qtyPurchase: 1,
            purchasePrice: 1000,
            sellingPrices: [
              { productUnitId: fixture.baseProductUnit.id, sellingPrice: 1200 },
            ],
          },
          {
            productId: fixture.product.id,
            productUnitId: otherFixture.baseProductUnit.id,
            batchNumber: `ROLLBACK-INVALID-${suffix}`,
            expiredDate: futureDate(100),
            qtyPurchase: 1,
            purchasePrice: 1000,
            sellingPrices: [
              { productUnitId: fixture.baseProductUnit.id, sellingPrice: 1200 },
            ],
          },
        ],
      },
      400,
    );

    await expect(
      prisma.purchase.count(),
    ).resolves.toBe(beforeCount);
    await expect(
      prisma.productBatch.findFirst({
        where: { batchNumber: `ROLLBACK-VALID-${suffix}` },
      }),
    ).resolves.toBeNull();
  });

  it('rejects cashier and invalid purchase payloads', async () => {
    const fixture = await createProductFixture('rbac');

    await request(app.getHttpServer())
      .get('/api/purchases')
      .set('Authorization', `Bearer ${cashierToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/stock/mutations')
      .set('Authorization', `Bearer ${cashierToken}`)
      .expect(403);

    await postManager(
      '/api/purchases',
      {
        supplierId: fixture.supplier.id,
        purchaseDate: today(),
        items: [
          {
            productId: fixture.product.id,
            productUnitId: fixture.baseProductUnit.id,
            batchNumber: `BAD-QTY-${suffix}`,
            expiredDate: futureDate(10),
            qtyPurchase: 0,
            purchasePrice: 1000,
            sellingPrices: [
              { productUnitId: fixture.baseProductUnit.id, sellingPrice: 1200 },
            ],
          },
        ],
      },
      400,
    );

    await postManager(
      '/api/purchases',
      {
        supplierId: fixture.supplier.id,
        purchaseDate: today(),
        items: [
          {
            productId: fixture.product.id,
            productUnitId: fixture.baseProductUnit.id,
            batchNumber: `BAD-PRICE-${suffix}`,
            expiredDate: futureDate(10),
            qtyPurchase: 1,
            purchasePrice: -1,
            sellingPrices: [
              { productUnitId: fixture.baseProductUnit.id, sellingPrice: 1200 },
            ],
          },
        ],
      },
      400,
    );

    const inactiveSupplier = await prisma.supplier.create({
      data: {
        name: `Inactive Supplier Purchase ${suffix}`,
        isActive: false,
      },
    });

    await postManager(
      '/api/purchases',
      {
        supplierId: inactiveSupplier.id,
        purchaseDate: today(),
        items: [
          {
            productId: fixture.product.id,
            productUnitId: fixture.baseProductUnit.id,
            batchNumber: `BAD-SUPPLIER-${suffix}`,
            expiredDate: futureDate(10),
            qtyPurchase: 1,
            purchasePrice: 1000,
            sellingPrices: [
              { productUnitId: fixture.baseProductUnit.id, sellingPrice: 1200 },
            ],
          },
        ],
      },
      400,
    );
  });

  it('calculates purchase discounts, PPN excluded, and invoice validation', async () => {
    const fixture = await createProductFixture('invoice');

    const purchase = await postManager('/api/purchases', {
      supplierId: fixture.supplier.id,
      purchaseDate: today(),
      invoiceNumber: `INV-PPN-${suffix}`,
      invoiceDate: today(),
      taxMode: 'PPN_EXCLUDED',
      taxRatePercent: 11,
      invoiceTotalInput: 9990,
      items: [
        {
          productId: fixture.product.id,
          productUnitId: fixture.baseProductUnit.id,
          batchNumber: `INV-PPN-BATCH-${suffix}`,
          expiredDate: futureDate(365),
          qtyPurchase: 10,
          purchasePrice: 1000,
          discountType: 'NOMINAL',
          discountValue: 1000,
          sellingPrices: [
            { productUnitId: fixture.baseProductUnit.id, sellingPrice: 1500 },
          ],
        },
      ],
    });

    expect(purchase).toMatchObject({
      subtotal: 9000,
      purchaseDiscountAmount: 1000,
      taxMode: 'PPN_EXCLUDED',
      taxRatePercent: 11,
      taxAmount: 990,
      invoiceTotalInput: 9990,
      calculatedTotal: 9990,
    });
    expect(purchase.items[0]).toMatchObject({
      grossTotal: 10000,
      discountAmount: 1000,
      netTotal: 9000,
      hppBase: 900,
    });

    await postManager(
      '/api/purchases',
      {
        supplierId: fixture.supplier.id,
        purchaseDate: today(),
        taxMode: 'NON_PPN',
        invoiceTotalInput: 5000,
        items: [
          {
            productId: fixture.product.id,
            productUnitId: fixture.baseProductUnit.id,
            batchNumber: `BAD-INVOICE-${suffix}`,
            expiredDate: futureDate(365),
            qtyPurchase: 1,
            purchasePrice: 1000,
            sellingPrices: [
              { productUnitId: fixture.baseProductUnit.id, sellingPrice: 1500 },
            ],
          },
        ],
      },
      400,
    );
  });

  async function createProductFixture(label: string) {
    const category = await prisma.category.create({
      data: { name: `Purchase Category ${label} ${suffix}` },
    });
    const supplier = await prisma.supplier.create({
      data: { name: `Purchase Supplier ${label} ${suffix}` },
    });
    const baseUnit = await prisma.unit.create({
      data: { name: `purchase tablet ${label} ${suffix}`, symbol: 'tab' },
    });
    const boxUnit = await prisma.unit.create({
      data: { name: `purchase box ${label} ${suffix}`, symbol: 'box' },
    });
    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        baseUnitId: baseUnit.id,
        code: `PUR-PROD-${label}-${suffix}`,
        name: `Purchase Product ${label} ${suffix}`,
      },
    });
    const baseProductUnit = await prisma.productUnit.create({
      data: {
        productId: product.id,
        unitId: baseUnit.id,
        conversionToBase: 1,
        isDefaultSaleUnit: true,
      },
    });
    const boxProductUnit = await prisma.productUnit.create({
      data: {
        productId: product.id,
        unitId: boxUnit.id,
        conversionToBase: 10,
      },
    });

    return { category, supplier, baseUnit, boxUnit, product, baseProductUnit, boxProductUnit };
  }

  async function postManager(path: string, payload: object, status = 201) {
    const response = await request(app.getHttpServer())
      .post(path)
      .set('Authorization', `Bearer ${managerToken}`)
      .set('Idempotency-Key', `purchase-test-${Date.now()}-${Math.random()}`)
      .send(payload)
      .expect(status);
    return response.body;
  }

  async function getManager(path: string, status = 200) {
    const response = await request(app.getHttpServer())
      .get(path)
      .set('Authorization', `Bearer ${managerToken}`)
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
    const passwordHash = await bcrypt.hash('ChangeMe123!', 12);

    await prisma.user.upsert({
      where: { username: 'manager_purchase' },
      update: {
        roleId: managerRole.id,
        passwordHash,
        isActive: true,
        deletedAt: null,
      },
      create: {
        roleId: managerRole.id,
        name: 'Manager Purchase',
        username: 'manager_purchase',
        email: 'manager-purchase@risyah.local',
        passwordHash,
        isActive: true,
      },
    });
    await prisma.user.upsert({
      where: { username: 'cashier_purchase' },
      update: {
        roleId: cashierRole.id,
        passwordHash,
        isActive: true,
        deletedAt: null,
      },
      create: {
        roleId: cashierRole.id,
        name: 'Cashier Purchase',
        username: 'cashier_purchase',
        email: 'cashier-purchase@risyah.local',
        passwordHash,
        isActive: true,
      },
    });
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function futureDate(days: number) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }
});
