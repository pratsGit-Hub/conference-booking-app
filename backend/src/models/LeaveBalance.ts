import mongoose, { Document, Model, Schema, Types } from "mongoose";

import { LEAVE_TYPES, LeaveType } from "./Leave";

/**
 * Leave balance document interface.
 */
export interface ILeaveBalance extends Document {
  employeeId: Types.ObjectId;

  leaveType: LeaveType;

  /**
   * Total leave days allocated to the employee for the year.
   */
  entitlement: number;

  /**
   * Leave days already approved and taken.
   */
  approvedDays: number;

  /**
   * Leave days awaiting approval.
   */
  pendingDays: number;

  /**
   * Optional year for which this balance applies.
   */
  year: number;

  /**
   * Remaining balance after approved leave.
   *
   * Pending leave is tracked separately and does not reduce
   * availableDays in this implementation.
   */
  availableDays: number;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Leave balance schema.
 */
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
      min: [0, "Leave entitlement cannot be negative"],
      default: 0,
      validate: {
        validator: (value: number) =>
          Number.isFinite(value) && value >= 0,
        message: "Entitlement must be a non-negative number",
      },
    },

    approvedDays: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Approved leave days cannot be negative"],
      validate: {
        validator: (value: number) =>
          Number.isFinite(value) && value >= 0,
        message: "Approved days must be a non-negative number",
      },
    },

    pendingDays: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Pending leave days cannot be negative"],
      validate: {
        validator: (value: number) =>
          Number.isFinite(value) && value >= 0,
        message: "Pending days must be a non-negative number",
      },
    },

    year: {
      type: Number,
      required: true,
      default: () => new Date().getFullYear(),
      min: [2000, "Year must be valid"],
      max: [2200, "Year must be valid"],
      validate: {
        validator: (value: number) =>
          Number.isInteger(value) && value >= 2000 && value <= 2200,
        message: "Year must be a valid integer",
      },
    },

    availableDays: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Available leave days cannot be negative"],
      validate: {
        validator: (value: number) =>
          Number.isFinite(value) && value >= 0,
        message: "Available days must be a non-negative number",
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/**
 * Each employee can have only one balance record per leave type
 * per calendar year.
 */
leaveBalanceSchema.index(
  {
    employeeId: 1,
    leaveType: 1,
    year: 1,
  },
  {
    unique: true,
  }
);

/**
 * Calculate the available balance before saving.
 *
 * Pending requests are displayed separately and do not reduce
 * availableDays under the current policy assumption.
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

/**
 * Export the model without recompiling it during repeated imports.
 */
const LeaveBalance: Model<ILeaveBalance> =
  (mongoose.models.LeaveBalance as Model<ILeaveBalance>) ||
  mongoose.model<ILeaveBalance>(
    "LeaveBalance",
    leaveBalanceSchema
  );

export default LeaveBalance;