import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isPrismaUniqueError } from '../../common/utils/prisma-error';
import { PrismaService } from '../../database/prisma.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { PrescriptionItemDto } from './dto/prescription-item.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';

const prescriptionInclude = {
  pharmacist: {
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
  sale: true,
} satisfies Prisma.PrescriptionInclude;

type PrescriptionWithRelations = Prisma.PrescriptionGetPayload<{
  include: typeof prescriptionInclude;
}>;

@Injectable()
export class PrescriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const prescriptions = await this.prisma.prescription.findMany({
      where: { deletedAt: null },
      include: prescriptionInclude,
      orderBy: [{ prescriptionDate: 'desc' }, { createdAt: 'desc' }],
    });

    return prescriptions.map((prescription) =>
      this.toPrescriptionResponse(prescription),
    );
  }

  async findReadyForPayment() {
    const prescriptions = await this.prisma.prescription.findMany({
      where: {
        status: 'READY_FOR_PAYMENT',
        deletedAt: null,
      },
      include: prescriptionInclude,
      orderBy: [{ readyAt: 'asc' }, { createdAt: 'asc' }],
    });

    return prescriptions.map((prescription) =>
      this.toPrescriptionResponse(prescription),
    );
  }

  async findOne(id: string) {
    const prescription = await this.findPrescriptionOrThrow(id);
    return this.toPrescriptionResponse(prescription);
  }

  async create(dto: CreatePrescriptionDto, pharmacistId: string) {
    await this.ensureItemsValid(dto.items);

    try {
      const prescription = await this.prisma.prescription.create({
        data: {
          pharmacistId,
          prescriptionNumber: this.generatePrescriptionNumber(),
          patientName: dto.patientName,
          patientPhone: dto.patientPhone,
          doctorName: dto.doctorName,
          prescriptionDate: this.toDate(dto.prescriptionDate),
          note: dto.note,
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              productUnitId: item.productUnitId,
              qtySaleUnit: item.qtySaleUnit,
              instruction: item.instruction,
              note: item.note,
            })),
          },
        },
        include: prescriptionInclude,
      });

      return this.toPrescriptionResponse(prescription);
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new BadRequestException('Nomor resep sudah digunakan');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdatePrescriptionDto) {
    const existing = await this.findPrescriptionOrThrow(id);
    if (!['DRAFT', 'REVIEWED', 'NEED_CONFIRMATION'].includes(existing.status)) {
      throw new BadRequestException('Resep pada status ini tidak dapat diubah');
    }

    if (dto.items) await this.ensureItemsValid(dto.items);

    const prescription = await this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        await tx.prescriptionItem.deleteMany({
          where: { prescriptionId: id },
        });
      }

      return tx.prescription.update({
        where: { id },
        data: {
          patientName: dto.patientName,
          patientPhone: dto.patientPhone,
          doctorName: dto.doctorName,
          prescriptionDate: dto.prescriptionDate
            ? this.toDate(dto.prescriptionDate)
            : undefined,
          note: dto.note,
          ...(dto.items
            ? {
                items: {
                  create: dto.items.map((item) => ({
                    productId: item.productId,
                    productUnitId: item.productUnitId,
                    qtySaleUnit: item.qtySaleUnit,
                    instruction: item.instruction,
                    note: item.note,
                  })),
                },
              }
            : {}),
        },
        include: prescriptionInclude,
      });
    });

    return this.toPrescriptionResponse(prescription);
  }

  async markReadyForPayment(id: string) {
    const existing = await this.findPrescriptionOrThrow(id);
    if (!['DRAFT', 'REVIEWED', 'NEED_CONFIRMATION'].includes(existing.status)) {
      throw new BadRequestException('Resep tidak dapat ditandai siap bayar');
    }

    const prescription = await this.prisma.prescription.update({
      where: { id },
      data: {
        status: 'READY_FOR_PAYMENT',
        readyAt: new Date(),
      },
      include: prescriptionInclude,
    });

    return this.toPrescriptionResponse(prescription);
  }

  async markPaid(id: string, tx: Prisma.TransactionClient) {
    await tx.prescription.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    });
  }

  async cancel(id: string) {
    const existing = await this.findPrescriptionOrThrow(id);
    if (['PAID', 'COMPLETED', 'CANCELLED'].includes(existing.status)) {
      throw new BadRequestException('Resep tidak dapat dibatalkan');
    }

    const prescription = await this.prisma.prescription.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
      include: prescriptionInclude,
    });

    return this.toPrescriptionResponse(prescription);
  }

  async getReadyCheckoutItems(id: string) {
    const prescription = await this.prisma.prescription.findFirst({
      where: {
        id,
        status: 'READY_FOR_PAYMENT',
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

    return {
      prescription,
      items: prescription.items.map((item) => ({
        productId: item.productId,
        productUnitId: item.productUnitId,
        qtySaleUnit: Number(item.qtySaleUnit),
        note: item.note ?? item.instruction ?? undefined,
      })),
    };
  }

  private async findPrescriptionOrThrow(id: string) {
    const prescription = await this.prisma.prescription.findFirst({
      where: { id, deletedAt: null },
      include: prescriptionInclude,
    });

    if (!prescription) {
      throw new NotFoundException('Resep tidak ditemukan');
    }

    return prescription;
  }

  private async ensureItemsValid(items: PrescriptionItemDto[]) {
    for (const item of items) {
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
      });

      if (!productUnit) {
        throw new BadRequestException('Produk atau satuan jual resep tidak valid');
      }

      const minSaleQty = Number(productUnit.minSaleQty);
      if (item.qtySaleUnit < minSaleQty) {
        throw new BadRequestException(
          `Qty resep minimal untuk satuan ini adalah ${minSaleQty}`,
        );
      }
    }
  }

  private toPrescriptionResponse(prescription: PrescriptionWithRelations) {
    return {
      id: prescription.id,
      prescriptionNumber: prescription.prescriptionNumber,
      patientName: prescription.patientName,
      patientPhone: prescription.patientPhone,
      doctorName: prescription.doctorName,
      prescriptionDate: prescription.prescriptionDate.toISOString().slice(0, 10),
      status: prescription.status,
      note: prescription.note,
      readyAt: prescription.readyAt?.toISOString() ?? null,
      paidAt: prescription.paidAt?.toISOString() ?? null,
      cancelledAt: prescription.cancelledAt?.toISOString() ?? null,
      createdAt: prescription.createdAt.toISOString(),
      pharmacist: {
        id: prescription.pharmacist.id,
        name: prescription.pharmacist.name,
        username: prescription.pharmacist.username,
        role: prescription.pharmacist.role.name,
      },
      saleId: prescription.sale?.id ?? null,
      items: prescription.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productUnitId: item.productUnitId,
        productName: item.product.name,
        unitName: item.productUnit.unit.name,
        unitSymbol: item.productUnit.unit.symbol,
        qtySaleUnit: Number(item.qtySaleUnit),
        conversionToBase: Number(item.productUnit.conversionToBase),
        instruction: item.instruction,
        note: item.note,
      })),
    };
  }

  private generatePrescriptionNumber() {
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `RX-${day}-${Date.now()}-${random}`;
  }

  private toDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Tanggal resep tidak valid');
    }
    return date;
  }
}
