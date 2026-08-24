import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request = require('supertest');
import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';

describe('Stock API', () => {
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

    managerToken = await login('manager_stock');
    cashierToken = await login('cashier_stock');
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns product stock summary and batch detail excluding expired stock from available total', async () => {
    const fixture = await createStockFixture('summary');

    const stockList = await getManager('/api/stock');
    const productStock = stockList.find((item: { id: string }) => item.id === fixture.product.id);

    expect(productStock).toMatchObject({
      id: fixture.product.id,
      totalStockBase: 8,
      minStockBase: 10,
      isLowStock: true,
      activeBatchCount: 1,
      expiredBatchCount: 1,
    });

    const detail = await getManager(`/api/stock/${fixture.product.id}`);
    expect(detail.batches).toHaveLength(2);
    expect(detail.batches.map((batch: { status: string }) => batch.status)).toEqual(
      expect.arrayContaining(['ACTIVE', 'EXPIRED']),
    );
  });

  it('creates stock adjustment, updates batch qty, and records stock mutation', async () => {
    const fixture = await createStockFixture('adjustment');

    const adjustment = await request(app.getHttpServer())
      .post('/api/stock/adjustments')
      .set('Authorization', `Bearer ${managerToken}`)
      .set('Idempotency-Key', `stock-adjustment-${suffix}`)
      .send({
        batchId: fixture.activeBatch.id,
        newQtyBase: 15,
        reason: 'Koreksi stok opname',
      })
      .expect(201);

    expect(adjustment.body).toMatchObject({
      oldQty: 8,
      newQty: 15,
      difference: 7,
      reason: 'Koreksi stok opname',
    });

    const batch = await prisma.productBatch.findUniqueOrThrow({
      where: { id: fixture.activeBatch.id },
    });
    expect(batch.currentStockBase.toNumber()).toBe(15);

    const mutations = await getManager('/api/stock/mutations');
    const mutation = mutations.find(
      (item: { referenceId: string }) => item.referenceId === adjustment.body.id,
    );

    expect(mutation).toMatchObject({
      mutationType: 'STOCK_ADJUSTMENT_IN',
      referenceType: 'STOCK_ADJUSTMENT',
      qtyBefore: 8,
      qtyChange: 7,
      qtyAfter: 15,
      reason: 'Koreksi stok opname',
    });
  });

  it('rejects invalid adjustment payloads and cashier access', async () => {
    const fixture = await createStockFixture('rbac');

    await request(app.getHttpServer())
      .get('/api/stock')
      .set('Authorization', `Bearer ${cashierToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/stock/adjustments')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        batchId: fixture.activeBatch.id,
        newQtyBase: 1,
        reason: 'Tidak boleh',
      })
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/stock/adjustments')
      .set('Authorization', `Bearer ${managerToken}`)
      .set('Idempotency-Key', `stock-adjustment-invalid-${suffix}`)
      .send({
        batchId: fixture.activeBatch.id,
        newQtyBase: -1,
        reason: 'Invalid',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/stock/adjustments')
      .set('Authorization', `Bearer ${managerToken}`)
      .set('Idempotency-Key', `stock-adjustment-same-${suffix}`)
      .send({
        batchId: fixture.activeBatch.id,
        newQtyBase: 8,
        reason: 'Sama',
      })
      .expect(400);
  });

  async function createStockFixture(label: string) {
    const category = await prisma.category.create({
      data: { name: `Stock Category ${label} ${suffix}` },
    });
    const unit = await prisma.unit.create({
      data: { name: `stock tablet ${label} ${suffix}`, symbol: 'tab' },
    });
    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        baseUnitId: unit.id,
        code: `STOCK-PROD-${label}-${suffix}`,
        name: `Stock Product ${label} ${suffix}`,
        minStockBase: 10,
      },
    });
    const productUnit = await prisma.productUnit.create({
      data: {
        productId: product.id,
        unitId: unit.id,
        conversionToBase: 1,
        isDefaultSaleUnit: true,
      },
    });

    const activeBatch = await prisma.productBatch.create({
      data: {
        productId: product.id,
        batchNumber: `STOCK-ACTIVE-${label}-${suffix}`,
        expiredDate: futureDate(90),
        initialStockBase: 8,
        currentStockBase: 8,
        hppBase: 1000,
        prices: {
          create: {
            productUnitId: productUnit.id,
            sellingPrice: 1500,
          },
        },
      },
    });

    const expiredBatch = await prisma.productBatch.create({
      data: {
        productId: product.id,
        batchNumber: `STOCK-EXPIRED-${label}-${suffix}`,
        expiredDate: pastDate(1),
        initialStockBase: 4,
        currentStockBase: 4,
        hppBase: 900,
      },
    });

    return { category, unit, product, productUnit, activeBatch, expiredBatch };
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
      where: { username: 'manager_stock' },
      update: {
        roleId: managerRole.id,
        passwordHash,
        isActive: true,
        deletedAt: null,
      },
      create: {
        roleId: managerRole.id,
        name: 'Manager Stock',
        username: 'manager_stock',
        email: 'manager-stock@risyah.local',
        passwordHash,
        isActive: true,
      },
    });
    await prisma.user.upsert({
      where: { username: 'cashier_stock' },
      update: {
        roleId: cashierRole.id,
        passwordHash,
        isActive: true,
        deletedAt: null,
      },
      create: {
        roleId: cashierRole.id,
        name: 'Cashier Stock',
        username: 'cashier_stock',
        email: 'cashier-stock@risyah.local',
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

  function pastDate(days: number) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - days);
    return date;
  }
});
