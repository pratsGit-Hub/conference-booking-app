import { Response } from "express";
import { z } from "zod";

import {
  AuthenticatedRequest,
} from "../middleware/authMiddleware.js";

import { User } from "../models/User.js";

/* =====================================================
   VALIDATION
===================================================== */

const updateUserRoleSchema = z.object({
  role: z.enum(["ADMIN", "EMPLOYEE"]),
});

/* =====================================================
   UPDATE MY PROFILE VALIDATION
===================================================== */

const updateMyProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long")
    .optional(),

  department: z
    .string()
    .trim()
    .max(100, "Department is too long")
    .optional(),

  defaultLocation: z
    .string()
    .trim()
    .max(200, "Location is too long")
    .optional(),

  defaultDuration: z
    .number()
    .int()
    .min(
      15,
      "Duration must be at least 15 minutes"
    )
    .max(
      480,
      "Duration cannot exceed 480 minutes"
    )
    .optional(),

  /*
   * IMPORTANT:
   * User.ts uses uppercase values.
   */

  calendarView: z
    .enum(["DAY", "WEEK", "MONTH"])
    .optional(),

  timezone: z
    .string()
    .trim()
    .max(100, "Timezone is too long")
    .optional(),

  notifications: z
    .object({
      bookingConfirmation:
        z.boolean().optional(),

      bookingCancellation:
        z.boolean().optional(),

      bookingReminder:
        z.boolean().optional(),

      roomAvailable:
        z.boolean().optional(),
    })
    .optional(),
});

/* =====================================================
   OBJECT ID VALIDATION
===================================================== */

function isValidObjectId(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    /^[a-fA-F0-9]{24}$/.test(value)
  );
}

/* =====================================================
   GET MY PROFILE
   AUTHENTICATED USER
===================================================== */

export async function getMyProfile(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    /* -------------------------------------------------
       Authentication check
    ------------------------------------------------- */

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    /* -------------------------------------------------
       Find current user
    ------------------------------------------------- */

    const user = await User.findById(
      req.user.userId
    )
      .select("-passwordHash")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    /* -------------------------------------------------
       Response
    ------------------------------------------------- */

    return res.status(200).json({
      success: true,

      user: {
        id: user._id,

        name: user.name,

        email: user.email,

        department:
          user.department,

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

        /*
         * Keep the complete Monday-Sunday
         * working-hours structure.
         */

        workingHours:
          user.workingHours,

        notifications: {
          bookingConfirmation:
            user.notifications
              ?.bookingConfirmation ?? true,

          bookingCancellation:
            user.notifications
              ?.bookingCancellation ?? true,

          bookingReminder:
            user.notifications
              ?.bookingReminder ?? true,

          roomAvailable:
            user.notifications
              ?.roomAvailable ?? false,
        },
      },
    });
  } catch (error) {
    console.error(
      "Get my profile error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
}

/* =====================================================
   UPDATE MY PROFILE
   AUTHENTICATED USER
===================================================== */

export async function updateMyProfile(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    /* -------------------------------------------------
       Authentication check
    ------------------------------------------------- */

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    /* -------------------------------------------------
       Validate request body
    ------------------------------------------------- */

    const result =
      updateMyProfileSchema.safeParse(
        req.body
      );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid profile data",
        errors: result.error.flatten(),
      });
    }

    const data = result.data;

    /* -------------------------------------------------
       Build update object
    ------------------------------------------------- */

    const update: Record<
      string,
      unknown
    > = {};

    /* ---------------- Name ---------------- */

    if (data.name !== undefined) {
      update.name = data.name;
    }

    /* ---------------- Department ---------------- */

    if (
      data.department !== undefined
    ) {
      update.department =
        data.department;
    }

    /* ---------------- Default Location ---------------- */

    if (
      data.defaultLocation !==
      undefined
    ) {
      update.defaultLocation =
        data.defaultLocation;
    }

    /* ---------------- Default Duration ---------------- */

    if (
      data.defaultDuration !==
      undefined
    ) {
      update.defaultDuration =
        data.defaultDuration;
    }

    /* ---------------- Calendar View ---------------- */

    if (
      data.calendarView !== undefined
    ) {
      update.calendarView =
        data.calendarView;
    }

    /* ---------------- Timezone ---------------- */

    if (
      data.timezone !== undefined
    ) {
      update.timezone =
        data.timezone;
    }

    /* =================================================
       NOTIFICATIONS
    ================================================= */

    if (
      data.notifications
        ?.bookingConfirmation !==
      undefined
    ) {
      update[
        "notifications.bookingConfirmation"
      ] =
        data.notifications
          .bookingConfirmation;
    }

    if (
      data.notifications
        ?.bookingCancellation !==
      undefined
    ) {
      update[
        "notifications.bookingCancellation"
      ] =
        data.notifications
          .bookingCancellation;
    }

    if (
      data.notifications
        ?.bookingReminder !==
      undefined
    ) {
      update[
        "notifications.bookingReminder"
      ] =
        data.notifications
          .bookingReminder;
    }

    if (
      data.notifications
        ?.roomAvailable !==
      undefined
    ) {
      update[
        "notifications.roomAvailable"
      ] =
        data.notifications
          .roomAvailable;
    }

    /* -------------------------------------------------
       Update database
    ------------------------------------------------- */

    const user =
      await User.findByIdAndUpdate(
        req.user.userId,
        {
          $set: update,
        },
        {
          new: true,
          runValidators: true,
        }
      )
        .select("-passwordHash")
        .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    /* -------------------------------------------------
       Response
    ------------------------------------------------- */

    return res.status(200).json({
      success: true,

      message:
        "Profile updated successfully",

      user: {
        id: user._id,

        name: user.name,

        email: user.email,

        department:
          user.department,

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

        /*
         * Return the complete working-hours
         * structure from MongoDB.
         */

        workingHours:
          user.workingHours,

        notifications: {
          bookingConfirmation:
            user.notifications
              ?.bookingConfirmation ?? true,

          bookingCancellation:
            user.notifications
              ?.bookingCancellation ?? true,

          bookingReminder:
            user.notifications
              ?.bookingReminder ?? true,

          roomAvailable:
            user.notifications
              ?.roomAvailable ?? false,
        },
      },
    });
  } catch (error) {
    console.error(
      "Update my profile error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
}

/* =====================================================
   GET ALL USERS
   ADMIN ONLY
===================================================== */

export async function getAllUsers(
  _req: AuthenticatedRequest,
  res: Response
) {
  try {
    const users = await User.find({})
      .select(
        "_id name email department role profileImage defaultLocation favoriteRoom defaultDuration calendarView timezone notifications workingHours createdAt updatedAt"
      )
      .sort({
        createdAt: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error(
      "Get all users error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
}

/* =====================================================
   UPDATE USER ROLE
   ADMIN ONLY
===================================================== */

export async function updateUserRole(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    /* -------------------------------------------------
       Authentication check
    ------------------------------------------------- */

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    /* -------------------------------------------------
       Validate user ID
    ------------------------------------------------- */

    const id: unknown =
      req.params.id;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    /* -------------------------------------------------
       Validate request body
    ------------------------------------------------- */

    const result =
      updateUserRoleSchema.safeParse(
        req.body
      );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message:
          "Role must be ADMIN or EMPLOYEE",
      });
    }

    const { role } = result.data;

    /* -------------------------------------------------
       Find target user
    ------------------------------------------------- */

    const targetUser =
      await User.findById(id);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    /* -------------------------------------------------
       Prevent unnecessary role update
    ------------------------------------------------- */

    if (
      targetUser.role === role
    ) {
      return res.status(400).json({
        success: false,
        message:
          `User is already ${role}`,
      });
    }

    /* -------------------------------------------------
       Prevent admin from removing own access
    ------------------------------------------------- */

    if (
      req.user.userId ===
        targetUser._id.toString() &&
      role === "EMPLOYEE"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot remove your own admin access",
      });
    }

    /* -------------------------------------------------
       Prevent removing the last administrator
    ------------------------------------------------- */

    if (
      targetUser.role === "ADMIN" &&
      role === "EMPLOYEE"
    ) {
      const adminCount =
        await User.countDocuments({
          role: "ADMIN",
        });

      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message:
            "At least one administrator must remain",
        });
      }
    }

    /* -------------------------------------------------
       Update role
    ------------------------------------------------- */

    targetUser.role = role;

    await targetUser.save();

    /* -------------------------------------------------
       Response
    ------------------------------------------------- */

    return res.status(200).json({
      success: true,

      message:
        role === "ADMIN"
          ? "User promoted to administrator"
          : "Administrator role removed",

      user: {
        id: targetUser._id,

        name: targetUser.name,

        email: targetUser.email,

        department:
          targetUser.department,

        role: targetUser.role,
      },
    });
  } catch (error) {
    console.error(
      "Update user role error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
}

/* =====================================================
   UPDATE USER EMAIL
   ADMIN ONLY
===================================================== */

export async function updateUserEmail(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    /* -------------------------------------------------
       Authentication check
    ------------------------------------------------- */

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    /* -------------------------------------------------
       Validate user ID
    ------------------------------------------------- */

    const id: unknown =
      req.params.id;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    /* -------------------------------------------------
       Validate email
    ------------------------------------------------- */

    const email =
      typeof req.body?.email === "string"
        ? req.body.email
            .trim()
            .toLowerCase()
        : "";

    if (!email) {
      return res.status(400).json({
        success: false,
        message:
          "Email address is required",
      });
    }

    /* -------------------------------------------------
       Basic email validation
    ------------------------------------------------- */

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a valid email address",
      });
    }

    /* -------------------------------------------------
       Company email validation
    ------------------------------------------------- */

    if (
      !email.endsWith("@dangote.com")
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only @dangote.com email addresses are allowed",
      });
    }

    /* -------------------------------------------------
       Find target user
    ------------------------------------------------- */

    const targetUser =
      await User.findById(id);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    /* -------------------------------------------------
       Prevent unnecessary update
    ------------------------------------------------- */

    if (
      targetUser.email.toLowerCase() ===
      email
    ) {
      return res.status(400).json({
        success: false,
        message:
          "The new email is the same as the current email",
      });
    }

    /* -------------------------------------------------
       Check duplicate email
    ------------------------------------------------- */

    const existingUser =
      await User.findOne({
        email,
        _id: {
          $ne: id,
        },
      });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "This email address is already registered",
      });
    }

    /* -------------------------------------------------
       Update email
    ------------------------------------------------- */

    targetUser.email = email;

    await targetUser.save();

    /* -------------------------------------------------
       Response
    ------------------------------------------------- */

    return res.status(200).json({
      success: true,

      message:
        "User email updated successfully",

      user: {
        id: targetUser._id,

        name: targetUser.name,

        email: targetUser.email,

        department:
          targetUser.department,

        role: targetUser.role,
      },
    });
  } catch (error) {
    console.error(
      "Update user email error:",
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
   DELETE USER
   ADMIN ONLY
===================================================== */

export async function deleteUser(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    /* -------------------------------------------------
       Authentication check
    ------------------------------------------------- */

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    /* -------------------------------------------------
       Validate user ID
    ------------------------------------------------- */

    const id: unknown =
      req.params.id;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    /* -------------------------------------------------
       Find target user
    ------------------------------------------------- */

    const targetUser =
      await User.findById(id);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    /* -------------------------------------------------
       Prevent admin from deleting themselves
    ------------------------------------------------- */

    if (
      req.user.userId ===
      targetUser._id.toString()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot delete your own account",
      });
    }

    /* -------------------------------------------------
       Prevent deletion of the last administrator
    ------------------------------------------------- */

    if (
      targetUser.role === "ADMIN"
    ) {
      const adminCount =
        await User.countDocuments({
          role: "ADMIN",
        });

      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message:
            "At least one administrator must remain",
        });
      }
    }

    /* -------------------------------------------------
       Delete user
    ------------------------------------------------- */

    await User.findByIdAndDelete(id);

    /* -------------------------------------------------
       Response
    ------------------------------------------------- */

    return res.status(200).json({
      success: true,

      message:
        `${targetUser.name} was deleted successfully`,
    });
  } catch (error) {
    console.error(
      "Delete user error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
}