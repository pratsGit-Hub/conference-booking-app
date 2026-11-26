
import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type LeaveActivityType =
  | "BALANCE_ADDED"
  | "BALANCE_REDUCED"
  | "FIRST_LEVEL_ACCEPTED"
  | "FIRST_LEVEL_DECLINED"
  | "ADMIN_APPROVED"
  | "ADMIN_REJECTED";

export interface ILeaveActivityLog extends Document {
  actorId: Types.ObjectId;
  actorName: string;
  actorEmail: string;
  actorRole: "ADMIN" | "EMPLOYEE";
  employeeId: Types.ObjectId;
  employeeName: string;
  employeeEmail: string;
  activityType: LeaveActivityType;
  leaveType?: string;
  leaveRequestId?: Types.ObjectId;
  days?: number;
  previousEntitlement?: number;
  newEntitlement?: number;
  createdAt: Date;
  updatedAt: Date;
}

const leaveActivityLogSchema = new Schema<ILeaveActivityLog>(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actorName: {
      type: String,
      required: true,
      trim: true,
    },
    actorEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    actorRole: {
      type: String,
      enum: ["ADMIN", "EMPLOYEE"],
      required: true,
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    employeeName: {
      type: String,
      required: true,
      trim: true,
    },
    employeeEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    activityType: {
      type: String,
      enum: [
        "BALANCE_ADDED",
        "BALANCE_REDUCED",
        "FIRST_LEVEL_ACCEPTED",
        "FIRST_LEVEL_DECLINED",
        "ADMIN_APPROVED",
        "ADMIN_REJECTED",
      ],
      required: true,
      index: true,
    },
    leaveType: {
      type: String,
      trim: true,
    },
    leaveRequestId: {
      type: Schema.Types.ObjectId,
      ref: "Leave",
    },
    days: {
      type: Number,
      min: 0,
      validate: {
        validator: (value: number) =>
          Number.isFinite(value) && Number.isInteger(value * 2),
        message: "Days must use increments of 0.5",
      },
    },
    previousEntitlement: {
      type: Number,
      min: 0,
    },
    newEntitlement: {
      type: Number,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

leaveActivityLogSchema.index({ createdAt: -1 });
leaveActivityLogSchema.index({ employeeId: 1, createdAt: -1 });
leaveActivityLogSchema.index({ actorId: 1, createdAt: -1 });

const LeaveActivityLog: Model<ILeaveActivityLog> =
  (mongoose.models.LeaveActivityLog as Model<ILeaveActivityLog>) ||
  mongoose.model<ILeaveActivityLog>(
    "LeaveActivityLog",
    leaveActivityLogSchema
  );

export default LeaveActivityLog;
