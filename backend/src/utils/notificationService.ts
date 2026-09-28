import mongoose from "mongoose";

import { User } from "../models/User.js";
import {
  Notification,
  NotificationType,
} from "../models/Notification.js";

/* =====================================================
   TYPES
===================================================== */

interface CreateNotificationOptions {
  userId: string;

  type: NotificationType;

  title: string;

  message: string;

  bookingId?: string;
}

/* =====================================================
   CHECK USER NOTIFICATION PREFERENCE
===================================================== */

function isNotificationEnabled(
  type: NotificationType,
  user: {
    notifications?: {
      bookingConfirmation?: boolean;
      bookingCancellation?: boolean;
      bookingReminder?: boolean;
      roomAvailable?: boolean;
    };
  }
): boolean {
  switch (type) {
    case "BOOKING_CREATED":
      return (
        user.notifications
          ?.bookingConfirmation ?? true
      );

    case "BOOKING_CANCELLED":
      return (
        user.notifications
          ?.bookingCancellation ?? true
      );

    case "BOOKING_REMINDER":
      return (
        user.notifications
          ?.bookingReminder ?? true
      );

    case "ROOM_AVAILABLE":
      return (
        user.notifications
          ?.roomAvailable ?? false
      );

    default:
      return false;
  }
}

/* =====================================================
   CREATE NOTIFICATION
===================================================== */

export async function createNotificationIfEnabled(
  options: CreateNotificationOptions
) {
  try {
    if (
      !mongoose.Types.ObjectId.isValid(
        options.userId
      )
    ) {
      console.error(
        "Invalid notification user ID:",
        options.userId
      );

      return null;
    }

    const user =
      await User.findById(
        options.userId
      )
        .select("notifications")
        .lean();

    if (!user) {
      console.error(
        "Notification user not found:",
        options.userId
      );

      return null;
    }

    /* ---------------------------------------------
       Respect user's notification preference
    --------------------------------------------- */

    if (
      !isNotificationEnabled(
        options.type,
        user
      )
    ) {
      return null;
    }

    /* ---------------------------------------------
       Create notification
    --------------------------------------------- */

    const notification =
      await Notification.create({
        user: user._id,

        type: options.type,

        title: options.title,

        message: options.message,

        booking:
          options.bookingId ||
          undefined,

        isRead: false,
      });

    return notification;
  } catch (error) {
    console.error(
      "Create notification error:",
      error
    );

    return null;
  }
}