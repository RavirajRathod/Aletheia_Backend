import { Router } from "express";
import {
  checkEmail,
  signup,
  login,
  refreshToken,
  logout,
  verifyOtp,
  changePassword,
  sendOtp,
  sendSettingsResetOtp,
  verifySettingsResetOtp,
} from "../controllers/auth.controller";
import {
  checkExistingUser,
  validateLogin,
  authenticateJWT,
} from "../middlewares/auth.middleware";
import {
  validateBody,
  validateCheckEmail,
  validateSignup,
  validateLoginBody,
  validateRefreshToken,
  validateVerifyOtp,
  validateChangePassword,
  validateSendOtp,
} from "../middlewares/validate.middleware";

const router = Router();

router.post("/check-email", validateCheckEmail, checkEmail);
router.post("/send-otp", validateSendOtp, sendOtp);
router.post("/verify-otp", validateVerifyOtp, verifyOtp);
router.post("/signup", validateSignup, checkExistingUser, signup);
router.post("/login", validateLoginBody, validateLogin, login);
router.post("/refresh-token", validateRefreshToken, refreshToken);
router.post("/logout", authenticateJWT, logout);

// Password Reset & Verification Flows
router.post(
  "/change-password",
  validateChangePassword,
  authenticateJWT,
  changePassword,
);

// Settings-based password reset (authenticated user)
router.post("/settings/send-reset-otp", authenticateJWT, sendSettingsResetOtp);
router.post(
  "/settings/verify-reset-otp",
  validateBody({ required: ["otp"], allowed: ["otp"] }),
  authenticateJWT,
  verifySettingsResetOtp,
);

export default router;
