import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request = require('supertest');
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';

describe('Master Data API', () => {
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

    managerToken = await login('manager_phase3');
    cashierToken = await login('cashier_phase3');
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows manager to manage categories, suppliers, units, products, and product units', async () => {
    const category = await postManager('/api/categories', {
      name: `Kategori Phase3 ${suffix}`,
      description: 'Kategori awal',
    });

    const updatedCategory = await patchManager(`/api/categories/${category.id}`, {
      description: 'Kategori diubah',
    });
    expect(updatedCategory.description).toBe('Kategori diubah');

    const supplier = await postManager('/api/suppliers', {
      name: `Supplier Phase3 ${suffix}`,
      phone: '08123456789',
    });

    const updatedSupplier = await patchManager(`/api/suppliers/${supplier.id}`, {
      contactPerson: 'Admin Supplier',
    });
    expect(updatedSupplier.contactPerson).toBe('Admin Supplier');

    const baseUnit = await postManager('/api/units', {
      name: `tablet phase3 ${suffix}`,
      symbol: 'tab',
    });

    const saleUnit = await postManager('/api/units', {
      name: `box phase3 ${suffix}`,
      symbol: 'box',
    });

    const product = await postManager('/api/products', {
      categoryId: category.id,
      baseUnitId: baseUnit.id,
      code: `OBT-${suffix}`,
      barcode: `BAR-${suffix}`,
      name: `Obat Phase3 ${suffix}`,
      genericName: 'Paracetamol',
      minStockBase: 5,
    });

    expect(product).toMatchObject({
      code: `OBT-${suffix}`,
      name: `Obat Phase3 ${suffix}`,
      minStockBase: 5,
    });
    expect(product.category.id).toBe(category.id);
    expect(product.baseUnit.id).toBe(baseUnit.id);

    const cachedProductsBeforeUnit = await getManager('/api/products');
    const cachedProductBeforeUnit = cachedProductsBeforeUnit.find(
      (item: { id: string }) => item.id === product.id,
    );
    expect(cachedProductBeforeUnit.productUnits).toHaveLength(0);

    const defaultProductUnit = await postManager(`/api/products/${product.id}/units`, {
      unitId: baseUnit.id,
      conversionToBase: 1,
      isDefaultSaleUnit: true,
    });
    expect(defaultProductUnit).toMatchObject({
      conversionToBase: 1,
      isDefaultSaleUnit: true,
    });

    const productsAfterUnit = await getManager('/api/products');
    const productAfterUnit = productsAfterUnit.find(
      (item: { id: string }) => item.id === product.id,
    );
    expect(productAfterUnit.productUnits).toHaveLength(1);
    expect(productAfterUnit.productUnits[0].id).toBe(defaultProductUnit.id);

    const boxProductUnit = await postManager(`/api/products/${product.id}/units`, {
      unitId: saleUnit.id,
      conversionToBase: 10,
    });

    const promotedProductUnit = await patchManager(
      `/api/products/${product.id}/units/${boxProductUnit.id}`,
      { isDefaultSaleUnit: true },
    );
    expect(promotedProductUnit.isDefaultSaleUnit).toBe(true);

    const productUnits = await getManager(`/api/products/${product.id}/units`);
    expect(productUnits).toHaveLength(2);
    expect(productUnits.filter((unit: { isDefaultSaleUnit: boolean }) => unit.isDefaultSaleUnit)).toHaveLength(1);

    const searchResult = await getManager(`/api/products/search?q=OBT-${suffix}`);
    expect(searchResult).toHaveLength(1);
    expect(searchResult[0].id).toBe(product.id);

    const deactivatedProduct = await patchManager(`/api/products/${product.id}/deactivate`, {});
    expect(deactivatedProduct.isActive).toBe(false);
    expect(deactivatedProduct.deletedAt).toEqual(expect.any(String));

    const storedProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: { productUnits: true },
    });
    expect(storedProduct).toBeTruthy();
    expect(storedProduct?.deletedAt).toBeTruthy();
    expect(storedProduct?.productUnits.every((unit) => unit.deletedAt)).toBe(true);
  });

  it('rejects cashier from manager-only master data mutations', async () => {
    await request(app.getHttpServer())
      .post('/api/categories')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ name: `Kasir Forbidden ${suffix}` })
      .expect(403);
  });

  it('rejects duplicate master data and invalid product unit conversion', async () => {
    const category = await postManager('/api/categories', {
      name: `Duplicate Category ${suffix}`,
    });
    await postManager('/api/categories', { name: category.name }, 400);

    const supplier = await postManager('/api/suppliers', {
      name: `Duplicate Supplier ${suffix}`,
    });
    await postManager('/api/suppliers', { name: supplier.name }, 400);

    const unit = await postManager('/api/units', {
      name: `duplicate-unit-${suffix}`,
      symbol: 'dup',
    });
    await postManager('/api/units', { name: unit.name }, 400);

    const product = await postManager('/api/products', {
      categoryId: category.id,
      baseUnitId: unit.id,
      code: `DUP-${suffix}`,
      name: `Duplicate Product ${suffix}`,
    });
    await postManager(
      '/api/products',
      {
        categoryId: category.id,
        baseUnitId: unit.id,
        code: product.code,
        name: `Duplicate Product Copy ${suffix}`,
      },
      400,
    );

    await postManager(
      `/api/products/${product.id}/units`,
      {
        unitId: unit.id,
        conversionToBase: 0,
      },
      400,
    );

    const deactivatedCategory = await patchManager(
      `/api/categories/${category.id}/deactivate`,
      {},
    );
    expect(deactivatedCategory.deletedAt).toEqual(expect.any(String));

    const storedCategory = await prisma.category.findUnique({
      where: { id: category.id },
    });
    expect(storedCategory).toBeTruthy();
    expect(storedCategory?.deletedAt).toBeTruthy();
  });

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
      where: { username: 'manager_phase3' },
      update: {
        roleId: managerRole.id,
        passwordHash,
        isActive: true,
        deletedAt: null,
      },
      create: {
        roleId: managerRole.id,
        name: 'Manager Phase3',
        username: 'manager_phase3',
        email: 'manager-phase3@risyah.local',
        passwordHash,
        isActive: true,
      },
    });

    await prisma.user.upsert({
      where: { username: 'cashier_phase3' },
      update: {
        roleId: cashierRole.id,
        passwordHash,
        isActive: true,
        deletedAt: null,
      },
      create: {
        roleId: cashierRole.id,
        name: 'Cashier Phase3',
        username: 'cashier_phase3',
        email: 'cashier-phase3@risyah.local',
        passwordHash,
        isActive: true,
      },
    });
  }
});
