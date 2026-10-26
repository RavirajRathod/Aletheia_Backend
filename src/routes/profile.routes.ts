import { Router } from "express";
import {
  getMyProfile,
  getPublicProfile,
  updateMyProfile,
  deleteMyAccount,
} from "../controllers/profile.controller";
import { authenticateJWT } from "../middlewares/auth.middleware";
import { validateUpdateProfile } from "../middlewares/validate.middleware";

const router = Router();

// Current authenticated user's profile
router.get("/me", authenticateJWT, getMyProfile);
router.put("/me", authenticateJWT, validateUpdateProfile, updateMyProfile);
router.delete("/account", authenticateJWT, deleteMyAccount);

// Public profile by username
router.get("/:username", getPublicProfile);

export default router;
