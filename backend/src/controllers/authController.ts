import { Response } from "express";
import { z } from "zod";

import {
  AuthenticatedRequest,
} from "../middleware/authMiddleware.js";

import { User } from "../models/User.js";

import {
  hashPassword,
  comparePassword,
} from "../utils/password.js";

import { generateToken } from "../utils/jwt.js";

/* =====================================================
   COMPANY EMAIL DOMAIN
===================================================== */

const ALLOWED_EMAIL_DOMAIN = "@dangote.com";

/* =====================================================
   VALIDATION SCHEMAS
===================================================== */

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),

  email: z.string().trim().email(),

  department: z
    .string()
    .trim()
    .max(100)
    .optional(),

  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().trim().email(),

  password: z.string().min(1),
});

const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Current password is required"),

    newPassword: z
      .string()
      .min(
        8,
        "New password must be at least 8 characters"
      )
      .max(
        128,
        "New password cannot exceed 128 characters"
      ),

    confirmPassword: z
      .string()
      .min(
        1,
        "Please confirm your new password"
      ),
  })
  .refine(
    (data) =>
      data.newPassword ===
      data.confirmPassword,
    {
      message:
        "New password and confirmation password do not match",
      path: ["confirmPassword"],
    }
  );

/* =====================================================
   COMPANY EMAIL VALIDATION
===================================================== */

function isDangoteEmail(
  email: string
): boolean {
  return email
    .trim()
    .toLowerCase()
    .endsWith(ALLOWED_EMAIL_DOMAIN);
}

/* =====================================================
   AUTH COOKIE
===================================================== */

function setAuthCookie(
  response: Response,
  token: string
) {
  response.cookie("access_token", token, {
    httpOnly: true,

    secure:
      process.env.NODE_ENV === "production",

    sameSite:
      process.env.NODE_ENV === "production"
        ? "none"
        : "lax",

    maxAge:
      7 * 24 * 60 * 60 * 1000,

    path: "/",
  });
}

/* =====================================================
   REGISTER
===================================================== */

export async function register(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    /* ---------- Validate request ---------- */

    const result =
      registerSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid registration data",
        errors: result.error.flatten(),
      });
    }

    const {
      name,
      email,
      department,
      password,
    } = result.data;

    /* ---------- Normalize email ---------- */

    const normalizedEmail =
      email.trim().toLowerCase();

    /* ---------- Check company email ---------- */

    if (
      !isDangoteEmail(
        normalizedEmail
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only @dangote.com email addresses are allowed.",
      });
    }

    /* ---------- Check existing email ---------- */

    const existingEmail =
      await User.findOne({
        email: normalizedEmail,
      });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message:
          "An account with this email already exists",
      });
    }

    /* ---------- Hash password ---------- */

    const passwordHash =
      await hashPassword(password);

    /* ---------- Create user ---------- */

    const user = await User.create({
      name,
      email: normalizedEmail,
      department,
      passwordHash,

      // Public signup can never create an admin.
      role: "EMPLOYEE",
    });

    /* ---------- Generate JWT ---------- */

    const token = generateToken(
      user._id.toString(),
      user.role
    );

    /* ---------- Store JWT ---------- */

    setAuthCookie(res, token);

    /* ---------- Response ---------- */

    return res.status(201).json({
      success: true,
      message:
        "Account created successfully",

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        department: user.department,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(
      "Registration error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Something went wrong",
    });
  }
}

/* =====================================================
   LOGIN
===================================================== */

export async function login(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    /* ---------- Validate request ---------- */

    const result =
      loginSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid login data",
      });
    }

    const {
      email,
      password,
    } = result.data;

    /* ---------- Normalize email ---------- */

    const normalizedEmail =
      email.trim().toLowerCase();

    /* ---------- Check company email ---------- */

    if (
      !isDangoteEmail(
        normalizedEmail
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Only @dangote.com email addresses are allowed.",
      });
    }

    /* ---------- Find user ---------- */

    const user =
      await User.findOne({
        email: normalizedEmail,
      }).select("+passwordHash");

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    /* ---------- Verify password ---------- */

    const passwordValid =
      await comparePassword(
        password,
        user.passwordHash
      );

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    /* ---------- Generate JWT ---------- */

    const token = generateToken(
      user._id.toString(),
      user.role
    );

    /* ---------- Store JWT ---------- */

    setAuthCookie(res, token);

    /* ---------- Response ---------- */

    return res.status(200).json({
      success: true,
      message: "Login successful",

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        department: user.department,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Something went wrong",
    });
  }
}

/* =====================================================
   GET CURRENT USER
===================================================== */

export async function me(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    /* ---------- Check authentication ---------- */

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    /* ---------- Find user ---------- */

    const user = await User.findById(
      req.user.userId
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }

    /* ---------- Response ---------- */

    return res.status(200).json({
      success: true,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        department: user.department,
        role: user.role,

        profileImage:
          user.profileImage,

        defaultLocation:
          user.defaultLocation,

        favoriteRoom:
          user.favoriteRoom,

        defaultDuration:
          user.defaultDuration,

        calendarView:
          user.calendarView,

        timezone:
          user.timezone,

        notifications:
          user.notifications,

        workingHours:
          user.workingHours,
      },
    });
  } catch (error) {
    console.error(
      "Get current user error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Something went wrong",
    });
  }
}

/* =====================================================
   CHANGE PASSWORD
===================================================== */

export async function changePassword(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    /* ---------- Check authentication ---------- */

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    /* ---------- Validate request ---------- */

    const result =
      changePasswordSchema.safeParse(
        req.body
      );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid password data",
        errors:
          result.error.flatten(),
      });
    }

    const {
      currentPassword,
      newPassword,
    } = result.data;

    /* ---------- Find user ---------- */

    const user =
      await User.findById(
        req.user.userId
      ).select("+passwordHash");

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }

    /* ---------- Verify current password ---------- */

    const currentPasswordValid =
      await comparePassword(
        currentPassword,
        user.passwordHash
      );

    if (!currentPasswordValid) {
      return res.status(400).json({
        success: false,
        message:
          "Current password is incorrect",
      });
    }

    /* ---------- Prevent password reuse ---------- */

    const samePassword =
      await comparePassword(
        newPassword,
        user.passwordHash
      );

    if (samePassword) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be different from your current password",
      });
    }

    /* ---------- Hash new password ---------- */

    const newPasswordHash =
      await hashPassword(
        newPassword
      );

    /* ---------- Save new password ---------- */

    user.passwordHash =
      newPasswordHash;

    await user.save();

    /* ---------- Clear authentication cookie ---------- */

    res.clearCookie(
      "access_token",
      {
        httpOnly: true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite:
          process.env.NODE_ENV ===
          "production"
            ? "none"
            : "lax",

        path: "/",
      }
    );

    /* ---------- Response ---------- */

    return res.status(200).json({
      success: true,
      message:
        "Password changed successfully. Please log in again.",
    });
  } catch (error) {
    console.error(
      "Change password error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Something went wrong",
    });
  }
}

/* =====================================================
   LOGOUT
===================================================== */

export function logout(
  _req: AuthenticatedRequest,
  res: Response
) {
  res.clearCookie(
    "access_token",
    {
      httpOnly: true,

      secure:
        process.env.NODE_ENV ===
        "production",

      sameSite:
        process.env.NODE_ENV ===
        "production"
          ? "none"
          : "lax",

      path: "/",
    }
  );

  return res.status(200).json({
    success: true,
    message:
      "Logged out successfully",
  });
}