import type { Request, Response } from "express";
import { Booking } from "../models/Booking.js";
import { Room } from "../models/Room.js";

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

  return `${values.year}-${values.month}-${values.day}`;
}

/**
 * GET /api/display/rooms
 *
 * Public, read-only endpoint.
 * Returns ALL rooms, including rooms with no bookings.
 * Exposes only basic room information.
 */
export async function getDisplayRooms(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const rooms = await Room.find({})
      .select("_id name")
      .sort({ name: 1 })
      .lean();

    const safeRooms = rooms.map((room: any) => ({
      id: String(room._id),
      name: room.name || "Unnamed room",
    }));

    res.setHeader("Cache-Control", "no-store");

    res.status(200).json({
      success: true,
      count: safeRooms.length,
      rooms: safeRooms,
    });
  } catch (error) {
    console.error("Display rooms error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load rooms.",
    });
  }
}

/**
 * GET /api/display/today
 *
 * Public, read-only endpoint.
 * Returns today's non-cancelled meetings.
 */
export async function getTodayDisplayBookings(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const today = getTodayDate();

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

    const safeBookings = bookings.map((booking: any) => ({
      id: String(booking._id),
      meeting: booking.title || "Untitled meeting",
      room: booking.room?.name || "Conference Room",
      time: `${booking.startTime || ""} - ${
        booking.endTime || ""
      }`.trim(),
      date: String(booking.date),
      booker: booking.user?.name || "Employee",
      status: booking.status || "UPCOMING",
    }));

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