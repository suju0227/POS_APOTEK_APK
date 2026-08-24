import type { RoleName } from '../auth/auth.types';

export type UserRow = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: RoleName;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateUserPayload = {
  name: string;
  username: string;
  email?: string;
  password: string;
  roleName: RoleName;
};

export type UpdateUserPayload = {
  name?: string;
  email?: string | null;
  password?: string;
  roleName?: RoleName;
  isActive?: boolean;
};
