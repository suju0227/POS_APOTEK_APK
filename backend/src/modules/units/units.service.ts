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
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Injectable()
export class UnitsService {
  private readonly cacheKey = 'units:all';

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
    const units = await this.prisma.unit.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    // Store in cache
    await this.cacheService.set(this.cacheKey, units);
    return units;
  }

  async create(dto: CreateUnitDto) {
    try {
      const unit = await this.prisma.unit.create({ data: dto });

      // Invalidate cache
      await this.cacheService.del(this.cacheKey);

      return unit;
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new BadRequestException('Nama satuan sudah digunakan');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateUnitDto) {
    try {
      const unit = await this.prisma.unit.update({
        where: { id },
        data: dto,
      });

      // Invalidate cache
      await this.cacheService.del(this.cacheKey);

      return unit;
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        throw new NotFoundException('Satuan tidak ditemukan');
      }
      if (isPrismaUniqueError(error)) {
        throw new BadRequestException('Nama satuan sudah digunakan');
      }
      throw error;
    }
  }

  deactivate(id: string) {
    return this.update(id, { isActive: false });
  }
}
