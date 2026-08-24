import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductBatch, ProductUnit } from '@prisma/client';
import { isPrismaUniqueError } from '../../common/utils/prisma-error';
import { PrismaService } from '../../database/prisma.service';
import { IdempotencyService } from '../sales/idempotency.service';
import {
  CreatePurchaseDto,
  PurchaseTaxMode,
} from './dto/create-purchase.dto';
import {
  PurchaseDiscountType,
  PurchaseItemDto,
} from './dto/purchase-item.dto';

const purchaseInclude = {
  supplier: true,
  purchaseOrder: true,
  createdBy: {
    include: { role: true },
  },
  items: {
    include: {
      product: true,
      productUnit: {
        include: { unit: true },
      },
      purchaseOrderItem: true,
      batch: true,
    },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.PurchaseInclude;

type PurchaseWithRelations = Prisma.PurchaseGetPayload<{
  include: typeof purchaseInclude;
}>;

type ProductUnitForPurchase = ProductUnit & {
  product: {
    id: string;
    isActive: boolean;
    deletedAt: Date | null;
  };
};

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async findAll() {
    const purchases = await this.prisma.purchase.findMany({
      where: { deletedAt: null },
      include: purchaseInclude,
      orderBy: [{ purchaseDate: 'desc' }, { createdAt: 'desc' }],
    });

    return purchases.map((purchase) => this.toPurchaseResponse(purchase));
  }

  async createDraftFromPo(poId: string) {
    const purchaseOrder = await this.prisma.purchaseOrder.findFirst({
      where: {
        id: poId,
        status: { not: 'CANCELLED' },
        deletedAt: null,
      },
      include: {
        items: {
          include: {
            product: true,
            productUnit: { include: { unit: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('PO tidak ditemukan');
    }

    return {
      supplierId: purchaseOrder.supplierId,
      purchaseOrderId: purchaseOrder.id,
      purchaseDate: new Date().toISOString().slice(0, 10),
      taxMode: 'NON_PPN',
      taxRatePercent: 0,
      items: purchaseOrder.items
        .filter((item) => Number(item.qtyReceived) < Number(item.qtyOrdered))
        .map((item) => ({
          purchaseOrderItemId: item.id,
          productId: item.productId,
          productUnitId: item.productUnitId,
          qtyPurchase: this.roundPrecision(
            Number(item.qtyOrdered) - Number(item.qtyReceived),
            4,
          ),
          batchNumber: '',
          expiredDate: '',
          purchasePrice: 0,
          discountType: 'NONE',
          discountValue: 0,
          sellingPrices: [],
          product: item.product,
          productUnit: {
            ...item.productUnit,
            conversionToBase: Number(item.productUnit.conversionToBase),
            minSaleQty: Number(item.productUnit.minSaleQty),
          },
        })),
    };
  }

  async findOne(id: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id, deletedAt: null },
      include: purchaseInclude,
    });

    if (!purchase) {
      throw new NotFoundException('Pembelian tidak ditemukan');
    }

    return this.toPurchaseResponse(purchase);
  }

  async create(
    dto: CreatePurchaseDto,
    createdById: string,
    idempotencyKey?: string,
  ) {
    const key = idempotencyKey?.trim();
    if (!key) {
      throw new BadRequestException('Header Idempotency-Key wajib diisi');
    }

    const requestHash = this.idempotencyService.hashRequest(dto);
    const activeKey = await this.idempotencyService.findActiveKey({
      key,
      userId: createdById,
      actionType: 'PURCHASE_CREATE',
    });

    if (activeKey) {
      if (activeKey.requestHash !== requestHash) {
        throw new ConflictException('Idempotency key dipakai untuk payload berbeda');
      }
      if (activeKey.status === 'SUCCESS') {
        return activeKey.responseSnapshot;
      }
      throw new ConflictException('Pembelian dengan idempotency key ini masih aktif');
    }

    const processingKey = await this.idempotencyService.createProcessingKey({
      key,
      userId: createdById,
      actionType: 'PURCHASE_CREATE',
      requestHash,
    });

    try {
      const response = await this.createPurchase(dto, createdById);
      await this.idempotencyService.markSuccess(processingKey.id, response);
      return response;
    } catch (error) {
      await this.idempotencyService.markFailed(processingKey.id);
      throw error;
    }
  }

  private async createPurchase(dto: CreatePurchaseDto, createdById: string) {
    await this.ensureSupplierActive(dto.supplierId);
    if (dto.purchaseOrderId) {
      await this.ensurePurchaseOrderUsable(dto.purchaseOrderId, dto.supplierId);
    }
    this.ensureUniqueSellingPrices(dto.items);

    const items = await this.resolveItems(dto.items, dto.purchaseOrderId);
    const purchaseNumber = this.generatePurchaseNumber();
    const subtotal = this.roundPrecision(
      items.reduce((sum, item) => sum + item.netTotal, 0),
      6,
    );
    const purchaseDiscountAmount = this.roundPrecision(
      items.reduce((sum, item) => sum + item.discountAmount, 0),
      6,
    );
    const taxMode = dto.taxMode ?? 'NON_PPN';
    const taxRatePercent = dto.taxRatePercent ?? 0;
    const taxAmount = this.calculateTaxAmount(subtotal, taxMode, taxRatePercent);
    const calculatedTotal = this.calculateInvoiceTotal({
      subtotal,
      taxAmount,
      taxMode,
      roundingAdjustment: dto.roundingAdjustment ?? 0,
    });

    this.validateInvoiceDifference(
      dto.invoiceTotalInput,
      calculatedTotal,
      dto.differenceNote,
    );

    try {
      const purchase = await this.prisma.$transaction(async (tx) => {
        const createdPurchase = await tx.purchase.create({
          data: {
            supplierId: dto.supplierId,
            purchaseOrderId: dto.purchaseOrderId,
            createdById,
            purchaseNumber,
            invoiceNumber: dto.invoiceNumber,
            invoiceDate: dto.invoiceDate ? this.toDate(dto.invoiceDate) : undefined,
            purchaseDate: this.toDate(dto.purchaseDate),
            taxMode,
            taxRatePercent,
            subtotal,
            purchaseDiscountAmount,
            taxAmount,
            invoiceTotalInput: dto.invoiceTotalInput,
            calculatedTotal,
            roundingAdjustment: dto.roundingAdjustment ?? 0,
            differenceNote: dto.differenceNote,
          },
        });

        for (const item of items) {
          const batch = await this.createOrUpdateBatch(tx, {
            productId: item.productId,
            supplierId: dto.supplierId,
            batchNumber: item.batchNumber,
            expiredDate: item.expiredDate,
            qtyBase: item.qtyBase,
            hppBase: item.hppBase,
          });

          await tx.purchaseItem.create({
            data: {
              purchaseId: createdPurchase.id,
              purchaseOrderItemId: item.purchaseOrderItemId,
              productId: item.productId,
              productUnitId: item.productUnitId,
              batchId: batch.id,
              batchNumber: item.batchNumber,
              expiredDate: item.expiredDate,
              qtyPurchase: item.qtyPurchase,
              qtyOrdered: item.qtyOrdered,
              qtyReceived: item.qtyPurchase,
              conversionSnapshot: item.conversionSnapshot,
              qtyBase: item.qtyBase,
              purchasePrice: item.purchasePrice,
              discountType: item.discountType,
              discountValue: item.discountValue,
              discountAmount: item.discountAmount,
              grossTotal: item.grossTotal,
              netTotal: item.netTotal,
              hppBase: item.hppBase,
              totalPrice: item.netTotal,
            },
          });

          if (item.purchaseOrderItemId) {
            await this.applyPurchaseOrderReceipt(
              tx,
              item.purchaseOrderItemId,
              item.qtyPurchase,
            );
          }

          await this.replaceBatchPrices(tx, batch.id, item.sellingPrices);

          await tx.stockMutation.create({
            data: {
              productId: item.productId,
              batchId: batch.id,
              createdById,
              mutationType: 'PURCHASE_IN',
              referenceType: 'PURCHASE',
              referenceId: createdPurchase.id,
              qtyBefore: batch.qtyBefore,
              qtyChange: item.qtyBase,
              qtyAfter: batch.qtyAfter,
              reason: `Pembelian ${createdPurchase.purchaseNumber}`,
            },
          });
        }

        if (dto.purchaseOrderId) {
          await this.refreshPurchaseOrderStatus(tx, dto.purchaseOrderId);
        }

        return tx.purchase.findUniqueOrThrow({
          where: { id: createdPurchase.id },
          include: purchaseInclude,
        });
      });

      return this.toPurchaseResponse(purchase);
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new BadRequestException('Nomor pembelian sudah digunakan');
      }
      throw error;
    }
  }

  private async ensureSupplierActive(supplierId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, isActive: true, deletedAt: null },
    });

    if (!supplier) {
      throw new BadRequestException('Supplier tidak valid');
    }
  }

  private ensureUniqueSellingPrices(items: PurchaseItemDto[]) {
    for (const item of items) {
      const ids = item.sellingPrices.map((price) => price.productUnitId);
      if (new Set(ids).size !== ids.length) {
        throw new BadRequestException('Harga jual tidak boleh duplikat');
      }
    }
  }

  private async resolveItems(
    items: PurchaseItemDto[],
    purchaseOrderId?: string,
  ) {
    const resolvedItems = [];

    for (const item of items) {
      const purchaseUnit = await this.findProductUnit(
        item.productId,
        item.productUnitId,
      );
      const purchaseOrderItem = item.purchaseOrderItemId
        ? await this.findPurchaseOrderItem(
            item.purchaseOrderItemId,
            item.productId,
            item.productUnitId,
            purchaseOrderId,
          )
        : null;
      const conversionSnapshot = Number(purchaseUnit.conversionToBase);
      const qtyBase = this.roundPrecision(
        item.qtyPurchase * conversionSnapshot,
        4,
      );
      const grossTotal = this.roundPrecision(
        item.qtyPurchase * item.purchasePrice,
        6,
      );
      const discountType = item.discountType ?? 'NONE';
      const discountValue = item.discountValue ?? 0;
      const discountAmount = this.calculateDiscountAmount(
        grossTotal,
        discountType,
        discountValue,
      );
      const netTotal = this.roundPrecision(grossTotal - discountAmount, 6);
      const hppBase = qtyBase === 0
        ? 0
        : this.roundPrecision(netTotal / qtyBase, 8);

      await this.ensureSellingPricesBelongToProduct(
        item.productId,
        item.sellingPrices.map((price) => price.productUnitId),
      );

      resolvedItems.push({
        productId: item.productId,
        productUnitId: item.productUnitId,
        purchaseOrderItemId: item.purchaseOrderItemId,
        qtyOrdered: purchaseOrderItem
          ? Number(purchaseOrderItem.qtyOrdered)
          : undefined,
        batchNumber: item.batchNumber,
        expiredDate: this.toDate(item.expiredDate),
        qtyPurchase: item.qtyPurchase,
        conversionSnapshot,
        qtyBase,
        purchasePrice: item.purchasePrice,
        discountType,
        discountValue,
        discountAmount,
        grossTotal,
        netTotal,
        hppBase,
        sellingPrices: item.sellingPrices,
      });
    }

    return resolvedItems;
  }

  private async findProductUnit(productId: string, productUnitId: string) {
    const productUnit = await this.prisma.productUnit.findFirst({
      where: {
        id: productUnitId,
        productId,
        isActive: true,
        deletedAt: null,
        product: {
          isActive: true,
          deletedAt: null,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            isActive: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!productUnit) {
      throw new BadRequestException('Produk atau satuan pembelian tidak valid');
    }

    return productUnit as ProductUnitForPurchase;
  }

  private async findPurchaseOrderItem(
    purchaseOrderItemId: string,
    productId: string,
    productUnitId: string,
    purchaseOrderId?: string,
  ) {
    const purchaseOrderItem = await this.prisma.purchaseOrderItem.findFirst({
      where: {
        id: purchaseOrderItemId,
        productId,
        productUnitId,
        purchaseOrderId,
        purchaseOrder: {
          status: { not: 'CANCELLED' },
          deletedAt: null,
        },
      },
      include: { purchaseOrder: true },
    });

    if (!purchaseOrderItem) {
      throw new BadRequestException('Item PO tidak valid untuk pembelian');
    }

    const remainingQty =
      Number(purchaseOrderItem.qtyOrdered) - Number(purchaseOrderItem.qtyReceived);
    if (remainingQty <= 0) {
      throw new BadRequestException('Item PO sudah diterima penuh');
    }

    return purchaseOrderItem;
  }

  private async ensurePurchaseOrderUsable(
    purchaseOrderId: string,
    supplierId: string,
  ) {
    const purchaseOrder = await this.prisma.purchaseOrder.findFirst({
      where: {
        id: purchaseOrderId,
        supplierId,
        status: { not: 'CANCELLED' },
        deletedAt: null,
      },
    });

    if (!purchaseOrder) {
      throw new BadRequestException('PO tidak valid untuk pembelian');
    }
  }

  private async ensureSellingPricesBelongToProduct(
    productId: string,
    productUnitIds: string[],
  ) {
    const productUnits = await this.prisma.productUnit.findMany({
      where: {
        id: { in: productUnitIds },
        productId,
        isActive: true,
        isSaleUnit: true,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (productUnits.length !== productUnitIds.length) {
      throw new BadRequestException('Harga jual berisi satuan produk yang tidak valid');
    }
  }

  private async createOrUpdateBatch(
    tx: Prisma.TransactionClient,
    input: {
      productId: string;
      supplierId: string;
      batchNumber: string;
      expiredDate: Date;
      qtyBase: number;
      hppBase: number;
    },
  ): Promise<ProductBatch & { qtyBefore: number; qtyAfter: number }> {
    const existingBatch = await tx.productBatch.findFirst({
      where: {
        productId: input.productId,
        batchNumber: input.batchNumber,
        deletedAt: null,
      },
    });

    if (existingBatch) {
      const qtyBefore = Number(existingBatch.currentStockBase);
      const qtyAfter = this.roundPrecision(qtyBefore + input.qtyBase, 4);
      const updatedBatch = await tx.productBatch.update({
        where: { id: existingBatch.id },
        data: {
          supplierId: input.supplierId,
          expiredDate: input.expiredDate,
          currentStockBase: qtyAfter,
          hppBase: input.hppBase,
          isActive: true,
        },
      });

      return {
        ...updatedBatch,
        qtyBefore,
        qtyAfter,
      };
    }

    const createdBatch = await tx.productBatch.create({
      data: {
        productId: input.productId,
        supplierId: input.supplierId,
        batchNumber: input.batchNumber,
        expiredDate: input.expiredDate,
        initialStockBase: input.qtyBase,
        currentStockBase: input.qtyBase,
        hppBase: input.hppBase,
      },
    });

    return {
      ...createdBatch,
      qtyBefore: 0,
      qtyAfter: input.qtyBase,
    };
  }

  private async applyPurchaseOrderReceipt(
    tx: Prisma.TransactionClient,
    purchaseOrderItemId: string,
    qtyReceived: number,
  ) {
    const item = await tx.purchaseOrderItem.findUniqueOrThrow({
      where: { id: purchaseOrderItemId },
    });
    const nextQtyReceived = this.roundPrecision(
      Number(item.qtyReceived) + qtyReceived,
      4,
    );

    if (nextQtyReceived > Number(item.qtyOrdered)) {
      throw new BadRequestException('Qty diterima melebihi qty PO');
    }

    await tx.purchaseOrderItem.update({
      where: { id: purchaseOrderItemId },
      data: { qtyReceived: nextQtyReceived },
    });
  }

  private async refreshPurchaseOrderStatus(
    tx: Prisma.TransactionClient,
    purchaseOrderId: string,
  ) {
    const items = await tx.purchaseOrderItem.findMany({
      where: { purchaseOrderId },
    });
    const receivedItems = items.filter((item) => Number(item.qtyReceived) > 0);
    const allReceived = items.every(
      (item) => Number(item.qtyReceived) >= Number(item.qtyOrdered),
    );

    await tx.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: {
        status: allReceived
          ? 'RECEIVED'
          : receivedItems.length > 0
            ? 'PARTIALLY_RECEIVED'
            : 'SENT',
      },
    });
  }

  private async replaceBatchPrices(
    tx: Prisma.TransactionClient,
    batchId: string,
    sellingPrices: { productUnitId: string; sellingPrice: number }[],
  ) {
    for (const price of sellingPrices) {
      await tx.batchUnitPrice.updateMany({
        where: {
          batchId,
          productUnitId: price.productUnitId,
          deletedAt: null,
        },
        data: {
          isActive: false,
          deletedAt: new Date(),
        },
      });

      await tx.batchUnitPrice.create({
        data: {
          batchId,
          productUnitId: price.productUnitId,
          sellingPrice: price.sellingPrice,
        },
      });
    }
  }

  private toPurchaseResponse(purchase: PurchaseWithRelations) {
    return {
      ...purchase,
      subtotal: Number(purchase.subtotal),
      purchaseDiscountAmount: Number(purchase.purchaseDiscountAmount),
      taxRatePercent: Number(purchase.taxRatePercent),
      taxAmount: Number(purchase.taxAmount),
      invoiceTotalInput:
        purchase.invoiceTotalInput === null
          ? null
          : Number(purchase.invoiceTotalInput),
      calculatedTotal: Number(purchase.calculatedTotal),
      roundingAdjustment: Number(purchase.roundingAdjustment),
      createdBy: {
        id: purchase.createdBy.id,
        name: purchase.createdBy.name,
        username: purchase.createdBy.username,
        role: purchase.createdBy.role.name,
      },
      items: purchase.items.map((item) => ({
        ...item,
        qtyPurchase: Number(item.qtyPurchase),
        qtyOrdered:
          item.qtyOrdered === null ? null : Number(item.qtyOrdered),
        qtyReceived: Number(item.qtyReceived),
        conversionSnapshot: Number(item.conversionSnapshot),
        qtyBase: Number(item.qtyBase),
        purchasePrice: Number(item.purchasePrice),
        discountValue: Number(item.discountValue),
        discountAmount: Number(item.discountAmount),
        grossTotal: Number(item.grossTotal),
        netTotal: Number(item.netTotal),
        hppBase: Number(item.hppBase),
        totalPrice: Number(item.totalPrice),
        product: {
          ...item.product,
          minStockBase: Number(item.product.minStockBase),
        },
        productUnit: {
          ...item.productUnit,
          conversionToBase: Number(item.productUnit.conversionToBase),
          minSaleQty: Number(item.productUnit.minSaleQty),
        },
        batch: {
          ...item.batch,
          initialStockBase: Number(item.batch.initialStockBase),
          currentStockBase: Number(item.batch.currentStockBase),
          hppBase: Number(item.batch.hppBase),
        },
      })),
    };
  }

  private generatePurchaseNumber() {
    return `PUR-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }

  private calculateDiscountAmount(
    grossTotal: number,
    discountType: PurchaseDiscountType,
    discountValue: number,
  ) {
    if (discountType === 'NONE') return 0;
    if (discountType === 'PERCENT') {
      if (discountValue > 100) {
        throw new BadRequestException('Diskon persen tidak boleh lebih dari 100');
      }
      return this.roundPrecision((grossTotal * discountValue) / 100, 6);
    }
    if (discountValue > grossTotal) {
      throw new BadRequestException('Diskon tidak boleh melebihi total item');
    }
    return this.roundPrecision(discountValue, 6);
  }

  private calculateTaxAmount(
    subtotal: number,
    taxMode: PurchaseTaxMode,
    taxRatePercent: number,
  ) {
    if (taxMode === 'NON_PPN' || taxRatePercent === 0) return 0;
    if (taxMode === 'PPN_INCLUDED') {
      return this.roundPrecision(
        subtotal - subtotal / (1 + taxRatePercent / 100),
        6,
      );
    }
    return this.roundPrecision((subtotal * taxRatePercent) / 100, 6);
  }

  private calculateInvoiceTotal(input: {
    subtotal: number;
    taxAmount: number;
    taxMode: PurchaseTaxMode;
    roundingAdjustment: number;
  }) {
    const baseTotal =
      input.taxMode === 'PPN_EXCLUDED'
        ? input.subtotal + input.taxAmount
        : input.subtotal;
    return this.roundPrecision(baseTotal + input.roundingAdjustment, 6);
  }

  private validateInvoiceDifference(
    invoiceTotalInput: number | undefined,
    calculatedTotal: number,
    differenceNote: string | undefined,
  ) {
    if (invoiceTotalInput === undefined) return;
    const difference = Math.abs(invoiceTotalInput - calculatedTotal);
    if (difference > 1 && !differenceNote?.trim()) {
      throw new BadRequestException(
        'Selisih faktur signifikan wajib memiliki catatan koreksi',
      );
    }
  }

  private toDate(value: string) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private roundPrecision(value: number, decimals: number) {
    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }
}
