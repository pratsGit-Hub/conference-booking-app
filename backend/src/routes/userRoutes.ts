import { Router } from "express";

import {
  getMyProfile,
  updateMyProfile,
  getAllUsers,
  updateUserRole,
  updateUserEmail,
  deleteUser,
} from "../controllers/userController.js";

import {
  requireAuth,
} from "../middleware/authMiddleware.js";

import {
  requireRole,
} from "../middleware/roleMiddleware.js";

const router = Router();

/* =====================================================
   CURRENT USER PROFILE
===================================================== */

/*
 * GET /api/users/me
 *
 * Returns the currently logged-in user's profile
 * and settings.
 */
router.get(
  "/me",
  requireAuth,
  getMyProfile
);

/*
 * PATCH /api/users/me
 *
 * Updates the currently logged-in user's
 * profile and booking preferences.
 */
router.patch(
  "/me",
  requireAuth,
  updateMyProfile
);

/* =====================================================
   ADMIN USER MANAGEMENT
===================================================== */

/*
 * GET /api/users
 *
 * Only ADMIN users can access this.
 */
router.get(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  getAllUsers
);

/*
 * PATCH /api/users/:id/role
 *
 * Only ADMIN users can change another user's role.
 */
router.patch(
  "/:id/role",
  requireAuth,
  requireRole("ADMIN"),
  updateUserRole
);

/*
 * PATCH /api/users/:id/email
 *
 * Only ADMIN users can change another user's email.
 */
router.patch(
  "/:id/email",
  requireAuth,
  requireRole("ADMIN"),
  updateUserEmail
);

/*
 * DELETE /api/users/:id
 *
 * Only ADMIN users can delete another user.
 */
router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  deleteUser
);

export default router;