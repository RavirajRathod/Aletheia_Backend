import { UserStatus, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db";
import { GetUsersQuery } from "../types/admin.types";

/**
 * Synchronizes any existing User records into AdminUserListing if not yet present.
 */
export const syncExistingUsers = async () => {
  try {
    const usersWithoutListing = await prisma.user.findMany({
      where: {
        adminListing: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    for (const u of usersWithoutListing) {
      await prisma.adminUserListing.upsert({
        where: { email: u.email },
        create: {
          userId: u.id,
          email: u.email,
          name: u.name,
          username: u.username,
          status: u.status || "ACTIVE",
          lastLoginAt: u.lastLoginAt,
          registeredAt: u.createdAt,
        },
        update: {
          userId: u.id,
          name: u.name,
          username: u.username,
          status: u.status || "ACTIVE",
          lastLoginAt: u.lastLoginAt,
        },
      });
    }
  } catch (error) {
    console.error("Error syncing users to admin listing:", error);
  }
};

/**
 * Get all users from Admin listing table with optional filters and pagination
 */
export const getAllAdminUsers = async (query: GetUsersQuery) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.AdminUserListingWhereInput = {};

  if (query.status && query.status !== "ALL") {
    where.status = query.status as UserStatus;
  }

  if (query.search && query.search.trim() !== "") {
    const s = query.search.trim();
    where.OR = [
      { email: { contains: s, mode: "insensitive" } },
      { name: { contains: s, mode: "insensitive" } },
      { username: { contains: s, mode: "insensitive" } },
    ];
  }

  const [total, users] = await Promise.all([
    prisma.adminUserListing.count({ where }),
    prisma.adminUserListing.findMany({
      where,
      skip,
      take: limit,
      orderBy: { registeredAt: "desc" },
    }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
    users,
  };
};

/**
 * Get full user details for admin
 */
export const getAdminUserDetail = async (idOrUserIdOrEmail: string) => {
  // Find admin listing by id, userId, or email
  const listing = await prisma.adminUserListing.findFirst({
    where: {
      OR: [
        { id: idOrUserIdOrEmail },
        { userId: idOrUserIdOrEmail },
        { email: idOrUserIdOrEmail },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          avatar: true,
          coverImage: true,
          bio: true,
          contactNum: true,
          location: true,
          website: true,
          socialLinks: true,
          isPrivate: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!listing) {
    return null;
  }

  const user = listing.user;

  return {
    id: listing.id,
    userId: listing.userId,
    email: listing.email,
    name: listing.name || user?.name || null,
    username: listing.username || user?.username || null,
    status: listing.status,
    lastLoginAt: listing.lastLoginAt || user?.lastLoginAt || null,
    registeredAt: listing.registeredAt,
    deletedAt: listing.deletedAt,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    avatar: user?.avatar || null,
    coverImage: user?.coverImage || null,
    bio: user?.bio || null,
    contactNum: user?.contactNum || null,
    location: user?.location || null,
    website: user?.website || null,
    socialLinks: user?.socialLinks || null,
    isPrivate: user?.isPrivate ?? false,
    hasActiveAccount: !!user,
  };
};

/**
 * Modify user status in Admin table and sync with main User table
 */
export const updateUserStatus = async (idOrUserId: string, newStatus: UserStatus) => {
  // Find admin listing record
  const listing = await prisma.adminUserListing.findFirst({
    where: {
      OR: [{ id: idOrUserId }, { userId: idOrUserId }],
    },
  });

  if (!listing) {
    return null;
  }

  const isDeleting = newStatus === "DELETED";
  const isActivating = newStatus === "ACTIVE";

  // Update admin listing
  const updatedListing = await prisma.adminUserListing.update({
    where: { id: listing.id },
    data: {
      status: newStatus,
      deletedAt: isDeleting ? new Date() : isActivating ? null : listing.deletedAt,
    },
  });

  // If there is an associated main user, update it and invalidate tokens if blocked/deleted
  if (listing.userId) {
    await prisma.user.updateMany({
      where: { id: listing.userId },
      data: {
        status: newStatus,
        ...(newStatus === "BLOCKED" || newStatus === "DELETED"
          ? { accessToken: null, refreshToken: null }
          : {}),
      },
    });
  } else {
    // Also try matching by email just in case
    await prisma.user.updateMany({
      where: { email: listing.email },
      data: {
        status: newStatus,
        ...(newStatus === "BLOCKED" || newStatus === "DELETED"
          ? { accessToken: null, refreshToken: null }
          : {}),
      },
    });
  }

  return updatedListing;
};

/**
 * Get summary stats for the admin portal dashboard
 */
export const getAdminStats = async () => {
  const [total, active, blocked, deleted] = await Promise.all([
    prisma.adminUserListing.count(),
    prisma.adminUserListing.count({ where: { status: "ACTIVE" } }),
    prisma.adminUserListing.count({ where: { status: "BLOCKED" } }),
    prisma.adminUserListing.count({ where: { status: "DELETED" } }),
  ]);

  return {
    totalUsers: total,
    activeUsers: active,
    blockedUsers: blocked,
    deletedUsers: deleted,
  };
};

/**
 * Seed default SUPER_ADMIN and ADMIN roles and main admin user aletheius0@gmail.com
 */
export const seedDefaultAdminAndRoles = async () => {
  try {
    // 1. Ensure SUPER_ADMIN role exists
    const superAdminRole = await prisma.role.upsert({
      where: { name: "SUPER_ADMIN" },
      create: {
        name: "SUPER_ADMIN",
        description: "Super Administrator with full permissions across all resources",
      },
      update: {},
    });

    // 2. Ensure standard ADMIN role exists
    await prisma.role.upsert({
      where: { name: "ADMIN" },
      create: {
        name: "ADMIN",
        description: "Standard Administrator with user and content management permissions",
      },
      update: {},
    });

    // 3. Ensure main admin user aletheius0@gmail.com exists with password Password123!
    const mainAdminEmail = "aletheius0@gmail.com";
    const existingMainAdmin = await prisma.admin.findUnique({
      where: { email: mainAdminEmail },
    });

    const hashedPassword = await bcrypt.hash("Password123!", 10);

    if (!existingMainAdmin) {
      await prisma.admin.create({
        data: {
          email: mainAdminEmail,
          password: hashedPassword,
          name: "Main Super Admin",
          roleId: superAdminRole.id,
          isActive: true,
        },
      });
      console.log(`🛡️  Main Admin created: ${mainAdminEmail} (Role: SUPER_ADMIN)`);
    } else {
      // Ensure roleId is linked to SUPER_ADMIN
      await prisma.admin.update({
        where: { email: mainAdminEmail },
        data: {
          roleId: superAdminRole.id,
          isActive: true,
        },
      });
    }
  } catch (error) {
    console.error("Error seeding default admin and roles:", error);
  }
};

// ==========================================
// ROLE MANAGEMENT (CREATE, EDIT, DELETE, LIST)
// ==========================================

export const createRole = async (data: { name: string; description?: string }) => {
  const normalizedName = data.name.trim().toUpperCase();

  const existingRole = await prisma.role.findUnique({
    where: { name: normalizedName },
  });

  if (existingRole) {
    throw new Error("A role with this name already exists");
  }

  return await prisma.role.create({
    data: {
      name: normalizedName,
      description: data.description?.trim() || null,
    },
    include: {
      _count: {
        select: { admins: true },
      },
    },
  });
};

export const getAllRoles = async () => {
  return await prisma.role.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: {
        select: { admins: true },
      },
    },
  });
};

export const getRoleById = async (id: string) => {
  return await prisma.role.findUnique({
    where: { id },
    include: {
      _count: {
        select: { admins: true },
      },
      admins: {
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
      },
    },
  });
};

export const updateRole = async (
  id: string,
  data: { name?: string; description?: string }
) => {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) {
    throw new Error("Role not found");
  }

  // Prevent renaming protected system roles
  if (role.name === "SUPER_ADMIN" && data.name && data.name.trim().toUpperCase() !== "SUPER_ADMIN") {
    throw new Error("Cannot rename the system SUPER_ADMIN role");
  }

  let normalizedName = role.name;
  if (data.name) {
    normalizedName = data.name.trim().toUpperCase();
    if (normalizedName !== role.name) {
      const existing = await prisma.role.findUnique({
        where: { name: normalizedName },
      });
      if (existing) {
        throw new Error("A role with this name already exists");
      }
    }
  }

  return await prisma.role.update({
    where: { id },
    data: {
      name: normalizedName,
      ...(data.description !== undefined && {
        description: data.description?.trim() || null,
      }),
    },
    include: {
      _count: {
        select: { admins: true },
      },
    },
  });
};

export const deleteRole = async (id: string) => {
  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      _count: {
        select: { admins: true },
      },
    },
  });

  if (!role) {
    throw new Error("Role not found");
  }

  if (role.name === "SUPER_ADMIN" || role.name === "ADMIN") {
    throw new Error(`Cannot delete built-in system role: ${role.name}`);
  }

  if (role._count.admins > 0) {
    throw new Error(
      `Cannot delete role '${role.name}' because it is assigned to ${role._count.admins} admin(s). Reassign them first.`
    );
  }

  return await prisma.role.delete({
    where: { id },
  });
};

// ==========================================
// ADMIN USER MANAGEMENT (CREATE, EDIT, DELETE, LIST)
// ==========================================

export const createAdminUser = async (data: {
  email: string;
  password: string;
  roleId: string;
  name?: string;
}) => {
  const normalizedEmail = data.email.trim().toLowerCase();

  const existingAdmin = await prisma.admin.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingAdmin) {
    throw new Error("An administrator with this email already exists");
  }

  // Verify role exists
  const role = await prisma.role.findFirst({
    where: {
      OR: [{ id: data.roleId }, { name: data.roleId.toUpperCase() }],
    },
  });

  if (!role) {
    throw new Error("Selected role does not exist");
  }

  // Hash password at create time
  const hashedPassword = await bcrypt.hash(data.password, 10);

  const newAdmin = await prisma.admin.create({
    data: {
      email: normalizedEmail,
      password: hashedPassword,
      name: data.name?.trim() || null,
      roleId: role.id,
      isActive: true,
    },
    include: {
      role: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
  });

  const { password: _, ...safeAdmin } = newAdmin;
  return safeAdmin;
};

export const getAllAdmins = async () => {
  const admins = await prisma.admin.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      role: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
  });

  return admins.map(({ password: _, ...safeAdmin }) => safeAdmin);
};

export const getAdminById = async (id: string) => {
  const admin = await prisma.admin.findUnique({
    where: { id },
    include: {
      role: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
  });

  if (!admin) return null;

  const { password: _, ...safeAdmin } = admin;
  return safeAdmin;
};

export const updateAdminUser = async (
  id: string,
  data: {
    email?: string;
    password?: string;
    roleId?: string;
    name?: string;
    isActive?: boolean;
  }
) => {
  const admin = await prisma.admin.findUnique({ where: { id } });
  if (!admin) {
    throw new Error("Admin not found");
  }

  // If email is changing, ensure uniqueness
  if (data.email) {
    const normalizedEmail = data.email.trim().toLowerCase();
    if (normalizedEmail !== admin.email) {
      const existing = await prisma.admin.findUnique({
        where: { email: normalizedEmail },
      });
      if (existing) {
        throw new Error("An administrator with this email already exists");
      }
    }
  }

  // If role is changing, ensure existence
  let roleIdToSet = admin.roleId;
  if (data.roleId) {
    const role = await prisma.role.findFirst({
      where: {
        OR: [{ id: data.roleId }, { name: data.roleId.toUpperCase() }],
      },
    });
    if (!role) {
      throw new Error("Selected role does not exist");
    }
    roleIdToSet = role.id;
  }

  let hashedPassword = admin.password;
  if (data.password && data.password.trim() !== "") {
    hashedPassword = await bcrypt.hash(data.password, 10);
  }

  const updatedAdmin = await prisma.admin.update({
    where: { id },
    data: {
      ...(data.email && { email: data.email.trim().toLowerCase() }),
      password: hashedPassword,
      roleId: roleIdToSet,
      ...(data.name !== undefined && { name: data.name?.trim() || null }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
    include: {
      role: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
  });

  const { password: _, ...safeAdmin } = updatedAdmin;
  return safeAdmin;
};

export const deleteAdminUser = async (id: string) => {
  const admin = await prisma.admin.findUnique({ where: { id } });
  if (!admin) {
    throw new Error("Admin not found");
  }

  if (admin.email === "aletheius0@gmail.com") {
    throw new Error("Cannot delete main super admin account (aletheius0@gmail.com)");
  }

  await prisma.admin.delete({
    where: { id },
  });

  return { success: true, message: `Admin ${admin.email} deleted successfully` };
};

// ==========================================
// ADMIN AUTHENTICATION
// ==========================================

export const loginAdmin = async (data: { email: string; password: string }) => {
  const normalizedEmail = data.email.trim().toLowerCase();

  const admin = await prisma.admin.findUnique({
    where: { email: normalizedEmail },
    include: {
      role: true,
    },
  });

  if (!admin) {
    throw new Error("Invalid admin credentials");
  }

  if (!admin.isActive) {
    throw new Error("This admin account is disabled. Please contact the super administrator.");
  }

  const isPasswordValid = await bcrypt.compare(data.password, admin.password);
  if (!isPasswordValid) {
    throw new Error("Invalid admin credentials");
  }

  const now = new Date();
  await prisma.admin.update({
    where: { id: admin.id },
    data: { lastLoginAt: now },
  });

  const token = jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      role: admin.role.name,
      isAdmin: true,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: "2d" }
  );

  const { password: _, ...safeAdmin } = admin;

  return {
    token,
    admin: {
      ...safeAdmin,
      lastLoginAt: now,
    },
  };
};

