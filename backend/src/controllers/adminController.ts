import { Response } from "express";

import {
  AuthenticatedRequest,
} from "../middleware/authMiddleware.js";

import { User } from "../models/User.js";
import { Room } from "../models/Room.js";
import { Booking } from "../models/Booking.js";

/* =====================================================
   TYPES
===================================================== */

type BookingStatus =
  | "UPCOMING"
  | "COMPLETED"
  | "CANCELLED";

/* =====================================================
   DATE / TIME HELPERS
===================================================== */

const APP_TIMEZONE =
  process.env.APP_TIMEZONE ||
  "Asia/Kolkata";

function getCurrentDateAndTime() {
  const now = new Date();

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
    formatter.formatToParts(now);

  const values: Record<
    string,
    string
  > = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] =
        part.value;
    }
  }

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}

/* =====================================================
   CALCULATE EFFECTIVE BOOKING STATUS
===================================================== */

function getEffectiveBookingStatus(
  date: string,
  endTime: string,
  storedStatus: BookingStatus
): BookingStatus {
  if (
    storedStatus === "CANCELLED"
  ) {
    return "CANCELLED";
  }

  const {
    date: today,
    time: currentTime,
  } = getCurrentDateAndTime();

  if (date < today) {
    return "COMPLETED";
  }

  if (date > today) {
    return "UPCOMING";
  }

  if (endTime <= currentTime) {
    return "COMPLETED";
  }

  return "UPCOMING";
}

/* =====================================================
   ADMIN DASHBOARD
===================================================== */

export async function getAdminDashboard(
  _req: AuthenticatedRequest,
  res: Response
) {
  try {
    const {
      date: today,
      time: currentTime,
    } = getCurrentDateAndTime();

    /* =================================================
       BASIC COUNTS
    ================================================= */

    const [
      totalUsers,
      totalRooms,
      activeRooms,
      inactiveRooms,
      totalBookings,
      cancelledBookings,
      upcomingBookings,
      completedBookings,
      todayBookings,
    ] = await Promise.all([
      User.countDocuments({}),

      Room.countDocuments({}),

      Room.countDocuments({
        isActive: true,
      }),

      Room.countDocuments({
        isActive: false,
      }),

      Booking.countDocuments({}),

      Booking.countDocuments({
        status: "CANCELLED",
      }),

      /* =================================================
         UPCOMING BOOKINGS
      ================================================= */

      Booking.countDocuments({
        status: {
          $ne: "CANCELLED",
        },

        $or: [
          {
            date: {
              $gt: today,
            },
          },

          {
            date: today,
            endTime: {
              $gt: currentTime,
            },
          },
        ],
      }),

      /* =================================================
         COMPLETED BOOKINGS
      ================================================= */

      Booking.countDocuments({
        status: {
          $ne: "CANCELLED",
        },

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
      }),

      /* =================================================
         TODAY'S BOOKINGS
      ================================================= */

      Booking.countDocuments({
        date: today,

        status: {
          $ne: "CANCELLED",
        },
      }),
    ]);

    /* =================================================
       RECENT BOOKINGS
    ================================================= */

    const recentBookingsRaw =
      await Booking.find({})
        .populate(
          "user",
          "name email department"
        )
        .populate(
          "room",
          "name location capacity"
        )
        .sort({
          createdAt: -1,
        })
        .limit(10)
        .lean();

    const recentBookings =
      recentBookingsRaw.map(
        (booking) => ({
          ...booking,

          status:
            getEffectiveBookingStatus(
              booking.date,
              booking.endTime,
              booking.status
            ),
        })
      );

    /* =================================================
       ROOM BOOKING STATISTICS
    ================================================= */

    const roomUtilization =
      await Booking.aggregate([
        {
          $match: {
            status: {
              $ne: "CANCELLED",
            },
          },
        },

        {
          $group: {
            _id: "$room",

            bookingCount: {
              $sum: 1,
            },
          },
        },

        {
          $lookup: {
            from: "rooms",

            localField: "_id",

            foreignField: "_id",

            as: "room",
          },
        },

        {
          $unwind: {
            path: "$room",

            preserveNullAndEmptyArrays:
              true,
          },
        },

        {
          $project: {
            _id: 0,

            roomId: "$room._id",

            roomName: "$room.name",

            location:
              "$room.location",

            bookingCount: 1,
          },
        },

        {
          $sort: {
            bookingCount: -1,
          },
        },

        {
          $limit: 10,
        },
      ]);

    /* =================================================
       ROOM UTILIZATION PERCENTAGE
    ================================================= */

    const highestBookingCount =
      roomUtilization.length > 0
        ? roomUtilization[0]
            .bookingCount
        : 0;

    const formattedRoomUtilization =
      roomUtilization.map(
        (room) => ({
          roomId: room.roomId,

          roomName:
            room.roomName,

          location:
            room.location,

          bookingCount:
            room.bookingCount,

          percentage:
            highestBookingCount > 0
              ? Math.round(
                  (room.bookingCount /
                    highestBookingCount) *
                    100
                )
              : 0,
        })
      );

    /* =================================================
       RESPONSE
    ================================================= */

    return res.status(200).json({
      success: true,

      stats: {
        totalUsers,
        totalRooms,
        activeRooms,
        inactiveRooms,
        totalBookings,
        upcomingBookings,
        completedBookings,
        cancelledBookings,
        todayBookings,
      },

      recentBookings,

      roomUtilization:
        formattedRoomUtilization,
    });
  } catch (error) {
    console.error(
      "Admin dashboard error:",
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
   ADMIN REPORTS
===================================================== */

/*
 * Returns the current date in APP_TIMEZONE.
 *
 * Example:
 * 2026-09-21
 */
function getReportDateParts() {
  const { date } =
    getCurrentDateAndTime();

  return date.split("-").map(Number);
}

/*
 * Adds days to a YYYY-MM-DD date.
 *
 * We use UTC internally so the calculation does not
 * accidentally change because of the computer's local
 * timezone.
 */
function addDaysToDateString(
  dateString: string,
  days: number
): string {
  const [year, month, day] =
    dateString
      .split("-")
      .map(Number);

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );

  date.setUTCDate(
    date.getUTCDate() + days
  );

  return date
    .toISOString()
    .slice(0, 10);
}

/*
 * Returns Monday-Sunday week range.
 */
function getWeekRange(
  dateString: string
) {
  const [year, month, day] =
    dateString
      .split("-")
      .map(Number);

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );

  const dayOfWeek =
    date.getUTCDay();

  // Monday = 0 ... Sunday = 6
  const daysFromMonday =
    dayOfWeek === 0
      ? 6
      : dayOfWeek - 1;

  const start =
    addDaysToDateString(
      dateString,
      -daysFromMonday
    );

  const end =
    addDaysToDateString(
      start,
      6
    );

  return {
    start,
    end,
  };
}

/*
 * Returns first and last day of the current month.
 */
function getMonthRange(
  dateString: string
) {
  const [year, month] =
    dateString
      .split("-")
      .map(Number);

  const monthString =
    String(month).padStart(
      2,
      "0"
    );

  const start =
    `${year}-${monthString}-01`;

  const lastDay =
    new Date(
      Date.UTC(
        year,
        month,
        0
      )
    ).getUTCDate();

  const end =
    `${year}-${monthString}-${String(
      lastDay
    ).padStart(2, "0")}`;

  return {
    start,
    end,
  };
}

/* =====================================================
   GET ADMIN REPORTS
===================================================== */

export async function getAdminReports(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    /* =================================================
       VALIDATE PERIOD
    ================================================= */

    const requestedPeriod =
      typeof req.query.period ===
      "string"
        ? req.query.period
        : "month";

    const allowedPeriods = [
      "today",
      "week",
      "month",
      "all",
    ] as const;

    type ReportPeriod =
      (typeof allowedPeriods)[number];

    if (
      !allowedPeriods.includes(
        requestedPeriod as ReportPeriod
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid period. Use today, week, month, or all",
      });
    }

    const period =
      requestedPeriod as ReportPeriod;

    /* =================================================
       DATE RANGE
    ================================================= */

    /*
     * IMPORTANT:
     *
     * Reports are based on the scheduled meeting date:
     *
     * booking.date
     *
     * NOT booking.createdAt.
     */

    const [
      currentYear,
      currentMonth,
      currentDay,
    ] = getReportDateParts();

    const today =
      `${currentYear}-${String(
        currentMonth
      ).padStart(
        2,
        "0"
      )}-${String(
        currentDay
      ).padStart(
        2,
        "0"
      )}`;

    let startDate:
      | string
      | null = null;

    let endDate:
      | string
      | null = null;

    switch (period) {
      case "today": {
        startDate = today;
        endDate = today;

        break;
      }

      case "week": {
        const weekRange =
          getWeekRange(today);

        startDate =
          weekRange.start;

        endDate =
          weekRange.end;

        break;
      }

      case "month": {
        const monthRange =
          getMonthRange(today);

        startDate =
          monthRange.start;

        endDate =
          monthRange.end;

        break;
      }

      case "all": {
        startDate = null;
        endDate = null;

        break;
      }
    }

    /* =================================================
       BOOKING QUERY
    ================================================= */

    /*
     * Booking.date is stored as:
     *
     * YYYY-MM-DD
     *
     * Therefore a string range is appropriate here.
     */

    const bookingFilter: Record<
      string,
      unknown
    > = {};

    if (
      startDate &&
      endDate
    ) {
      bookingFilter.date = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    const bookings =
      await Booking.find(
        bookingFilter
      )
        .populate(
          "user",
          "name email department"
        )
        .populate(
          "room",
          "name location capacity"
        )
        .sort({
          date: -1,
          startTime: -1,
        })
        .lean();

    /* =================================================
       EFFECTIVE STATUS
    ================================================= */

    /*
     * CANCELLED remains CANCELLED.
     *
     * Otherwise status is calculated using the
     * actual scheduled date/time.
     */

    const effectiveStatuses =
      bookings.map(
        (booking) =>
          getEffectiveBookingStatus(
            booking.date,
            booking.endTime,
            booking.status
          )
      );

    /* =================================================
       SUMMARY
    ================================================= */

    const totalBookings =
      bookings.length;

    const upcomingBookings =
      effectiveStatuses.filter(
        (status) =>
          status === "UPCOMING"
      ).length;

    const completedBookings =
      effectiveStatuses.filter(
        (status) =>
          status === "COMPLETED"
      ).length;

    const cancelledBookings =
      effectiveStatuses.filter(
        (status) =>
          status === "CANCELLED"
      ).length;

    /* =================================================
       ROOM BOOKING ACTIVITY
    ================================================= */

    /*
     * Cancelled bookings are excluded because they
     * did not actually use the room.
     */

    const roomMap =
      new Map<
        string,
        {
          roomId: string;
          roomName: string;
          location: string;
          bookingCount: number;
        }
      >();

    for (
      const booking of bookings
    ) {
      if (
        booking.status ===
        "CANCELLED"
      ) {
        continue;
      }

      const room =
        booking.room as unknown as
          | {
              _id: unknown;
              name: string;
              location: string;
            }
          | null;

      if (!room) {
        continue;
      }

      const roomId =
        String(room._id);

      const existing =
        roomMap.get(roomId);

      if (existing) {
        existing.bookingCount +=
          1;
      } else {
        roomMap.set(
          roomId,
          {
            roomId,
            roomName:
              room.name,
            location:
              room.location,
            bookingCount: 1,
          }
        );
      }
    }

    const roomUtilization =
      Array.from(
        roomMap.values()
      ).sort(
        (a, b) =>
          b.bookingCount -
          a.bookingCount
      );

    const highestReportBookingCount =
      roomUtilization.length >
      0
        ? roomUtilization[0]
            .bookingCount
        : 0;

    const formattedReportRoomUtilization =
      roomUtilization.map(
        (room) => ({
          ...room,

          /*
           * This is relative booking activity.
           *
           * It is NOT yet actual percentage of
           * available working hours.
           */
          utilizationPercentage:
            highestReportBookingCount >
            0
              ? Math.round(
                  (room.bookingCount /
                    highestReportBookingCount) *
                    100
                )
              : 0,
        })
      );

    /* =================================================
       EMPLOYEE ACTIVITY
    ================================================= */

    const employeeMap =
      new Map<
        string,
        {
          userId: string;
          name: string;
          email: string;
          department?: string;
          bookingCount: number;
        }
      >();

    for (
      const booking of bookings
    ) {
      if (
        booking.status ===
        "CANCELLED"
      ) {
        continue;
      }

      const user =
        booking.user as unknown as
          | {
              _id: unknown;
              name: string;
              email: string;
              department?: string;
            }
          | null;

      if (!user) {
        continue;
      }

      const userId =
        String(user._id);

      const existing =
        employeeMap.get(
          userId
        );

      if (existing) {
        existing.bookingCount +=
          1;
      } else {
        employeeMap.set(
          userId,
          {
            userId,
            name: user.name,
            email: user.email,
            department:
              user.department,
            bookingCount: 1,
          }
        );
      }
    }

    const employeeActivity =
      Array.from(
        employeeMap.values()
      )
        .sort(
          (a, b) =>
            b.bookingCount -
            a.bookingCount
        )
        .slice(0, 20);

    /* =================================================
       DAILY BOOKING TREND
    ================================================= */

    const dailyMap =
      new Map<
        string,
        number
      >();

    for (
      const booking of bookings
    ) {
      if (
        booking.status ===
        "CANCELLED"
      ) {
        continue;
      }

      dailyMap.set(
        booking.date,
        (
          dailyMap.get(
            booking.date
          ) || 0
        ) + 1
      );
    }

    const dailyBookings =
      Array.from(
        dailyMap.entries()
      )
        .sort(
          ([dateA], [dateB]) =>
            dateA.localeCompare(
              dateB
            )
        )
        .map(
          ([
            date,
            bookingCount,
          ]) => ({
            date,
            bookingCount,
          })
        );

    /* =================================================
       RECENT BOOKINGS
    ================================================= */

    /*
     * Return a clean structure for the frontend instead
     * of returning raw Mongoose populated documents.
     */

    const recentBookings =
      bookings
        .slice(0, 20)
        .map(
          (booking) => {
            const user =
              booking.user as unknown as
                | {
                    _id: unknown;
                    name: string;
                    email: string;
                    department?: string;
                  }
                | null;

            const room =
              booking.room as unknown as
                | {
                    _id: unknown;
                    name: string;
                    location: string;
                  }
                | null;

            return {
              _id: String(
                booking._id
              ),

              title:
                booking.title,

              date:
                booking.date,

              startTime:
                booking.startTime,

              endTime:
                booking.endTime,

              status:
                getEffectiveBookingStatus(
                  booking.date,
                  booking.endTime,
                  booking.status
                ),

              user: user
                ? {
                    _id: String(
                      user._id
                    ),

                    name:
                      user.name,

                    email:
                      user.email,

                    department:
                      user.department,
                  }
                : null,

              room: room
                ? {
                    _id: String(
                      room._id
                    ),

                    name:
                      room.name,

                    location:
                      room.location,
                  }
                : null,
            };
          }
        );

    /* =================================================
       RESPONSE
    ================================================= */

    return res.status(200).json({
      success: true,

      period,

      dateRange: {
        start: startDate,
        end: endDate,
      },

      summary: {
        totalBookings,
        upcomingBookings,
        completedBookings,
        cancelledBookings,
      },

      roomUtilization:
        formattedReportRoomUtilization,

      employeeActivity,

      dailyBookings,

      recentBookings,
    });
  } catch (error) {
    console.error(
      "Admin reports error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Something went wrong",
    });
  }
}