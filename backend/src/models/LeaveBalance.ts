
import mongoose, {
  Document,
  Model,
  Schema,
  Types,
} from "mongoose";

import { LEAVE_TYPES, LeaveType } from "./Leave";

/* =====================================================
   INTERFACE
===================================================== */

export interface ILeaveBalance extends Document {
  employeeId: Types.ObjectId;
  leaveType: LeaveType;
  entitlement: number;
  approvedDays: number;
  pendingDays: number;
  year: number;
  availableDays: number;
  createdAt: Date;
  updatedAt: Date;
}

/* =====================================================
   VALIDATION HELPERS
===================================================== */

/**
 * Supports full days and half days only.
 * Valid values: 0, 0.5, 1, 1.5, 2, etc.
 */
const isValidLeaveDays = (value: number): boolean => {
  return (
    Number.isFinite(value) &&
    value >= 0 &&
    Number.isInteger(value * 2)
  );
};

/**
 * Validate calendar year.
 */
const isValidYear = (value: number): boolean => {
  return (
    Number.isInteger(value) &&
    value >= 2000 &&
    value <= 2200
  );
};

/* =====================================================
   SCHEMA
===================================================== */

const leaveBalanceSchema = new Schema<ILeaveBalance>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Employee ID is required"],
      index: true,
    },

    leaveType: {
      type: String,
      enum: {
        values: [...LEAVE_TYPES],
        message: "Invalid leave type",
      },
      required: [true, "Leave type is required"],
    },

    entitlement: {
      type: Number,
      required: [true, "Leave entitlement is required"],
      default: 0,
      min: [0, "Leave entitlement cannot be negative"],
      validate: {
        validator: isValidLeaveDays,
        message: "Entitlement must use increments of 0.5 days",
      },
    },

    approvedDays: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Approved leave days cannot be negative"],
      validate: {
        validator: isValidLeaveDays,
        message: "Approved days must use increments of 0.5 days",
      },
    },

    pendingDays: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Pending leave days cannot be negative"],
      validate: {
        validator: isValidLeaveDays,
        message: "Pending days must use increments of 0.5 days",
      },
    },

    year: {
      type: Number,
      required: true,
      default: () => new Date().getFullYear(),
      min: [2000, "Year must be valid"],
      max: [2200, "Year must be valid"],
      validate: {
        validator: isValidYear,
        message: "Year must be a valid integer between 2000 and 2200",
      },
    },

    availableDays: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Available leave days cannot be negative"],
      validate: {
        validator: isValidLeaveDays,
        message: "Available days must use increments of 0.5 days",
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/* =====================================================
   UNIQUE INDEX
===================================================== */

/**
 * Each employee can have only one balance record
 * per leave type per calendar year.
 */
leaveBalanceSchema.index(
  {
    employeeId: 1,
    leaveType: 1,
    year: 1,
  },
  {
    unique: true,
    name: "unique_employee_leave_balance_per_year",
  }
);

/* =====================================================
   BALANCE CALCULATION
===================================================== */

/**
 * Calculate available balance before validation.
 *
 * Formula:
 * Available Days = Entitlement - Approved Days
 *
 * Pending requests are displayed separately.
 * They do not reduce availableDays under the
 * existing leave balance policy.
 */
leaveBalanceSchema.pre("validate", function () {
  if (
    Number.isFinite(this.entitlement) &&
    Number.isFinite(this.approvedDays) &&
    this.entitlement >= 0 &&
    this.approvedDays >= 0
  ) {
    this.availableDays = Math.max(
      0,
      this.entitlement - this.approvedDays
    );
  }
});

/* =====================================================
   MODEL EXPORT
===================================================== */

/**
 * Prevent recompilation errors during repeated imports
 * and Next.js/backend development reloads.
 */
const LeaveBalance: Model<ILeaveBalance> =
  (mongoose.models.LeaveBalance as Model<ILeaveBalance>) ||
  mongoose.model<ILeaveBalance>(
    "LeaveBalance",
    leaveBalanceSchema
  );

export default LeaveBalance;
