import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request = require('supertest');
import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';

describe('Auth and RBAC API', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('logs in seeded manager, returns safe user data, and reads /me', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ usernameOrEmail: 'manager', password: 'ChangeMe123!' })
      .expect(201);

    expect(loginResponse.body.accessToken).toEqual(expect.any(String));
    expect(loginResponse.body.refreshToken).toEqual(expect.any(String));
    expect(loginResponse.body.user).toMatchObject({
      username: 'manager',
      role: 'MANAGER',
      isActive: true,
    });
    expect(loginResponse.body.user.passwordHash).toBeUndefined();

    const meResponse = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(200);

    expect(meResponse.body).toMatchObject({
      username: 'manager',
      role: 'MANAGER',
    });
    expect(meResponse.body.passwordHash).toBeUndefined();
  });

  it('rejects wrong password and inactive users', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ usernameOrEmail: 'manager', password: 'wrong-password' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ usernameOrEmail: 'inactive_manager', password: 'ChangeMe123!' })
      .expect(401);
  });

  it('requires a valid access token for /me', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('rotates refresh token and rejects revoked tokens', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ usernameOrEmail: 'manager', password: 'ChangeMe123!' })
      .expect(201);

    const firstRefreshToken = loginResponse.body.refreshToken as string;

    const refreshResponse = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: firstRefreshToken })
      .expect(201);

    expect(refreshResponse.body.accessToken).toEqual(expect.any(String));
    expect(refreshResponse.body.refreshToken).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: firstRefreshToken })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .send({ refreshToken: refreshResponse.body.refreshToken })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: refreshResponse.body.refreshToken })
      .expect(401);
  });

  it('allows manager and rejects cashier for manager-only users endpoint', async () => {
    const managerLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ usernameOrEmail: 'manager', password: 'ChangeMe123!' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${managerLogin.body.accessToken}`)
      .expect(200);

    const cashierLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ usernameOrEmail: 'kasir_test', password: 'ChangeMe123!' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${cashierLogin.body.accessToken}`)
      .expect(403);
  });

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
      where: { username: 'manager' },
      update: {
        roleId: managerRole.id,
        passwordHash,
        isActive: true,
        deletedAt: null,
      },
      create: {
        roleId: managerRole.id,
        name: 'Manager Apotek',
        username: 'manager',
        email: 'manager@risyah.local',
        passwordHash,
        isActive: true,
      },
    });

    await prisma.user.upsert({
      where: { username: 'inactive_manager' },
      update: {
        roleId: managerRole.id,
        passwordHash,
        isActive: false,
        deletedAt: null,
      },
      create: {
        roleId: managerRole.id,
        name: 'Inactive Manager',
        username: 'inactive_manager',
        email: 'inactive@risyah.local',
        passwordHash,
        isActive: false,
      },
    });

    await prisma.user.upsert({
      where: { username: 'kasir_test' },
      update: {
        roleId: cashierRole.id,
        passwordHash,
        isActive: true,
        deletedAt: null,
      },
      create: {
        roleId: cashierRole.id,
        name: 'Kasir Test',
        username: 'kasir_test',
        email: 'kasir-test@risyah.local',
        passwordHash,
        isActive: true,
      },
    });
  }
});
