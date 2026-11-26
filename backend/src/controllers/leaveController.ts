
import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";

import Leave, {
  LEAVE_TYPES,
  LeaveType,
  ApprovalAction,
} from "../models/Leave";

import LeaveBalance from "../models/LeaveBalance";
import User from "../models/User";
import LeaveActivityLog from "../models/LeaveActivityLog";

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

interface EmployeeIdentity {
  employeeId: Types.ObjectId;
  employeeName: string;
  employeeEmail: string;
  department: string;
  role: "ADMIN" | "EMPLOYEE";
}

/* =====================================================
   GET AUTHENTICATED USER FROM DATABASE
===================================================== */

const getAuthenticatedEmployee = async (
  req: Request
): Promise<EmployeeIdentity | null> => {
  const authUser = (req as AuthenticatedRequest).user;

  if (
    !authUser ||
    typeof authUser.userId !== "string" ||
    !Types.ObjectId.isValid(authUser.userId)
  ) {
    return null;
  }

  const employee = await User.findById(authUser.userId)
    .select("name email department role")
    .lean();

  if (
    !employee ||
    (employee.role !== "ADMIN" &&
      employee.role !== "EMPLOYEE")
  ) {
    return null;
  }

  return {
    employeeId: new Types.ObjectId(authUser.userId),
    employeeName: employee.name,
    employeeEmail: employee.email.toLowerCase(),
    department: employee.department || "",
    role: employee.role,
  };
};

/* =====================================================
   ROLE VALIDATION
===================================================== */

const requireAdmin = (
  employee: EmployeeIdentity,
  res: Response
): boolean => {
  if (employee.role !== "ADMIN") {
    res.status(403).json({
      success: false,
      message: "Administrator access is required.",
    });

    return false;
  }

  return true;
};

/* =====================================================
   VALIDATE LEAVE REQUEST ID
===================================================== */

const getLeaveRequestId = (
  req: Request,
  res: Response
): string | null => {
  const rawId: unknown = req.params["id"];

  if (
    typeof rawId !== "string" ||
    rawId.trim() === ""
  ) {
    res.status(400).json({
      success: false,
      message: "Invalid leave request ID.",
    });

    return null;
  }

  const id = rawId.trim();

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
   DATE PARSING
===================================================== */

const parseDate = (value: unknown): Date | null => {
  if (typeof value === "string") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null;
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      return null;
    }

    return date;
  }

  if (
    value instanceof Date &&
    !Number.isNaN(value.getTime())
  ) {
    return new Date(
      Date.UTC(
        value.getUTCFullYear(),
        value.getUTCMonth(),
        value.getUTCDate()
      )
    );
  }

  return null;
};

/* =====================================================
   CALCULATE LEAVE DAYS
===================================================== */

const calculateLeaveDays = (
  startDate: Date,
  endDate: Date
): number => {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return (
    Math.floor(
      (endDate.getTime() - startDate.getTime()) /
        millisecondsPerDay
    ) + 1
  );
};

/* =====================================================
   VALIDATE LEAVE TYPE
===================================================== */

const isValidLeaveType = (
  value: unknown
): value is LeaveType => {
  return (
    typeof value === "string" &&
    LEAVE_TYPES.includes(value as LeaveType)
  );
};

/* =====================================================
   VALIDATE OPTIONAL COMMENT
===================================================== */

const getComment = (
  value: unknown
): string | null => {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value !== "string") {
    return null;
  }

  const comment = value.trim();

  if (comment.length > 2000) {
    return null;
  }

  return comment;
};

/* =====================================================
   ADD APPROVAL HISTORY ENTRY
===================================================== */

const addApprovalHistory = (
  request: InstanceType<typeof Leave>,
  employee: EmployeeIdentity,
  action: ApprovalAction,
  comment = ""
): void => {
  request.approvalHistory.push({
    action,
    performedBy: employee.employeeId,
    performedByName: employee.employeeName,
    performedByEmail: employee.employeeEmail,
    comment,
    performedAt: new Date(),
  });
};

/* =====================================================
   SYNCHRONIZE EMPLOYEE LEAVE BALANCES
===================================================== */

const syncEmployeeBalances = async (
  employeeId: Types.ObjectId,
  year: number
): Promise<void> => {
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year + 1, 0, 1));

  const balances = await LeaveBalance.find({
    employeeId,
    year,
  });

  if (balances.length === 0) {
    return;
  }

  const usage = await Leave.aggregate([
    {
      $match: {
        employeeId,
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
        _id: {
          leaveType: "$leaveType",
          status: "$status",
        },
        totalDays: {
          $sum: "$days",
        },
      },
    },
  ]);

  const usageMap = new Map<string, number>();

  for (const item of usage) {
    const key = `${item._id.leaveType}:${item._id.status}`;
    usageMap.set(key, item.totalDays);
  }

  for (const balance of balances) {
    balance.approvedDays =
      usageMap.get(`${balance.leaveType}:Approved`) || 0;

    balance.pendingDays =
      usageMap.get(`${balance.leaveType}:Pending`) || 0;

    await balance.save();
  }
};

/* =====================================================
   CREATE SHARED LEAVE ACTIVITY
===================================================== */

const createLeaveActivity = async (data: {
  actor: EmployeeIdentity;
  employeeId: Types.ObjectId;
  employeeName: string;
  employeeEmail: string;
  activityType:
    | "BALANCE_ADDED"
    | "BALANCE_REDUCED"
    | "FIRST_LEVEL_ACCEPTED"
    | "FIRST_LEVEL_DECLINED"
    | "ADMIN_APPROVED"
    | "ADMIN_REJECTED";
  leaveType?: string;
  leaveRequestId?: Types.ObjectId;
  days?: number;
  previousEntitlement?: number;
  newEntitlement?: number;
}): Promise<void> => {
  await LeaveActivityLog.create({
    actorId: data.actor.employeeId,
    actorName: data.actor.employeeName,
    actorEmail: data.actor.employeeEmail,
    actorRole: data.actor.role,

    employeeId: data.employeeId,
    employeeName: data.employeeName,
    employeeEmail: data.employeeEmail,

    activityType: data.activityType,
    leaveType: data.leaveType,
    leaveRequestId: data.leaveRequestId,
    days: data.days,
    previousEntitlement: data.previousEntitlement,
    newEntitlement: data.newEntitlement,
  });
};

/* =====================================================
   1. SEARCH REGISTERED EMPLOYEES
===================================================== */

/**
 * GET /api/leaves/employees/search?q=rahul
 *
 * Any registered ADMIN or EMPLOYEE can be a first-level
 * approver. The applicant cannot select themselves.
 */

export const searchEmployees = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const currentUser = await getAuthenticatedEmployee(req);

    if (!currentUser) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const query =
      typeof req.query.q === "string"
        ? req.query.q.trim()
        : "";

    if (query.length < 2) {
      res.status(200).json({
        success: true,
        employees: [],
      });
      return;
    }

    const escapedQuery = query.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const employees = await User.find({
      _id: { $ne: currentUser.employeeId },
      role: { $in: ["ADMIN", "EMPLOYEE"] },
      $or: [
        {
          name: {
            $regex: escapedQuery,
            $options: "i",
          },
        },
        {
          email: {
            $regex: escapedQuery,
            $options: "i",
          },
        },
      ],
    })
      .select("name email department role")
      .limit(10)
      .lean();

    res.status(200).json({
      success: true,
      employees: employees.map((employee) => ({
        id: employee._id,
        name: employee.name,
        email: employee.email,
        department: employee.department || "",
      })),
    });
  } catch (error: unknown) {
    console.error("Employee search error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to search employees.",
    });
  }
};

/* =====================================================
   2. CREATE A LEAVE REQUEST
===================================================== */

/**
 * POST /api/leaves
 *
 * Required body:
 * {
 *   leaveType,
 *   startDate,
 *   endDate,
 *   reason,
 *   firstLevelApproverEmail
 * }
 */

export const createLeaveRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const employee = await getAuthenticatedEmployee(req);

    if (!employee) {
      res.status(401).json({
        success: false,
        message: "Authentication required. Please log in again.",
      });
      return;
    }

    const {
      leaveType,
      startDate,
      endDate,
      reason,
      firstLevelApproverEmail,
    } = req.body;

    if (!isValidLeaveType(leaveType)) {
      res.status(400).json({
        success: false,
        message: "Please select a valid leave type.",
        supportedLeaveTypes: LEAVE_TYPES,
      });
      return;
    }

    const parsedStartDate = parseDate(startDate);
    const parsedEndDate = parseDate(endDate);

    if (!parsedStartDate || !parsedEndDate) {
      res.status(400).json({
        success: false,
        message: "Please provide valid dates in YYYY-MM-DD format.",
      });
      return;
    }

    if (parsedEndDate < parsedStartDate) {
      res.status(400).json({
        success: false,
        message: "End date cannot be before the start date.",
      });
      return;
    }

    if (
      typeof reason !== "string" ||
      reason.trim().length < 3 ||
      reason.trim().length > 2000
    ) {
      res.status(400).json({
        success: false,
        message:
          "Please provide a leave reason between 3 and 2000 characters.",
      });
      return;
    }

    if (
      typeof firstLevelApproverEmail !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        firstLevelApproverEmail.trim()
      )
    ) {
      res.status(400).json({
        success: false,
        message: "Please select a valid first-level approver.",
      });
      return;
    }

    const approverEmail =
      firstLevelApproverEmail.trim().toLowerCase();

    if (approverEmail === employee.employeeEmail) {
      res.status(400).json({
        success: false,
        message: "You cannot select yourself as the approver.",
      });
      return;
    }

    const firstLevelApprover = await User.findOne({
      email: approverEmail,
      role: { $in: ["ADMIN", "EMPLOYEE"] },
    })
      .select("name email department role")
      .lean();

    if (!firstLevelApprover) {
      res.status(404).json({
        success: false,
        message:
          "The selected approver is not a registered Dangote user.",
      });
      return;
    }

    const days = calculateLeaveDays(
      parsedStartDate,
      parsedEndDate
    );

    // Prevent overlapping pending or approved requests.
    const overlappingRequest = await Leave.findOne({
      employeeId: employee.employeeId,
      status: {
        $in: ["Pending", "Approved"],
      },
      startDate: {
        $lte: parsedEndDate,
      },
      endDate: {
        $gte: parsedStartDate,
      },
    });

    if (overlappingRequest) {
      res.status(409).json({
        success: false,
        message:
          "You already have a pending or approved leave request overlapping these dates.",
      });
      return;
    }

    const leaveRequest = await Leave.create({
      employeeId: employee.employeeId,
      employeeName: employee.employeeName,
      employeeEmail: employee.employeeEmail,
      department: employee.department,

      leaveType,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      days,
      reason: reason.trim(),

      firstLevelApproverId: firstLevelApprover._id,
      firstLevelApproverName: firstLevelApprover.name,
      firstLevelApproverEmail: firstLevelApprover.email,

      firstLevelStatus: "Pending",
      firstLevelComment: "",
      firstLevelDecisionAt: null,

      status: "Pending",

      approvedBy: null,
      adminComment: "",
      adminDecisionAt: null,

      approverComment: "",

      approvalHistory: [
        {
          action: "SUBMITTED",
          performedBy: employee.employeeId,
          performedByName: employee.employeeName,
          performedByEmail: employee.employeeEmail,
          comment: "Leave request submitted.",
          performedAt: new Date(),
        },
      ],
    });

    await syncEmployeeBalances(
      employee.employeeId,
      parsedStartDate.getUTCFullYear()
    );

    res.status(201).json({
      success: true,
      message:
        "Leave request submitted and sent to the first-level approver.",
      request: leaveRequest,
    });
  } catch (error: unknown) {
    console.error("Create leave request error:", error);

    if (error instanceof mongoose.Error.ValidationError) {
      res.status(400).json({
        success: false,
        message: "Leave request validation failed.",
        errors: Object.values(error.errors).map(
          (item) => item.message
        ),
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Unable to submit leave request.",
    });
  }
};

/* =====================================================
   3. GET MY LEAVE REQUESTS
===================================================== */

/**
 * GET /api/leaves
 */

export const getMyLeaveRequests = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const employee = await getAuthenticatedEmployee(req);

    if (!employee) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const requests = await Leave.find({
      employeeId: employee.employeeId,
    }).sort({
      createdAt: -1,
    });

    const counts = {
      total: requests.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
    };

    requests.forEach((request) => {
      switch (request.status) {
        case "Pending":
          counts.pending++;
          break;

        case "Approved":
          counts.approved++;
          break;

        case "Rejected":
          counts.rejected++;
          break;

        case "Cancelled":
          counts.cancelled++;
          break;
      }
    });

    res.status(200).json({
      success: true,
      count: requests.length,
      counts,
      requests,
    });
  } catch (error: unknown) {
    console.error("Get employee leave requests error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve leave requests.",
    });
  }
};

/* =====================================================
   4. GET A PARTICULAR LEAVE REQUEST
===================================================== */

/**
 * GET /api/leaves/:id
 *
 * Employee can view their own request.
 * Designated first-level approver can view the request.
 * Admin can view all requests.
 */

export const getLeaveRequestById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const employee = await getAuthenticatedEmployee(req);

    if (!employee) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const id = getLeaveRequestId(req, res);

    if (!id) return;

    const request = await Leave.findById(id);

    if (!request) {
      res.status(404).json({
        success: false,
        message: "Leave request not found.",
      });
      return;
    }

    const isOwner = request.employeeId.equals(
      employee.employeeId
    );

    const isFirstLevelApprover =
      request.firstLevelApproverId?.equals(
        employee.employeeId
      ) || false;

    if (
      !isOwner &&
      !isFirstLevelApprover &&
      employee.role !== "ADMIN"
    ) {
      res.status(403).json({
        success: false,
        message: "You are not allowed to view this request.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      request,
    });
  } catch (error: unknown) {
    console.error("Get leave request details error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve leave request details.",
    });
  }
};

/* =====================================================
   5. CANCEL A PENDING LEAVE REQUEST
===================================================== */

/**
 * PATCH /api/leaves/:id/cancel
 *
 * Applicant can cancel while first-level approval is pending.
 */

export const cancelLeaveRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const employee = await getAuthenticatedEmployee(req);

    if (!employee) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const id = getLeaveRequestId(req, res);

    if (!id) return;

    const request = await Leave.findOne({
      _id: id,
      employeeId: employee.employeeId,
    });

    if (!request) {
      res.status(404).json({
        success: false,
        message: "Leave request not found.",
      });
      return;
    }

    if (
      request.status !== "Pending" ||
      request.firstLevelStatus !== "Pending"
    ) {
      res.status(400).json({
        success: false,
        message:
          "Only requests awaiting first-level approval can be cancelled.",
        currentStatus: request.status,
        firstLevelStatus: request.firstLevelStatus,
      });
      return;
    }

    request.status = "Cancelled";

    addApprovalHistory(
      request,
      employee,
      "CANCELLED",
      "Leave request cancelled by applicant."
    );

    await request.save();

    await syncEmployeeBalances(
      employee.employeeId,
      request.startDate.getUTCFullYear()
    );

    res.status(200).json({
      success: true,
      message: "Leave request cancelled successfully.",
      request,
    });
  } catch (error: unknown) {
    console.error("Cancel leave request error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to cancel leave request.",
    });
  }
};

/* =====================================================
   6. GET EMPLOYEE LEAVE BALANCE
===================================================== */

/**
 * GET /api/leaves/balance
 *
 * Optional query: ?year=2026
 */

export const getMyLeaveBalance = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const employee = await getAuthenticatedEmployee(req);

    if (!employee) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const requestedYear = req.query.year
      ? Number(req.query.year)
      : new Date().getFullYear();

    if (
      !Number.isInteger(requestedYear) ||
      requestedYear < 2000 ||
      requestedYear > 2200
    ) {
      res.status(400).json({
        success: false,
        message: "Please provide a valid year.",
      });
      return;
    }

    await syncEmployeeBalances(
      employee.employeeId,
      requestedYear
    );

    const balances = await LeaveBalance.find({
      employeeId: employee.employeeId,
      year: requestedYear,
    }).sort({
      leaveType: 1,
    });

    if (balances.length === 0) {
      res.status(404).json({
        success: false,
        message:
          "No leave entitlement has been configured for your account for this year. Please contact HR.",
        year: requestedYear,
        balances: [],
      });
      return;
    }

    const breakdown = balances.map((balance) => {
      const availableDays = Math.max(
        0,
        balance.entitlement - balance.approvedDays
      );

      return {
        leaveType: balance.leaveType,
        entitlement: balance.entitlement,
        approvedDays: balance.approvedDays,
        pendingDays: balance.pendingDays,
        availableDays,
      };
    });

    const totals = breakdown.reduce(
      (result, item) => ({
        totalEntitlement:
          result.totalEntitlement + item.entitlement,

        leaveTaken:
          result.leaveTaken + item.approvedDays,

        pendingLeave:
          result.pendingLeave + item.pendingDays,

        remainingBalance:
          result.remainingBalance + item.availableDays,
      }),
      {
        totalEntitlement: 0,
        leaveTaken: 0,
        pendingLeave: 0,
        remainingBalance: 0,
      }
    );

    res.status(200).json({
      success: true,
      year: requestedYear,

      employee: {
        id: employee.employeeId,
        name: employee.employeeName,
        email: employee.employeeEmail,
        department: employee.department,
      },

      summary: totals,
      breakdown,
    });
  } catch (error: unknown) {
    console.error("Get employee leave balance error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to calculate leave balance.",
    });
  }
};

/* =====================================================
   7. ADMIN: ADJUST EMPLOYEE LEAVE BALANCE
===================================================== */

/**
 * PATCH /api/leaves/admin/balance-adjustment
 *
 * Body:
 * {
 *   employeeId: string,
 *   leaveType: string,
 *   year: number,
 *   action: "ADD" | "REDUCE",
 *   days: number
 * }
 *
 * Only ADMIN users can adjust balances.
 * One employee is adjusted per request.
 * Days must be in increments of 0.5.
 * No adjustment reason is required.
 */

export const adjustEmployeeLeaveBalance = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const admin = await getAuthenticatedEmployee(req);

    if (!admin) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    if (!requireAdmin(admin, res)) return;

    const {
      employeeId,
      leaveType,
      year,
      action,
      days,
    } = req.body || {};

    // Validate employee ID.
    if (
      typeof employeeId !== "string" ||
      !Types.ObjectId.isValid(employeeId)
    ) {
      res.status(400).json({
        success: false,
        message: "Please select a valid employee.",
      });
      return;
    }

    // Validate leave type.
    if (!isValidLeaveType(leaveType)) {
      res.status(400).json({
        success: false,
        message: "Please select a valid leave type.",
        supportedLeaveTypes: LEAVE_TYPES,
      });
      return;
    }

    // Validate year.
    const adjustmentYear =
      year === undefined
        ? new Date().getFullYear()
        : Number(year);

    if (
      !Number.isInteger(adjustmentYear) ||
      adjustmentYear < 2000 ||
      adjustmentYear > 2200
    ) {
      res.status(400).json({
        success: false,
        message: "Please provide a valid leave year.",
      });
      return;
    }

    // Validate operation.
    if (action !== "ADD" && action !== "REDUCE") {
      res.status(400).json({
        success: false,
        message: "Action must be ADD or REDUCE.",
      });
      return;
    }

    // Validate adjustment days.
    const adjustmentDays = Number(days);

    if (
      !Number.isFinite(adjustmentDays) ||
      adjustmentDays <= 0 ||
      !Number.isInteger(adjustmentDays * 2)
    ) {
      res.status(400).json({
        success: false,
        message:
          "Adjustment days must be positive and use increments of 0.5.",
      });
      return;
    }

    // Retrieve employee from database.
    const targetEmployee = await User.findOne({
      _id: employeeId,
      role: "EMPLOYEE",
    })
      .select("name email department role")
      .lean();

    if (!targetEmployee) {
      res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
      return;
    }

    const targetEmployeeId = new Types.ObjectId(employeeId);

    // Synchronize approved and pending leave usage first.
    await syncEmployeeBalances(
      targetEmployeeId,
      adjustmentYear
    );

    let balance = await LeaveBalance.findOne({
      employeeId: targetEmployeeId,
      leaveType,
      year: adjustmentYear,
    });

    // A balance record can be created only through ADD.
    if (!balance && action === "REDUCE") {
      res.status(404).json({
        success: false,
        message:
          "No leave balance exists for this employee and leave type.",
      });
      return;
    }

    const previousEntitlement = balance
      ? balance.entitlement
      : 0;

    const approvedDays = balance
      ? balance.approvedDays
      : 0;

    let newEntitlement: number;

    if (action === "ADD") {
      newEntitlement =
        previousEntitlement + adjustmentDays;
    } else {
      newEntitlement =
        previousEntitlement - adjustmentDays;

      // Protect already approved leave.
      if (newEntitlement < approvedDays) {
        res.status(400).json({
          success: false,
          message:
            "Cannot reduce entitlement below the employee's already approved leave days.",
          currentEntitlement: previousEntitlement,
          approvedDays,
          maximumReduction: Math.max(
            0,
            previousEntitlement - approvedDays
          ),
        });
        return;
      }
    }

    if (newEntitlement < 0) {
      res.status(400).json({
        success: false,
        message: "Leave entitlement cannot become negative.",
      });
      return;
    }

    // Create a new record for an ADD operation if necessary.
    if (!balance) {
      balance = new LeaveBalance({
        employeeId: targetEmployeeId,
        leaveType,
        year: adjustmentYear,
        entitlement: newEntitlement,
        approvedDays: 0,
        pendingDays: 0,
      });
    } else {
      balance.entitlement = newEntitlement;
    }

    await balance.save();

    // Save immutable activity record.
    await createLeaveActivity({
      actor: admin,

      employeeId: targetEmployeeId,
      employeeName: targetEmployee.name,
      employeeEmail: targetEmployee.email,

      activityType:
        action === "ADD"
          ? "BALANCE_ADDED"
          : "BALANCE_REDUCED",

      leaveType,
      days: adjustmentDays,
      previousEntitlement,
      newEntitlement,
    });

    res.status(200).json({
      success: true,
      message:
        action === "ADD"
          ? "Leave balance increased successfully."
          : "Leave balance reduced successfully.",

      adjustment: {
        employee: {
          id: targetEmployeeId,
          name: targetEmployee.name,
          email: targetEmployee.email,
        },
        leaveType,
        year: adjustmentYear,
        action,
        days: adjustmentDays,
        previousEntitlement,
        newEntitlement,
        approvedDays: balance.approvedDays,
        pendingDays: balance.pendingDays,
        availableDays: Math.max(
          0,
          newEntitlement - balance.approvedDays
        ),
      },
    });
  } catch (error: unknown) {
    console.error("Leave balance adjustment error:", error);

    if (error instanceof mongoose.Error.ValidationError) {
      res.status(400).json({
        success: false,
        message: "Leave balance validation failed.",
        errors: Object.values(error.errors).map(
          (item) => item.message
        ),
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Unable to adjust employee leave balance.",
    });
  }
};

/* =====================================================
   8. GET REQUESTS ASSIGNED TO FIRST-LEVEL APPROVER
===================================================== */

/**
 * GET /api/leaves/approvals/first-level
 */

export const getFirstLevelApprovalRequests = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const employee = await getAuthenticatedEmployee(req);

    if (!employee) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const requests = await Leave.find({
      firstLevelApproverId: employee.employeeId,
      firstLevelStatus: "Pending",
      status: "Pending",
    }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error: unknown) {
    console.error("First-level approval list error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve approval requests.",
    });
  }
};

/* =====================================================
   9. FIRST-LEVEL ACCEPT OR DECLINE
===================================================== */

/**
 * PATCH /api/leaves/:id/first-level-decision
 *
 * Body:
 * {
 *   decision: "ACCEPT" | "DECLINE",
 *   comment?: string
 * }
 */

export const submitFirstLevelDecision = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const employee = await getAuthenticatedEmployee(req);

    if (!employee) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const id = getLeaveRequestId(req, res);

    if (!id) return;

    const decision = req.body?.decision;

    if (
      decision !== "ACCEPT" &&
      decision !== "DECLINE"
    ) {
      res.status(400).json({
        success: false,
        message: "Decision must be ACCEPT or DECLINE.",
      });
      return;
    }

    const comment = getComment(req.body?.comment);

    if (comment === null) {
      res.status(400).json({
        success: false,
        message: "Comment must not exceed 2000 characters.",
      });
      return;
    }

    const request = await Leave.findById(id);

    if (!request) {
      res.status(404).json({
        success: false,
        message: "Leave request not found.",
      });
      return;
    }

    // Only the assigned approver can decide.
    if (
      !request.firstLevelApproverId.equals(
        employee.employeeId
      )
    ) {
      res.status(403).json({
        success: false,
        message:
          "You are not the designated first-level approver for this request.",
      });
      return;
    }

    if (
      request.status !== "Pending" ||
      request.firstLevelStatus !== "Pending"
    ) {
      res.status(409).json({
        success: false,
        message: "This request has already been processed.",
      });
      return;
    }

    request.firstLevelStatus =
      decision === "ACCEPT" ? "Accepted" : "Declined";

    request.firstLevelComment = comment;
    request.firstLevelDecisionAt = new Date();

    if (decision === "ACCEPT") {
      addApprovalHistory(
        request,
        employee,
        "FIRST_LEVEL_ACCEPTED",
        comment || "First-level approver accepted the request."
      );
    } else {
      request.status = "Rejected";

      addApprovalHistory(
        request,
        employee,
        "FIRST_LEVEL_DECLINED",
        comment || "First-level approver declined the request."
      );
    }

    await request.save();

    // Synchronize the employee's leave balance.
    await syncEmployeeBalances(
      request.employeeId,
      request.startDate.getUTCFullYear()
    );

    // Record the first-level decision in the shared activity log.
    await createLeaveActivity({
      actor: employee,

      employeeId: request.employeeId,
      employeeName: request.employeeName,
      employeeEmail: request.employeeEmail,

      activityType:
        decision === "ACCEPT"
          ? "FIRST_LEVEL_ACCEPTED"
          : "FIRST_LEVEL_DECLINED",

      leaveType: request.leaveType,
      leaveRequestId: request._id,
      days: request.days,
    });

    res.status(200).json({
      success: true,
      message:
        decision === "ACCEPT"
          ? "Request accepted and forwarded for final admin approval."
          : "Request declined successfully.",
      request,
    });
  } catch (error: unknown) {
    console.error("First-level decision error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to process first-level decision.",
    });
  }
};

/* =====================================================
   10. ADMIN: GET FINAL APPROVAL QUEUE
===================================================== */

/**
 * GET /api/leaves/admin/approvals
 *
 * Only requests accepted at first level appear here.
 */

export const getAdminApprovalRequests = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const employee = await getAuthenticatedEmployee(req);

    if (!employee) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    if (!requireAdmin(employee, res)) return;

    const requests = await Leave.find({
      status: "Pending",
      firstLevelStatus: "Accepted",
    })
      .populate(
        "employeeId",
        "name email department"
      )
      .populate(
        "firstLevelApproverId",
        "name email department"
      )
      .sort({
        firstLevelDecisionAt: 1,
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error: unknown) {
    console.error("Admin approval queue error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve admin approval requests.",
    });
  }
};

/* =====================================================
   11. ADMIN: FINAL APPROVE OR REJECT
===================================================== */

/**
 * PATCH /api/leaves/:id/admin-decision
 *
 * Body:
 * {
 *   decision: "APPROVE" | "REJECT",
 *   comment?: string
 * }
 */

export const submitAdminDecision = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const admin = await getAuthenticatedEmployee(req);

    if (!admin) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    if (!requireAdmin(admin, res)) return;

    const id = getLeaveRequestId(req, res);

    if (!id) return;

    const decision = req.body?.decision;

    if (
      decision !== "APPROVE" &&
      decision !== "REJECT"
    ) {
      res.status(400).json({
        success: false,
        message: "Decision must be APPROVE or REJECT.",
      });
      return;
    }

    const comment = getComment(req.body?.comment);

    if (comment === null) {
      res.status(400).json({
        success: false,
        message: "Comment must not exceed 2000 characters.",
      });
      return;
    }

    const request = await Leave.findById(id);

    if (!request) {
      res.status(404).json({
        success: false,
        message: "Leave request not found.",
      });
      return;
    }

    // Admin cannot bypass first-level approval.
    if (
      request.status !== "Pending" ||
      request.firstLevelStatus !== "Accepted"
    ) {
      res.status(409).json({
        success: false,
        message:
          "This request is not eligible for final admin approval. First-level acceptance is required.",
      });
      return;
    }

    request.status =
      decision === "APPROVE" ? "Approved" : "Rejected";

    request.approvedBy = admin.employeeId;
    request.approvedByName = admin.employeeName;
    request.approvedByEmail = admin.employeeEmail;

    request.adminComment = comment;
    request.adminDecisionAt = new Date();

    // Preserve compatibility with the legacy comment field.
    request.approverComment = comment;

    if (decision === "APPROVE") {
      addApprovalHistory(
        request,
        admin,
        "ADMIN_APPROVED",
        comment || "Final approval granted by administrator."
      );
    } else {
      addApprovalHistory(
        request,
        admin,
        "ADMIN_REJECTED",
        comment || "Final approval rejected by administrator."
      );
    }

    await request.save();

    await syncEmployeeBalances(
      request.employeeId,
      request.startDate.getUTCFullYear()
    );

    // Record the final admin decision in the shared activity log.
    await createLeaveActivity({
      actor: admin,

      employeeId: request.employeeId,
      employeeName: request.employeeName,
      employeeEmail: request.employeeEmail,

      activityType:
        decision === "APPROVE"
          ? "ADMIN_APPROVED"
          : "ADMIN_REJECTED",

      leaveType: request.leaveType,
      leaveRequestId: request._id,
      days: request.days,
    });

    res.status(200).json({
      success: true,
      message:
        decision === "APPROVE"
          ? "Leave request approved successfully."
          : "Leave request rejected successfully.",
      request,
    });
  } catch (error: unknown) {
    console.error("Admin leave decision error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to process final admin decision.",
    });
  }
};

/* =====================================================
   12. ADMIN: APPROVAL HISTORY
===================================================== */

/**
 * GET /api/leaves/admin/history
 *
 * Returns requests that have reached a decision.
 */

export const getAdminApprovalHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const admin = await getAuthenticatedEmployee(req);

    if (!admin) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    if (!requireAdmin(admin, res)) return;

    const requests = await Leave.find({
      $or: [
        {
          firstLevelStatus: {
            $in: ["Accepted", "Declined"],
          },
        },
        {
          status: {
            $in: ["Approved", "Rejected", "Cancelled"],
          },
        },
      ],
    })
      .populate(
        "employeeId",
        "name email department"
      )
      .populate(
        "firstLevelApproverId",
        "name email department"
      )
      .populate(
        "approvedBy",
        "name email department"
      )
      .sort({
        updatedAt: -1,
      });

    res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error: unknown) {
    console.error("Admin approval history error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve approval history.",
    });
  }
};

/* =====================================================
   13. ADMIN: APPROVAL TRACKING
===================================================== */

/**
 * GET /api/leaves/admin/tracking
 *
 * Shows:
 * Applicant -> First-level approver -> Admin decision.
 */

export const getAdminApprovalTracking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const admin = await getAuthenticatedEmployee(req);

    if (!admin) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    if (!requireAdmin(admin, res)) return;

    const requests = await Leave.find({})
      .populate(
        "employeeId",
        "name email department"
      )
      .populate(
        "firstLevelApproverId",
        "name email department"
      )
      .populate(
        "approvedBy",
        "name email department"
      )
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error: unknown) {
    console.error("Admin approval tracking error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve approval tracking.",
    });
  }
};

/* =====================================================
   14. ADMIN: SHARED LEAVE ACTIVITY LOG
===================================================== */

/**
 * GET /api/leaves/admin/activity-log
 *
 * Available filters:
 *
 * ?employeeId=...
 * ?actorId=...
 * ?activityType=...
 * ?startDate=2026-01-01
 * ?endDate=2026-12-31
 * ?page=1
 * ?limit=20
 *
 * Only administrators can access this endpoint.
 *
 * All administrators see the same shared activity records.
 */

export const getLeaveActivityLog = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const admin = await getAuthenticatedEmployee(req);

    if (!admin) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    if (!requireAdmin(admin, res)) return;

    /* ---------------------------------------------
       PAGINATION
    --------------------------------------------- */

    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);

    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid pagination values.",
      });
      return;
    }

    const skip = (page - 1) * limit;

    /* ---------------------------------------------
       BUILD ACTIVITY FILTERS
    --------------------------------------------- */

    const filters: Record<string, unknown> = {};

    // Filter by employee.
    if (req.query.employeeId) {
      const employeeId = String(req.query.employeeId);

      if (!Types.ObjectId.isValid(employeeId)) {
        res.status(400).json({
          success: false,
          message: "Invalid employee ID.",
        });
        return;
      }

      filters.employeeId = new Types.ObjectId(employeeId);
    }

    // Filter by admin who performed the action.
    if (req.query.actorId) {
      const actorId = String(req.query.actorId);

      if (!Types.ObjectId.isValid(actorId)) {
        res.status(400).json({
          success: false,
          message: "Invalid admin ID.",
        });
        return;
      }

      filters.actorId = new Types.ObjectId(actorId);
    }

    // Filter by activity type.
    const allowedActivityTypes = [
      "BALANCE_ADDED",
      "BALANCE_REDUCED",
      "FIRST_LEVEL_ACCEPTED",
      "FIRST_LEVEL_DECLINED",
      "ADMIN_APPROVED",
      "ADMIN_REJECTED",
    ];

    if (req.query.activityType) {
      const activityType = String(req.query.activityType);

      if (!allowedActivityTypes.includes(activityType)) {
        res.status(400).json({
          success: false,
          message: "Invalid activity type.",
          supportedActivityTypes: allowedActivityTypes,
        });
        return;
      }

      filters.activityType = activityType;
    }

    /* ---------------------------------------------
       FILTER BY DATE
    --------------------------------------------- */

    const dateFilter: {
      $gte?: Date;
      $lt?: Date;
    } = {};

    if (req.query.startDate) {
      const startDate = parseDate(req.query.startDate);

      if (!startDate) {
        res.status(400).json({
          success: false,
          message: "Invalid start date. Use YYYY-MM-DD.",
        });
        return;
      }

      dateFilter.$gte = startDate;
    }

    if (req.query.endDate) {
      const endDate = parseDate(req.query.endDate);

      if (!endDate) {
        res.status(400).json({
          success: false,
          message: "Invalid end date. Use YYYY-MM-DD.",
        });
        return;
      }

      dateFilter.$lt = new Date(
        endDate.getTime() + 24 * 60 * 60 * 1000
      );
    }

    if (
      dateFilter.$gte &&
      dateFilter.$lt &&
      dateFilter.$gte >= dateFilter.$lt
    ) {
      res.status(400).json({
        success: false,
        message: "Start date cannot be after end date.",
      });
      return;
    }

    if (
      dateFilter.$gte ||
      dateFilter.$lt
    ) {
      filters.createdAt = dateFilter;
    }

    /* ---------------------------------------------
       FETCH ACTIVITY RECORDS
    --------------------------------------------- */

    const [activities, total] = await Promise.all([
      LeaveActivityLog.find(filters)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      LeaveActivityLog.countDocuments(filters),
    ]);

    res.status(200).json({
      success: true,

      count: activities.length,
      total,

      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: skip + activities.length < total,
        hasPreviousPage: page > 1,
      },

      activities,
    });
  } catch (error: unknown) {
    console.error("Leave activity log error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve leave activity log.",
    });
  }
};
