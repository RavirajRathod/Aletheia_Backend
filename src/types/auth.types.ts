import { User } from "@prisma/client";

export interface SignupRequest {
  email: string;
  username: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenPayload {
  id: string;
  email: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: Partial<User & { accessToken?: string, refreshToken?: string }> | null;
  exists?: boolean;
}

export interface SendOtpRequest {
  email: string;
  type: "forgot-password" | "signup";
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
  type: "forgot-password" | "signup";
}

export interface ChangePasswordRequest {
  password?: string;
  newPassword?: string;
}
