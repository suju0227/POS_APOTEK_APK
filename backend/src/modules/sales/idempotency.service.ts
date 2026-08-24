import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../database/prisma.service';

export type IdempotencyStatus = 'PROCESSING' | 'SUCCESS' | 'FAILED';

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  hashRequest(payload: unknown) {
    return createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  async createProcessingKey(input: {
    key: string;
    userId: string;
    actionType: string;
    requestHash: string;
    ttlMs?: number;
  }) {
    const now = new Date();
    const activeKey = await this.prisma.idempotencyKey.findFirst({
      where: {
        key: input.key,
        userId: input.userId,
        actionType: input.actionType,
        expiresAt: { gt: now },
      },
    });

    if (activeKey) {
      throw new BadRequestException('Idempotency key masih aktif');
    }

    return this.prisma.idempotencyKey.create({
      data: {
        key: input.key,
        userId: input.userId,
        actionType: input.actionType,
        requestHash: input.requestHash,
        status: 'PROCESSING',
        expiresAt: new Date(now.getTime() + (input.ttlMs ?? 24 * 60 * 60 * 1000)),
      },
    });
  }

  findActiveKey(input: {
    key: string;
    userId: string;
    actionType: string;
  }) {
    return this.prisma.idempotencyKey.findFirst({
      where: {
        key: input.key,
        userId: input.userId,
        actionType: input.actionType,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markSuccess(id: string, responseSnapshot: unknown) {
    return this.prisma.idempotencyKey.update({
      where: { id },
      data: {
        status: 'SUCCESS',
        responseSnapshot: responseSnapshot as object,
      },
    });
  }

  async markFailed(id: string) {
    return this.prisma.idempotencyKey.update({
      where: { id },
      data: { status: 'FAILED' },
    });
  }
}
