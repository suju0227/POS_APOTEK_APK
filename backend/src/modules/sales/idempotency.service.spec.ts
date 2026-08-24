import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { IdempotencyService } from './idempotency.service';

describe('IdempotencyService', () => {
  let idempotencyService: IdempotencyService;
  let prisma: PrismaService;
  const suffix = Date.now().toString();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [IdempotencyService, PrismaService],
    }).compile();

    idempotencyService = moduleRef.get(IdempotencyService);
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects duplicate active key for the same user and action', async () => {
    const user = await createUser('active');
    const requestHash = idempotencyService.hashRequest({ cart: ['a'] });

    await idempotencyService.createProcessingKey({
      key: `idem-active-${suffix}`,
      userId: user.id,
      actionType: 'SALE_CHECKOUT',
      requestHash,
    });

    await expect(
      idempotencyService.createProcessingKey({
        key: `idem-active-${suffix}`,
        userId: user.id,
        actionType: 'SALE_CHECKOUT',
        requestHash,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows the same key after the previous key expires', async () => {
    const user = await createUser('expired');
    const key = `idem-expired-${suffix}`;
    const requestHash = idempotencyService.hashRequest({ cart: ['b'] });

    await prisma.idempotencyKey.create({
      data: {
        key,
        userId: user.id,
        actionType: 'SALE_CHECKOUT',
        requestHash,
        status: 'PROCESSING',
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    const created = await idempotencyService.createProcessingKey({
      key,
      userId: user.id,
      actionType: 'SALE_CHECKOUT',
      requestHash,
    });

    expect(created.key).toBe(key);
    expect(created.status).toBe('PROCESSING');
  });

  it('can mark key success and failed', async () => {
    const user = await createUser('status');
    const key = await idempotencyService.createProcessingKey({
      key: `idem-status-${suffix}`,
      userId: user.id,
      actionType: 'SALE_CHECKOUT',
      requestHash: idempotencyService.hashRequest({ cart: ['c'] }),
    });

    const success = await idempotencyService.markSuccess(key.id, { saleId: 'sale-1' });
    expect(success.status).toBe('SUCCESS');
    expect(success.responseSnapshot).toEqual({ saleId: 'sale-1' });

    const failed = await idempotencyService.markFailed(key.id);
    expect(failed.status).toBe('FAILED');
  });

  async function createUser(label: string) {
    const role = await prisma.role.upsert({
      where: { name: `IDEMPOTENCY_MANAGER_${label}_${suffix}` },
      update: {},
      create: {
        name: `IDEMPOTENCY_MANAGER_${label}_${suffix}`,
      },
    });

    return prisma.user.create({
      data: {
        roleId: role.id,
        name: `Idempotency User ${label}`,
        username: `idempotency_${label}_${suffix}`,
        passwordHash: await bcrypt.hash('ChangeMe123!', 12),
      },
    });
  }
});
