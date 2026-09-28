import { Router } from "express";

import {
  register,
  login,
  me,
  logout,
  changePassword,
} from "../controllers/authController.js";

import {
  requireAuth,
} from "../middleware/authMiddleware.js";

const router = Router();

/* =====================================================
   PUBLIC ROUTES
===================================================== */

// Create account
router.post(
  "/register",
  register
);

// Login
router.post(
  "/login",
  login
);

/* =====================================================
   PROTECTED ROUTES
===================================================== */

// Get currently authenticated user
router.get(
  "/me",
  requireAuth,
  me
);

// Change password
router.patch(
  "/change-password",
  requireAuth,
  changePassword
);

// Logout
router.post(
  "/logout",
  logout
);

export default router;