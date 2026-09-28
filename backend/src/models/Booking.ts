import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type BookingStatus =
  | "UPCOMING"
  | "COMPLETED"
  | "CANCELLED";

export interface IBooking
  extends Document {
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

  status: BookingStatus;

  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema =
  new Schema<IBooking>(
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

      date: {
        type: String,
        required: true,
        match: /^\d{4}-\d{2}-\d{2}$/,
        index: true,
      },

      startTime: {
        type: String,
        required: true,
        match:
          /^([01]\d|2[0-3]):([0-5]\d)$/,
      },

      endTime: {
        type: String,
        required: true,
        match:
          /^([01]\d|2[0-3]):([0-5]\d)$/,
      },

      description: {
        type: String,
        trim: true,
        maxlength: 1000,
      },

      occupiedSlots: {
        type: [String],
        required: true,
        validate: {
          validator: (
            slots: string[]
          ) => {
            return (
              Array.isArray(slots) &&
              slots.length > 0
            );
          },

          message:
            "Booking must contain at least one occupied time slot",
        },
      },

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
 * General booking lookup indexes.
 */
bookingSchema.index({
  room: 1,
  date: 1,
  status: 1,
});

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
 * Room 1
 * 2026-09-25
 * 10:00, 10:15, 10:30, 10:45
 *
 * Booking B:
 * Room 1
 * 2026-09-25
 * 10:30, 10:45, 11:00
 *
 * MongoDB sees:
 *
 * Room 1 + 2026-09-25 + 10:30
 *
 * already exists.
 *
 * Therefore Booking B fails with duplicate key error.
 *
 * CANCELLED bookings are excluded from this index,
 * meaning their time slots become available again.
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

export const Booking =
  mongoose.model<IBooking>(
    "Booking",
    bookingSchema
  );