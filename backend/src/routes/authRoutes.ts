import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
  register,
  login,
  me,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";

import {
  requireAuth,
} from "../middleware/authMiddleware.js";

const router = Router();

/* =====================================================
   FORGOT PASSWORD RATE LIMITER
===================================================== */

const forgotPasswordLimiter =
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes

    max: 5,

    standardHeaders: true,

    legacyHeaders: false,

    message: {
      success: false,
      message:
        "Too many password reset requests. Please try again later.",
    },
  });

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

// Forgot password
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  forgotPassword
);

// Reset password
router.post(
  "/reset-password",
  resetPassword
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