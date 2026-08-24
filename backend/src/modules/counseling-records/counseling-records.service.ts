import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateCounselingRecordDto } from './dto/create-counseling-record.dto';
import { UpdateCounselingRecordDto } from './dto/update-counseling-record.dto';

const counselingInclude = {
  pharmacist: {
    include: { role: true },
  },
  prescription: true,
  sale: true,
} satisfies Prisma.CounselingRecordInclude;

type CounselingRecordWithRelations = Prisma.CounselingRecordGetPayload<{
  include: typeof counselingInclude;
}>;

@Injectable()
export class CounselingRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const records = await this.prisma.counselingRecord.findMany({
      where: { deletedAt: null },
      include: counselingInclude,
      orderBy: [{ counselingDate: 'desc' }, { createdAt: 'desc' }],
    });

    return records.map((record) => this.toCounselingRecordResponse(record));
  }

  async findOne(id: string) {
    const record = await this.findCounselingRecordOrThrow(id);
    return this.toCounselingRecordResponse(record);
  }

  async create(dto: CreateCounselingRecordDto, pharmacistId: string) {
    await this.ensureReferencesValid(dto.prescriptionId, dto.saleId);

    const record = await this.prisma.counselingRecord.create({
      data: {
        pharmacistId,
        prescriptionId: dto.prescriptionId,
        saleId: dto.saleId,
        patientName: dto.patientName,
        counselingDate: dto.counselingDate
          ? this.toDateTime(dto.counselingDate)
          : undefined,
        educationSummary: dto.educationSummary,
        note: dto.note,
      },
      include: counselingInclude,
    });

    return this.toCounselingRecordResponse(record);
  }

  async update(id: string, dto: UpdateCounselingRecordDto) {
    await this.findCounselingRecordOrThrow(id);
    await this.ensureReferencesValid(dto.prescriptionId, dto.saleId);

    const record = await this.prisma.counselingRecord.update({
      where: { id },
      data: {
        prescriptionId: dto.prescriptionId,
        saleId: dto.saleId,
        patientName: dto.patientName,
        counselingDate: dto.counselingDate
          ? this.toDateTime(dto.counselingDate)
          : undefined,
        educationSummary: dto.educationSummary,
        note: dto.note,
      },
      include: counselingInclude,
    });

    return this.toCounselingRecordResponse(record);
  }

  private async findCounselingRecordOrThrow(id: string) {
    const record = await this.prisma.counselingRecord.findFirst({
      where: { id, deletedAt: null },
      include: counselingInclude,
    });

    if (!record) {
      throw new NotFoundException('Catatan konseling tidak ditemukan');
    }

    return record;
  }

  private async ensureReferencesValid(prescriptionId?: string, saleId?: string) {
    if (prescriptionId) {
      const prescription = await this.prisma.prescription.findFirst({
        where: { id: prescriptionId, deletedAt: null },
      });
      if (!prescription) {
        throw new BadRequestException('Resep konseling tidak valid');
      }
    }

    if (saleId) {
      const sale = await this.prisma.sale.findFirst({
        where: { id: saleId, deletedAt: null },
      });
      if (!sale) {
        throw new BadRequestException('Transaksi konseling tidak valid');
      }
    }
  }

  private toCounselingRecordResponse(record: CounselingRecordWithRelations) {
    return {
      id: record.id,
      prescriptionId: record.prescriptionId,
      saleId: record.saleId,
      patientName: record.patientName,
      counselingDate: record.counselingDate.toISOString(),
      educationSummary: record.educationSummary,
      note: record.note,
      createdAt: record.createdAt.toISOString(),
      pharmacist: {
        id: record.pharmacist.id,
        name: record.pharmacist.name,
        username: record.pharmacist.username,
        role: record.pharmacist.role.name,
      },
      prescriptionNumber: record.prescription?.prescriptionNumber ?? null,
      saleNumber: record.sale?.saleNumber ?? null,
    };
  }

  private toDateTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Tanggal konseling tidak valid');
    }
    return date;
  }
}
