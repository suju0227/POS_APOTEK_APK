import { Test } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { FefoService } from './fefo.service';
import { StockNotEnoughError } from './errors/stock-not-enough.error';

describe('FefoService', () => {
  let fefoService: FefoService;
  let prisma: PrismaService;
  const suffix = Date.now().toString();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [FefoService, PrismaService],
    }).compile();

    fefoService = moduleRef.get(FefoService);
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('chooses nearest valid expiry and ignores expired, inactive, deleted, and empty batches', async () => {
    const product = await createProductFixture('filtering');
    await createBatch(product.id, 'EXPIRED', pastDate(1), 99);
    await createBatch(product.id, 'INACTIVE', futureDate(1), 99, { isActive: false });
    await createBatch(product.id, 'DELETED', futureDate(1), 99, { deletedAt: new Date() });
    await createBatch(product.id, 'EMPTY', futureDate(1), 0);
    const validSoon = await createBatch(product.id, 'VALID-SOON', futureDate(3), 5);
    const validLater = await createBatch(product.id, 'VALID-LATER', futureDate(10), 5);

    const allocations = await fefoService.allocateBatches(product.id, 4);

    expect(allocations).toHaveLength(1);
    expect(allocations[0]).toMatchObject({
      batchId: validSoon.id,
      batchNumber: validSoon.batchNumber,
      qtyBase: 4,
      currentStockBase: 5,
      hppBaseSnapshot: 100,
    });
    expect(allocations[0].batchId).not.toBe(validLater.id);
  });

  it('splits allocation across multiple batches by FEFO order', async () => {
    const product = await createProductFixture('split');
    const first = await createBatch(product.id, 'SPLIT-FIRST', futureDate(2), 3);
    const second = await createBatch(product.id, 'SPLIT-SECOND', futureDate(5), 4);

    const allocations = await fefoService.allocateBatches(product.id, 6);

    expect(allocations).toHaveLength(2);
    expect(allocations).toEqual([
      expect.objectContaining({ batchId: first.id, qtyBase: 3 }),
      expect.objectContaining({ batchId: second.id, qtyBase: 3 }),
    ]);
  });

  it('keeps stable ordering when expired date is the same', async () => {
    const product = await createProductFixture('same-date');
    const first = await createBatch(product.id, 'SAME-FIRST', futureDate(7), 1);
    await new Promise((resolve) => setTimeout(resolve, 10));
    const second = await createBatch(product.id, 'SAME-SECOND', futureDate(7), 1);

    const allocations = await fefoService.allocateBatches(product.id, 2);

    expect(allocations.map((item) => item.batchId)).toEqual([first.id, second.id]);
  });

  it('fails when valid stock is not enough', async () => {
    const product = await createProductFixture('not-enough');
    await createBatch(product.id, 'LOW', futureDate(3), 2);

    await expect(fefoService.allocateBatches(product.id, 3)).rejects.toBeInstanceOf(
      StockNotEnoughError,
    );
  });

  async function createProductFixture(label: string) {
    const category = await prisma.category.create({
      data: { name: `FEFO Category ${label} ${suffix}` },
    });
    const unit = await prisma.unit.create({
      data: { name: `fefo unit ${label} ${suffix}` },
    });
    return prisma.product.create({
      data: {
        categoryId: category.id,
        baseUnitId: unit.id,
        code: `FEFO-${label}-${suffix}`,
        name: `FEFO Product ${label} ${suffix}`,
      },
    });
  }

  function createBatch(
    productId: string,
    batchNumber: string,
    expiredDate: Date,
    currentStockBase: number,
    extra?: { isActive?: boolean; deletedAt?: Date },
  ) {
    return prisma.productBatch.create({
      data: {
        productId,
        batchNumber: `${batchNumber}-${suffix}`,
        expiredDate,
        initialStockBase: currentStockBase,
        currentStockBase,
        hppBase: 100,
        isActive: extra?.isActive ?? true,
        deletedAt: extra?.deletedAt,
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
