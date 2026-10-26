import { Request, Response, NextFunction } from "express";

interface ValidateBodyOptions {
  /**
   * Fields that MUST be present and non-empty in the request body.
   * Wrap in an inner array for "at least one of" semantics.
   *
   * Example:
   *  required: ["email", "password"]          → both must be present
   *  required: [["password", "newPassword"]]   → at least one must be present
   */
  required?: (string | string[])[];

  /**
   * The complete list of field names permitted in the request body.
   * Any key not in this list is rejected with a 400 error.
   */
  allowed: string[];
}

/**
 * Middleware factory that validates the shape of a request body.
 *
 * - Returns 400 if any field not in `allowed` is present.
 * - Returns 400 if any `required` field (or required group) is missing.
 */
export const validateBody = (options: ValidateBodyOptions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const body = req.body ?? {};
    const { required = [], allowed } = options;

    // ── 1. Check for disallowed parameters ─────────────────────────────────
    const incomingKeys = Object.keys(body);
    const disallowed = incomingKeys.filter((key) => !allowed.includes(key));

    if (disallowed.length > 0) {
      const label =
        disallowed.length === 1
          ? `'${disallowed[0]}' is not allowed`
          : `The following parameters are not allowed: ${disallowed.map((k) => `'${k}'`).join(", ")}`;

      return res.status(400).json({ success: false, message: label });
    }

    // ── 2. Check for required parameters ───────────────────────────────────
    for (const rule of required) {
      if (Array.isArray(rule)) {
        // "At least one of these" group
        const hasAtLeastOne = rule.some(
          (key) => body[key] !== undefined && body[key] !== null && body[key] !== ""
        );

        if (!hasAtLeastOne) {
          const label = rule.map((k) => `'${k}'`).join(" or ");
          return res.status(400).json({ success: false, message: `${label} is required` });
        }
      } else {
        // Single required field
        if (body[rule] === undefined || body[rule] === null || body[rule] === "") {
          return res.status(400).json({ success: false, message: `'${rule}' is required` });
        }
      }
    }

    next();
  };
};

// ── Pre-configured validators for each auth route ─────────────────────────

export const validateCheckEmail = validateBody({
  required: ["email"],
  allowed: ["email"],
});

export const validateSignup = validateBody({
  required: ["email", "username", "password", "name"],
  allowed: ["email", "username", "password", "name"],
});

export const validateLoginBody = validateBody({
  required: ["email", "password"],
  allowed: ["email", "password"],
});

export const validateRefreshToken = validateBody({
  required: ["refreshToken"],
  allowed: ["refreshToken"],
});

export const validateSendOtp = validateBody({
  required: ["email", "type"],
  allowed: ["email", "type"],
});

export const validateForgotPassword = validateBody({
  required: ["email"],
  allowed: ["email"],
});

export const validateVerifyOtp = validateBody({
  required: ["email", "otp", "type"],
  allowed: ["email", "otp", "type"],
});

export const validateChangePassword = validateBody({
  // Accept either 'password' or 'newPassword' — at least one is required
  required: [["password", "newPassword"]],
  allowed: ["password", "newPassword"],
});

export const validateUpdateProfile = validateBody({
  required: [],
  allowed: [
    "name",
    "username",
    "avatar",
    "coverImage",
    "bio",
    "contactNum",
    "location",
    "website",
    "socialLinks",
    "isPrivate",
  ],
});

