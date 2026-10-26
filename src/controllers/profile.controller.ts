import { Request, Response } from "express";
import {
  getProfileById,
  getProfileByUsername as fetchProfileByUsername,
  checkUsernameTaken,
  updateUserProfile,
  deleteUserAccount,
} from "../services/profile.service";
import { UpdateProfileRequest } from "../types/profile.types";

/**
 * GET /api/profile/me
 * Retrieves current authenticated user's profile
 */
export const getMyProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const profile = await getProfileById(userId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error("Get My Profile Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching profile",
    });
  }
};

/**
 * GET /api/profile/:username
 * Retrieves public profile by username
 */
export const getPublicProfile = async (req: Request, res: Response) => {
  try {
    const username = req.params.username as string;

    const profile = await fetchProfileByUsername(username);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error("Get Public Profile Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching public profile",
    });
  }
};

/**
 * PUT /api/profile/me
 * Updates authenticated user's profile
 */
export const updateMyProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const data = req.body as UpdateProfileRequest;

    // If username is changing, ensure it is unique
    if (data.username) {
      const isTaken = await checkUsernameTaken(data.username, userId);
      if (isTaken) {
        return res.status(400).json({
          success: false,
          message: "Username is already taken",
        });
      }
    }

    const updatedProfile = await updateUserProfile(userId, data);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedProfile,
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating profile",
    });
  }
};

/**
 * DELETE /api/profile/account
 * Deletes current authenticated user's account and updates admin listing status to DELETED
 */
export const deleteMyAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    await deleteUserAccount(userId);

    return res.status(200).json({
      success: true,
      message: "Your account has been deleted successfully",
    });
  } catch (error) {
    console.error("Delete Account Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while deleting account",
    });
  }
};

