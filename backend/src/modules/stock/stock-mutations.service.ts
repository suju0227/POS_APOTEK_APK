import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class StockMutationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const mutations = await this.prisma.stockMutation.findMany({
      include: {
        product: true,
        batch: true,
        createdBy: {
          include: { role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return mutations.map((mutation) => ({
      ...mutation,
      qtyBefore: Number(mutation.qtyBefore),
      qtyChange: Number(mutation.qtyChange),
      qtyAfter: Number(mutation.qtyAfter),
      product: {
        ...mutation.product,
        minStockBase: Number(mutation.product.minStockBase),
      },
      batch: {
        ...mutation.batch,
        initialStockBase: Number(mutation.batch.initialStockBase),
        currentStockBase: Number(mutation.batch.currentStockBase),
        hppBase: Number(mutation.batch.hppBase),
      },
      createdBy: {
        id: mutation.createdBy.id,
        name: mutation.createdBy.name,
        username: mutation.createdBy.username,
        role: mutation.createdBy.role.name,
      },
    }));
  }
}
