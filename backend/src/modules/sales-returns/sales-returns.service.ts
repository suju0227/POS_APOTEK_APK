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
import { CreateSalesReturnDto } from './dto/create-sales-return.dto';

const SALES_RETURN_ACTION = 'SALES_RETURN';

const salesReturnInclude = {
  sale: true,
  cashier: {
    include: { role: true },
  },
  items: {
    include: {
      product: true,
      batch: true,
      saleBatchAllocation: {
        include: {
          saleItem: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.SalesReturnInclude;

type SalesReturnWithRelations = Prisma.SalesReturnGetPayload<{
  include: typeof salesReturnInclude;
}>;

type LockedAllocationRow = {
  id: string;
  batchId: string;
  productId: string;
  saleId: string;
  productName: string;
  unitName: string;
  batchNumber: string;
  qtyBase: Prisma.Decimal;
  returnedQtyBase: Prisma.Decimal;
  hppBaseSnapshot: Prisma.Decimal;
  subtotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  profitAmount: Prisma.Decimal;
  currentStockBase: Prisma.Decimal;
};

@Injectable()
export class SalesReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async findAll(user: AuthUser) {
    const returns = await this.prisma.salesReturn.findMany({
      include: salesReturnInclude,
      orderBy: { createdAt: 'desc' },
    });

    return returns.map((salesReturn) =>
      this.toSalesReturnResponse(salesReturn, user.role),
    );
  }

  async findOne(id: string, user: AuthUser) {
    const salesReturn = await this.prisma.salesReturn.findUnique({
      where: { id },
      include: salesReturnInclude,
    });

    if (!salesReturn) {
      throw new NotFoundException('Retur penjualan tidak ditemukan');
    }

    return this.toSalesReturnResponse(salesReturn, user.role);
  }

  async create(
    dto: CreateSalesReturnDto,
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
      actionType: SALES_RETURN_ACTION,
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
      actionType: SALES_RETURN_ACTION,
      requestHash,
    });

    try {
      const response = await this.createSalesReturnTransaction(dto, user, key);
      await this.idempotencyService.markSuccess(processingKey.id, response);
      return response;
    } catch (error) {
      await this.idempotencyService.markFailed(processingKey.id);
      throw error;
    }
  }

  private async createSalesReturnTransaction(
    dto: CreateSalesReturnDto,
    user: AuthUser,
    idempotencyKey: string,
  ) {
    const reason = dto.reason.trim();
    if (!reason) {
      throw new BadRequestException('Alasan retur wajib diisi');
    }

    const uniqueAllocationIds = new Set(
      dto.items.map((item) => item.saleBatchAllocationId),
    );
    if (uniqueAllocationIds.size !== dto.items.length) {
      throw new BadRequestException('Item retur tidak boleh duplikat');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const sale = await tx.sale.findFirst({
          where: { id: dto.saleId, deletedAt: null },
          select: { id: true, saleNumber: true },
        });

        if (!sale) {
          throw new NotFoundException('Transaksi asal tidak ditemukan');
        }

        const preparedItems = [];

        for (const item of dto.items) {
          const allocation = await this.lockAllocation(tx, item.saleBatchAllocationId);
          if (!allocation || allocation.saleId !== dto.saleId) {
            throw new BadRequestException('Item retur tidak sesuai transaksi asal');
          }

          const qtyBase = Number(allocation.qtyBase);
          const returnedQtyBase = Number(allocation.returnedQtyBase);
          const availableQtyBase = this.roundQty(qtyBase - returnedQtyBase);
          const qtyBaseReturned = this.roundQty(item.qtyBaseReturned);

          if (qtyBaseReturned <= 0) {
            throw new BadRequestException('Qty retur harus lebih dari 0');
          }

          if (qtyBaseReturned > availableQtyBase) {
            throw new BadRequestException('Qty retur melebihi sisa yang dapat diretur');
          }

          const returnRatio = qtyBaseReturned / qtyBase;
          const refundableSubtotal =
            Number(allocation.subtotal) - Number(allocation.discountAmount);
          const refundAmount = this.roundMoney(refundableSubtotal * returnRatio);
          const hppReversed = this.roundInternal(
            qtyBaseReturned * Number(allocation.hppBaseSnapshot),
          );
          const profitReversed = this.roundInternal(refundAmount - hppReversed);
          const qtyBefore = Number(allocation.currentStockBase);
          const qtyAfter = this.roundQty(qtyBefore + qtyBaseReturned);

          preparedItems.push({
            allocation,
            qtyBaseReturned,
            refundAmount,
            hppReversed,
            profitReversed,
            qtyBefore,
            qtyAfter,
          });
        }

        const totalRefund = this.roundMoney(
          preparedItems.reduce((sum, item) => sum + item.refundAmount, 0),
        );
        const totalHppReversed = this.roundInternal(
          preparedItems.reduce((sum, item) => sum + item.hppReversed, 0),
        );
        const totalProfitReversed = this.roundInternal(
          preparedItems.reduce((sum, item) => sum + item.profitReversed, 0),
        );

        const createdReturn = await tx.salesReturn.create({
          data: {
            saleId: dto.saleId,
            cashierId: user.id,
            returnNumber: this.generateReturnNumber(),
            reason,
            totalRefund,
            totalHppReversed,
            totalProfitReversed,
            idempotencyKey,
          },
        });

        for (const item of preparedItems) {
          await tx.salesReturnItem.create({
            data: {
              salesReturnId: createdReturn.id,
              saleBatchAllocationId: item.allocation.id,
              productId: item.allocation.productId,
              batchId: item.allocation.batchId,
              qtyBaseReturned: item.qtyBaseReturned,
              refundAmount: item.refundAmount,
              hppReversed: item.hppReversed,
              profitReversed: item.profitReversed,
            },
          });

          await tx.saleBatchAllocation.update({
            where: { id: item.allocation.id },
            data: {
              returnedQtyBase: this.roundQty(
                Number(item.allocation.returnedQtyBase) + item.qtyBaseReturned,
              ),
            },
          });

          await tx.productBatch.update({
            where: { id: item.allocation.batchId },
            data: { currentStockBase: item.qtyAfter },
          });

          await tx.stockMutation.create({
            data: {
              productId: item.allocation.productId,
              batchId: item.allocation.batchId,
              createdById: user.id,
              mutationType: 'SALES_RETURN_IN',
              referenceType: 'SALES_RETURN',
              referenceId: createdReturn.id,
              qtyBefore: item.qtyBefore,
              qtyChange: item.qtyBaseReturned,
              qtyAfter: item.qtyAfter,
              reason: `Retur ${createdReturn.returnNumber} dari ${sale.saleNumber}`,
            },
          });
        }

        const salesReturn = await tx.salesReturn.findUniqueOrThrow({
          where: { id: createdReturn.id },
          include: salesReturnInclude,
        });

        return this.toSalesReturnResponse(salesReturn, user.role);
      });
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new BadRequestException('Nomor retur sudah digunakan');
      }
      throw error;
    }
  }

  private lockAllocation(
    tx: Prisma.TransactionClient,
    allocationId: string,
  ) {
    return tx.$queryRaw<LockedAllocationRow[]>(Prisma.sql`
      SELECT
        sba.id,
        sba.batch_id AS "batchId",
        si.product_id AS "productId",
        si.sale_id AS "saleId",
        si.product_name AS "productName",
        si.unit_name AS "unitName",
        sba.batch_number AS "batchNumber",
        sba.qty_base AS "qtyBase",
        sba.returned_qty_base AS "returnedQtyBase",
        sba.hpp_base_snapshot AS "hppBaseSnapshot",
        sba.subtotal,
        sba.discount_amount AS "discountAmount",
        sba.profit_amount AS "profitAmount",
        pb.current_stock_base AS "currentStockBase"
      FROM sale_batch_allocations sba
      JOIN sale_items si ON si.id = sba.sale_item_id
      JOIN product_batches pb ON pb.id = sba.batch_id
      WHERE sba.id = ${allocationId}::uuid
      FOR UPDATE OF sba, pb
    `).then((rows) => rows[0]);
  }

  private toSalesReturnResponse(
    salesReturn: SalesReturnWithRelations,
    role: string,
  ) {
    const isManager = role === 'MANAGER';
    const response = {
      id: salesReturn.id,
      saleId: salesReturn.saleId,
      saleNumber: salesReturn.sale.saleNumber,
      returnNumber: salesReturn.returnNumber,
      reason: salesReturn.reason,
      totalRefund: Number(salesReturn.totalRefund),
      status: salesReturn.status,
      createdAt: salesReturn.createdAt.toISOString(),
      cashier: {
        id: salesReturn.cashier.id,
        name: salesReturn.cashier.name,
        username: salesReturn.cashier.username,
        role: salesReturn.cashier.role.name,
      },
      items: salesReturn.items.map((item) => ({
        id: item.id,
        saleBatchAllocationId: item.saleBatchAllocationId,
        productId: item.productId,
        productName: item.product.name,
        batchId: item.batchId,
        batchNumber: item.batch.batchNumber,
        unitName: item.saleBatchAllocation.saleItem.unitName,
        qtyBaseReturned: Number(item.qtyBaseReturned),
        refundAmount: Number(item.refundAmount),
        ...(isManager
          ? {
              hppReversed: Number(item.hppReversed),
              profitReversed: Number(item.profitReversed),
            }
          : {}),
      })),
    };

    if (!isManager) return response;

    return {
      ...response,
      totalHppReversed: Number(salesReturn.totalHppReversed),
      totalProfitReversed: Number(salesReturn.totalProfitReversed),
    };
  }

  private generateReturnNumber() {
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `RET-${day}-${Date.now()}-${random}`;
  }

  private roundMoney(value: number) {
    return Math.round(value + Number.EPSILON);
  }

  private roundInternal(value: number) {
    return Math.round((value + Number.EPSILON) * 100000000) / 100000000;
  }

  private roundQty(value: number) {
    return Math.round((value + Number.EPSILON) * 10000) / 10000;
  }
}
