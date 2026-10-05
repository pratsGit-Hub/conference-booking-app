import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type BookingStatus =
  | "UPCOMING"
  | "COMPLETED"
  | "CANCELLED";

export interface IBooking extends Document {
  user: mongoose.Types.ObjectId;
  room: mongoose.Types.ObjectId;

  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description?: string;

  /*
   * Every booking occupies 15-minute slots.
   *
   * Example:
   *
   * 10:00 - 11:00
   *
   * occupiedSlots:
   * [
   *   "10:00",
   *   "10:15",
   *   "10:30",
   *   "10:45"
   * ]
   */
  occupiedSlots: string[];

  /*
   * Database status.
   *
   * UPCOMING  -> Booking has not finished.
   * COMPLETED -> Booking has finished.
   * CANCELLED -> Booking was cancelled.
   *
   * IMPORTANT:
   * The frontend/backend should determine whether an
   * UPCOMING booking is actually completed by comparing
   * date + endTime with the current time.
   */
  status: BookingStatus;

  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    room: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
    },

    /*
     * Booking date.
     *
     * Format:
     * YYYY-MM-DD
     *
     * Example:
     * 2026-10-05
     */
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },

    /*
     * Booking start time.
     *
     * Format:
     * HH:mm
     *
     * Example:
     * 10:00
     */
    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },

    /*
     * Booking end time.
     *
     * Format:
     * HH:mm
     *
     * Example:
     * 11:00
     */
    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    /*
     * 15-minute booking slots.
     *
     * Example:
     *
     * 10:00 - 11:00
     *
     * becomes:
     *
     * [
     *   "10:00",
     *   "10:15",
     *   "10:30",
     *   "10:45"
     * ]
     */
    occupiedSlots: {
      type: [String],
      required: true,

      validate: {
        validator: (slots: string[]) => {
          return (
            Array.isArray(slots) &&
            slots.length > 0
          );
        },

        message:
          "Booking must contain at least one occupied time slot",
      },
    },

    /*
     * Booking status.
     *
     * UPCOMING:
     * Booking is active/upcoming.
     *
     * COMPLETED:
     * Booking has finished.
     *
     * CANCELLED:
     * Booking was cancelled.
     */
    status: {
      type: String,

      enum: [
        "UPCOMING",
        "COMPLETED",
        "CANCELLED",
      ],

      default: "UPCOMING",

      required: true,

      index: true,
    },
  },

  {
    timestamps: true,
  }
);

/*
 * =====================================================
 * GENERAL BOOKING LOOKUP INDEXES
 * =====================================================
 */

/*
 * Useful for:
 *
 * - Room bookings by date
 * - Admin booking views
 * - Upcoming/completed booking queries
 */
bookingSchema.index({
  room: 1,
  date: 1,
  status: 1,
});

/*
 * Useful for:
 *
 * - Employee's bookings
 * - User booking history
 */
bookingSchema.index({
  user: 1,
  date: 1,
});

/*
 * =====================================================
 * DATABASE-LEVEL DOUBLE-BOOKING PROTECTION
 * =====================================================
 *
 * A room cannot have the same 15-minute slot occupied
 * by two active bookings on the same date.
 *
 * Example:
 *
 * Booking A:
 *
 * Room 1
 * 2026-10-05
 * 10:00, 10:15, 10:30, 10:45
 *
 * Booking B:
 *
 * Room 1
 * 2026-10-05
 * 10:30, 10:45, 11:00
 *
 * MongoDB detects:
 *
 * Room 1 + 2026-10-05 + 10:30
 *
 * already exists.
 *
 * Therefore Booking B fails with duplicate key error.
 *
 * CANCELLED bookings are excluded from this index,
 * meaning their time slots become available again.
 *
 * COMPLETED bookings remain protected because they
 * represent historical bookings and should not allow
 * another booking to overlap the same historical slot.
 */
bookingSchema.index(
  {
    room: 1,
    date: 1,
    occupiedSlots: 1,
  },
  {
    unique: true,

    partialFilterExpression: {
      status: {
        $in: [
          "UPCOMING",
          "COMPLETED",
        ],
      },
    },
  }
);

/*
 * =====================================================
 * MODEL
 * =====================================================
 */

export const Booking =
  mongoose.model<IBooking>(
    "Booking",
    bookingSchema
  );