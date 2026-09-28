import { Router } from "express";

import {
  getAdminDashboard,
  getAdminReports,
} from "../controllers/adminController.js";

import {
  requireAuth,
} from "../middleware/authMiddleware.js";

import {
  requireRole,
} from "../middleware/roleMiddleware.js";

const router = Router();

/* =====================================================
   ADMIN DASHBOARD
===================================================== */

router.get(
  "/dashboard",
  requireAuth,
  requireRole("ADMIN"),
  getAdminDashboard
);

/* =====================================================
   ADMIN REPORTS
===================================================== */

router.get(
  "/reports",
  requireAuth,
  requireRole("ADMIN"),
  getAdminReports
);

export default router;