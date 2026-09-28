import { Response } from "express";

import {
  AuthenticatedRequest,
} from "../middleware/authMiddleware.js";

import { Booking } from "../models/Booking.js";

/* =====================================================
   HELPERS
===================================================== */

function timeToMinutes(
  time: string
): number {
  const [hours, minutes] =
    time.split(":").map(Number);

  return (
    hours * 60 +
    minutes
  );
}

function isValidDate(
  date: string
): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      date
    )
  ) {
    return false;
  }

  const [
    year,
    month,
    day,
  ] = date.split("-").map(Number);

  const parsedDate = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );

  return (
    !Number.isNaN(
      parsedDate.getTime()
    ) &&
    parsedDate
      .toISOString()
      .slice(0, 10) === date
  );
}

function isValidTime(
  time: string
): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(
    time
  );
}

/* =====================================================
   GET ROOM AVAILABILITY
===================================================== */

/*
 * GET
 *
 * /api/bookings/availability
 *
 * Example:
 *
 * /api/bookings/availability
 *   ?date=2026-09-24
 *   &startTime=15:00
 *   &endTime=16:00
 *
 * Returns room IDs that are already booked
 * during the selected time range.
 *
 * Conflict rule:
 *
 * existing.startTime < selected.endTime
 *
 * AND
 *
 * existing.endTime > selected.startTime
 *
 * Example:
 *
 * Existing:
 * 15:00 - 17:00
 *
 * Selected:
 * 16:00 - 17:00
 *
 * -> CONFLICT
 *
 * Existing:
 * 15:00 - 16:00
 *
 * Selected:
 * 16:00 - 17:00
 *
 * -> AVAILABLE
 */

export async function getRoomAvailability(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    /* ---------------------------------------------
       AUTHENTICATION
    --------------------------------------------- */

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    /* ---------------------------------------------
       READ QUERY PARAMETERS
    --------------------------------------------- */

    const date =
      typeof req.query.date ===
      "string"
        ? req.query.date.trim()
        : "";

    const startTime =
      typeof req.query.startTime ===
      "string"
        ? req.query.startTime.trim()
        : "";

    const endTime =
      typeof req.query.endTime ===
      "string"
        ? req.query.endTime.trim()
        : "";

    /* ---------------------------------------------
       VALIDATE DATE
    --------------------------------------------- */

    if (!isValidDate(date)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid date. Use YYYY-MM-DD format.",
      });
    }

    /* ---------------------------------------------
       VALIDATE TIMES
    --------------------------------------------- */

    if (
      !isValidTime(startTime) ||
      !isValidTime(endTime)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid time. Use HH:mm format.",
      });
    }

    /* ---------------------------------------------
       VALIDATE TIME RANGE
    --------------------------------------------- */

    const startMinutes =
      timeToMinutes(startTime);

    const endMinutes =
      timeToMinutes(endTime);

    if (
      startMinutes >=
      endMinutes
    ) {
      return res.status(400).json({
        success: false,
        message:
          "End time must be later than start time.",
      });
    }

    /* ---------------------------------------------
       REQUIRE 15-MINUTE BOUNDARIES
    --------------------------------------------- */

    if (
      startMinutes % 15 !== 0 ||
      endMinutes % 15 !== 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Times must be in 15-minute intervals.",
      });
    }

    /* ---------------------------------------------
       FIND CONFLICTING BOOKINGS
    --------------------------------------------- */

    const conflictingBookings =
      await Booking.find({
        date,

        status: {
          $ne: "CANCELLED",
        },

        /*
         * Existing booking starts before
         * selected booking ends.
         */
        startTime: {
          $lt: endTime,
        },

        /*
         * Existing booking ends after
         * selected booking starts.
         */
        endTime: {
          $gt: startTime,
        },
      })
        .select(
          "room startTime endTime title"
        )
        .lean();

    /* ---------------------------------------------
       GET BOOKED ROOM IDS
    --------------------------------------------- */

    const bookedRoomIds =
      Array.from(
        new Set(
          conflictingBookings.map(
            (booking) =>
              booking.room.toString()
          )
        )
      );

    /* ---------------------------------------------
       RESPONSE
    --------------------------------------------- */

    return res.status(200).json({
      success: true,

      date,

      startTime,

      endTime,

      bookedRoomIds,

      bookedRooms:
        conflictingBookings.map(
          (booking) => ({
            roomId:
              booking.room.toString(),

            startTime:
              booking.startTime,

            endTime:
              booking.endTime,

            title:
              booking.title,
          })
        ),
    });
  } catch (error) {
    console.error(
      "Get room availability error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Something went wrong",
    });
  }
}