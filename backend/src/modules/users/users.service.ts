import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

type UserWithRole = User & { role: Role };

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => this.toSafeUser(user));
  }

  async create(dto: CreateUserDto, actor?: AuthUser) {
    const role = await this.findRole(dto.roleName);
    const passwordHash = await bcrypt.hash(dto.password, 12);

    try {
      const user = await this.prisma.user.create({
        data: {
          name: dto.name,
          username: dto.username,
          email: dto.email,
          passwordHash,
          roleId: role.id,
        },
        include: { role: true },
      });

      const response = this.toSafeUser(user);
      await this.auditLogsService.record({
        userId: actor?.id,
        action: 'USER_CREATED',
        entityType: 'USER',
        entityId: user.id,
        newValue: response,
      });

      return response;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new BadRequestException('Username atau email sudah digunakan');
      }

      throw error;
    }
  }

  async update(id: string, dto: UpdateUserDto, actor?: AuthUser) {
    const existing = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { role: true },
    });

    if (!existing) {
      throw new NotFoundException('User tidak ditemukan');
    }

    const data: {
      name?: string;
      email?: string | null;
      passwordHash?: string;
      roleId?: string;
      isActive?: boolean;
    } = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 12);
    if (dto.roleName) data.roleId = (await this.findRole(dto.roleName)).id;

    try {
      const user = await this.prisma.user.update({
        where: { id },
        data,
        include: { role: true },
      });

      const response = this.toSafeUser(user);
      await this.auditLogsService.record({
        userId: actor?.id,
        action: 'USER_UPDATED',
        entityType: 'USER',
        entityId: user.id,
        oldValue: this.toSafeUser(existing),
        newValue: response,
      });

      return response;
    } catch (error) {
      if (this.isRecordNotFoundError(error)) {
        throw new NotFoundException('User tidak ditemukan');
      }

      if (this.isUniqueConstraintError(error)) {
        throw new BadRequestException('Username atau email sudah digunakan');
      }

      throw error;
    }
  }

  async deactivate(id: string, actor?: AuthUser) {
    return this.update(id, { isActive: false }, actor);
  }

  private async findRole(roleName: string) {
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      throw new BadRequestException('Role tidak valid');
    }

    return role;
  }

  private toSafeUser(user: UserWithRole) {
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role.name,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private isUniqueConstraintError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }

  private isRecordNotFoundError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2025'
    );
  }
}
