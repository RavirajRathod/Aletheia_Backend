import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db";
import {
  createUser,
  checkUserExists,
  generateToken,
  logoutUser,
  saveUserTokens,
  generateRefreshToken,
  storeOtp,
  verifyUserOtp,
  updatePassword,
  storeSignupOtp,
  verifySignupOtpCode,
  isEmailSignupVerified,
  clearEmailSignupVerification,
  storeSettingsOtp,
  verifySettingsOtpCode,
} from "../services/auth.service";
import { sendOtpEmail, sendSignupOtpEmail } from "../services/email.service";
import {
  AuthResponse,
  SignupRequest,
  SendOtpRequest,
  VerifyOtpRequest,
  ChangePasswordRequest,
} from "../types/auth.types";

export const checkEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const exists = await checkUserExists(email);

    return res.status(200).json({
      success: true,
      exists,
      message: exists ? "User already exist" : "User does not exist",
    } as AuthResponse);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    } as AuthResponse);
  }
};

export const signup = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as SignupRequest;

    if (!isEmailSignupVerified(email)) {
      return res.status(400).json({
        success: false,
        message: "Email not verified via OTP",
      } as AuthResponse);
    }

    const user = await createUser(req.body as SignupRequest);

    // Clear verification state
    clearEmailSignupVerification(email);

    const accessToken = generateToken({
      id: user.id,
      email: user.email,
    });

    const refreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
    });

    // Store tokens in database and retrieve updated user from database
    const updatedUser = await saveUserTokens(
      user.id,
      accessToken,
      refreshToken,
    );

    const { password, ...safeUser } = updatedUser;

    return res.status(201).json({
      success: true,
      message: "User created successfully!",
      user: safeUser,
    } as AuthResponse);
  } catch (error) {
    console.error("Signup Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    } as AuthResponse);
  }
};

export const sendOtp = async (req: Request, res: Response) => {
  try {
    const { email, type } = req.body as SendOtpRequest;

    if (type === "forgot-password") {
      const exists = await checkUserExists(email);
      if (!exists) {
        return res.status(404).json({
          success: false,
          message: "Email does not exist",
        } as AuthResponse);
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Set expiry to 5 minutes from now
      const expiry = new Date(Date.now() + 5 * 60 * 1000);

      await storeOtp(email, otp, expiry);

      // Send OTP via Email
      const emailSent = await sendOtpEmail(email, otp);
      if (!emailSent) {
        return res.status(500).json({
          success: false,
          message: "Failed to dispatch email. Please check server logs.",
        } as AuthResponse);
      }

      return res.status(200).json({
        success: true,
        message: "OTP sent successfully to email",
      } as AuthResponse);
    } else if (type === "signup") {
      const exists = await checkUserExists(email);
      if (exists) {
        return res.status(400).json({
          success: false,
          message: "User already exist",
        } as AuthResponse);
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Set expiry to 5 minutes from now
      const expiry = new Date(Date.now() + 5 * 60 * 1000);

      storeSignupOtp(email, otp, expiry);

      // Send OTP via Email
      const emailSent = await sendSignupOtpEmail(email, otp);
      if (!emailSent) {
        return res.status(500).json({
          success: false,
          message: "Failed to dispatch email. Please check server logs.",
        } as AuthResponse);
      }

      return res.status(200).json({
        success: true,
        message: "OTP sent successfully to email",
      } as AuthResponse);
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP type requested",
      } as AuthResponse);
    }
  } catch (error) {
    console.error("Send OTP Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    } as AuthResponse);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    // Track lastLoginAt in both User and AdminUserListing tables
    const now = new Date();
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: now },
    });
    await prisma.adminUserListing.updateMany({
      where: { OR: [{ userId: user.id }, { email: user.email }] },
      data: { lastLoginAt: now },
    });

    const accessToken = generateToken({
      id: user.id,
      email: user.email,
    });

    const refreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
    });

    // Store tokens in database and retrieve updated user from database
    const updatedUser = await saveUserTokens(
      user.id,
      accessToken,
      refreshToken,
    );

    const { password, ...safeUser } = updatedUser;

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: safeUser,
    } as AuthResponse);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Login failed",
    } as AuthResponse);
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    // 'refreshToken' presence is guaranteed by validateBody middleware
    const refreshTokenStr = req.body.refreshToken as string;

    const decoded = jwt.verify(
      refreshTokenStr,
      process.env.REFRESH_TOKEN_SECRET as string,
    ) as jwt.JwtPayload;

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user || user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        status: user?.status || "INACTIVE",
        message:
          user?.status === "BLOCKED"
            ? "Your account has been blocked by an administrator."
            : "Account is inactive or deleted.",
      });
    }

    const accessToken = generateToken({
      id: decoded.id,
      email: decoded.email,
    });

    return res.status(200).json({
      success: true,
      accessToken,
      message: "Token Refreshed",
    });
  } catch (error) {
    console.error("Refresh Token Error:", error);
    return res.status(500).json({
      success: false,
      message: "Invalid refresh token",
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access token is missing or invalid",
      });
    }

    const token = authHeader.split(" ")[1];
    const user = req.user!;

    if (user.accessToken !== token) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    await logoutUser(user.id);
    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout Error:", error);
    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp, type } = req.body as VerifyOtpRequest;

    if (type === "signup") {
      const result = verifySignupOtpCode(email, otp);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message || "Invalid or expired OTP",
        } as AuthResponse);
      }

      return res.status(200).json({
        success: true,
        message: "OTP verified successfully",
      } as AuthResponse);
    } else if (type === "forgot-password") {
      const verification = await verifyUserOtp(email, otp);
      if (!verification.success || !verification.user) {
        return res.status(400).json({
          success: false,
          message: verification.message || "Invalid or expired OTP",
        } as AuthResponse);
      }

      const user = verification.user;

      // Login user automatically after OTP verification
      const accessToken = generateToken({
        id: user.id,
        email: user.email,
      });

      const refreshToken = generateRefreshToken({
        id: user.id,
        email: user.email,
      });

      // Store tokens in database and retrieve updated user from database
      const updatedUser = await saveUserTokens(
        user.id,
        accessToken,
        refreshToken,
      );

      const { password, ...safeUser } = updatedUser;

      return res.status(200).json({
        success: true,
        message: "OTP verified successfully and logged in",
        user: safeUser,
      } as AuthResponse);
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid verification type",
      } as AuthResponse);
    }
  } catch (error) {
    console.error("Verify OTP Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    } as AuthResponse);
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    // At least one of 'password' or 'newPassword' is guaranteed by validateBody middleware
    const { password, newPassword } = req.body as ChangePasswordRequest;
    const passwordToSet = (password || newPassword) as string;

    const user = req.user!;
    await updatePassword(user.id, passwordToSet);

    return res.status(200).json({
      success: true,
      message:
        "Password updated successfully! You can now log in with your new credentials.",
    } as AuthResponse);
  } catch (error) {
    console.error("Change Password Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    } as AuthResponse);
  }
};

// ─── Settings Password Reset Flow ───────────────────────────────────────────

export const sendSettingsResetOtp = async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const email = user.email;

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    storeSettingsOtp(email, otp, expiry);

    // Send OTP via Email
    const { sendOtpEmail } = await import("../services/email.service");
    const emailSent = await sendOtpEmail(email, otp);
    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP email. Please try again.",
      } as AuthResponse);
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent to your registered email address",
    } as AuthResponse);
  } catch (error) {
    console.error("Settings Send OTP Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    } as AuthResponse);
  }
};

export const verifySettingsResetOtp = async (req: Request, res: Response) => {
  try {
    const { otp } = req.body;
    const user = req.user!;
    const email = user.email;

    const result = verifySettingsOtpCode(email, otp);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || "Invalid or expired OTP",
      } as AuthResponse);
    }

    return res.status(200).json({
      success: true,
      message: "OTP verified. You can now set a new password.",
    } as AuthResponse);
  } catch (error) {
    console.error("Settings Verify OTP Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    } as AuthResponse);
  }
};
