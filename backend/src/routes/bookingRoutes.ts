import { Router } from "express";

import {
  createBooking,
  getRoomAvailability,
  getMyBookings,
  cancelMyBooking,
  getAllBookings,
  adminCancelBooking,
} from "../controllers/bookingController.js";

import { requireAuth } from "../middleware/authMiddleware.js";

import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();

/* =====================================================
   ROOM AVAILABILITY

   IMPORTANT:
   Keep this BEFORE "/:id" routes.
===================================================== */

router.get(
  "/availability",
  requireAuth,
  getRoomAvailability
);

/* =====================================================
   CREATE BOOKING
===================================================== */

router.post(
  "/",
  requireAuth,
  createBooking
);

/* =====================================================
   MY BOOKINGS
===================================================== */

router.get(
  "/my",
  requireAuth,
  getMyBookings
);

/* =====================================================
   CANCEL MY BOOKING
===================================================== */

router.patch(
  "/:id/cancel",
  requireAuth,
  cancelMyBooking
);

/* =====================================================
   ADMIN - GET ALL BOOKINGS
===================================================== */

router.get(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  getAllBookings
);

/* =====================================================
   ADMIN - CANCEL BOOKING
===================================================== */

router.patch(
  "/:id/admin-cancel",
  requireAuth,
  requireRole("ADMIN"),
  adminCancelBooking
);

export default router;