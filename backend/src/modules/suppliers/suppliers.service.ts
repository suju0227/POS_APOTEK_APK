import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  isPrismaNotFoundError,
  isPrismaUniqueError,
} from '../../common/utils/prisma-error';
import { PrismaService } from '../../database/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  private readonly cacheKey = 'suppliers:all';

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async findAll() {
    // Try to get from cache
    const cached = await this.cacheService.get<any>(this.cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const suppliers = await this.prisma.supplier.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });

    // Store in cache
    await this.cacheService.set(this.cacheKey, suppliers);
    return suppliers;
  }

  async create(dto: CreateSupplierDto) {
    try {
      const supplier = await this.prisma.supplier.create({ data: dto });

      // Invalidate cache
      await this.cacheService.del(this.cacheKey);

      return supplier;
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new BadRequestException('Nama supplier sudah digunakan');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateSupplierDto) {
    try {
      const supplier = await this.prisma.supplier.update({
        where: { id },
        data: dto,
      });

      // Invalidate cache
      await this.cacheService.del(this.cacheKey);

      return supplier;
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        throw new NotFoundException('Supplier tidak ditemukan');
      }
      if (isPrismaUniqueError(error)) {
        throw new BadRequestException('Nama supplier sudah digunakan');
      }
      throw error;
    }
  }

  async deactivate(id: string) {
    try {
      const supplier = await this.prisma.supplier.update({
        where: { id },
        data: { isActive: false, deletedAt: new Date() },
      });

      // Invalidate cache
      await this.cacheService.del(this.cacheKey);

      return supplier;
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        throw new NotFoundException('Supplier tidak ditemukan');
      }
      throw error;
    }
  }
}
