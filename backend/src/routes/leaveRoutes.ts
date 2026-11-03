
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
} from "../controllers/leaveController.js";

const router = Router();

/**
 * All leave routes require authentication.
 * requireAuth validates the access token and attaches
 * the authenticated user to req.user.
 */

// ==========================================
// EMPLOYEE ROUTES
// ==========================================

// GET /api/leaves/employees/search?q=name
// Search registered employees to select a first-level approver.
router.get("/employees/search", requireAuth, searchEmployees);

// GET /api/leaves/balance
// Get the logged-in employee's leave balance.
router.get("/balance", requireAuth, getMyLeaveBalance);

// POST /api/leaves
// Submit a leave application with a selected first-level approver.
router.post("/", requireAuth, createLeaveRequest);

// GET /api/leaves
// Get the logged-in employee's leave requests.
router.get("/", requireAuth, getMyLeaveRequests);

// GET /api/leaves/:id
// Get a leave request (applicant, assigned approver, or admin).
router.get("/:id", requireAuth, getLeaveRequestById);

// PATCH /api/leaves/:id/cancel
// Cancel an eligible pending leave request.
router.patch("/:id/cancel", requireAuth, cancelLeaveRequest);


// ==========================================
// FIRST-LEVEL APPROVER ROUTES
// ==========================================

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


// ==========================================
// ADMIN / HR ROUTES
// ==========================================

// GET /api/leaves/admin/approvals
// Get requests accepted by the first-level approver
// and waiting for final admin approval.
router.get(
  "/admin/approvals",
  requireAuth,
  getAdminApprovalRequests
);

// PATCH /api/leaves/:id/admin-decision
// Admin makes the final APPROVE or REJECT decision.
router.patch(
  "/:id/admin-decision",
  requireAuth,
  submitAdminDecision
);

// GET /api/leaves/admin/history
// Get leave approval and rejection history.
router.get(
  "/admin/history",
  requireAuth,
  getAdminApprovalHistory
);

// GET /api/leaves/admin/tracking
// Track the complete approval journey:
// Employee -> First-level approver -> Admin.
router.get(
  "/admin/tracking",
  requireAuth,
  getAdminApprovalTracking
);

export default router;
