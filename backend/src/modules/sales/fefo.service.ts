import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StockNotEnoughError } from './errors/stock-not-enough.error';

export type FefoAllocation = {
  batchId: string;
  batchNumber: string;
  expiredDate: Date;
  qtyBase: number;
  hppBaseSnapshot: number;
  currentStockBase: number;
};

@Injectable()
export class FefoService {
  constructor(private readonly prisma: PrismaService) {}

  async allocateBatches(
    productId: string,
    requiredQtyBase: number,
  ): Promise<FefoAllocation[]> {
    if (requiredQtyBase <= 0) {
      throw new StockNotEnoughError();
    }

    const today = this.startOfToday();
    const batches = await this.prisma.productBatch.findMany({
      where: {
        productId,
        isActive: true,
        deletedAt: null,
        expiredDate: { gte: today },
        currentStockBase: { gt: 0 },
      },
      orderBy: [{ expiredDate: 'asc' }, { createdAt: 'asc' }],
    });

    let remainingQty = requiredQtyBase;
    const allocations: FefoAllocation[] = [];

    for (const batch of batches) {
      if (remainingQty <= 0) break;

      const availableQty = Number(batch.currentStockBase);
      const allocatedQty = Math.min(availableQty, remainingQty);

      allocations.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        expiredDate: batch.expiredDate,
        qtyBase: allocatedQty,
        hppBaseSnapshot: Number(batch.hppBase),
        currentStockBase: availableQty,
      });

      remainingQty -= allocatedQty;
    }

    if (remainingQty > 0) {
      throw new StockNotEnoughError();
    }

    return allocations;
  }

  private startOfToday() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
}
