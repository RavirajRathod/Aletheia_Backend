import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db";
import { checkUserExists, getUserByEmail, verifyPassword } from "../services/auth.service";
import { AuthResponse, LoginRequest } from "../types/auth.types";

export const checkExistingUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;
    const exists = await checkUserExists(email);

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "User already exist",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Middleware error",
    } as AuthResponse);
  }
};

export const validateLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body as LoginRequest;

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.status === "BLOCKED") {
      return res.status(403).json({
        success: false,
        status: "BLOCKED",
        message: "Your account has been blocked by an administrator. Please contact support.",
      });
    }

    if (user.status === "DELETED") {
      return res.status(403).json({
        success: false,
        status: "DELETED",
        message: "This account has been deleted.",
      });
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid password",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Middleware error",
    } as AuthResponse);
  }
};

export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access token is missing or invalid",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload;

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.status === "BLOCKED") {
      return res.status(403).json({
        success: false,
        status: "BLOCKED",
        message: "Your account has been blocked by an administrator.",
      });
    }

    if (user.status === "DELETED") {
      return res.status(403).json({
        success: false,
        status: "DELETED",
        message: "This account has been deleted.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("JWT Authentication Error:", error);
    return res.status(401).json({
      success: false,
      message: "Unauthorized or expired token",
    });
  }
};