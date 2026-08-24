import { BadRequestException, Injectable } from '@nestjs/common';
import { AppSetting } from '@prisma/client';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../database/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  private readonly cacheKey = 'settings:app';

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly cacheService: CacheService,
  ) {}

  async get() {
    // Try to get from cache (30-minute TTL for settings)
    const cached = await this.cacheService.get<any>(this.cacheKey);
    if (cached) {
      return cached;
    }

    // Get or create settings
    const settings = await this.getOrCreateSettings();
    const response = this.toResponse(settings);

    // Store in cache for 30 minutes
    await this.cacheService.set(this.cacheKey, response, 30 * 60);

    return response;
  }

  async update(dto: UpdateSettingsDto, user: AuthUser) {
    if (dto.timezone && dto.timezone !== 'Asia/Makassar') {
      throw new BadRequestException('Timezone wajib Asia/Makassar');
    }

    const current = await this.getOrCreateSettings();
    const updated = await this.prisma.appSetting.update({
      where: { id: current.id },
      data: {
        pharmacyName: dto.pharmacyName?.trim() || undefined,
        address: dto.address,
        phone: dto.phone,
        expiredAlertDays: dto.expiredAlertDays,
        timezone: dto.timezone,
      },
    });

    await this.auditLogsService.record({
      userId: user.id,
      action: 'SETTINGS_UPDATED',
      entityType: 'APP_SETTINGS',
      entityId: updated.id,
      oldValue: this.toResponse(current),
      newValue: this.toResponse(updated),
    });

    // Invalidate cache
    await this.cacheService.del(this.cacheKey);

    return this.toResponse(updated);
  }

  private async getOrCreateSettings() {
    const settings = await this.prisma.appSetting.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (settings) return settings;

    return this.prisma.appSetting.create({
      data: {
        pharmacyName: 'Apotek Risyah',
        expiredAlertDays: 30,
        timezone: 'Asia/Makassar',
        currency: 'IDR',
      },
    });
  }

  private toResponse(settings: AppSetting) {
    return {
      id: settings.id,
      pharmacyName: settings.pharmacyName,
      address: settings.address,
      phone: settings.phone,
      expiredAlertDays: settings.expiredAlertDays,
      timezone: settings.timezone,
      currency: settings.currency,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }
}
