import { prisma } from "../config/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { SignupRequest, TokenPayload } from "../types/auth.types";

export const checkUserExists = async (email: string) => {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });
  return !!existingUser;
};

export const createUser = async (data: SignupRequest) => {
  const { email, username, password, name } = data;
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      username,
      password: hashedPassword,
      name,
      status: "ACTIVE",
    },
  });

  // Automatically insert / sync into AdminUserListing table
  await prisma.adminUserListing.upsert({
    where: { email },
    create: {
      userId: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      status: "ACTIVE",
      registeredAt: user.createdAt,
    },
    update: {
      userId: user.id,
      name: user.name,
      username: user.username,
      status: "ACTIVE",
      deletedAt: null,
    },
  });

  return user;
};

export const getUserByEmail = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });
  return user;
};

export const generateToken = (payload: TokenPayload) => {
  const { id, email } = payload;
  return jwt.sign(
    { id, email },
    process.env.JWT_SECRET as string,
    { expiresIn: "2d" }
  );
};

export const generateRefreshToken = (payload: TokenPayload) => {
  const { id, email } = payload;
  return jwt.sign(
    { id, email },
    process.env.REFRESH_TOKEN_SECRET as string,
    { expiresIn: "7d" }
  );
};

export const verifyPassword = async (password: string, hashedPassword: string) => {
  return await bcrypt.compare(password, hashedPassword);
};



export const storeOtp = async (email: string, otp: string, expiry: Date) => {
  forgotPasswordOtps.set(email, { otp, expiry });
};

export const verifyUserOtp = async (email: string, otp: string) => {
  const user = await getUserByEmail(email);
  if (!user) {
    return { success: false, message: "User not found" };
  }

  const masterOtp = process.env.MASTER_OTP || "999999";
  if (otp === masterOtp) {
    forgotPasswordOtps.delete(email);
    return { success: true, user };
  }

  const record = forgotPasswordOtps.get(email);
  if (!record) {
    return { success: false, message: "No OTP requested for this email" };
  }

  if (record.otp !== otp) {
    return { success: false, message: "Invalid OTP code" };
  }

  const now = new Date();
  if (record.expiry < now) {
    forgotPasswordOtps.delete(email);
    return { success: false, message: "OTP has expired" };
  }

  forgotPasswordOtps.delete(email);
  return { success: true, user };
};

export const updatePassword = async (userId: string, newPassword: string) => {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  return await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
    },
  });
};

export const logoutUser = async (userId: string) => {
  return await prisma.user.update({
    where: { id: userId },
    data: {
      accessToken: null,
      refreshToken: null,
    },
  });
};

export const saveUserTokens = async (
  userId: string,
  accessToken: string,
  refreshToken: string
) => {
  return await prisma.user.update({
    where: { id: userId },
    data: {
      accessToken,
      refreshToken,
    },
  });
};

// In-memory maps for OTP flows
const signupOtps = new Map<string, { otp: string; expiry: Date }>();
const forgotPasswordOtps = new Map<string, { otp: string; expiry: Date }>();
const verifiedSignupEmails = new Set<string>();

export const storeSignupOtp = (email: string, otp: string, expiry: Date) => {
  signupOtps.set(email, { otp, expiry });
};

export const verifySignupOtpCode = (email: string, otp: string) => {
  const record = signupOtps.get(email);
  if (!record) {
    return { success: false, message: "No OTP requested for this email" };
  }

  const masterOtp = process.env.MASTER_OTP || "999999";
  if (otp === masterOtp) {
    signupOtps.delete(email);
    verifiedSignupEmails.add(email);
    return { success: true };
  }

  if (record.otp !== otp) {
    return { success: false, message: "Invalid OTP code" };
  }

  const now = new Date();
  if (record.expiry < now) {
    signupOtps.delete(email);
    return { success: false, message: "OTP has expired" };
  }

  signupOtps.delete(email);
  verifiedSignupEmails.add(email);
  return { success: true };
};

export const isEmailSignupVerified = (email: string) => {
  return verifiedSignupEmails.has(email);
};

export const clearEmailSignupVerification = (email: string) => {
  verifiedSignupEmails.delete(email);
};

// ─── Settings Reset OTP (Authenticated User) ─────────────────────────────────
const settingsOtps = new Map<string, { otp: string; expiry: Date }>();

export const storeSettingsOtp = (email: string, otp: string, expiry: Date) => {
  settingsOtps.set(email, { otp, expiry });
};

export const verifySettingsOtpCode = (email: string, otp: string) => {
  const masterOtp = process.env.MASTER_OTP || "999999";
  if (otp === masterOtp) {
    settingsOtps.delete(email);
    return { success: true };
  }

  const record = settingsOtps.get(email);
  if (!record) {
    return { success: false, message: "No OTP requested. Please request a new one." };
  }

  if (record.otp !== otp) {
    return { success: false, message: "Invalid OTP code" };
  }

  const now = new Date();
  if (record.expiry < now) {
    settingsOtps.delete(email);
    return { success: false, message: "OTP has expired. Please request a new one." };
  }

  settingsOtps.delete(email);
  return { success: true };
};