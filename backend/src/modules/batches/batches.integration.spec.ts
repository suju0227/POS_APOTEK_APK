import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request = require('supertest');
import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';

describe('Batches API', () => {
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

    managerToken = await login('manager_batch');
    cashierToken = await login('cashier_batch');
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows manager to create, list, view, update, and deactivate a batch', async () => {
    const fixture = await createProductFixture('happy');
    const alertDate = futureDate(10);

    const batch = await postManager('/api/batches', {
      productId: fixture.product.id,
      supplierId: fixture.supplier.id,
      batchNumber: `BATCH-${suffix}`,
      expiredDate: alertDate,
      initialStockBase: 100,
      currentStockBase: 80,
      hppBase: 1500,
      prices: [
        { productUnitId: fixture.baseProductUnit.id, sellingPrice: 2500 },
        { productUnitId: fixture.boxProductUnit.id, sellingPrice: 24000 },
      ],
    });

    expect(batch).toMatchObject({
      batchNumber: `BATCH-${suffix}`,
      initialStockBase: 100,
      currentStockBase: 80,
      hppBase: 1500,
      status: 'ACTIVE',
    });
    expect(batch.prices).toHaveLength(2);

    const list = await getManager('/api/batches');
    expect(list.some((item: { id: string }) => item.id === batch.id)).toBe(true);

    const detail = await getManager(`/api/batches/${batch.id}`);
    expect(detail.id).toBe(batch.id);

    const updated = await patchManager(`/api/batches/${batch.id}`, {
      currentStockBase: 60,
      prices: [{ productUnitId: fixture.baseProductUnit.id, sellingPrice: 2600 }],
    });
    expect(updated.currentStockBase).toBe(60);
    expect(updated.prices).toHaveLength(1);
    expect(updated.prices[0].sellingPrice).toBe(2600);

    const alert = await getManager('/api/batches/expired-alert');
    expect(alert.some((item: { id: string }) => item.id === batch.id)).toBe(true);

    const deactivated = await patchManager(`/api/batches/${batch.id}/deactivate`, {});
    expect(deactivated.isActive).toBe(false);
    expect(deactivated.deletedAt).toEqual(expect.any(String));
    expect(deactivated.status).toBe('INACTIVE');

    const stored = await prisma.productBatch.findUnique({
      where: { id: batch.id },
      include: { prices: true },
    });
    expect(stored).toBeTruthy();
    expect(stored?.deletedAt).toBeTruthy();
    expect(stored?.prices.every((price) => price.deletedAt)).toBe(true);
  });

  it('rejects cashier from batch management endpoints', async () => {
    await request(app.getHttpServer())
      .get('/api/batches')
      .set('Authorization', `Bearer ${cashierToken}`)
      .expect(403);
  });

  it('rejects negative values, duplicate prices, and product unit from another product', async () => {
    const fixture = await createProductFixture('validation');
    const otherFixture = await createProductFixture('other');

    await postManager(
      '/api/batches',
      {
        productId: fixture.product.id,
        batchNumber: `NEG-${suffix}`,
        expiredDate: futureDate(20),
        initialStockBase: -1,
        currentStockBase: 1,
        hppBase: 1,
        prices: [{ productUnitId: fixture.baseProductUnit.id, sellingPrice: 1 }],
      },
      400,
    );

    await postManager(
      '/api/batches',
      {
        productId: fixture.product.id,
        batchNumber: `PRICE-NEG-${suffix}`,
        expiredDate: futureDate(20),
        initialStockBase: 1,
        currentStockBase: 1,
        hppBase: 1,
        prices: [{ productUnitId: fixture.baseProductUnit.id, sellingPrice: -1 }],
      },
      400,
    );

    await postManager(
      '/api/batches',
      {
        productId: fixture.product.id,
        batchNumber: `DUPPRICE-${suffix}`,
        expiredDate: futureDate(20),
        initialStockBase: 1,
        currentStockBase: 1,
        hppBase: 1,
        prices: [
          { productUnitId: fixture.baseProductUnit.id, sellingPrice: 1 },
          { productUnitId: fixture.baseProductUnit.id, sellingPrice: 2 },
        ],
      },
      400,
    );

    await postManager(
      '/api/batches',
      {
        productId: fixture.product.id,
        batchNumber: `WRONGUNIT-${suffix}`,
        expiredDate: futureDate(20),
        initialStockBase: 1,
        currentStockBase: 1,
        hppBase: 1,
        prices: [{ productUnitId: otherFixture.baseProductUnit.id, sellingPrice: 1 }],
      },
      400,
    );
  });

  async function createProductFixture(label: string) {
    const category = await prisma.category.create({
      data: {
        name: `Batch Category ${label} ${suffix}`,
      },
    });

    const supplier = await prisma.supplier.create({
      data: {
        name: `Batch Supplier ${label} ${suffix}`,
      },
    });

    const baseUnit = await prisma.unit.create({
      data: {
        name: `tablet batch ${label} ${suffix}`,
        symbol: 'tab',
      },
    });

    const boxUnit = await prisma.unit.create({
      data: {
        name: `box batch ${label} ${suffix}`,
        symbol: 'box',
      },
    });

    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        baseUnitId: baseUnit.id,
        code: `BATCH-PROD-${label}-${suffix}`,
        name: `Batch Product ${label} ${suffix}`,
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

    return {
      category,
      supplier,
      baseUnit,
      boxUnit,
      product,
      baseProductUnit,
      boxProductUnit,
    };
  }

  async function postManager(path: string, payload: object, status = 201) {
    const response = await request(app.getHttpServer())
      .post(path)
      .set('Authorization', `Bearer ${managerToken}`)
      .send(payload)
      .expect(status);
    return response.body;
  }

  async function patchManager(path: string, payload: object, status = 200) {
    const response = await request(app.getHttpServer())
      .patch(path)
      .set('Authorization', `Bearer ${managerToken}`)
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
      where: { username: 'manager_batch' },
      update: {
        roleId: managerRole.id,
        passwordHash,
        isActive: true,
        deletedAt: null,
      },
      create: {
        roleId: managerRole.id,
        name: 'Manager Batch',
        username: 'manager_batch',
        email: 'manager-batch@risyah.local',
        passwordHash,
        isActive: true,
      },
    });

    await prisma.user.upsert({
      where: { username: 'cashier_batch' },
      update: {
        roleId: cashierRole.id,
        passwordHash,
        isActive: true,
        deletedAt: null,
      },
      create: {
        roleId: cashierRole.id,
        name: 'Cashier Batch',
        username: 'cashier_batch',
        email: 'cashier-batch@risyah.local',
        passwordHash,
        isActive: true,
      },
    });
  }

  function futureDate(days: number) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }
});
