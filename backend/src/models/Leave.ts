
import mongoose, {
  Document,
  Model,
  Schema,
  Types,
} from "mongoose";

/* =====================================================
   SUPPORTED LEAVE TYPES
===================================================== */

export const LEAVE_TYPES = [
  "Annual Leave",
  "Casual Leave",
  "Sick Leave",
  "Maternity Leave",
  "Paternity Leave",
  "Unpaid Leave",
  "Other",
] as const;

export type LeaveType = (typeof LEAVE_TYPES)[number];

/* =====================================================
   APPROVAL STATUSES
===================================================== */

export const FIRST_LEVEL_STATUSES = [
  "Pending",
  "Accepted",
  "Declined",
] as const;

export type FirstLevelStatus =
  (typeof FIRST_LEVEL_STATUSES)[number];

export const LEAVE_STATUSES = [
  "Pending",
  "Approved",
  "Rejected",
  "Cancelled",
] as const;

export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

/* =====================================================
   APPROVAL HISTORY TYPES
===================================================== */

export const APPROVAL_ACTIONS = [
  "SUBMITTED",
  "FIRST_LEVEL_ACCEPTED",
  "FIRST_LEVEL_DECLINED",
  "ADMIN_APPROVED",
  "ADMIN_REJECTED",
  "CANCELLED",
] as const;

export type ApprovalAction =
  (typeof APPROVAL_ACTIONS)[number];

export interface IApprovalHistory {
  action: ApprovalAction;

  performedBy: Types.ObjectId;

  performedByName: string;

  performedByEmail: string;

  comment?: string;

  performedAt: Date;
}

/* =====================================================
   LEAVE DOCUMENT INTERFACE
===================================================== */

export interface ILeave extends Document {
  // Employee information
  employeeId: Types.ObjectId;
  employeeName: string;
  employeeEmail: string;
  department?: string;

  // Leave information
  leaveType: LeaveType;

  startDate: Date;
  endDate: Date;

  days: number;
  reason: string;

  // Overall leave status
  status: LeaveStatus;

  // First-level approver
  firstLevelApproverId: Types.ObjectId;
  firstLevelApproverName: string;
  firstLevelApproverEmail: string;

  firstLevelStatus: FirstLevelStatus;

  firstLevelComment?: string;
  firstLevelDecisionAt?: Date | null;

  // Final admin approval
  approvedBy?: Types.ObjectId | null;
  approvedByName?: string;
  approvedByEmail?: string;

  adminComment?: string;
  adminDecisionAt?: Date | null;

  // Legacy approval fields
  approverComment?: string;

  // Complete approval history
  approvalHistory: IApprovalHistory[];

  createdAt: Date;
  updatedAt: Date;
}

/* =====================================================
   APPROVAL HISTORY SUB-SCHEMA
===================================================== */

const approvalHistorySchema =
  new Schema<IApprovalHistory>(
    {
      action: {
        type: String,
        enum: [...APPROVAL_ACTIONS],
        required: true,
      },

      performedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      performedByName: {
        type: String,
        required: true,
        trim: true,
      },

      performedByEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },

      comment: {
        type: String,
        trim: true,
        maxlength: 2000,
      },

      performedAt: {
        type: Date,
        default: Date.now,
        required: true,
      },
    },
    {
      _id: false,
    }
  );

/* =====================================================
   LEAVE SCHEMA
===================================================== */

const leaveSchema = new Schema<ILeave>(
  {
    // -------------------------------------------------
    // EMPLOYEE INFORMATION
    // -------------------------------------------------

    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Employee ID is required"],
      index: true,
    },

    employeeName: {
      type: String,
      required: [true, "Employee name is required"],
      trim: true,
      maxlength: [150, "Employee name cannot exceed 150 characters"],
    },

    employeeEmail: {
      type: String,
      required: [true, "Employee email is required"],
      trim: true,
      lowercase: true,
      maxlength: [254, "Email cannot exceed 254 characters"],
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid employee email address",
      ],
    },

    department: {
      type: String,
      trim: true,
      maxlength: [100, "Department cannot exceed 100 characters"],
    },

    // -------------------------------------------------
    // LEAVE TYPE
    // -------------------------------------------------

    leaveType: {
      type: String,
      enum: {
        values: [...LEAVE_TYPES],
        message: "Invalid leave type",
      },
      required: [true, "Leave type is required"],
    },

    // -------------------------------------------------
    // LEAVE DATES
    // -------------------------------------------------

    startDate: {
      type: Date,
      required: [true, "Start date is required"],
      validate: {
        validator: (value: Date): boolean =>
          value instanceof Date &&
          !Number.isNaN(value.getTime()),
        message: "Start date must be a valid date",
      },
    },

    endDate: {
      type: Date,
      required: [true, "End date is required"],
      validate: {
        validator: (value: Date): boolean =>
          value instanceof Date &&
          !Number.isNaN(value.getTime()),
        message: "End date must be a valid date",
      },
    },

    // -------------------------------------------------
    // LEAVE DURATION
    // -------------------------------------------------

    days: {
      type: Number,
      required: [true, "Leave duration is required"],
      min: [1, "Leave duration must be at least one day"],
      validate: {
        validator: (value: number): boolean =>
          Number.isFinite(value) && value > 0,
        message: "Leave duration must be a positive number",
      },
    },

    // -------------------------------------------------
    // LEAVE REASON
    // -------------------------------------------------

    reason: {
      type: String,
      required: [true, "Leave reason is required"],
      trim: true,
      minlength: [
        3,
        "Leave reason must contain at least 3 characters",
      ],
      maxlength: [
        2000,
        "Leave reason cannot exceed 2000 characters",
      ],
    },

    // -------------------------------------------------
    // OVERALL LEAVE STATUS
    // -------------------------------------------------

    status: {
      type: String,
      enum: {
        values: [...LEAVE_STATUSES],
        message: "Invalid leave status",
      },
      default: "Pending",
      required: true,
      index: true,
    },

    // -------------------------------------------------
    // FIRST-LEVEL APPROVER
    // -------------------------------------------------

    firstLevelApproverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [
        true,
        "First-level approver is required",
      ],
      index: true,
    },

    firstLevelApproverName: {
      type: String,
      required: [
        true,
        "First-level approver name is required",
      ],
      trim: true,
      maxlength: 150,
    },

    firstLevelApproverEmail: {
      type: String,
      required: [
        true,
        "First-level approver email is required",
      ],
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid approver email address",
      ],
    },

    firstLevelStatus: {
      type: String,
      enum: {
        values: [...FIRST_LEVEL_STATUSES],
        message: "Invalid first-level approval status",
      },
      default: "Pending",
      required: true,
      index: true,
    },

    firstLevelComment: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    firstLevelDecisionAt: {
      type: Date,
      default: null,
    },

    // -------------------------------------------------
    // FINAL ADMIN APPROVAL
    // -------------------------------------------------

    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedByName: {
      type: String,
      trim: true,
      maxlength: 150,
    },

    approvedByEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },

    adminComment: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    adminDecisionAt: {
      type: Date,
      default: null,
    },

    // -------------------------------------------------
    // LEGACY APPROVAL COMMENT
    // -------------------------------------------------

    approverComment: {
      type: String,
      trim: true,
      maxlength: [
        2000,
        "Approver comment cannot exceed 2000 characters",
      ],
    },

    // -------------------------------------------------
    // APPROVAL HISTORY
    // -------------------------------------------------

    approvalHistory: {
      type: [approvalHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/* =====================================================
   SCHEMA-LEVEL DATE VALIDATION
===================================================== */

leaveSchema.pre("validate", function () {
  if (
    this.startDate instanceof Date &&
    this.endDate instanceof Date &&
    !Number.isNaN(this.startDate.getTime()) &&
    !Number.isNaN(this.endDate.getTime()) &&
    this.endDate < this.startDate
  ) {
    this.invalidate(
      "endDate",
      "End date cannot be before the start date"
    );
  }

  // An employee cannot approve their own leave.
  if (
    this.employeeId &&
    this.firstLevelApproverId &&
    this.employeeId.equals(this.firstLevelApproverId)
  ) {
    this.invalidate(
      "firstLevelApproverId",
      "You cannot select yourself as the first-level approver"
    );
  }

  // Admin approval must follow first-level acceptance.
  if (
    this.status === "Approved" &&
    this.firstLevelStatus !== "Accepted"
  ) {
    this.invalidate(
      "status",
      "Leave cannot be approved before first-level acceptance"
    );
  }
});

/* =====================================================
   DATABASE INDEXES
===================================================== */

leaveSchema.index({
  employeeId: 1,
  createdAt: -1,
});

leaveSchema.index({
  employeeId: 1,
  status: 1,
});

leaveSchema.index({
  status: 1,
  startDate: 1,
  endDate: 1,
});

leaveSchema.index({
  firstLevelApproverId: 1,
  firstLevelStatus: 1,
  createdAt: -1,
});

leaveSchema.index({
  status: 1,
  firstLevelStatus: 1,
  createdAt: -1,
});

/* =====================================================
   EXPORT MODEL
===================================================== */

const Leave: Model<ILeave> =
  (mongoose.models.Leave as Model<ILeave>) ||
  mongoose.model<ILeave>("Leave", leaveSchema);

export default Leave;
