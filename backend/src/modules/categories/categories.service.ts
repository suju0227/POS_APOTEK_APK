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
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  private readonly cacheKey = 'categories:all';

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
    const categories = await this.prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });

    // Store in cache
    await this.cacheService.set(this.cacheKey, categories);
    return categories;
  }

  async create(dto: CreateCategoryDto) {
    try {
      const category = await this.prisma.category.create({ data: dto });

      // Invalidate cache
      await this.cacheService.del(this.cacheKey);

      return category;
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new BadRequestException('Nama kategori sudah digunakan');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateCategoryDto) {
    try {
      const category = await this.prisma.category.update({
        where: { id },
        data: dto,
      });

      // Invalidate cache
      await this.cacheService.del(this.cacheKey);

      return category;
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        throw new NotFoundException('Kategori tidak ditemukan');
      }
      if (isPrismaUniqueError(error)) {
        throw new BadRequestException('Nama kategori sudah digunakan');
      }
      throw error;
    }
  }

  async deactivate(id: string) {
    try {
      const category = await this.prisma.category.update({
        where: { id },
        data: { isActive: false, deletedAt: new Date() },
      });

      // Invalidate cache
      await this.cacheService.del(this.cacheKey);

      return category;
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        throw new NotFoundException('Kategori tidak ditemukan');
      }
      throw error;
    }
  }
}
