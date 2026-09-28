import { Router } from "express";

import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "../controllers/notificationController.js";

import {
  requireAuth,
} from "../middleware/authMiddleware.js";

const router = Router();

/* =====================================================
   ALL NOTIFICATION ROUTES REQUIRE LOGIN
===================================================== */

router.use(requireAuth);

/* =====================================================
   GET NOTIFICATIONS
===================================================== */

router.get(
  "/",
  getMyNotifications
);

/* =====================================================
   MARK ONE AS READ
===================================================== */

router.patch(
  "/:id/read",
  markNotificationRead
);

/* =====================================================
   MARK ALL AS READ
===================================================== */

router.patch(
  "/read-all",
  markAllNotificationsRead
);

/* =====================================================
   DELETE
===================================================== */

router.delete(
  "/:id",
  deleteNotification
);

export default router;