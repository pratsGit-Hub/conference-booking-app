import mongoose, {
  Document,
  Schema,
} from "mongoose";

/* =====================================================
   NOTIFICATION TYPES
===================================================== */

export type NotificationType =
  | "BOOKING_CREATED"
  | "BOOKING_CANCELLED"
  | "BOOKING_REMINDER"
  | "ROOM_AVAILABLE";

/* =====================================================
   INTERFACE
===================================================== */

export interface INotification
  extends Document {
  user: mongoose.Types.ObjectId;

  type: NotificationType;

  title: string;

  message: string;

  booking?: mongoose.Types.ObjectId;

  isRead: boolean;

  createdAt: Date;

  updatedAt: Date;
}

/* =====================================================
   SCHEMA
===================================================== */

const notificationSchema =
  new Schema<INotification>(
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      type: {
        type: String,
        enum: [
          "BOOKING_CREATED",
          "BOOKING_CANCELLED",
          "BOOKING_REMINDER",
          "ROOM_AVAILABLE",
        ],
        required: true,
        index: true,
      },

      title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
      },

      message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000,
      },

      booking: {
        type: Schema.Types.ObjectId,
        ref: "Booking",
        index: true,
      },

      isRead: {
        type: Boolean,
        default: false,
        index: true,
      },
    },
    {
      timestamps: true,
    }
  );

/* =====================================================
   INDEXES
===================================================== */

notificationSchema.index({
  user: 1,
  isRead: 1,
  createdAt: -1,
});

notificationSchema.index({
  user: 1,
  createdAt: -1,
});

/* =====================================================
   MODEL
===================================================== */

export const Notification =
  mongoose.model<INotification>(
    "Notification",
    notificationSchema
  );