import { Router } from "express";

import {
  createBooking,
  getRoomAvailability,
  getMyBookings,
  cancelMyBooking,
  getAllBookings,
  adminCancelBooking,
  adminEditBooking,
} from "../controllers/bookingController.js";

import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();

/* =====================================================
   ROOM AVAILABILITY

   IMPORTANT:
   Keep this before "/:id" routes.
===================================================== */

router.get(
  "/availability",
  requireAuth,
  getRoomAvailability
);

/* =====================================================
   CREATE BOOKING

   POST /api/bookings
===================================================== */

router.post(
  "/",
  requireAuth,
  createBooking
);

/* =====================================================
   MY BOOKINGS

   GET /api/bookings/my

   Returns:
   - UPCOMING
   - COMPLETED
   - CANCELLED
===================================================== */

router.get(
  "/my",
  requireAuth,
  getMyBookings
);

/* =====================================================
   ADMIN - GET ALL BOOKINGS

   GET /api/bookings

   IMPORTANT:
   This must remain before "/:id" routes.
===================================================== */

router.get(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  getAllBookings
);

/* =====================================================
   ADMIN - EDIT BOOKING

   PATCH /api/bookings/:id/edit
===================================================== */

router.patch(
  "/:id/edit",
  requireAuth,
  requireRole("ADMIN"),
  adminEditBooking
);

/* =====================================================
   ADMIN - CANCEL BOOKING

   PATCH /api/bookings/:id/admin-cancel
===================================================== */

router.patch(
  "/:id/admin-cancel",
  requireAuth,
  requireRole("ADMIN"),
  adminCancelBooking
);

/* =====================================================
   EMPLOYEE - CANCEL OWN BOOKING

   PATCH /api/bookings/:id/cancel
===================================================== */

router.patch(
  "/:id/cancel",
  requireAuth,
  cancelMyBooking
);

export default router;