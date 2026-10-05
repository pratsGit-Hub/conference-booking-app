import { Response } from "express";
import { z } from "zod";

import {
  AuthenticatedRequest,
} from "../middleware/authMiddleware.js";

import { Booking } from "../models/Booking.js";
import { Room } from "../models/Room.js";

import {
  createNotificationIfEnabled,
} from "../utils/notificationService.js";

import {
  sendBookingCreatedEmails,
  sendBookingCancelledEmails,
  sendBookingUpdatedEmails,
} from "../utils/emailService.js";

/* =====================================================
   HELPERS
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
   APP TIMEZONE
===================================================== */

const APP_TIMEZONE =
  process.env.APP_TIMEZONE ||
  "Asia/Kolkata";

function getCurrentDateAndTime() {
  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: APP_TIMEZONE,

        year: "numeric",
        month: "2-digit",
        day: "2-digit",

        hour: "2-digit",
        minute: "2-digit",

        hourCycle: "h23",
      }
    );

  const parts =
    formatter.formatToParts(
      new Date()
    );

  const values: Record<
    string,
    string
  > = {};

  for (const part of parts) {
    if (
      part.type !== "literal"
    ) {
      values[part.type] =
        part.value;
    }
  }

  return {
    date:
      `${values.year}-${values.month}-${values.day}`,

    time:
      `${values.hour}:${values.minute}`,
  };
}

/* =====================================================
   BOOKING STATUS HELPERS
===================================================== */

/**
 * Automatically marks finished UPCOMING bookings
 * as COMPLETED.
 *
 * A booking is completed when:
 *
 * 1. Its date is before today
 *
 * OR
 *
 * 2. Its date is today and its end time
 *    has already passed.
 *
 * CANCELLED bookings are never changed.
 *
 * This uses APP_TIMEZONE so local development
 * and Render use the same timezone.
 */
async function syncCompletedBookings(
  filter: Record<string, unknown> = {}
): Promise<void> {
  const {
    date: today,
    time: currentTime,
  } = getCurrentDateAndTime();

  await Booking.updateMany(
    {
      ...filter,

      status: "UPCOMING",

      $or: [
        {
          date: {
            $lt: today,
          },
        },

        {
          date: today,

          endTime: {
            $lte: currentTime,
          },
        },
      ],
    },

    {
      $set: {
        status: "COMPLETED",
      },
    }
  );
}

/* =====================================================
   TIME HELPERS
===================================================== */

const SLOT_MINUTES = 15;

/**
 * Convert HH:mm to minutes.
 */
function timeToMinutes(
  time: string
): number {
  const [hours, minutes] =
    time
      .split(":")
      .map(Number);

  return (
    hours * 60 +
    minutes
  );
}

/**
 * Convert minutes to HH:mm.
 */
function minutesToTime(
  totalMinutes: number
): string {
  const hours =
    Math.floor(
      totalMinutes / 60
    );

  const minutes =
    totalMinutes % 60;

  return `${String(hours).padStart(
    2,
    "0"
  )}:${String(minutes).padStart(
    2,
    "0"
  )}`;
}

/**
 * Generate occupied 15-minute slots.
 */
function generateOccupiedSlots(
  startTime: string,
  endTime: string
): string[] {
  const startMinutes =
    timeToMinutes(
      startTime
    );

  const endMinutes =
    timeToMinutes(
      endTime
    );

  const slots: string[] = [];

  for (
    let current = startMinutes;
    current < endMinutes;
    current += SLOT_MINUTES
  ) {
    slots.push(
      minutesToTime(
        current
      )
    );
  }

  return slots;
}

/**
 * Check whether time is aligned
 * to a 15-minute boundary.
 */
function isValidSlotBoundary(
  time: string
): boolean {
  return (
    timeToMinutes(time) %
      SLOT_MINUTES ===
    0
  );
}

/* =====================================================
   VALIDATION SCHEMA
===================================================== */

const createBookingSchema =
  z.object({
    roomId: z
      .string()
      .min(
        1,
        "Room is required"
      ),

    title: z
      .string()
      .trim()
      .min(
        2,
        "Title must be at least 2 characters"
      )
      .max(
        200,
        "Title is too long"
      ),

    date: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "Date must be in YYYY-MM-DD format"
      ),

    startTime: z
      .string()
      .regex(
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        "Start time must be in HH:mm format"
      ),

    endTime: z
      .string()
      .regex(
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        "End time must be in HH:mm format"
      ),

    description: z
      .string()
      .trim()
      .max(
        1000,
        "Description is too long"
      )
      .optional(),
  });

/* =====================================================
   ADMIN EDIT BOOKING VALIDATION
===================================================== */

const editBookingSchema =
  z.object({
    roomId: z
      .string()
      .min(
        1,
        "Room is required"
      ),

    title: z
      .string()
      .trim()
      .min(
        2,
        "Title must be at least 2 characters"
      )
      .max(
        200,
        "Title is too long"
      ),

    date: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "Date must be in YYYY-MM-DD format"
      ),

    startTime: z
      .string()
      .regex(
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        "Start time must be in HH:mm format"
      ),

    endTime: z
      .string()
      .regex(
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        "End time must be in HH:mm format"
      ),

    description: z
      .string()
      .trim()
      .max(
        1000,
        "Description is too long"
      )
      .optional(),
  });

/* =====================================================
   GET ROOM AVAILABILITY
===================================================== */

export async function getRoomAvailability(
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

    const date =
      typeof req.query.date ===
      "string"
        ? req.query.date
        : "";

    const startTime =
      typeof req.query.startTime ===
      "string"
        ? req.query.startTime
        : "";

    const endTime =
      typeof req.query.endTime ===
      "string"
        ? req.query.endTime
        : "";

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        date
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Date must be in YYYY-MM-DD format",
      });
    }

    const dateParts =
      date
        .split("-")
        .map(Number);

    const [
      year,
      month,
      day,
    ] = dateParts;

    const parsedDate =
      new Date(
        Date.UTC(
          year,
          month - 1,
          day
        )
      );

    if (
      Number.isNaN(
        parsedDate.getTime()
      ) ||
      parsedDate
        .toISOString()
        .slice(0, 10) !==
        date
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid booking date",
      });
    }

    const timeRegex =
      /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (
      !timeRegex.test(startTime)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid start time",
      });
    }

    if (
      !timeRegex.test(endTime)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid end time",
      });
    }

    const startMinutes =
      timeToMinutes(
        startTime
      );

    const endMinutes =
      timeToMinutes(
        endTime
      );

    if (
      startMinutes >=
      endMinutes
    ) {
      return res.status(400).json({
        success: false,
        message:
          "End time must be later than start time",
      });
    }

    if (
      !isValidSlotBoundary(
        startTime
      ) ||
      !isValidSlotBoundary(
        endTime
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Times must be in 15-minute intervals",
      });
    }

    const {
      date: today,
      time: currentTime,
    } =
      getCurrentDateAndTime();

    if (date < today) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot check availability for a past date",
      });
    }

    if (
      date === today &&
      startTime <= currentTime
    ) {
      return res.status(400).json({
        success: false,
        message:
          "The selected time has already passed",
      });
    }

    const activeRooms =
      await Room.find({
        isActive: true,
      })
        .select(
          "_id name capacity location description facilities isActive"
        )
        .lean();

    const conflictingBookings =
      await Booking.find({
        date,

        status: {
          $ne: "CANCELLED",
        },

        startTime: {
          $lt: endTime,
        },

        endTime: {
          $gt: startTime,
        },
      })
        .select(
          "room startTime endTime title"
        )
        .lean();

    const bookedRoomIds =
      Array.from(
        new Set(
          conflictingBookings.map(
            (booking) =>
              String(
                booking.room
              )
          )
        )
      );

    const bookedRooms =
      conflictingBookings.map(
        (booking) => ({
          roomId: String(
            booking.room
          ),

          startTime:
            booking.startTime,

          endTime:
            booking.endTime,

          title:
            booking.title,
        })
      );

    const availableRooms =
      activeRooms.filter(
        (room) =>
          !bookedRoomIds.includes(
            String(room._id)
          )
      );

    return res.status(200).json({
      success: true,

      date,

      startTime,

      endTime,

      bookedRoomIds,

      bookedRooms,

      availableRooms,
    });
  } catch (error) {
    console.error(
      "Room availability error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to check room availability",
    });
  }
}

/* =====================================================
   CREATE BOOKING
===================================================== */

export async function createBooking(
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

    const result =
      createBookingSchema.safeParse(
        req.body
      );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message:
          result.error.issues[0]
            ?.message ||
          "Invalid booking data",
      });
    }

    const {
      roomId,
      title,
      date,
      startTime,
      endTime,
      description,
    } = result.data;

    if (
      !isValidObjectId(
        roomId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid room ID",
      });
    }

    const dateParts =
      date
        .split("-")
        .map(Number);

    const [
      year,
      month,
      day,
    ] = dateParts;

    const parsedDate =
      new Date(
        Date.UTC(
          year,
          month - 1,
          day
        )
      );

    if (
      Number.isNaN(
        parsedDate.getTime()
      ) ||
      parsedDate
        .toISOString()
        .slice(0, 10) !==
        date
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid booking date",
      });
    }

    const {
      date: today,
      time: currentTime,
    } =
      getCurrentDateAndTime();

    if (date < today) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot book a room for a past date",
      });
    }

    const startMinutes =
      timeToMinutes(
        startTime
      );

    const endMinutes =
      timeToMinutes(
        endTime
      );

    if (
      startMinutes >=
      endMinutes
    ) {
      return res.status(400).json({
        success: false,
        message:
          "End time must be later than start time",
      });
    }

    if (
      !isValidSlotBoundary(
        startTime
      ) ||
      !isValidSlotBoundary(
        endTime
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Booking times must be in 15-minute intervals",
      });
    }

    if (
      date === today &&
      startTime <= currentTime
    ) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot book a time that has already passed",
      });
    }

    const room =
      await Room.findOne({
        _id: roomId,
        isActive: true,
      });

    if (!room) {
      return res.status(404).json({
        success: false,
        message:
          "Room not found or is currently unavailable",
      });
    }

    const occupiedSlots =
      generateOccupiedSlots(
        startTime,
        endTime
      );

    if (
      occupiedSlots.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid booking duration",
      });
    }

    const conflictingBooking =
      await Booking.findOne({
        room: room._id,

        date,

        status: {
          $ne: "CANCELLED",
        },

        startTime: {
          $lt: endTime,
        },

        endTime: {
          $gt: startTime,
        },
      });

    if (conflictingBooking) {
      return res.status(409).json({
        success: false,
        message:
          "This room is already booked for the selected time",
      });
    }

    let booking;

    try {
      booking =
        await Booking.create({
          user:
            req.user.userId,

          room:
            room._id,

          title:
            title.trim(),

          date,

          startTime,

          endTime,

          description:
            description?.trim() ||
            undefined,

          occupiedSlots,

          status:
            "UPCOMING",
        });
    } catch (error: unknown) {
      if (
        typeof error ===
          "object" &&
        error !== null &&
        "code" in error &&
        (
          error as {
            code?: number;
          }
        ).code === 11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This room was just booked by another user for part of the selected time. Please choose another time.",
        });
      }

      throw error;
    }

    void createNotificationIfEnabled({
      userId:
        req.user.userId,

      type:
        "BOOKING_CREATED",

      title:
        "Booking confirmed",

      message:
        `Your booking for ${room.name} ` +
        `on ${date} from ${startTime} to ${endTime} ` +
        `has been confirmed.`,

      bookingId:
        booking._id.toString(),
    });

    void sendBookingCreatedEmails(
      booking._id
    );

    const populatedBooking =
      await Booking.findById(
        booking._id
      )
        .populate(
          "room",
          "name capacity location facilities"
        )
        .populate(
          "user",
          "name email department"
        );

    return res.status(201).json({
      success: true,

      message:
        "Room booked successfully",

      booking:
        populatedBooking,
    });
  } catch (error) {
    console.error(
      "Create booking error:",
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
   GET MY BOOKINGS
===================================================== */

export async function getMyBookings(
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

    /*
     * IMPORTANT:
     *
     * Before returning the employee's bookings,
     * automatically convert finished UPCOMING
     * bookings into COMPLETED.
     *
     * Only this employee's bookings are updated.
     */
    await syncCompletedBookings({
      user: req.user.userId,
    });

    /*
     * IMPORTANT:
     *
     * Do NOT filter by:
     *
     * status: "UPCOMING"
     *
     * because the employee must continue seeing
     * past bookings.
     *
     * The response contains:
     *
     * UPCOMING
     * COMPLETED
     * CANCELLED
     */
    const bookings =
      await Booking.find({
        user:
          req.user.userId,
      })
        .populate(
          "room",
          "name capacity location facilities"
        )
        .sort({
          date: -1,
          startTime: -1,
        });

    return res.status(200).json({
      success: true,
      bookings,
    });
  } catch (error) {
    console.error(
      "Get my bookings error:",
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
   CANCEL MY BOOKING
===================================================== */

export async function cancelMyBooking(
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

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid booking ID",
      });
    }

    const booking =
      await Booking.findOne({
        _id: id,

        user:
          req.user.userId,
      });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message:
          "Booking not found",
      });
    }

    if (
      booking.status ===
      "CANCELLED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Booking is already cancelled",
      });
    }

    booking.status =
      "CANCELLED";

    await booking.save();

    const room =
      await Room.findById(
        booking.room
      ).select("name");

    void createNotificationIfEnabled({
      userId:
        req.user.userId,

      type:
        "BOOKING_CANCELLED",

      title:
        "Booking cancelled",

      message:
        `Your booking for ${
          room?.name ||
          "the conference room"
        } on ${
          booking.date
        } from ${
          booking.startTime
        } to ${
          booking.endTime
        } has been cancelled.`,

      bookingId:
        booking._id.toString(),
    });

    void sendBookingCancelledEmails(
      booking._id,
      "Employee"
    );

    return res.status(200).json({
      success: true,

      message:
        "Booking cancelled successfully",

      booking,
    });
  } catch (error) {
    console.error(
      "Cancel my booking error:",
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
   GET ALL BOOKINGS — ADMIN
===================================================== */

export async function getAllBookings(
  _req: AuthenticatedRequest,
  res: Response
) {
  try {
    /*
     * Automatically mark every finished UPCOMING
     * booking as COMPLETED before returning
     * bookings to the administrator.
     */
    await syncCompletedBookings();

    /*
     * Return ALL bookings.
     *
     * This intentionally includes:
     *
     * UPCOMING
     * COMPLETED
     * CANCELLED
     *
     * Therefore old bookings remain visible.
     */
    const bookings =
      await Booking.find({})
        .populate(
          "room",
          "name capacity location facilities"
        )
        .populate(
          "user",
          "name email department role"
        )
        .sort({
          date: -1,
          startTime: -1,
        });

    return res.status(200).json({
      success: true,
      bookings,
    });
  } catch (error) {
    console.error(
      "Get all bookings error:",
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
   ADMIN EDIT BOOKING
===================================================== */

export async function adminEditBooking(
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
       ADMIN AUTHORIZATION

       Only ADMIN users can edit bookings.
    --------------------------------------------- */

    if (
      req.user.role !==
      "ADMIN"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Admin access required",
      });
    }

    /* ---------------------------------------------
       BOOKING ID
    --------------------------------------------- */

    const id: unknown =
      req.params.id;

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid booking ID",
      });
    }

    /* ---------------------------------------------
       VALIDATE REQUEST
    --------------------------------------------- */

    const result =
      editBookingSchema.safeParse(
        req.body
      );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message:
          result.error.issues[0]
            ?.message ||
          "Invalid booking data",
      });
    }

    const {
      roomId,
      title,
      date,
      startTime,
      endTime,
      description,
    } = result.data;

    /* ---------------------------------------------
       VALIDATE ROOM ID
    --------------------------------------------- */

    if (
      !isValidObjectId(
        roomId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid room ID",
      });
    }

    /* ---------------------------------------------
       FIND BOOKING
    --------------------------------------------- */

    const booking =
      await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message:
          "Booking not found",
      });
    }

    /* ---------------------------------------------
       PREVENT EDITING CANCELLED BOOKING
    --------------------------------------------- */

    if (
      booking.status ===
      "CANCELLED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cancelled bookings cannot be edited",
      });
    }

    /* ---------------------------------------------
       VALIDATE DATE
    --------------------------------------------- */

    const [
      year,
      month,
      day,
    ] =
      date
        .split("-")
        .map(Number);

    const parsedDate =
      new Date(
        Date.UTC(
          year,
          month - 1,
          day
        )
      );

    if (
      Number.isNaN(
        parsedDate.getTime()
      ) ||
      parsedDate
        .toISOString()
        .slice(0, 10) !==
        date
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid booking date",
      });
    }

    /* ---------------------------------------------
       PREVENT PAST DATE
    --------------------------------------------- */

    const {
      date: today,
      time: currentTime,
    } =
      getCurrentDateAndTime();

    if (date < today) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot move a booking to a past date",
      });
    }

    /* ---------------------------------------------
       VALIDATE TIME RANGE
    --------------------------------------------- */

    const startMinutes =
      timeToMinutes(
        startTime
      );

    const endMinutes =
      timeToMinutes(
        endTime
      );

    if (
      startMinutes >=
      endMinutes
    ) {
      return res.status(400).json({
        success: false,
        message:
          "End time must be later than start time",
      });
    }

    /* ---------------------------------------------
       REQUIRE 15-MINUTE BOUNDARIES
    --------------------------------------------- */

    if (
      !isValidSlotBoundary(
        startTime
      ) ||
      !isValidSlotBoundary(
        endTime
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Booking times must be in 15-minute intervals",
      });
    }

    /* ---------------------------------------------
       PREVENT PAST TIME TODAY
    --------------------------------------------- */

    if (
      date === today &&
      startTime <= currentTime
    ) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot move a booking to a time that has already passed",
      });
    }

    /* ---------------------------------------------
       FIND ACTIVE ROOM
    --------------------------------------------- */

    const room =
      await Room.findOne({
        _id: roomId,
        isActive: true,
      });

    if (!room) {
      return res.status(404).json({
        success: false,
        message:
          "Room not found or is currently unavailable",
      });
    }

    /* ---------------------------------------------
       GENERATE OCCUPIED SLOTS
    --------------------------------------------- */

    const occupiedSlots =
      generateOccupiedSlots(
        startTime,
        endTime
      );

    if (
      occupiedSlots.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid booking duration",
      });
    }

    /* ---------------------------------------------
       CHECK ROOM CONFLICT

       IMPORTANT:
       $ne excludes the booking currently
       being edited from the conflict check.
    --------------------------------------------- */

    const conflictingBooking =
      await Booking.findOne({
        _id: {
          $ne:
            booking._id,
        },

        room:
          room._id,

        date,

        status: {
          $ne: "CANCELLED",
        },

        startTime: {
          $lt: endTime,
        },

        endTime: {
          $gt: startTime,
        },
      });

    if (conflictingBooking) {
      return res.status(409).json({
        success: false,
        message:
          "This room is already booked for the selected time",
      });
    }

    /* ---------------------------------------------
       STORE OLD BOOKING DETAILS

       Used by the update email.
    --------------------------------------------- */

    const oldRoom =
      await Room.findById(
        booking.room
      ).select("name");

    const oldDate =
      booking.date;

    const oldStartTime =
      booking.startTime;

    const oldEndTime =
      booking.endTime;

    /* ---------------------------------------------
       UPDATE BOOKING

       IMPORTANT:
       booking.user is NOT changed.

       Therefore the original employee
       remains the owner of the booking.
    --------------------------------------------- */

    booking.room =
      room._id;

    booking.title =
      title.trim();

    booking.date =
      date;

    booking.startTime =
      startTime;

    booking.endTime =
      endTime;

    booking.description =
      description?.trim() ||
      undefined;

    booking.occupiedSlots =
      occupiedSlots;

    booking.status =
      "UPCOMING";

    await booking.save();

    /* =================================================
       IN-APP NOTIFICATION
    ================================================= */

    void createNotificationIfEnabled({
      userId:
        booking.user.toString(),

      type:
        "BOOKING_CREATED",

      title:
        "Booking updated by administrator",

      message:
        `Your booking for ${room.name} ` +
        `on ${date} from ${startTime} to ${endTime} ` +
        `has been updated by an administrator.`,

      bookingId:
        booking._id.toString(),
    });

    /* =================================================
       EMAIL NOTIFICATION

       Employee email and admin emails are resolved
       dynamically by emailService.
    ================================================= */

    void sendBookingUpdatedEmails(
      booking._id,
      {
        oldRoomName:
          oldRoom?.name ||
          "Conference Room",

        oldDate,

        oldStartTime,

        oldEndTime,
      }
    );

    /* ---------------------------------------------
       POPULATE UPDATED BOOKING
    --------------------------------------------- */

    const populatedBooking =
      await Booking.findById(
        booking._id
      )
        .populate(
          "room",
          "name capacity location facilities"
        )
        .populate(
          "user",
          "name email department role"
        );

    return res.status(200).json({
      success: true,

      message:
        "Booking updated successfully",

      booking:
        populatedBooking,
    });
  } catch (error) {
    console.error(
      "Admin edit booking error:",
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
   ADMIN CANCEL BOOKING
===================================================== */

export async function adminCancelBooking(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const id: unknown =
      req.params.id;

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid booking ID",
      });
    }

    const booking =
      await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message:
          "Booking not found",
      });
    }

    if (
      booking.status ===
      "CANCELLED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Booking is already cancelled",
      });
    }

    /* ---------------------------------------------
       CANCEL BOOKING
    --------------------------------------------- */

    booking.status =
      "CANCELLED";

    await booking.save();

    /* ---------------------------------------------
       FIND ROOM
    --------------------------------------------- */

    const room =
      await Room.findById(
        booking.room
      ).select("name");

    /* =================================================
       IN-APP NOTIFICATION

       Goes to employee who created the booking.
    ================================================= */

    void createNotificationIfEnabled({
      userId:
        booking.user.toString(),

      type:
        "BOOKING_CANCELLED",

      title:
        "Booking cancelled by administrator",

      message:
        `Your booking for ${
          room?.name ||
          "the conference room"
        } on ${
          booking.date
        } from ${
          booking.startTime
        } to ${
          booking.endTime
        } was cancelled by an administrator.`,

      bookingId:
        booking._id.toString(),
    });

    /* =================================================
       EMAIL NOTIFICATION

       Dynamic:

       booking.user
           ↓
       User.email
           ↓
       Employee receives cancellation email

       Admin emails are also dynamically fetched
       by emailService using role: "ADMIN".
    ================================================= */

    void sendBookingCancelledEmails(
      booking._id,
      "Administrator"
    );

    return res.status(200).json({
      success: true,

      message:
        "Booking cancelled successfully",

      booking,
    });
  } catch (error) {
    console.error(
      "Admin cancel booking error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Something went wrong",
    });
  }
}