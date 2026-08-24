import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isPrismaUniqueError } from '../../common/utils/prisma-error';
import { PrismaService } from '../../database/prisma.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

const purchaseOrderInclude = {
  supplier: true,
  createdBy: {
    include: { role: true },
  },
  items: {
    include: {
      product: true,
      productUnit: {
        include: { unit: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.PurchaseOrderInclude;

type PurchaseOrderWithRelations = Prisma.PurchaseOrderGetPayload<{
  include: typeof purchaseOrderInclude;
}>;

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const purchaseOrders = await this.prisma.purchaseOrder.findMany({
      where: { deletedAt: null },
      include: purchaseOrderInclude,
      orderBy: [{ orderDate: 'desc' }, { createdAt: 'desc' }],
    });

    return purchaseOrders.map((purchaseOrder) =>
      this.toPurchaseOrderResponse(purchaseOrder),
    );
  }

  async findOne(id: string) {
    const purchaseOrder = await this.findPurchaseOrderOrThrow(id);
    return this.toPurchaseOrderResponse(purchaseOrder);
  }

  async create(dto: CreatePurchaseOrderDto, createdById: string) {
    await this.ensureSupplierActive(dto.supplierId);
    await this.ensureItemsValid(dto.items);

    try {
      const purchaseOrder = await this.prisma.purchaseOrder.create({
        data: {
          supplierId: dto.supplierId,
          createdById,
          poNumber: this.generatePoNumber(),
          orderDate: this.toDate(dto.orderDate),
          note: dto.note,
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              productUnitId: item.productUnitId,
              qtyOrdered: item.qtyOrdered,
              note: item.note,
            })),
          },
        },
        include: purchaseOrderInclude,
      });

      return this.toPurchaseOrderResponse(purchaseOrder);
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new BadRequestException('Nomor PO sudah digunakan');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdatePurchaseOrderDto) {
    const existing = await this.findPurchaseOrderOrThrow(id);
    if (!['DRAFT', 'SENT'].includes(existing.status)) {
      throw new BadRequestException('PO yang sudah diterima tidak dapat diubah');
    }

    if (dto.supplierId) await this.ensureSupplierActive(dto.supplierId);
    if (dto.items) await this.ensureItemsValid(dto.items);

    const purchaseOrder = await this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        await tx.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: id, qtyReceived: 0 },
        });

        const receivedCount = await tx.purchaseOrderItem.count({
          where: { purchaseOrderId: id },
        });
        if (receivedCount > 0) {
          throw new BadRequestException(
            'Item PO yang sudah diterima tidak dapat diganti total',
          );
        }
      }

      return tx.purchaseOrder.update({
        where: { id },
        data: {
          supplierId: dto.supplierId,
          orderDate: dto.orderDate ? this.toDate(dto.orderDate) : undefined,
          note: dto.note,
          ...(dto.items
            ? {
                items: {
                  create: dto.items.map((item) => ({
                    productId: item.productId,
                    productUnitId: item.productUnitId,
                    qtyOrdered: item.qtyOrdered,
                    note: item.note,
                  })),
                },
              }
            : {}),
        },
        include: purchaseOrderInclude,
      });
    });

    return this.toPurchaseOrderResponse(purchaseOrder);
  }

  async markSent(id: string) {
    const existing = await this.findPurchaseOrderOrThrow(id);
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Hanya PO draft yang dapat dikirim');
    }

    const purchaseOrder = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date() },
      include: purchaseOrderInclude,
    });

    return this.toPurchaseOrderResponse(purchaseOrder);
  }

  async cancel(id: string) {
    const existing = await this.findPurchaseOrderOrThrow(id);
    if (['RECEIVED', 'CANCELLED'].includes(existing.status)) {
      throw new BadRequestException('PO tidak dapat dibatalkan');
    }

    const purchaseOrder = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
      include: purchaseOrderInclude,
    });

    return this.toPurchaseOrderResponse(purchaseOrder);
  }

  async printPreview(id: string) {
    const purchaseOrder = await this.findPurchaseOrderOrThrow(id);
    return {
      type: 'PURCHASE_ORDER_PRINT_PREVIEW',
      generatedAt: new Date().toISOString(),
      purchaseOrder: this.toPurchaseOrderResponse(purchaseOrder),
    };
  }

  async convertToPurchase(id: string) {
    const purchaseOrder = await this.findPurchaseOrderOrThrow(id);
    if (purchaseOrder.status === 'CANCELLED') {
      throw new BadRequestException('PO batal tidak dapat ditarik ke pembelian');
    }

    return {
      supplierId: purchaseOrder.supplierId,
      purchaseOrderId: purchaseOrder.id,
      purchaseDate: new Date().toISOString().slice(0, 10),
      invoiceNumber: undefined,
      invoiceDate: undefined,
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
        })),
    };
  }

  private async findPurchaseOrderOrThrow(id: string) {
    const purchaseOrder = await this.prisma.purchaseOrder.findFirst({
      where: { id, deletedAt: null },
      include: purchaseOrderInclude,
    });

    if (!purchaseOrder) {
      throw new NotFoundException('PO tidak ditemukan');
    }

    return purchaseOrder;
  }

  private async ensureSupplierActive(supplierId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, isActive: true, deletedAt: null },
    });

    if (!supplier) {
      throw new BadRequestException('Supplier tidak valid');
    }
  }

  private async ensureItemsValid(items: CreatePurchaseOrderDto['items']) {
    for (const item of items) {
      const productUnit = await this.prisma.productUnit.findFirst({
        where: {
          id: item.productUnitId,
          productId: item.productId,
          isActive: true,
          deletedAt: null,
          product: {
            isActive: true,
            deletedAt: null,
          },
        },
      });

      if (!productUnit) {
        throw new BadRequestException('Produk atau satuan PO tidak valid');
      }
    }
  }

  private toPurchaseOrderResponse(purchaseOrder: PurchaseOrderWithRelations) {
    return {
      ...purchaseOrder,
      items: purchaseOrder.items.map((item) => ({
        ...item,
        qtyOrdered: Number(item.qtyOrdered),
        qtyReceived: Number(item.qtyReceived),
        product: {
          ...item.product,
          minStockBase: Number(item.product.minStockBase),
        },
        productUnit: {
          ...item.productUnit,
          conversionToBase: Number(item.productUnit.conversionToBase),
          minSaleQty: Number(item.productUnit.minSaleQty),
        },
      })),
    };
  }

  private generatePoNumber() {
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `PO-${day}-${Date.now()}-${random}`;
  }

  private toDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Tanggal tidak valid');
    }
    return date;
  }

  private roundPrecision(value: number, decimals: number) {
    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }
}
