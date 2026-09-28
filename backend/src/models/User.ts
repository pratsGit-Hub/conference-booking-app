import mongoose, {
  Document,
  Schema,
} from "mongoose";

/* =====================================================
   TYPES
===================================================== */

export type UserRole =
  | "ADMIN"
  | "EMPLOYEE";

export type CalendarView =
  | "DAY"
  | "WEEK"
  | "MONTH";

/* =====================================================
   WORKING DAY TYPE
===================================================== */

export interface IWorkingDay {
  enabled: boolean;
  start: string;
  end: string;
}

/* =====================================================
   WORKING HOURS TYPE
===================================================== */

export interface IWorkingHours {
  monday: IWorkingDay;
  tuesday: IWorkingDay;
  wednesday: IWorkingDay;
  thursday: IWorkingDay;
  friday: IWorkingDay;
  saturday: IWorkingDay;
  sunday: IWorkingDay;
}

/* =====================================================
   NOTIFICATION TYPE
===================================================== */

export interface IUserNotifications {
  bookingConfirmation: boolean;
  bookingCancellation: boolean;
  bookingReminder: boolean;
  roomAvailable: boolean;
}

/* =====================================================
   USER INTERFACE
===================================================== */

export interface IUser extends Document {
  /* -------------------- Basic Information -------------------- */

  name: string;

  email: string;

  passwordHash: string;

  department?: string;

  /* -------------------- Role -------------------- */

  role: UserRole;

  /* -------------------- Profile -------------------- */

  profileImage?: string;

  /* -------------------- Booking Preferences -------------------- */

  defaultLocation?: string;

  favoriteRoom?: mongoose.Types.ObjectId;

  defaultDuration: number;

  calendarView: CalendarView;

  timezone: string;

  /* -------------------- Notifications -------------------- */

  notifications: IUserNotifications;

  /* -------------------- Working Hours -------------------- */

  workingHours: IWorkingHours;

  /* -------------------- Timestamps -------------------- */

  createdAt: Date;

  updatedAt: Date;
}

/* =====================================================
   WORKING DAY SCHEMA
===================================================== */

const workingDaySchema =
  new Schema<IWorkingDay>(
    {
      enabled: {
        type: Boolean,
        default: true,
      },

      start: {
        type: String,
        default: "09:00",
        trim: true,
      },

      end: {
        type: String,
        default: "18:00",
        trim: true,
      },
    },
    {
      _id: false,
    }
  );

/* =====================================================
   USER SCHEMA
===================================================== */

const userSchema =
  new Schema<IUser>(
    {
      /* =================================================
         BASIC INFORMATION
      ================================================= */

      name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 100,
      },

      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
      },

      passwordHash: {
        type: String,
        required: true,
        select: false,
      },

      department: {
        type: String,
        trim: true,
        maxlength: 100,
      },

      /* =================================================
         ROLE
      ================================================= */

      role: {
        type: String,
        enum: [
          "ADMIN",
          "EMPLOYEE",
        ],
        default: "EMPLOYEE",
        required: true,
        index: true,
      },

      /* =================================================
         PROFILE
      ================================================= */

      profileImage: {
        type: String,
        trim: true,
      },

      /* =================================================
         BOOKING PREFERENCES
      ================================================= */

      defaultLocation: {
        type: String,
        trim: true,
        maxlength: 200,
      },

      favoriteRoom: {
        type: Schema.Types.ObjectId,
        ref: "Room",
      },

      defaultDuration: {
        type: Number,
        default: 60,
        min: 15,
        max: 480,
      },

      calendarView: {
        type: String,
        enum: [
          "DAY",
          "WEEK",
          "MONTH",
        ],
        default: "WEEK",
      },

      timezone: {
        type: String,
        default: "Asia/Kolkata",
        trim: true,
      },

      /* =================================================
         NOTIFICATIONS
      ================================================= */

      notifications: {
        bookingConfirmation: {
          type: Boolean,
          default: true,
        },

        bookingCancellation: {
          type: Boolean,
          default: true,
        },

        bookingReminder: {
          type: Boolean,
          default: true,
        },

        roomAvailable: {
          type: Boolean,
          default: false,
        },
      },

      /* =================================================
         WORKING HOURS
      ================================================= */

      workingHours: {
        /* ---------------- Monday ---------------- */

        monday: {
          type: workingDaySchema,
          default: () => ({}),
        },

        /* ---------------- Tuesday ---------------- */

        tuesday: {
          type: workingDaySchema,
          default: () => ({}),
        },

        /* ---------------- Wednesday ---------------- */

        wednesday: {
          type: workingDaySchema,
          default: () => ({}),
        },

        /* ---------------- Thursday ---------------- */

        thursday: {
          type: workingDaySchema,
          default: () => ({}),
        },

        /* ---------------- Friday ---------------- */

        friday: {
          type: workingDaySchema,
          default: () => ({}),
        },

        /* ---------------- Saturday ---------------- */

        saturday: {
          type: workingDaySchema,
          default: () => ({
            enabled: false,
          }),
        },

        /* ---------------- Sunday ---------------- */

        sunday: {
          type: workingDaySchema,
          default: () => ({
            enabled: false,
          }),
        },
      },
    },

    /* =================================================
       SCHEMA OPTIONS
    ================================================= */

    {
      timestamps: true,
    }
  );

/* =====================================================
   MODEL
===================================================== */

export const User =
  mongoose.model<IUser>(
    "User",
    userSchema
  );