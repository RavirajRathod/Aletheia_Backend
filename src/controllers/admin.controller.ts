import { Request, Response } from "express";
import { UserStatus } from "@prisma/client";
import {
  getAllAdminUsers,
  getAdminUserDetail,
  updateUserStatus,
  getAdminStats,
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole,
  createAdminUser,
  getAllAdmins,
  getAdminById,
  updateAdminUser,
  deleteAdminUser,
  loginAdmin,
} from "../services/admin.service";
import { GetUsersQuery } from "../types/admin.types";

/**
 * GET /api/admin/users
 * List all registered users with their status, email, and details
 */
export const getUsers = async (req: Request, res: Response) => {
  try {
    const query: GetUsersQuery = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      status: req.query.status as UserStatus | "ALL",
      search: req.query.search as string,
    };

    const result = await getAllAdminUsers(query);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Admin Get Users Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch registered users list",
    });
  }
};

/**
 * GET /api/admin/users/:id
 * Get full user details (email, status, when last login, when account created, etc.)
 */
export const getUserDetails = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const user = await getAdminUserDetail(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Admin Get User Details Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user details",
    });
  }
};

/**
 * PATCH /api/admin/users/:id/status
 * or PUT /api/admin/users/:id/status
 * Modify user status (ACTIVE, BLOCKED, DELETED)
 */
export const updateStatus = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    const validStatuses: UserStatus[] = ["ACTIVE", "BLOCKED", "DELETED"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Allowed statuses are: ACTIVE, BLOCKED, DELETED",
      });
    }

    const updated = await updateUserStatus(id, status as UserStatus);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "User not found in admin listings",
      });
    }

    return res.status(200).json({
      success: true,
      message: `User status successfully updated to ${status}`,
      data: updated,
    });
  } catch (error) {
    console.error("Admin Update User Status Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update user status",
    });
  }
};

/**
 * DELETE /api/admin/users/:id
 * Delete user from admin portal (sets status to DELETED and revokes sessions)
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const updated = await updateUserStatus(id, "DELETED");

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "User not found in admin listings",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User has been marked as DELETED and session revoked",
      data: updated,
    });
  } catch (error) {
    console.error("Admin Delete User Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete user",
    });
  }
};

/**
 * GET /api/admin/stats
 * Overview stats for users
 */
export const getStats = async (_req: Request, res: Response) => {
  try {
    const stats = await getAdminStats();
    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Admin Get Stats Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch stats",
    });
  }
};

// ==========================================
// ROLE CONTROLLERS (CREATE, GET, UPDATE, DELETE)
// ==========================================

export const handleCreateRole = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Role name is required",
      });
    }

    const role = await createRole({ name, description });
    return res.status(201).json({
      success: true,
      message: "Role created successfully",
      data: role,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create role",
    });
  }
};

export const handleGetAllRoles = async (_req: Request, res: Response) => {
  try {
    const roles = await getAllRoles();
    return res.status(200).json({
      success: true,
      data: roles,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch roles",
    });
  }
};

export const handleGetRoleById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const role = await getRoleById(id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: role,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch role",
    });
  }
};

export const handleUpdateRole = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, description } = req.body;

    const updated = await updateRole(id, { name, description });
    return res.status(200).json({
      success: true,
      message: "Role updated successfully",
      data: updated,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update role",
    });
  }
};

export const handleDeleteRole = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await deleteRole(id);
    return res.status(200).json({
      success: true,
      message: "Role deleted successfully",
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to delete role",
    });
  }
};

// ==========================================
// ADMIN USER CONTROLLERS (CREATE, GET, UPDATE, DELETE)
// ==========================================

export const handleCreateAdmin = async (req: Request, res: Response) => {
  try {
    const { email, password, roleId, name } = req.body;

    if (!email || !password || !roleId) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and role selection are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const admin = await createAdminUser({ email, password, roleId, name });
    return res.status(201).json({
      success: true,
      message: "Admin created successfully",
      data: admin,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create admin",
    });
  }
};

export const handleGetAllAdmins = async (_req: Request, res: Response) => {
  try {
    const admins = await getAllAdmins();
    return res.status(200).json({
      success: true,
      data: admins,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch admins",
    });
  }
};

export const handleGetAdminById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const admin = await getAdminById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: admin,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch admin",
    });
  }
};

export const handleUpdateAdmin = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { email, password, roleId, name, isActive } = req.body;

    const updated = await updateAdminUser(id, {
      email,
      password,
      roleId,
      name,
      isActive,
    });

    return res.status(200).json({
      success: true,
      message: "Admin updated successfully",
      data: updated,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update admin",
    });
  }
};

export const handleDeleteAdmin = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const result = await deleteAdminUser(id);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to delete admin",
    });
  }
};

// ==========================================
// ADMIN LOGIN
// ==========================================

export const handleAdminLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const result = await loginAdmin({ email, password });
    return res.status(200).json({
      success: true,
      message: "Admin login successful",
      ...result,
    });
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      message: error.message || "Admin login failed",
    });
  }
};

