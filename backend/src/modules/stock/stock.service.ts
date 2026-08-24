import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { IdempotencyService } from '../sales/idempotency.service';

const productStockInclude = {
  category: true,
  baseUnit: true,
  batches: {
    where: { deletedAt: null },
    include: {
      supplier: true,
      prices: {
        where: { deletedAt: null },
        include: { productUnit: { include: { unit: true } } },
      },
    },
    orderBy: [{ expiredDate: 'asc' }, { createdAt: 'desc' }],
  },
} satisfies Prisma.ProductInclude;

type ProductStock = Prisma.ProductGetPayload<{ include: typeof productStockInclude }>;
type BatchStock = ProductStock['batches'][number];

@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async findAll() {
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null },
      include: productStockInclude,
      orderBy: { name: 'asc' },
    });

    return products.map((product) => this.toProductStockSummary(product));
  }

  async findOne(productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
      include: productStockInclude,
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    return {
      ...this.toProductStockSummary(product),
      batches: product.batches.map((batch) => this.toBatchStockResponse(batch)),
    };
  }

  async adjustStock(
    batchId: string,
    newQtyBase: number,
    reason: string,
    userId: string,
    idempotencyKey?: string,
  ) {
    const key = idempotencyKey?.trim();
    if (!key) {
      throw new BadRequestException('Header Idempotency-Key wajib diisi');
    }

    const requestPayload = { batchId, newQtyBase, reason };
    const requestHash = this.idempotencyService.hashRequest(requestPayload);
    const activeKey = await this.idempotencyService.findActiveKey({
      key,
      userId,
      actionType: 'STOCK_ADJUSTMENT',
    });

    if (activeKey) {
      if (activeKey.requestHash !== requestHash) {
        throw new ConflictException('Idempotency key dipakai untuk payload berbeda');
      }
      if (activeKey.status === 'SUCCESS') {
        return activeKey.responseSnapshot;
      }
      throw new ConflictException('Koreksi stok dengan idempotency key ini masih aktif');
    }

    const processingKey = await this.idempotencyService.createProcessingKey({
      key,
      userId,
      actionType: 'STOCK_ADJUSTMENT',
      requestHash,
    });

    try {
      const response = await this.createStockAdjustment(
        batchId,
        newQtyBase,
        reason,
        userId,
      );
      await this.idempotencyService.markSuccess(processingKey.id, response);
      return response;
    } catch (error) {
      await this.idempotencyService.markFailed(processingKey.id);
      throw error;
    }
  }

  private async createStockAdjustment(
    batchId: string,
    newQtyBase: number,
    reason: string,
    userId: string,
  ) {
    const adjustment = await this.prisma.$transaction(async (tx) => {
      const batch = await tx.productBatch.findFirst({
        where: { id: batchId, deletedAt: null },
      });

      if (!batch) {
        throw new NotFoundException('Batch tidak ditemukan');
      }

      const oldQty = Number(batch.currentStockBase);
      const difference = newQtyBase - oldQty;

      if (difference === 0) {
        throw new BadRequestException('Qty baru harus berbeda dari qty lama');
      }

      const updatedBatch = await tx.productBatch.update({
        where: { id: batch.id },
        data: {
          currentStockBase: newQtyBase,
          isActive: true,
        },
      });

      const createdAdjustment = await tx.stockAdjustment.create({
        data: {
          batchId,
          createdById: userId,
          oldQty,
          newQty: newQtyBase,
          difference,
          reason,
        },
      });

      await tx.stockMutation.create({
        data: {
          productId: batch.productId,
          batchId,
          createdById: userId,
          mutationType:
            difference > 0 ? 'STOCK_ADJUSTMENT_IN' : 'STOCK_ADJUSTMENT_OUT',
          referenceType: 'STOCK_ADJUSTMENT',
          referenceId: createdAdjustment.id,
          qtyBefore: oldQty,
          qtyChange: difference,
          qtyAfter: newQtyBase,
          reason,
        },
      });

      return {
        adjustment: createdAdjustment,
        batch: updatedBatch,
      };
    });

    return {
      ...adjustment.adjustment,
      oldQty: Number(adjustment.adjustment.oldQty),
      newQty: Number(adjustment.adjustment.newQty),
      difference: Number(adjustment.adjustment.difference),
      batch: {
        ...adjustment.batch,
        initialStockBase: Number(adjustment.batch.initialStockBase),
        currentStockBase: Number(adjustment.batch.currentStockBase),
        hppBase: Number(adjustment.batch.hppBase),
      },
    };
  }

  private toProductStockSummary(product: ProductStock) {
    const activeBatches = product.batches.filter((batch) => this.isAvailableBatch(batch));
    const totalStockBase = activeBatches.reduce(
      (sum, batch) => sum + Number(batch.currentStockBase),
      0,
    );
    const minStockBase = Number(product.minStockBase);

    return {
      id: product.id,
      code: product.code,
      barcode: product.barcode,
      name: product.name,
      genericName: product.genericName,
      category: product.category,
      baseUnit: product.baseUnit,
      minStockBase,
      totalStockBase,
      isLowStock: totalStockBase <= minStockBase,
      activeBatchCount: activeBatches.length,
      expiredBatchCount: product.batches.filter((batch) => this.isExpired(batch)).length,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  private toBatchStockResponse(batch: BatchStock) {
    return {
      ...batch,
      initialStockBase: Number(batch.initialStockBase),
      currentStockBase: Number(batch.currentStockBase),
      hppBase: Number(batch.hppBase),
      status: this.resolveBatchStatus(batch),
      prices: batch.prices.map((price) => ({
        ...price,
        sellingPrice: Number(price.sellingPrice),
        productUnit: {
          ...price.productUnit,
          conversionToBase: Number(price.productUnit.conversionToBase),
        },
      })),
    };
  }

  private isAvailableBatch(batch: BatchStock) {
    return batch.isActive && !batch.deletedAt && !this.isExpired(batch) && Number(batch.currentStockBase) > 0;
  }

  private isExpired(batch: BatchStock) {
    return batch.expiredDate < this.startOfToday();
  }

  private resolveBatchStatus(batch: BatchStock) {
    if (!batch.isActive || batch.deletedAt) return 'INACTIVE';
    if (Number(batch.currentStockBase) <= 0) return 'OUT_OF_STOCK';
    if (this.isExpired(batch)) return 'EXPIRED';
    return 'ACTIVE';
  }

  private startOfToday() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
}
