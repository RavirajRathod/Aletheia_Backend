export interface UpdateProfileRequest {
  name?: string;
  username?: string;
  avatar?: string | null;
  coverImage?: string | null;
  bio?: string | null;
  contactNum?: string | null;
  location?: string | null;
  website?: string | null;
  socialLinks?: Record<string, string> | null;
  isPrivate?: boolean;
}

export interface UserProfileResponse {
  id: string;
  email: string;
  name: string;
  username: string;
  avatar?: string | null;
  coverImage?: string | null;
  bio?: string | null;
  contactNum?: string | null;
  location?: string | null;
  website?: string | null;
  socialLinks?: any;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileApiResponse {
  success: boolean;
  message?: string;
  data?: UserProfileResponse;
}
