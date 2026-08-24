import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../../common/types/auth-user';
import { isPrismaUniqueError } from '../../common/utils/prisma-error';
import { PrismaService } from '../../database/prisma.service';
import { IdempotencyService } from '../sales/idempotency.service';
import { CreatePurchaseReturnDto } from './dto/create-purchase-return.dto';

const PURCHASE_RETURN_ACTION = 'PURCHASE_RETURN';

const purchaseReturnInclude = {
  purchase: true,
  createdBy: {
    include: { role: true },
  },
  items: {
    include: {
      product: true,
      batch: true,
    },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.PurchaseReturnInclude;

type PurchaseReturnWithRelations = Prisma.PurchaseReturnGetPayload<{
  include: typeof purchaseReturnInclude;
}>;

type LockedBatchRow = {
  id: string;
  productId: string;
  batchNumber: string;
  currentStockBase: Prisma.Decimal;
  hppBase: Prisma.Decimal;
  isActive: boolean;
  deletedAt: Date | null;
};

@Injectable()
export class PurchaseReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async findAll() {
    const returns = await this.prisma.purchaseReturn.findMany({
      include: purchaseReturnInclude,
      orderBy: { createdAt: 'desc' },
    });

    return returns.map((purchaseReturn) =>
      this.toPurchaseReturnResponse(purchaseReturn),
    );
  }

  async findOne(id: string) {
    const purchaseReturn = await this.prisma.purchaseReturn.findUnique({
      where: { id },
      include: purchaseReturnInclude,
    });

    if (!purchaseReturn) {
      throw new NotFoundException('Retur pembelian tidak ditemukan');
    }

    return this.toPurchaseReturnResponse(purchaseReturn);
  }

  async create(
    dto: CreatePurchaseReturnDto,
    user: AuthUser,
    idempotencyKey?: string,
  ) {
    const key = idempotencyKey?.trim();
    if (!key) {
      throw new BadRequestException('Header Idempotency-Key wajib diisi');
    }

    const requestHash = this.idempotencyService.hashRequest(dto);
    const activeKey = await this.idempotencyService.findActiveKey({
      key,
      userId: user.id,
      actionType: PURCHASE_RETURN_ACTION,
    });

    if (activeKey) {
      if (activeKey.requestHash !== requestHash) {
        throw new ConflictException('Idempotency key dipakai untuk payload berbeda');
      }
      if (activeKey.status === 'SUCCESS' && activeKey.responseSnapshot) {
        return activeKey.responseSnapshot;
      }
      throw new ConflictException('Retur dengan idempotency key ini masih aktif');
    }

    const processingKey = await this.idempotencyService.createProcessingKey({
      key,
      userId: user.id,
      actionType: PURCHASE_RETURN_ACTION,
      requestHash,
    });

    try {
      const response = await this.createPurchaseReturnTransaction(dto, user, key);
      await this.idempotencyService.markSuccess(processingKey.id, response);
      return response;
    } catch (error) {
      await this.idempotencyService.markFailed(processingKey.id);
      throw error;
    }
  }

  private async createPurchaseReturnTransaction(
    dto: CreatePurchaseReturnDto,
    user: AuthUser,
    idempotencyKey: string,
  ) {
    const reason = dto.reason.trim();
    if (!reason) {
      throw new BadRequestException('Alasan retur wajib diisi');
    }

    const uniqueBatchIds = new Set(dto.items.map((item) => item.batchId));
    if (uniqueBatchIds.size !== dto.items.length) {
      throw new BadRequestException('Batch retur tidak boleh duplikat');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.purchaseId) {
          const purchase = await tx.purchase.findFirst({
            where: { id: dto.purchaseId, deletedAt: null },
            select: { id: true },
          });

          if (!purchase) {
            throw new BadRequestException('Pembelian asal tidak valid');
          }
        }

        const preparedItems = [];

        for (const item of dto.items) {
          const batch = await this.lockBatch(tx, item.batchId);
          if (!batch || !batch.isActive || batch.deletedAt) {
            throw new BadRequestException('Batch retur tidak valid');
          }

          const qtyBefore = Number(batch.currentStockBase);
          const qtyBaseReturned = this.roundQty(item.qtyBaseReturned);
          if (qtyBaseReturned <= 0) {
            throw new BadRequestException('Qty retur harus lebih dari 0');
          }
          if (qtyBaseReturned > qtyBefore) {
            throw new BadRequestException('Qty retur melebihi stok batch');
          }

          const hppBaseSnapshot = Number(batch.hppBase);
          const totalAmount = this.roundInternal(
            qtyBaseReturned * hppBaseSnapshot,
          );
          const qtyAfter = this.roundQty(qtyBefore - qtyBaseReturned);

          preparedItems.push({
            batch,
            qtyBefore,
            qtyBaseReturned,
            hppBaseSnapshot,
            totalAmount,
            qtyAfter,
          });
        }

        const totalAmount = this.roundInternal(
          preparedItems.reduce((sum, item) => sum + item.totalAmount, 0),
        );

        const createdReturn = await tx.purchaseReturn.create({
          data: {
            purchaseId: dto.purchaseId,
            createdById: user.id,
            returnNumber: this.generateReturnNumber(),
            reason,
            totalAmount,
            idempotencyKey,
          },
        });

        for (const item of preparedItems) {
          await tx.purchaseReturnItem.create({
            data: {
              purchaseReturnId: createdReturn.id,
              productId: item.batch.productId,
              batchId: item.batch.id,
              qtyBaseReturned: item.qtyBaseReturned,
              hppBaseSnapshot: item.hppBaseSnapshot,
              totalAmount: item.totalAmount,
            },
          });

          await tx.productBatch.update({
            where: { id: item.batch.id },
            data: { currentStockBase: item.qtyAfter },
          });

          await tx.stockMutation.create({
            data: {
              productId: item.batch.productId,
              batchId: item.batch.id,
              createdById: user.id,
              mutationType: 'PURCHASE_RETURN_OUT',
              referenceType: 'PURCHASE_RETURN',
              referenceId: createdReturn.id,
              qtyBefore: item.qtyBefore,
              qtyChange: -item.qtyBaseReturned,
              qtyAfter: item.qtyAfter,
              reason: `Retur pembelian ${createdReturn.returnNumber}`,
            },
          });
        }

        const purchaseReturn = await tx.purchaseReturn.findUniqueOrThrow({
          where: { id: createdReturn.id },
          include: purchaseReturnInclude,
        });

        return this.toPurchaseReturnResponse(purchaseReturn);
      });
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new BadRequestException('Nomor retur pembelian sudah digunakan');
      }
      throw error;
    }
  }

  private lockBatch(tx: Prisma.TransactionClient, batchId: string) {
    return tx.$queryRaw<LockedBatchRow[]>(Prisma.sql`
      SELECT
        id,
        product_id AS "productId",
        batch_number AS "batchNumber",
        current_stock_base AS "currentStockBase",
        hpp_base AS "hppBase",
        is_active AS "isActive",
        deleted_at AS "deletedAt"
      FROM product_batches
      WHERE id = ${batchId}::uuid
      FOR UPDATE
    `).then((rows) => rows[0]);
  }

  private toPurchaseReturnResponse(purchaseReturn: PurchaseReturnWithRelations) {
    return {
      id: purchaseReturn.id,
      purchaseId: purchaseReturn.purchaseId,
      purchaseNumber: purchaseReturn.purchase?.purchaseNumber ?? null,
      returnNumber: purchaseReturn.returnNumber,
      reason: purchaseReturn.reason,
      totalAmount: Number(purchaseReturn.totalAmount),
      status: purchaseReturn.status,
      createdAt: purchaseReturn.createdAt.toISOString(),
      createdBy: {
        id: purchaseReturn.createdBy.id,
        name: purchaseReturn.createdBy.name,
        username: purchaseReturn.createdBy.username,
        role: purchaseReturn.createdBy.role.name,
      },
      items: purchaseReturn.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        batchId: item.batchId,
        batchNumber: item.batch.batchNumber,
        qtyBaseReturned: Number(item.qtyBaseReturned),
        hppBaseSnapshot: Number(item.hppBaseSnapshot),
        totalAmount: Number(item.totalAmount),
      })),
    };
  }

  private generateReturnNumber() {
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `PRET-${day}-${Date.now()}-${random}`;
  }

  private roundInternal(value: number) {
    return Math.round((value + Number.EPSILON) * 100000000) / 100000000;
  }

  private roundQty(value: number) {
    return Math.round((value + Number.EPSILON) * 10000) / 10000;
  }
}
