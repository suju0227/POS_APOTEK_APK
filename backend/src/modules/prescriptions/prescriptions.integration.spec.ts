import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request = require('supertest');
import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';

describe('Prescriptions and counseling API', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let pharmacistToken: string;
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

    pharmacistToken = await login('pharmacist_presc');
    managerToken = await login('manager_presc');
    cashierToken = await login('cashier_presc');
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows apoteker and manager to create prescriptions without changing stock', async () => {
    const fixture = await createProductFixture('create');
    const batch = await createBatchWithPrice(
      fixture.product.id,
      fixture.baseProductUnit.id,
      {
        batchNumber: `PRESC-CREATE-${suffix}`,
        expiredDays: 30,
        stockBase: 10,
        hppBase: 500,
        sellingPrice: 1000,
      },
    );
    const mutationCountBefore = await prisma.stockMutation.count();

    const prescription = await createPrescription(pharmacistToken, fixture);
    expect(prescription).toMatchObject({
      patientName: `Patient ${suffix}`,
      status: 'DRAFT',
    });
    expect(prescription.items[0]).toMatchObject({
      productId: fixture.product.id,
      productUnitId: fixture.baseProductUnit.id,
      qtySaleUnit: 2,
    });

    await createPrescription(managerToken, fixture, 'manager');

    const storedBatch = await prisma.productBatch.findUniqueOrThrow({
      where: { id: batch.id },
    });
    expect(storedBatch.currentStockBase.toNumber()).toBe(10);
    await expect(prisma.stockMutation.count()).resolves.toBe(mutationCountBefore);

    await request(app.getHttpServer())
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send(prescriptionPayload(fixture))
      .expect(403);
  });

  it('marks prescription ready for payment without reducing stock and exposes ready list to cashier', async () => {
    const fixture = await createProductFixture('ready');
    const batch = await createBatchWithPrice(
      fixture.product.id,
      fixture.baseProductUnit.id,
      {
        batchNumber: `PRESC-READY-${suffix}`,
        expiredDays: 30,
        stockBase: 6,
        hppBase: 500,
        sellingPrice: 1000,
      },
    );
    const prescription = await createPrescription(pharmacistToken, fixture, 'ready');

    const ready = await request(app.getHttpServer())
      .post(`/api/prescriptions/${prescription.id}/mark-ready-for-payment`)
      .set('Authorization', `Bearer ${pharmacistToken}`)
      .expect(201);

    expect(ready.body.status).toBe('READY_FOR_PAYMENT');
    const storedBatch = await prisma.productBatch.findUniqueOrThrow({
      where: { id: batch.id },
    });
    expect(storedBatch.currentStockBase.toNumber()).toBe(6);

    const readyList = await request(app.getHttpServer())
      .get('/api/prescriptions/ready-for-payment')
      .set('Authorization', `Bearer ${cashierToken}`)
      .expect(200);

    expect(
      readyList.body.some(
        (item: { id: string; status: string }) =>
          item.id === prescription.id && item.status === 'READY_FOR_PAYMENT',
      ),
    ).toBe(true);
  });

  it('checks out a ready prescription through sales and keeps cashier response sanitized', async () => {
    const fixture = await createProductFixture('checkout');
    const batch = await createBatchWithPrice(
      fixture.product.id,
      fixture.baseProductUnit.id,
      {
        batchNumber: `PRESC-CHECKOUT-${suffix}`,
        expiredDays: 30,
        stockBase: 5,
        hppBase: 333.33333333,
        sellingPrice: 1000,
      },
    );
    const prescription = await createPrescription(
      pharmacistToken,
      fixture,
      'checkout',
    );

    await request(app.getHttpServer())
      .post(`/api/prescriptions/${prescription.id}/mark-ready-for-payment`)
      .set('Authorization', `Bearer ${pharmacistToken}`)
      .expect(201);

    const saleResponse = await request(app.getHttpServer())
      .post(`/api/sales/from-prescription/${prescription.id}`)
      .set('Authorization', `Bearer ${cashierToken}`)
      .set('Idempotency-Key', `presc-checkout-${suffix}`)
      .send({
        paymentMethod: 'CASH',
        paidAmount: 5000,
        discountType: 'NONE',
        discountValue: 0,
      })
      .expect(201);

    expect(saleResponse.body).toMatchObject({
      prescriptionId: prescription.id,
      prescriptionNumber: prescription.prescriptionNumber,
      subtotal: 2000,
      grandTotal: 2000,
      changeAmount: 3000,
    });
    expect(saleResponse.body.totalHpp).toBeUndefined();
    expect(saleResponse.body.totalProfit).toBeUndefined();
    expect(saleResponse.body.items[0].allocations).toBeUndefined();

    const storedBatch = await prisma.productBatch.findUniqueOrThrow({
      where: { id: batch.id },
    });
    expect(storedBatch.currentStockBase.toNumber()).toBe(3);

    const storedPrescription = await prisma.prescription.findUniqueOrThrow({
      where: { id: prescription.id },
    });
    expect(storedPrescription.status).toBe('PAID');

    const mutation = await prisma.stockMutation.findFirstOrThrow({
      where: {
        referenceId: saleResponse.body.id,
        mutationType: 'SALE_OUT',
      },
    });
    expect(mutation.qtyChange.toNumber()).toBe(-2);

    const retryResponse = await request(app.getHttpServer())
      .post(`/api/sales/from-prescription/${prescription.id}`)
      .set('Authorization', `Bearer ${cashierToken}`)
      .set('Idempotency-Key', `presc-checkout-${suffix}`)
      .send({
        paymentMethod: 'CASH',
        paidAmount: 5000,
        discountType: 'NONE',
        discountValue: 0,
      })
      .expect(201);

    expect(retryResponse.body.id).toBe(saleResponse.body.id);
    await expect(
      prisma.sale.count({ where: { prescriptionId: prescription.id } }),
    ).resolves.toBe(1);
  });

  it('records counseling without creating billing or stock mutation and rejects cashier access', async () => {
    const fixture = await createProductFixture('counseling');
    const prescription = await createPrescription(
      pharmacistToken,
      fixture,
      'counseling',
    );
    const saleCountBefore = await prisma.sale.count();
    const mutationCountBefore = await prisma.stockMutation.count();

    const response = await request(app.getHttpServer())
      .post('/api/counseling-records')
      .set('Authorization', `Bearer ${pharmacistToken}`)
      .send({
        prescriptionId: prescription.id,
        patientName: `Patient ${suffix}`,
        educationSummary: 'Edukasi aturan pakai dan penyimpanan obat.',
        note: 'Tidak ada tagihan dari konseling.',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      prescriptionId: prescription.id,
      patientName: `Patient ${suffix}`,
      prescriptionNumber: prescription.prescriptionNumber,
    });
    await expect(prisma.sale.count()).resolves.toBe(saleCountBefore);
    await expect(prisma.stockMutation.count()).resolves.toBe(mutationCountBefore);

    await request(app.getHttpServer())
      .get('/api/counseling-records')
      .set('Authorization', `Bearer ${cashierToken}`)
      .expect(403);
  });

  async function createPrescription(
    token: string,
    fixture: Awaited<ReturnType<typeof createProductFixture>>,
    label = 'apoteker',
  ) {
    const response = await request(app.getHttpServer())
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${token}`)
      .send(prescriptionPayload(fixture, label))
      .expect(201);
    return response.body;
  }

  function prescriptionPayload(
    fixture: Awaited<ReturnType<typeof createProductFixture>>,
    label = 'apoteker',
  ) {
    return {
      patientName: `Patient ${suffix}`,
      patientPhone: `08${suffix.slice(-8)}`,
      doctorName: `Doctor ${label} ${suffix}`,
      prescriptionDate: new Date().toISOString().slice(0, 10),
      note: `Resep ${label}`,
      items: [
        {
          productId: fixture.product.id,
          productUnitId: fixture.baseProductUnit.id,
          qtySaleUnit: 2,
          instruction: '2x sehari setelah makan',
          note: `Item ${label}`,
        },
      ],
    };
  }

  async function createProductFixture(label: string) {
    const category = await prisma.category.create({
      data: { name: `Prescription Category ${label} ${suffix}` },
    });
    const unit = await prisma.unit.create({
      data: {
        name: `prescription unit ${label} ${suffix}`,
        symbol: `rx${label.slice(0, 2)}`,
      },
    });
    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        baseUnitId: unit.id,
        code: `PRESC-${label}-${suffix}`,
        name: `Prescription Product ${label} ${suffix}`,
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

  async function login(username: string) {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ usernameOrEmail: username, password: 'ChangeMe123!' })
      .expect(201);
    return response.body.accessToken as string;
  }

  async function seedUsers() {
    await prisma.refreshToken.deleteMany();

    const pharmacistRole = await prisma.role.upsert({
      where: { name: 'APOTEKER' },
      update: {},
      create: {
        name: 'APOTEKER',
        description: 'Apoteker untuk PO, resep, dan konseling.',
      },
    });
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
      where: { username: 'pharmacist_presc' },
      update: {
        roleId: pharmacistRole.id,
        passwordHash,
        isActive: true,
        deletedAt: null,
      },
      create: {
        roleId: pharmacistRole.id,
        name: 'Pharmacist Prescription',
        username: 'pharmacist_presc',
        email: 'pharmacist-prescription@risyah.local',
        passwordHash,
        isActive: true,
      },
    });
    await prisma.user.upsert({
      where: { username: 'manager_presc' },
      update: {
        roleId: managerRole.id,
        passwordHash,
        isActive: true,
        deletedAt: null,
      },
      create: {
        roleId: managerRole.id,
        name: 'Manager Prescription',
        username: 'manager_presc',
        email: 'manager-prescription@risyah.local',
        passwordHash,
        isActive: true,
      },
    });
    await prisma.user.upsert({
      where: { username: 'cashier_presc' },
      update: {
        roleId: cashierRole.id,
        passwordHash,
        isActive: true,
        deletedAt: null,
      },
      create: {
        roleId: cashierRole.id,
        name: 'Cashier Prescription',
        username: 'cashier_presc',
        email: 'cashier-prescription@risyah.local',
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
