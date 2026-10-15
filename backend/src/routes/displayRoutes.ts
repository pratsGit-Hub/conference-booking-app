
import { Router } from "express";
import {
  getDisplayRooms,
  getTodayDisplayBookings,
} from "../controllers/displayController.js";

const router = Router();

// Public endpoint: all rooms, including rooms without bookings.
router.get("/rooms", getDisplayRooms);

// Public endpoint: today's non-cancelled bookings.
router.get("/today", getTodayDisplayBookings);

export default router;
