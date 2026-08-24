import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request = require('supertest');
import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';

describe('Purchase Orders API', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let managerToken: string;
  let pharmacistToken: string;
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

    managerToken = await login('manager_po');
    pharmacistToken = await login('apoteker_po');
    cashierToken = await login('cashier_po');
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows pharmacist to create, print, and convert PO without stock mutation', async () => {
    const fixture = await createProductFixture('create');
    const beforeBatchCount = await prisma.productBatch.count();
    const beforeMutationCount = await prisma.stockMutation.count();

    const po = await post(
      pharmacistToken,
      '/api/purchase-orders',
      {
        supplierId: fixture.supplier.id,
        orderDate: today(),
        note: 'Pesan reguler',
        items: [
          {
            productId: fixture.product.id,
            productUnitId: fixture.boxProductUnit.id,
            qtyOrdered: 3,
            note: 'Butuh cepat',
          },
        ],
      },
    );

    expect(po.poNumber).toEqual(expect.stringMatching(/^PO-/));
    expect(po.status).toBe('DRAFT');
    expect(po.items[0]).toMatchObject({
      productId: fixture.product.id,
      productUnitId: fixture.boxProductUnit.id,
      qtyOrdered: 3,
      qtyReceived: 0,
    });

    await expect(prisma.productBatch.count()).resolves.toBe(beforeBatchCount);
    await expect(prisma.stockMutation.count()).resolves.toBe(beforeMutationCount);

    const printPreview = await get(
      pharmacistToken,
      `/api/purchase-orders/${po.id}/print-preview`,
    );
    expect(printPreview).toMatchObject({
      type: 'PURCHASE_ORDER_PRINT_PREVIEW',
    });

    const draft = await post(
      pharmacistToken,
      `/api/purchase-orders/${po.id}/convert-to-purchase`,
      {},
    );
    expect(draft).toMatchObject({
      supplierId: fixture.supplier.id,
      purchaseOrderId: po.id,
    });
    expect(draft.items[0]).toMatchObject({
      purchaseOrderItemId: po.items[0].id,
      qtyPurchase: 3,
      purchasePrice: 0,
    });

    const purchaseDraft = await get(
      managerToken,
      `/api/purchases/create-from-po/${po.id}`,
    );
    expect(purchaseDraft.items[0].purchaseOrderItemId).toBe(po.items[0].id);
  });

  it('updates PO status after partial and full receipt through purchase finalization', async () => {
    const fixture = await createProductFixture('receive');
    const po = await post(managerToken, '/api/purchase-orders', {
      supplierId: fixture.supplier.id,
      orderDate: today(),
      items: [
        {
          productId: fixture.product.id,
          productUnitId: fixture.baseProductUnit.id,
          qtyOrdered: 5,
        },
      ],
    });

    const firstPurchase = await post(managerToken, '/api/purchases', {
      supplierId: fixture.supplier.id,
      purchaseOrderId: po.id,
      purchaseDate: today(),
      items: [
        {
          purchaseOrderItemId: po.items[0].id,
          productId: fixture.product.id,
          productUnitId: fixture.baseProductUnit.id,
          batchNumber: `PO-PARTIAL-${suffix}`,
          expiredDate: futureDate(365),
          qtyPurchase: 2,
          purchasePrice: 1000,
          sellingPrices: [
            { productUnitId: fixture.baseProductUnit.id, sellingPrice: 1500 },
          ],
        },
      ],
    });

    expect(firstPurchase.purchaseOrderId).toBe(po.id);
    const partiallyReceived = await get(managerToken, `/api/purchase-orders/${po.id}`);
    expect(partiallyReceived.status).toBe('PARTIALLY_RECEIVED');
    expect(partiallyReceived.items[0].qtyReceived).toBe(2);

    await post(managerToken, '/api/purchases', {
      supplierId: fixture.supplier.id,
      purchaseOrderId: po.id,
      purchaseDate: today(),
      items: [
        {
          purchaseOrderItemId: po.items[0].id,
          productId: fixture.product.id,
          productUnitId: fixture.baseProductUnit.id,
          batchNumber: `PO-FULL-${suffix}`,
          expiredDate: futureDate(365),
          qtyPurchase: 3,
          purchasePrice: 1000,
          sellingPrices: [
            { productUnitId: fixture.baseProductUnit.id, sellingPrice: 1500 },
          ],
        },
      ],
    });

    const received = await get(managerToken, `/api/purchase-orders/${po.id}`);
    expect(received.status).toBe('RECEIVED');
    expect(received.items[0].qtyReceived).toBe(5);

    const mutation = await prisma.stockMutation.findFirstOrThrow({
      where: { referenceId: firstPurchase.id, mutationType: 'PURCHASE_IN' },
    });
    expect(mutation.qtyChange.toNumber()).toBe(2);
  });

  it('rejects cashier from PO endpoints', async () => {
    await request(app.getHttpServer())
      .get('/api/purchase-orders')
      .set('Authorization', `Bearer ${cashierToken}`)
      .expect(403);
  });

  async function createProductFixture(label: string) {
    const category = await prisma.category.create({
      data: { name: `PO Category ${label} ${suffix}` },
    });
    const supplier = await prisma.supplier.create({
      data: { name: `PO Supplier ${label} ${suffix}` },
    });
    const baseUnit = await prisma.unit.create({
      data: { name: `po tablet ${label} ${suffix}`, symbol: 'tab' },
    });
    const boxUnit = await prisma.unit.create({
      data: { name: `po box ${label} ${suffix}`, symbol: 'box' },
    });
    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        baseUnitId: baseUnit.id,
        code: `PO-PROD-${label}-${suffix}`,
        name: `PO Product ${label} ${suffix}`,
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

  async function post(token: string, path: string, payload: object, status = 201) {
    const builder = request(app.getHttpServer())
      .post(path)
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    if (path === '/api/purchases') {
      builder.set('Idempotency-Key', `po-test-${suffix}-${Date.now()}-${Math.random()}`);
    }
    const response = await builder.expect(status);
    return response.body;
  }

  async function get(token: string, path: string, status = 200) {
    const response = await request(app.getHttpServer())
      .get(path)
      .set('Authorization', `Bearer ${token}`)
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
      create: { name: 'MANAGER', description: 'Manager apotek.' },
    });
    const pharmacistRole = await prisma.role.upsert({
      where: { name: 'APOTEKER' },
      update: {},
      create: { name: 'APOTEKER', description: 'Apoteker apotek.' },
    });
    const cashierRole = await prisma.role.upsert({
      where: { name: 'KASIR' },
      update: {},
      create: { name: 'KASIR', description: 'Kasir apotek.' },
    });
    const passwordHash = await bcrypt.hash('ChangeMe123!', 12);

    await prisma.user.upsert({
      where: { username: 'manager_po' },
      update: { roleId: managerRole.id, passwordHash, isActive: true, deletedAt: null },
      create: {
        roleId: managerRole.id,
        name: 'Manager PO',
        username: 'manager_po',
        email: 'manager-po@risyah.local',
        passwordHash,
        isActive: true,
      },
    });
    await prisma.user.upsert({
      where: { username: 'apoteker_po' },
      update: { roleId: pharmacistRole.id, passwordHash, isActive: true, deletedAt: null },
      create: {
        roleId: pharmacistRole.id,
        name: 'Apoteker PO',
        username: 'apoteker_po',
        email: 'apoteker-po@risyah.local',
        passwordHash,
        isActive: true,
      },
    });
    await prisma.user.upsert({
      where: { username: 'cashier_po' },
      update: { roleId: cashierRole.id, passwordHash, isActive: true, deletedAt: null },
      create: {
        roleId: cashierRole.id,
        name: 'Cashier PO',
        username: 'cashier_po',
        email: 'cashier-po@risyah.local',
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
