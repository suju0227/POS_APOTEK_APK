import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductUnit, Unit } from '@prisma/client';
import {
  isPrismaNotFoundError,
  isPrismaUniqueError,
} from '../../common/utils/prisma-error';
import { PrismaService } from '../../database/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductUnitDto } from './dto/create-product-unit.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductUnitDto } from './dto/update-product-unit.dto';

const productInclude = {
  category: true,
  baseUnit: true,
  productUnits: {
    where: { deletedAt: null },
    include: { unit: true },
    orderBy: [{ isDefaultSaleUnit: 'desc' }, { createdAt: 'asc' }],
  },
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;
type ProductUnitWithUnit = ProductUnit & { unit: Unit };

@Injectable()
export class ProductsService {
  private readonly cacheKey = 'products:all';

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async findAll(search?: string) {
    // Don't cache search results
    if (search) {
      return this.queryProducts(search);
    }

    // Try to get from cache
    const cached = await this.cacheService.get<any>(this.cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const products = await this.queryProducts();

    // Store in cache
    await this.cacheService.set(this.cacheKey, products);

    return products;
  }

  private async queryProducts(search?: string) {
    const products = await this.prisma.product.findMany({
      where: {
        deletedAt: null,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
                { barcode: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: productInclude,
      orderBy: { name: 'asc' },
    });

    return products.map((product) => this.toProductResponse(product));
  }

  search(search?: string) {
    return this.findAll(search);
  }

  async create(dto: CreateProductDto) {
    await this.ensureCategoryActive(dto.categoryId);
    await this.ensureUnitActive(dto.baseUnitId);

    try {
      const product = await this.prisma.product.create({
        data: dto,
        include: productInclude,
      });

      // Invalidate cache
      await this.cacheService.del(this.cacheKey);

      return this.toProductResponse(product);
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new BadRequestException('Kode, barcode, atau nama produk sudah digunakan');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateProductDto) {
    if (dto.categoryId) await this.ensureCategoryActive(dto.categoryId);
    if (dto.baseUnitId) await this.ensureUnitActive(dto.baseUnitId);

    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: dto,
        include: productInclude,
      });

      // Invalidate cache
      await this.cacheService.del(this.cacheKey);

      return this.toProductResponse(product);
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        throw new NotFoundException('Produk tidak ditemukan');
      }
      if (isPrismaUniqueError(error)) {
        throw new BadRequestException('Kode, barcode, atau nama produk sudah digunakan');
      }
      throw error;
    }
  }

  async deactivate(id: string) {
    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: {
          isActive: false,
          deletedAt: new Date(),
          productUnits: {
            updateMany: {
              where: { deletedAt: null },
              data: {
                isActive: false,
                isDefaultSaleUnit: false,
                deletedAt: new Date(),
              },
            },
          },
        },
        include: productInclude,
      });

      // Invalidate cache
      await this.cacheService.del(this.cacheKey);

      return this.toProductResponse(product);
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        throw new NotFoundException('Produk tidak ditemukan');
      }
      throw error;
    }
  }

  async findUnits(productId: string) {
    await this.ensureProductExists(productId);

    const units = await this.prisma.productUnit.findMany({
      where: { productId, deletedAt: null },
      include: { unit: true },
      orderBy: [{ isDefaultSaleUnit: 'desc' }, { createdAt: 'asc' }],
    });

    return units.map((unit) => this.toProductUnitResponse(unit));
  }

  async createUnit(productId: string, dto: CreateProductUnitDto) {
    await this.ensureProductExists(productId);
    await this.ensureUnitActive(dto.unitId);
    this.ensureDefaultSaleUnitIsSellable(dto);

    try {
      const productUnit = await this.prisma.$transaction(async (tx) => {
        if (dto.isDefaultSaleUnit) {
          await tx.productUnit.updateMany({
            where: { productId, deletedAt: null },
            data: { isDefaultSaleUnit: false },
          });
        }

        return tx.productUnit.create({
          data: {
            productId,
            unitId: dto.unitId,
            conversionToBase: dto.conversionToBase,
            isDefaultSaleUnit: dto.isDefaultSaleUnit ?? false,
            isSaleUnit: dto.isSaleUnit ?? true,
            minSaleQty: dto.minSaleQty ?? 1,
            saleUnitNote: dto.saleUnitNote,
          },
          include: { unit: true },
        });
      });

      await this.cacheService.del(this.cacheKey);

      return this.toProductUnitResponse(productUnit);
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new BadRequestException('Satuan produk sudah digunakan');
      }
      throw error;
    }
  }

  async updateUnit(
    productId: string,
    productUnitId: string,
    dto: UpdateProductUnitDto,
  ) {
    await this.ensureProductExists(productId);
    await this.ensureProductUnitExists(productId, productUnitId);
    if (dto.unitId) await this.ensureUnitActive(dto.unitId);
    this.ensureDefaultSaleUnitIsSellable(dto);
    if (dto.isDefaultSaleUnit && dto.isActive === false) {
      throw new BadRequestException('Satuan default harus aktif');
    }

    try {
      const productUnit = await this.prisma.$transaction(async (tx) => {
        if (dto.isDefaultSaleUnit) {
          await tx.productUnit.updateMany({
            where: {
              productId,
              id: { not: productUnitId },
              deletedAt: null,
            },
            data: { isDefaultSaleUnit: false },
          });
        }

        return tx.productUnit.update({
          where: { id: productUnitId },
          data: {
            ...dto,
            ...(dto.isActive === false || dto.isSaleUnit === false
              ? { isDefaultSaleUnit: false }
              : {}),
          },
          include: { unit: true },
        });
      });

      await this.cacheService.del(this.cacheKey);

      return this.toProductUnitResponse(productUnit);
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        throw new NotFoundException('Satuan produk tidak ditemukan');
      }
      if (isPrismaUniqueError(error)) {
        throw new BadRequestException('Satuan produk sudah digunakan');
      }
      throw error;
    }
  }

  async deactivateUnit(productId: string, productUnitId: string) {
    await this.ensureProductExists(productId);
    await this.ensureProductUnitExists(productId, productUnitId);

    try {
      const productUnit = await this.prisma.productUnit.update({
        where: { id: productUnitId },
        data: {
          isActive: false,
          isSaleUnit: false,
          isDefaultSaleUnit: false,
          deletedAt: new Date(),
        },
        include: { unit: true },
      });

      await this.cacheService.del(this.cacheKey);

      return this.toProductUnitResponse(productUnit);
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        throw new NotFoundException('Satuan produk tidak ditemukan');
      }
      throw error;
    }
  }

  private async ensureCategoryActive(categoryId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, isActive: true, deletedAt: null },
    });

    if (!category) {
      throw new BadRequestException('Kategori tidak valid');
    }
  }

  private async ensureUnitActive(unitId: string) {
    const unit = await this.prisma.unit.findFirst({
      where: { id: unitId, isActive: true },
    });

    if (!unit) {
      throw new BadRequestException('Satuan tidak valid');
    }
  }

  private async ensureProductExists(productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }
  }

  private async ensureProductUnitExists(productId: string, productUnitId: string) {
    const productUnit = await this.prisma.productUnit.findFirst({
      where: {
        id: productUnitId,
        productId,
        deletedAt: null,
      },
    });

    if (!productUnit) {
      throw new NotFoundException('Satuan produk tidak ditemukan');
    }
  }

  private ensureDefaultSaleUnitIsSellable(
    dto: CreateProductUnitDto | UpdateProductUnitDto,
  ) {
    if (dto.isDefaultSaleUnit && dto.isSaleUnit === false) {
      throw new BadRequestException('Satuan default harus boleh dijual');
    }
  }

  private toProductResponse(product: ProductWithRelations) {
    return {
      ...product,
      minStockBase: Number(product.minStockBase),
      productUnits: product.productUnits.map((unit) =>
        this.toProductUnitResponse(unit),
      ),
    };
  }

  private toProductUnitResponse(productUnit: ProductUnitWithUnit) {
    return {
      ...productUnit,
      conversionToBase: Number(productUnit.conversionToBase),
      minSaleQty: Number(productUnit.minSaleQty),
    };
  }
}
