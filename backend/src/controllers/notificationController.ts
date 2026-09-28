import { Response } from "express";

import {
  AuthenticatedRequest,
} from "../middleware/authMiddleware.js";

import { Notification } from "../models/Notification.js";

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
   GET MY NOTIFICATIONS
===================================================== */

export async function getMyNotifications(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    const notifications =
      await Notification.find({
        user: req.user.userId,
      })
        .populate(
          "booking",
          "title date startTime endTime status"
        )
        .sort({
          createdAt: -1,
        })
        .limit(50)
        .lean();

    const unreadCount =
      await Notification.countDocuments({
        user: req.user.userId,
        isRead: false,
      });

    return res.status(200).json({
      success: true,

      notifications,

      unreadCount,
    });
  } catch (error) {
    console.error(
      "Get notifications error:",
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
   MARK ONE NOTIFICATION AS READ
===================================================== */

export async function markNotificationRead(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    const id: unknown =
      req.params.id;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid notification ID",
      });
    }

    const notification =
      await Notification.findOneAndUpdate(
        {
          _id: id,
          user: req.user.userId,
        },
        {
          $set: {
            isRead: true,
          },
        },
        {
          new: true,
        }
      ).lean();

    if (!notification) {
      return res.status(404).json({
        success: false,
        message:
          "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.error(
      "Mark notification read error:",
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
   MARK ALL NOTIFICATIONS AS READ
===================================================== */

export async function markAllNotificationsRead(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    await Notification.updateMany(
      {
        user: req.user.userId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "All notifications marked as read",
    });
  } catch (error) {
    console.error(
      "Mark all notifications read error:",
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
   DELETE NOTIFICATION
===================================================== */

export async function deleteNotification(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    const id: unknown =
      req.params.id;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid notification ID",
      });
    }

    const notification =
      await Notification.findOneAndDelete({
        _id: id,
        user: req.user.userId,
      });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message:
          "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Notification deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete notification error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Something went wrong",
    });
  }
}