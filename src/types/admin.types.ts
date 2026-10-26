import { UserStatus } from "@prisma/client";

export interface AdminUserListItem {
  id: string;
  userId: string | null;
  email: string;
  name: string | null;
  username: string | null;
  status: UserStatus;
  lastLoginAt: Date | null;
  registeredAt: Date;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminUserDetailResponse {
  id: string;
  userId: string | null;
  email: string;
  name: string | null;
  username: string | null;
  status: UserStatus;
  lastLoginAt: Date | null;
  registeredAt: Date;
  deletedAt: Date | null;
  avatar?: string | null;
  coverImage?: string | null;
  bio?: string | null;
  contactNum?: string | null;
  location?: string | null;
  website?: string | null;
  socialLinks?: unknown;
  isPrivate?: boolean;
}

export interface GetUsersQuery {
  page?: number;
  limit?: number;
  status?: UserStatus | "ALL";
  search?: string;
}

export interface UpdateUserStatusRequest {
  status: UserStatus;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
}

export interface CreateAdminRequest {
  email: string;
  password: string;
  roleId: string;
  name?: string;
}

export interface UpdateAdminRequest {
  email?: string;
  password?: string;
  roleId?: string;
  name?: string;
  isActive?: boolean;
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

