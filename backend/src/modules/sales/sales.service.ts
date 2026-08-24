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
import { CreateSaleFromPrescriptionDto } from '../prescriptions/dto/create-sale-from-prescription.dto';
import { DiscountService } from './discount.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { IdempotencyService } from './idempotency.service';
import { PaymentService } from './payment.service';

const SALE_CHECKOUT_ACTION = 'SALE_CHECKOUT';

const saleInclude = {
  cashier: {
    include: { role: true },
  },
  prescription: true,
  items: {
    include: {
      allocations: {
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.SaleInclude;

type SaleWithRelations = Prisma.SaleGetPayload<{ include: typeof saleInclude }>;
type Tx = Prisma.TransactionClient;

type CreateSaleOptions = {
  prescriptionId?: string;
};

type LockedBatchRow = {
  id: string;
  batchNumber: string;
  expiredDate: Date;
  currentStockBase: Prisma.Decimal;
  hppBase: Prisma.Decimal;
};

type ResolvedSaleItem = {
  productId: string;
  productUnitId: string;
  productName: string;
  unitName: string;
  qtySale: number;
  conversionSnapshot: number;
  minSaleQty: number;
  qtyBase: number;
};

type PreparedAllocation = {
  batchId: string;
  batchNumber: string;
  expiredDate: Date;
  qtyBase: number;
  hppBaseSnapshot: number;
  sellingPrice: number;
  subtotal: number;
  discountAmount: number;
  profitAmount: number;
  qtyBefore: number;
  qtyAfter: number;
};

type PreparedSaleItem = ResolvedSaleItem & {
  sellingPrice: number;
  subtotal: number;
  discountAmount: number;
  totalAfterDiscount: number;
  allocations: PreparedAllocation[];
};

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly discountService: DiscountService,
    private readonly idempotencyService: IdempotencyService,
    private readonly paymentService: PaymentService,
  ) {}

  async findCashierProducts(q?: string) {
    const today = this.startOfToday();
    const search = q?.trim();
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        ...(search
          ? {
              OR: [
                { code: { contains: search, mode: 'insensitive' } },
                { barcode: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
                { genericName: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
        batches: {
          some: {
            isActive: true,
            deletedAt: null,
            expiredDate: { gte: today },
            currentStockBase: { gt: 0 },
          },
        },
      },
      include: {
        category: true,
        baseUnit: true,
        productUnits: {
          where: { isActive: true, isSaleUnit: true, deletedAt: null },
          include: { unit: true },
          orderBy: [{ isDefaultSaleUnit: 'desc' }, { createdAt: 'asc' }],
        },
        batches: {
          where: {
            isActive: true,
            deletedAt: null,
            expiredDate: { gte: today },
            currentStockBase: { gt: 0 },
          },
          include: {
            prices: {
              where: { isActive: true, deletedAt: null },
            },
          },
          orderBy: [{ expiredDate: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: { name: 'asc' },
      take: 50,
    });

    return products
      .map((product) => {
        const totalStockBase = product.batches.reduce(
          (sum, batch) => sum + Number(batch.currentStockBase),
          0,
        );
        const units = product.productUnits
          .map((productUnit) => {
            const price = product.batches
              .flatMap((batch) => batch.prices)
              .find((item) => item.productUnitId === productUnit.id);

            if (!price) return null;

            const conversionToBase = Number(productUnit.conversionToBase);
            return {
              productUnitId: productUnit.id,
              unitId: productUnit.unitId,
              unitName: productUnit.unit.name,
              unitSymbol: productUnit.unit.symbol,
              conversionToBase,
              isDefaultSaleUnit: productUnit.isDefaultSaleUnit,
              minSaleQty: Number(productUnit.minSaleQty),
              saleUnitNote: productUnit.saleUnitNote,
              sellingPrice: Number(price.sellingPrice),
              stockAvailable: totalStockBase / conversionToBase,
            };
          })
          .filter((unit): unit is NonNullable<typeof unit> => Boolean(unit));

        if (!units.length) return null;

        return {
          id: product.id,
          code: product.code,
          barcode: product.barcode,
          name: product.name,
          genericName: product.genericName,
          category: product.category,
          baseUnit: product.baseUnit,
          stockAvailableBase: totalStockBase,
          units,
        };
      })
      .filter((product): product is NonNullable<typeof product> => Boolean(product));
  }

  async findAll(user: AuthUser) {
    const sales = await this.prisma.sale.findMany({
      where: { deletedAt: null },
      include: saleInclude,
      orderBy: { createdAt: 'desc' },
    });

    return sales.map((sale) => this.toSaleResponse(sale, user.role));
  }

  async findOne(id: string, user: AuthUser) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, deletedAt: null },
      include: saleInclude,
    });

    if (!sale) {
      throw new NotFoundException('Transaksi penjualan tidak ditemukan');
    }

    return this.toSaleResponse(sale, user.role);
  }

  async returnableItems(id: string, user: AuthUser) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, deletedAt: null },
      include: saleInclude,
    });

    if (!sale) {
      throw new NotFoundException('Transaksi penjualan tidak ditemukan');
    }

    const isManager = user.role === 'MANAGER';
    const items = sale.items.flatMap((item) =>
      item.allocations
        .map((allocation) => {
          const qtyBase = Number(allocation.qtyBase);
          const returnedQtyBase = Number(allocation.returnedQtyBase);
          const returnableQtyBase = this.roundQty(qtyBase - returnedQtyBase);
          if (returnableQtyBase <= 0) return null;

          const refundableAmount = this.roundMoney(
            Number(allocation.subtotal) - Number(allocation.discountAmount),
          );
          return {
            saleItemId: item.id,
            saleBatchAllocationId: allocation.id,
            productId: item.productId,
            productName: item.productName,
            productUnitId: item.productUnitId,
            unitName: item.unitName,
            batchId: allocation.batchId,
            batchNumber: allocation.batchNumber,
            expiredDate: allocation.expiredDate.toISOString().slice(0, 10),
            qtyBase,
            returnedQtyBase,
            returnableQtyBase,
            refundableAmount,
            ...(isManager
              ? {
                  hppBaseSnapshot: Number(allocation.hppBaseSnapshot),
                  profitAmount: Number(allocation.profitAmount),
                }
              : {}),
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    );

    return {
      saleId: sale.id,
      saleNumber: sale.saleNumber,
      createdAt: sale.createdAt.toISOString(),
      items,
    };
  }

  async create(
    dto: CreateSaleDto,
    user: AuthUser,
    idempotencyKey?: string,
    options: CreateSaleOptions = {},
  ) {
    const key = idempotencyKey?.trim();
    if (!key) {
      throw new BadRequestException('Header Idempotency-Key wajib diisi');
    }

    const requestHash = this.idempotencyService.hashRequest({
      ...dto,
      prescriptionId: options.prescriptionId ?? null,
    });
    const activeKey = await this.idempotencyService.findActiveKey({
      key,
      userId: user.id,
      actionType: SALE_CHECKOUT_ACTION,
    });

    if (activeKey) {
      if (activeKey.requestHash !== requestHash) {
        throw new ConflictException('Idempotency key dipakai untuk payload berbeda');
      }
      if (activeKey.status === 'SUCCESS' && activeKey.responseSnapshot) {
        return activeKey.responseSnapshot;
      }
      throw new ConflictException('Transaksi dengan idempotency key ini masih aktif');
    }

    const processingKey = await this.idempotencyService.createProcessingKey({
      key,
      userId: user.id,
      actionType: SALE_CHECKOUT_ACTION,
      requestHash,
    });

    try {
      const response = await this.createSaleTransaction(dto, user, options);
      await this.idempotencyService.markSuccess(processingKey.id, response);
      return response;
    } catch (error) {
      await this.idempotencyService.markFailed(processingKey.id);
      throw error;
    }
  }

  async createFromPrescription(
    prescriptionId: string,
    dto: CreateSaleFromPrescriptionDto,
    user: AuthUser,
    idempotencyKey?: string,
  ) {
    const prescription = await this.prisma.prescription.findFirst({
      where: {
        id: prescriptionId,
        status: { in: ['READY_FOR_PAYMENT', 'PAID'] },
        deletedAt: null,
      },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!prescription) {
      throw new BadRequestException('Resep belum siap bayar atau tidak ditemukan');
    }

    const saleDto: CreateSaleDto = {
      paymentMethod: dto.paymentMethod,
      paidAmount: dto.paidAmount,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      customerName: dto.customerName ?? prescription.patientName,
      note: dto.note,
      items: prescription.items.map((item) => ({
        productId: item.productId,
        productUnitId: item.productUnitId,
        qtySaleUnit: Number(item.qtySaleUnit),
        note: item.note ?? item.instruction ?? undefined,
      })),
    };

    return this.create(saleDto, user, idempotencyKey, { prescriptionId });
  }

  private async createSaleTransaction(
    dto: CreateSaleDto,
    user: AuthUser,
    options: CreateSaleOptions = {},
  ) {
    const resolvedItems = await this.resolveItems(dto);

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (options.prescriptionId) {
          const prescription = await tx.prescription.findFirst({
            where: {
              id: options.prescriptionId,
              status: 'READY_FOR_PAYMENT',
              deletedAt: null,
            },
            select: { id: true },
          });

          if (!prescription) {
            throw new BadRequestException('Resep belum siap bayar atau sudah dibayar');
          }
        }

        const preparedItems = await this.prepareItems(tx, resolvedItems);
        const subtotal = this.roundMoney(
          preparedItems.reduce((sum, item) => sum + item.subtotal, 0),
        );
        const discountTotal = this.discountService.calculateDiscount(
          dto.discountType,
          dto.discountValue,
          subtotal,
        );
        const grandTotal = this.roundMoney(subtotal - discountTotal);
        const payment = this.paymentService.validatePayment(
          dto.paymentMethod,
          dto.paidAmount,
          grandTotal,
        );

        const allocations = preparedItems.flatMap((item) => item.allocations);
        const allocationDiscounts = this.discountService.allocateDiscount(
          allocations.map((allocation) => allocation.subtotal),
          discountTotal,
        );

        let discountIndex = 0;
        for (const item of preparedItems) {
          let itemDiscount = 0;
          for (const allocation of item.allocations) {
            allocation.discountAmount = allocationDiscounts[discountIndex++];
            const hppAmount = allocation.qtyBase * allocation.hppBaseSnapshot;
            allocation.profitAmount = this.roundInternal(
              allocation.subtotal - allocation.discountAmount - hppAmount,
            );
            itemDiscount += allocation.discountAmount;
          }
          item.discountAmount = this.roundMoney(itemDiscount);
          item.totalAfterDiscount = this.roundMoney(
            item.subtotal - item.discountAmount,
          );
        }

        const totalHpp = this.roundInternal(
          preparedItems
            .flatMap((item) => item.allocations)
            .reduce(
              (sum, allocation) =>
                sum + allocation.qtyBase * allocation.hppBaseSnapshot,
              0,
            ),
        );
        const totalProfit = this.roundInternal(
          preparedItems
            .flatMap((item) => item.allocations)
            .reduce((sum, allocation) => sum + allocation.profitAmount, 0),
        );

        const createdSale = await tx.sale.create({
          data: {
            cashierId: user.id,
            prescriptionId: options.prescriptionId,
            saleNumber: this.generateSaleNumber(),
            paymentMethod: dto.paymentMethod,
            subtotal,
            discountTotal,
            grandTotal,
            paidAmount: payment.paidAmount,
            changeAmount: payment.changeAmount,
            totalHpp,
            totalProfit,
          },
        });

        if (options.prescriptionId) {
          await tx.prescription.update({
            where: { id: options.prescriptionId },
            data: {
              status: 'PAID',
              paidAt: new Date(),
            },
          });
        }

        for (const item of preparedItems) {
          const createdItem = await tx.saleItem.create({
            data: {
              saleId: createdSale.id,
              productId: item.productId,
              productUnitId: item.productUnitId,
              productName: item.productName,
              unitName: item.unitName,
              qtySale: item.qtySale,
              conversionSnapshot: item.conversionSnapshot,
              qtyBase: item.qtyBase,
              sellingPrice: item.sellingPrice,
              subtotal: item.subtotal,
              discountAmount: item.discountAmount,
              totalAfterDiscount: item.totalAfterDiscount,
            },
          });

          for (const allocation of item.allocations) {
            await tx.saleBatchAllocation.create({
              data: {
                saleItemId: createdItem.id,
                batchId: allocation.batchId,
                batchNumber: allocation.batchNumber,
                expiredDate: allocation.expiredDate,
                qtyBase: allocation.qtyBase,
                hppBaseSnapshot: allocation.hppBaseSnapshot,
                subtotal: allocation.subtotal,
                discountAmount: allocation.discountAmount,
                profitAmount: allocation.profitAmount,
              },
            });

            await tx.productBatch.update({
              where: { id: allocation.batchId },
              data: { currentStockBase: allocation.qtyAfter },
            });

            await tx.stockMutation.create({
              data: {
                productId: item.productId,
                batchId: allocation.batchId,
                createdById: user.id,
                mutationType: 'SALE_OUT',
                referenceType: 'SALE',
                referenceId: createdSale.id,
                qtyBefore: allocation.qtyBefore,
                qtyChange: -allocation.qtyBase,
                qtyAfter: allocation.qtyAfter,
                reason: `Penjualan ${createdSale.saleNumber}`,
              },
            });
          }
        }

        const sale = await tx.sale.findUniqueOrThrow({
          where: { id: createdSale.id },
          include: saleInclude,
        });

        return this.toSaleResponse(sale, user.role);
      });
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new BadRequestException('Nomor transaksi sudah digunakan');
      }
      throw error;
    }
  }

  private async resolveItems(dto: CreateSaleDto): Promise<ResolvedSaleItem[]> {
    const items: ResolvedSaleItem[] = [];

    for (const item of dto.items) {
      const productUnit = await this.prisma.productUnit.findFirst({
        where: {
          id: item.productUnitId,
          productId: item.productId,
          isActive: true,
          isSaleUnit: true,
          deletedAt: null,
          product: {
            isActive: true,
            deletedAt: null,
          },
        },
        include: {
          unit: true,
          product: true,
        },
      });

      if (!productUnit) {
        throw new BadRequestException('Produk atau satuan jual tidak valid');
      }

      const conversionSnapshot = Number(productUnit.conversionToBase);
      const minSaleQty = Number(productUnit.minSaleQty);
      if (item.qtySaleUnit < minSaleQty) {
        throw new BadRequestException(
          `Qty jual minimal untuk satuan ini adalah ${minSaleQty}`,
        );
      }

      items.push({
        productId: item.productId,
        productUnitId: item.productUnitId,
        productName: productUnit.product.name,
        unitName: productUnit.unit.name,
        qtySale: item.qtySaleUnit,
        conversionSnapshot,
        minSaleQty,
        qtyBase: this.roundQty(item.qtySaleUnit * conversionSnapshot),
      });
    }

    return items;
  }

  private async prepareItems(tx: Tx, items: ResolvedSaleItem[]) {
    const preparedItems: PreparedSaleItem[] = [];

    for (const item of items) {
      const lockedBatches = await this.lockFefoBatches(tx, item.productId);
      let remainingQty = item.qtyBase;
      const allocations: PreparedAllocation[] = [];

      for (const batch of lockedBatches) {
        if (remainingQty <= 0) break;

        const qtyBefore = Number(batch.currentStockBase);
        const qtyBase = Math.min(qtyBefore, remainingQty);
        const price = await tx.batchUnitPrice.findFirst({
          where: {
            batchId: batch.id,
            productUnitId: item.productUnitId,
            isActive: true,
            deletedAt: null,
          },
        });

        if (!price) {
          throw new BadRequestException('Harga jual batch tidak valid');
        }

        const sellingPrice = Number(price.sellingPrice);
        const qtySalePart = qtyBase / item.conversionSnapshot;
        const subtotal = this.roundMoney(qtySalePart * sellingPrice);
        const qtyAfter = this.roundQty(qtyBefore - qtyBase);

        if (qtyAfter < 0) {
          throw new BadRequestException('Stok produk tidak mencukupi');
        }

        allocations.push({
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          expiredDate: batch.expiredDate,
          qtyBase,
          hppBaseSnapshot: Number(batch.hppBase),
          sellingPrice,
          subtotal,
          discountAmount: 0,
          profitAmount: 0,
          qtyBefore,
          qtyAfter,
        });

        remainingQty = this.roundQty(remainingQty - qtyBase);
      }

      if (remainingQty > 0) {
        throw new BadRequestException('Stok produk tidak mencukupi');
      }

      const subtotal = this.roundMoney(
        allocations.reduce((sum, allocation) => sum + allocation.subtotal, 0),
      );

      preparedItems.push({
        ...item,
        sellingPrice: allocations[0]?.sellingPrice ?? 0,
        subtotal,
        discountAmount: 0,
        totalAfterDiscount: subtotal,
        allocations,
      });
    }

    return preparedItems;
  }

  private async lockFefoBatches(tx: Tx, productId: string) {
    const today = this.startOfToday();
    return tx.$queryRaw<LockedBatchRow[]>(Prisma.sql`
      SELECT
        id,
        batch_number AS "batchNumber",
        expired_date AS "expiredDate",
        current_stock_base AS "currentStockBase",
        hpp_base AS "hppBase"
      FROM product_batches
      WHERE product_id = ${productId}::uuid
        AND is_active = true
        AND deleted_at IS NULL
        AND expired_date >= ${today}::date
        AND current_stock_base > 0
      ORDER BY expired_date ASC, created_at ASC
      FOR UPDATE
    `);
  }

  private toSaleResponse(sale: SaleWithRelations, role: string) {
    const isManager = role === 'MANAGER';
    const response = {
      id: sale.id,
      saleNumber: sale.saleNumber,
      prescriptionId: sale.prescriptionId,
      prescriptionNumber: sale.prescription?.prescriptionNumber ?? null,
      paymentMethod: sale.paymentMethod,
      subtotal: Number(sale.subtotal),
      discountTotal: Number(sale.discountTotal),
      grandTotal: Number(sale.grandTotal),
      paidAmount: Number(sale.paidAmount),
      changeAmount: Number(sale.changeAmount),
      createdAt: sale.createdAt.toISOString(),
      cashier: {
        id: sale.cashier.id,
        name: sale.cashier.name,
        username: sale.cashier.username,
        role: sale.cashier.role.name,
      },
      items: sale.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productUnitId: item.productUnitId,
        productName: item.productName,
        unitName: item.unitName,
        qtySale: Number(item.qtySale),
        conversionSnapshot: Number(item.conversionSnapshot),
        qtyBase: Number(item.qtyBase),
        sellingPrice: Number(item.sellingPrice),
        subtotal: Number(item.subtotal),
        discountAmount: Number(item.discountAmount),
        totalAfterDiscount: Number(item.totalAfterDiscount),
        ...(isManager
          ? {
              allocations: item.allocations.map((allocation) => ({
                id: allocation.id,
                batchId: allocation.batchId,
                batchNumber: allocation.batchNumber,
                expiredDate: allocation.expiredDate.toISOString().slice(0, 10),
                qtyBase: Number(allocation.qtyBase),
                hppBaseSnapshot: Number(allocation.hppBaseSnapshot),
                subtotal: Number(allocation.subtotal),
                discountAmount: Number(allocation.discountAmount),
                profitAmount: Number(allocation.profitAmount),
                returnedQtyBase: Number(allocation.returnedQtyBase),
              })),
            }
          : {}),
      })),
    };

    if (!isManager) return response;

    return {
      ...response,
      totalHpp: Number(sale.totalHpp),
      totalProfit: Number(sale.totalProfit),
    };
  }

  private generateSaleNumber() {
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `TRX-${day}-${Date.now()}-${random}`;
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

  private startOfToday() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
}
