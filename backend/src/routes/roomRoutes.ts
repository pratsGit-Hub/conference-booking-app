import { Router } from "express";

import {
  getActiveRooms,
  getAllRooms,
  createRoom,
  updateRoom,
  updateRoomStatus,
} from "../controllers/roomController.js";

import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();

/* =====================================================
   EMPLOYEE + ADMIN
===================================================== */

router.get(
  "/",
  requireAuth,
  getActiveRooms
);

/* =====================================================
   ADMIN
===================================================== */

router.get(
  "/admin",
  requireAuth,
  requireRole("ADMIN"),
  getAllRooms
);

router.post(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  createRoom
);

router.patch(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  updateRoom
);

router.patch(
  "/:id/status",
  requireAuth,
  requireRole("ADMIN"),
  updateRoomStatus
);

export default router;