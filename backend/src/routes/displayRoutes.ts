
import { Router } from "express";
import {
  getTodayDisplayBookings,
} from "../controllers/displayController.js";

const router = Router();

// Public, read-only endpoint. No login required.
router.get("/today", getTodayDisplayBookings);

export default router;
