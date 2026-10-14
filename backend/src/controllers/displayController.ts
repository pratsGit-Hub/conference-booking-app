import type { Request, Response } from "express";
import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";

const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";

/**
 * Get today's date in YYYY-MM-DD format
 * using the configured application timezone.
 */
function getTodayDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return values.year + "-" + values.month + "-" + values.day;
}

/**
 * Public endpoint:
 * GET /api/display/today
 *
 * No login required.
 * Returns only today's non-cancelled meetings.
 */
export async function getTodayDisplayBookings(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const today = getTodayDate();

    // TEMPORARY DIAGNOSTICS
    console.log("TV display date:", today);
    console.log(
      "MongoDB connection state:",
      mongoose.connection.readyState
    );

    const totalBookings = await Booking.countDocuments();

    const todayBookingCount = await Booking.countDocuments({
      date: today,
    });

    const upcomingBookings = await Booking.find({
      status: "UPCOMING",
    })
      .select("date status")
      .sort({ date: 1 })
      .limit(20)
      .lean();

    console.log("Total bookings in database:", totalBookings);
    console.log("Bookings dated today:", todayBookingCount);
    console.log("Upcoming booking dates:", upcomingBookings);

    // Fetch today's bookings, excluding cancelled meetings.
    const bookings = await Booking.find({
      date: today,
      status: { $ne: "CANCELLED" },
    })
      .select("title date startTime endTime room user status")
      .populate({
        path: "room",
        select: "name",
      })
      .populate({
        path: "user",
        select: "name",
      })
      .sort({ startTime: 1 })
      .lean();

    const safeBookings = bookings.map((booking: any) => {
      const startTime = booking.startTime || "";
      const endTime = booking.endTime || "";

      return {
        id: String(booking._id),
        meeting: booking.title || "Untitled meeting",
        room: booking.room?.name || "Conference Room",
        time: startTime + " - " + endTime,
        date: String(booking.date),
        booker: booking.user?.name || "Employee",
      };
    });

    res.setHeader("Cache-Control", "no-store");

    res.status(200).json({
      success: true,
      date: today,
      timezone: APP_TIMEZONE,
      count: safeBookings.length,
      bookings: safeBookings,
    });
  } catch (error) {
    console.error("Office TV display error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load today's bookings.",
    });
  }
}
