import { Router } from "express";
import {
  getUsers,
  getUserDetails,
  updateStatus,
  deleteUser,
  getStats,
  handleCreateRole,
  handleGetAllRoles,
  handleGetRoleById,
  handleUpdateRole,
  handleDeleteRole,
  handleCreateAdmin,
  handleGetAllAdmins,
  handleGetAdminById,
  handleUpdateAdmin,
  handleDeleteAdmin,
  handleAdminLogin,
} from "../controllers/admin.controller";

const router = Router();

// ==========================================
// ADMIN AUTHENTICATION
// ==========================================
router.post("/auth/login", handleAdminLogin);

// ==========================================
// ROLE MANAGEMENT (CREATE, READ, UPDATE, DELETE)
// ==========================================
router.post("/roles", handleCreateRole);
router.get("/roles", handleGetAllRoles);
router.get("/roles/:id", handleGetRoleById);
router.patch("/roles/:id", handleUpdateRole);
router.put("/roles/:id", handleUpdateRole);
router.delete("/roles/:id", handleDeleteRole);

// ==========================================
// ADMIN USER MANAGEMENT (CREATE, READ, UPDATE, DELETE)
// ==========================================
router.post("/admins", handleCreateAdmin);
router.get("/admins", handleGetAllAdmins);
router.get("/admins/:id", handleGetAdminById);
router.patch("/admins/:id", handleUpdateAdmin);
router.put("/admins/:id", handleUpdateAdmin);
router.delete("/admins/:id", handleDeleteAdmin);

// ==========================================
// REGISTERED APP USERS (PORTAL LISTING & DETAILS)
// ==========================================
router.get("/stats", getStats);
router.get("/users", getUsers);
router.get("/users/:id", getUserDetails);
router.patch("/users/:id/status", updateStatus);
router.put("/users/:id/status", updateStatus);
router.patch("/users/:id", updateStatus);
router.put("/users/:id", updateStatus);
router.delete("/users/:id", deleteUser);

export default router;

