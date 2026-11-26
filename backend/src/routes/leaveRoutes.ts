
import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";

import {
  createLeaveRequest,
  getMyLeaveRequests,
  getLeaveRequestById,
  cancelLeaveRequest,
  getMyLeaveBalance,
  searchEmployees,
  getFirstLevelApprovalRequests,
  submitFirstLevelDecision,
  getAdminApprovalRequests,
  submitAdminDecision,
  getAdminApprovalHistory,
  getAdminApprovalTracking,
  adjustEmployeeLeaveBalance,
  getLeaveActivityLog,
} from "../controllers/leaveController.js";

const router = Router();

/**
 * All leave routes require authentication.
 * requireAuth validates the access token and attaches
 * the authenticated user to req.user.
 */

// =====================================================
// EMPLOYEE ROUTES
// =====================================================

// GET /api/leaves/employees/search?q=name
// Search registered employees to select a first-level approver.
router.get(
  "/employees/search",
  requireAuth,
  searchEmployees
);

// GET /api/leaves/balance
// Get the logged-in employee's leave balance.
router.get(
  "/balance",
  requireAuth,
  getMyLeaveBalance
);

// POST /api/leaves
// Submit a leave application.
router.post(
  "/",
  requireAuth,
  createLeaveRequest
);

// GET /api/leaves
// Get the logged-in employee's leave requests.
router.get(
  "/",
  requireAuth,
  getMyLeaveRequests
);

// =====================================================
// FIRST-LEVEL APPROVER ROUTES
// =====================================================

// GET /api/leaves/approvals/first-level
// Get leave applications assigned to the logged-in approver.
router.get(
  "/approvals/first-level",
  requireAuth,
  getFirstLevelApprovalRequests
);

// PATCH /api/leaves/:id/first-level-decision
// First-level approver accepts or declines a leave application.
router.patch(
  "/:id/first-level-decision",
  requireAuth,
  submitFirstLevelDecision
);

// =====================================================
// ADMIN / HR ROUTES
// =====================================================

// PATCH /api/leaves/admin/balance-adjustment
// Add or reduce an employee's leave entitlement.
router.patch(
  "/admin/balance-adjustment",
  requireAuth,
  adjustEmployeeLeaveBalance
);

// GET /api/leaves/admin/activity-log
// Shared activity log for administrators.
router.get(
  "/admin/activity-log",
  requireAuth,
  getLeaveActivityLog
);

// GET /api/leaves/admin/approvals
// Requests accepted by first-level approvers and awaiting final decision.
router.get(
  "/admin/approvals",
  requireAuth,
  getAdminApprovalRequests
);

// GET /api/leaves/admin/history
// Finalized leave approval and rejection history.
router.get(
  "/admin/history",
  requireAuth,
  getAdminApprovalHistory
);

// GET /api/leaves/admin/tracking
// Track the complete approval journey.
router.get(
  "/admin/tracking",
  requireAuth,
  getAdminApprovalTracking
);

// PATCH /api/leaves/:id/admin-decision
// Admin makes the final APPROVE or REJECT decision.
router.patch(
  "/:id/admin-decision",
  requireAuth,
  submitAdminDecision
);

// =====================================================
// DYNAMIC LEAVE REQUEST ROUTES
// Keep these after the static routes.
// =====================================================

// PATCH /api/leaves/:id/cancel
// Cancel an eligible pending leave request.
router.patch(
  "/:id/cancel",
  requireAuth,
  cancelLeaveRequest
);

// GET /api/leaves/:id
// Get a leave request (applicant, assigned approver, or admin).
router.get(
  "/:id",
  requireAuth,
  getLeaveRequestById
);

export default router;
