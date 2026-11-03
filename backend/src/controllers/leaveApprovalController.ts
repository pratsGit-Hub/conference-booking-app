
import { Request, Response } from "express";
import mongoose, {
  ClientSession,
  Types,
} from "mongoose";

import Leave, {
  LeaveStatus,
  LeaveType,
} from "../models/Leave";

import LeaveBalance from "../models/LeaveBalance";

/* =====================================================
   AUTHENTICATED USER TYPES
===================================================== */

interface AuthenticatedUser {
  userId: string;
  role: "ADMIN" | "EMPLOYEE";
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/* =====================================================
   GET AUTHENTICATED USER
===================================================== */

const getAuthenticatedUser = (req: Request) => {
  const user = (req as AuthenticatedRequest).user;

  if (!user || !user.userId) {
    return null;
  }

  if (!Types.ObjectId.isValid(user.userId)) {
    return null;
  }

  return {
    id: new Types.ObjectId(user.userId),
    role: user.role,
  };
};

/* =====================================================
   ADMIN AUTHORIZATION
===================================================== */

const isAdmin = (role: string): boolean => {
  return role === "ADMIN";
};

const authorizeAdmin = (
  req: Request,
  res: Response
): Types.ObjectId | null => {
  const admin = getAuthenticatedUser(req);

  if (!admin) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });

    return null;
  }

  if (!isAdmin(admin.role)) {
    res.status(403).json({
      success: false,
      message: "Only administrators can manage leave requests.",
    });

    return null;
  }

  return admin.id;
};

/* =====================================================
   ERROR HANDLING
===================================================== */

class LeaveApprovalError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "LeaveApprovalError";
  }
}

const sendControllerError = (
  res: Response,
  error: unknown,
  operation: string
): void => {
  console.error(`${operation} error:`, error);

  if (error instanceof LeaveApprovalError) {
    const responses: Record<
      string,
      { status: number; message: string }
    > = {
      LEAVE_REQUEST_NOT_FOUND: {
        status: 404,
        message: "Leave request not found.",
      },

      LEAVE_REQUEST_ALREADY_PROCESSED: {
        status: 409,
        message: "This leave request has already been processed.",
      },

      LEAVE_BALANCE_NOT_CONFIGURED: {
        status: 409,
        message:
          "Leave entitlement is not configured for this employee and leave type.",
      },

      INSUFFICIENT_LEAVE_BALANCE: {
        status: 409,
        message:
          "The employee does not have enough available leave balance.",
      },

      CROSS_YEAR_LEAVE_NOT_SUPPORTED: {
        status: 400,
        message:
          "This leave request crosses calendar years and requires HR review.",
      },
    };

    const knownError = responses[error.code];

    if (knownError) {
      res.status(knownError.status).json({
        success: false,
        message: knownError.message,
      });

      return;
    }
  }

  res.status(500).json({
    success: false,
    message: `Unable to ${operation.toLowerCase()}.`,
  });
};

/* =====================================================
   VALIDATE LEAVE REQUEST ID
===================================================== */

const getLeaveRequestId = (
  req: Request,
  res: Response
): string | null => {
  const rawId: unknown = req.params["id"];

  // Check that ID is a valid string.
  if (
    typeof rawId !== "string" ||
    rawId.trim().length === 0
  ) {
    res.status(400).json({
      success: false,
      message: "Invalid leave request ID.",
    });

    return null;
  }

  const id: string = rawId.trim();

  // Check MongoDB ObjectId format.
  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: "Invalid leave request ID.",
    });

    return null;
  }

  return id;
};

/* =====================================================
   VALIDATE APPROVER COMMENT
===================================================== */

const getApproverComment = (
  req: Request,
  res: Response
): string | null => {
  const comment: unknown = req.body?.approverComment;

  if (
    comment !== undefined &&
    typeof comment !== "string"
  ) {
    res.status(400).json({
      success: false,
      message: "Approver comment must be a string.",
    });

    return null;
  }

  const approverComment =
    typeof comment === "string"
      ? comment.trim()
      : "";

  if (approverComment.length > 2000) {
    res.status(400).json({
      success: false,
      message: "Approver comment cannot exceed 2000 characters.",
    });

    return null;
  }

  return approverComment;
};

/* =====================================================
   SYNCHRONIZE EMPLOYEE LEAVE BALANCE
===================================================== */

const synchronizeBalance = async (
  employeeId: Types.ObjectId,
  leaveType: LeaveType,
  year: number,
  session: ClientSession
): Promise<void> => {
  const balance = await LeaveBalance.findOne({
    employeeId,
    leaveType,
    year,
  }).session(session);

  if (!balance) {
    return;
  }

  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year + 1, 0, 1));

  const usage = await Leave.aggregate<{
    _id: LeaveStatus;
    totalDays: number;
  }>([
    {
      $match: {
        employeeId,
        leaveType,
        startDate: {
          $gte: yearStart,
          $lt: yearEnd,
        },
        status: {
          $in: ["Approved", "Pending"],
        },
      },
    },
    {
      $group: {
        _id: "$status",
        totalDays: {
          $sum: "$days",
        },
      },
    },
  ]).session(session);

  let approvedDays = 0;
  let pendingDays = 0;

  for (const item of usage) {
    if (item._id === "Approved") {
      approvedDays = item.totalDays;
    }

    if (item._id === "Pending") {
      pendingDays = item.totalDays;
    }
  }

  balance.approvedDays = approvedDays;
  balance.pendingDays = pendingDays;

  await balance.save({ session });
};

/* =====================================================
   1. GET ALL LEAVE REQUESTS FOR ADMIN
===================================================== */

/**
 * GET /api/leaves/admin
 *
 * Query parameters:
 * ?status=Pending
 * ?page=1
 * ?limit=10
 */

export const getAllLeaveRequestsForAdmin = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const adminId = authorizeAdmin(req, res);

    if (!adminId) return;

    const requestedStatus = req.query.status
      ? String(req.query.status)
      : "";

    const allowedStatuses: LeaveStatus[] = [
      "Pending",
      "Approved",
      "Rejected",
      "Cancelled",
    ];

    if (
      requestedStatus &&
      !allowedStatuses.includes(
        requestedStatus as LeaveStatus
      )
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid leave request status filter.",
        allowedStatuses,
      });

      return;
    }

    const page = Math.max(
      1,
      Number(req.query.page) || 1
    );

    const limit = Math.min(
      100,
      Math.max(1, Number(req.query.limit) || 10)
    );

    const filter: {
      status?: LeaveStatus;
    } = {};

    if (requestedStatus) {
      filter.status = requestedStatus as LeaveStatus;
    }

    const [requests, total] = await Promise.all([
      Leave.find(filter)
        .populate("employeeId", "name email department")
        .populate("approvedBy", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Leave.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: requests.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      requests,
    });
  } catch (error: unknown) {
    sendControllerError(
      res,
      error,
      "Retrieve leave requests"
    );
  }
};

/* =====================================================
   2. APPROVE LEAVE REQUEST
===================================================== */

/**
 * PATCH /api/leaves/:id/approve
 *
 * Body:
 * {
 *   "approverComment": "Approved by Admin"
 * }
 */

export const approveLeaveRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  let session: ClientSession | undefined;

  try {
    const adminId = authorizeAdmin(req, res);

    if (!adminId) return;

    const id = getLeaveRequestId(req, res);

    if (!id) return;

    const approverComment = getApproverComment(
      req,
      res
    );

    if (approverComment === null) return;

    session = await mongoose.startSession();

    let approvedRequest: unknown = null;

    await session.withTransaction(async () => {
      const request = await Leave.findById(id)
        .session(session!);

      if (!request) {
        throw new LeaveApprovalError(
          "LEAVE_REQUEST_NOT_FOUND",
          "Leave request not found."
        );
      }

      if (request.status !== "Pending") {
        throw new LeaveApprovalError(
          "LEAVE_REQUEST_ALREADY_PROCESSED",
          "Leave request has already been processed."
        );
      }

      const year = request.startDate.getUTCFullYear();

      if (request.endDate.getUTCFullYear() !== year) {
        throw new LeaveApprovalError(
          "CROSS_YEAR_LEAVE_NOT_SUPPORTED",
          "Cross-year leave is not supported."
        );
      }

      const balance = await LeaveBalance.findOne({
        employeeId: request.employeeId,
        leaveType: request.leaveType,
        year,
      }).session(session!);

      if (!balance) {
        throw new LeaveApprovalError(
          "LEAVE_BALANCE_NOT_CONFIGURED",
          "Leave balance not configured."
        );
      }

      // Recalculate existing leave usage.
      await synchronizeBalance(
        request.employeeId,
        request.leaveType,
        year,
        session!
      );

      const refreshedBalance = await LeaveBalance.findOne({
        employeeId: request.employeeId,
        leaveType: request.leaveType,
        year,
      }).session(session!);

      if (!refreshedBalance) {
        throw new LeaveApprovalError(
          "LEAVE_BALANCE_NOT_CONFIGURED",
          "Leave balance not configured."
        );
      }

      const availableDays =
        refreshedBalance.entitlement -
        refreshedBalance.approvedDays;

      if (request.days > availableDays) {
        throw new LeaveApprovalError(
          "INSUFFICIENT_LEAVE_BALANCE",
          "Insufficient leave balance."
        );
      }

      // Approve only if the request is still Pending.
      const updatedRequest = await Leave.findOneAndUpdate(
        {
          _id: id,
          status: "Pending",
        },
        {
          $set: {
            status: "Approved",
            approvedBy: adminId,
            approverComment,
          },
        },
        {
          new: true,
          runValidators: true,
          session: session!,
        }
      );

      if (!updatedRequest) {
        throw new LeaveApprovalError(
          "LEAVE_REQUEST_ALREADY_PROCESSED",
          "Leave request has already been processed."
        );
      }

      // Synchronize the balance after approval.
      await synchronizeBalance(
        request.employeeId,
        request.leaveType,
        year,
        session!
      );

      approvedRequest = updatedRequest;
    });

    res.status(200).json({
      success: true,
      message: "Leave request approved successfully.",
      request: approvedRequest,
    });
  } catch (error: unknown) {
    sendControllerError(
      res,
      error,
      "Approve leave request"
    );
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

/* =====================================================
   3. REJECT LEAVE REQUEST
===================================================== */

/**
 * PATCH /api/leaves/:id/reject
 *
 * Body:
 * {
 *   "approverComment": "Please provide additional information."
 * }
 */

export const rejectLeaveRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  let session: ClientSession | undefined;

  try {
    const adminId = authorizeAdmin(req, res);

    if (!adminId) return;

    const id = getLeaveRequestId(req, res);

    if (!id) return;

    const approverComment = getApproverComment(
      req,
      res
    );

    if (approverComment === null) return;

    session = await mongoose.startSession();

    let rejectedRequest: unknown = null;

    await session.withTransaction(async () => {
      const request = await Leave.findById(id)
        .session(session!);

      if (!request) {
        throw new LeaveApprovalError(
          "LEAVE_REQUEST_NOT_FOUND",
          "Leave request not found."
        );
      }

      if (request.status !== "Pending") {
        throw new LeaveApprovalError(
          "LEAVE_REQUEST_ALREADY_PROCESSED",
          "Leave request has already been processed."
        );
      }

      const updatedRequest = await Leave.findOneAndUpdate(
        {
          _id: id,
          status: "Pending",
        },
        {
          $set: {
            status: "Rejected",
            approvedBy: adminId,
            approverComment,
          },
        },
        {
          new: true,
          runValidators: true,
          session: session!,
        }
      );

      if (!updatedRequest) {
        throw new LeaveApprovalError(
          "LEAVE_REQUEST_ALREADY_PROCESSED",
          "Leave request has already been processed."
        );
      }

      // Recalculate balance after rejection.
      const year = request.startDate.getUTCFullYear();

      await synchronizeBalance(
        request.employeeId,
        request.leaveType,
        year,
        session!
      );

      rejectedRequest = updatedRequest;
    });

    res.status(200).json({
      success: true,
      message: "Leave request rejected successfully.",
      request: rejectedRequest,
    });
  } catch (error: unknown) {
    sendControllerError(
      res,
      error,
      "Reject leave request"
    );
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};
