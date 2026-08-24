import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    const now = new Date().toISOString();
    const localNetworkMode = this.configService.get<string | boolean>(
      'LOCAL_NETWORK_MODE',
    );

    return {
      status: 'ok',
      service: 'pos-apotek-backend',
      app: this.configService.get<string>('APP_NAME') ?? 'POS_APOTEK',
      mode:
        localNetworkMode === true || localNetworkMode === 'true'
          ? 'local-network'
          : 'standard',
      time: now,
      serverTime: now,
      timezone: this.configService.get<string>('APP_TIMEZONE') ?? 'Asia/Makassar',
      database: 'connected',
    };
  }
}
