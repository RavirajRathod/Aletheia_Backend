import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { UpdateProfileRequest } from "../types/profile.types";

export const getProfileById = async (userId: string) => {
  return await prisma.user.findUnique({
    where: { id: userId },
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
      createdAt: true,
      updatedAt: true,
    },
  });
};

export const getProfileByUsername = async (username: string) => {
  return await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      username: true,
      avatar: true,
      coverImage: true,
      bio: true,
      location: true,
      website: true,
      socialLinks: true,
      isPrivate: true,
      createdAt: true,
    },
  });
};

export const checkUsernameTaken = async (username: string, excludeUserId?: string) => {
  const existingUser = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (!existingUser) return false;
  if (excludeUserId && existingUser.id === excludeUserId) return false;
  return true;
};

export const updateUserProfile = async (
  userId: string,
  data: UpdateProfileRequest
) => {
  return await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.username !== undefined && { username: data.username }),
      ...(data.avatar !== undefined && { avatar: data.avatar }),
      ...(data.coverImage !== undefined && { coverImage: data.coverImage }),
      ...(data.bio !== undefined && { bio: data.bio }),
      ...(data.contactNum !== undefined && { contactNum: data.contactNum }),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.website !== undefined && { website: data.website }),
      ...(data.socialLinks !== undefined && {
        socialLinks:
          data.socialLinks === null
            ? Prisma.JsonNull
            : (data.socialLinks as Prisma.InputJsonValue),
      }),
      ...(data.isPrivate !== undefined && { isPrivate: data.isPrivate }),
    },
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
      createdAt: true,
      updatedAt: true,
    },
  });
};

export const deleteUserAccount = async (userId: string) => {
  const now = new Date();

  // 1. Mark status as DELETED in main user table and revoke active sessions
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      status: "DELETED",
      accessToken: null,
      refreshToken: null,
    },
  });

  // 2. Automatically sync status to DELETED in the AdminUserListing table
  await prisma.adminUserListing.updateMany({
    where: {
      OR: [{ userId }, { email: user.email }],
    },
    data: {
      status: "DELETED",
      deletedAt: now,
    },
  });

  return user;
};

