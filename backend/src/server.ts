
import "dotenv/config";

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { connectDatabase } from "./config/database.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import displayRoutes from "./routes/displayRoutes.js";
import leaveRoutes from "./routes/leaveRoutes.js";

import { startReminderScheduler } from "./utils/reminderScheduler.js";
import { verifyEmailConnection } from "./utils/emailService.js";

/* =====================================================
   APPLICATION
===================================================== */

const app = express();

// Render runs behind a reverse proxy.
app.set("trust proxy", 1);

/* =====================================================
   CONFIGURATION
===================================================== */

const PORT = Number(process.env.PORT) || 5001;

const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:3000";

/* =====================================================
   SECURITY
===================================================== */

app.use(helmet());

/* =====================================================
   CORS
===================================================== */

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

/* =====================================================
   RATE LIMITING
===================================================== */

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", apiLimiter);

/* =====================================================
   BODY PARSING
===================================================== */

app.use(express.json({ limit: "1mb" }));

app.use(
  express.urlencoded({
    extended: true,
  })
);

/* =====================================================
   COOKIES
===================================================== */

app.use(cookieParser());

/* =====================================================
   HEALTH CHECK
===================================================== */

app.get("/api/health", (_req, res) => {
  return res.status(200).json({
    success: true,
    message: "Conference Booking API is running",
  });
});

/* =====================================================
   AUTHENTICATION
===================================================== */

app.use("/api/auth", authRoutes);

/* =====================================================
   USER MANAGEMENT
===================================================== */

app.use("/api/users", userRoutes);

/* =====================================================
   ROOM MANAGEMENT
===================================================== */

app.use("/api/rooms", roomRoutes);

/* =====================================================
   BOOKING MANAGEMENT
===================================================== */

app.use("/api/bookings", bookingRoutes);

/* =====================================================
   ADMIN MANAGEMENT
===================================================== */

app.use("/api/admin", adminRoutes);

/* =====================================================
   NOTIFICATION MANAGEMENT
===================================================== */

app.use("/api/notifications", notificationRoutes);

/* =====================================================
   LEAVE MANAGEMENT
===================================================== */

/*
 * EMPLOYEE ROUTES
 *
 * GET    /api/leaves/employees/search
 * GET    /api/leaves/balance
 * POST   /api/leaves
 * GET    /api/leaves
 * GET    /api/leaves/:id
 * PATCH  /api/leaves/:id/cancel
 *
 * FIRST-LEVEL APPROVER ROUTES
 *
 * GET    /api/leaves/approvals/first-level
 * PATCH  /api/leaves/:id/first-level-decision
 *
 * ADMIN ROUTES
 *
 * GET    /api/leaves/admin/approvals
 * PATCH  /api/leaves/:id/admin-decision
 * GET    /api/leaves/admin/history
 * GET    /api/leaves/admin/tracking
 *
 * Authentication is handled inside leaveRoutes.ts.
 * Admin authorization is checked inside the relevant
 * controller functions.
 */

app.use("/api/leaves", leaveRoutes);

/* =====================================================
   PUBLIC OFFICE DISPLAY
===================================================== */

/*
 * PUBLIC, READ-ONLY ROUTES
 *
 * GET /api/display/today
 * GET /api/display/rooms
 *
 * No employee or admin login required.
 */

app.use("/api/display", displayRoutes);

/* =====================================================
   API 404 HANDLER
===================================================== */

app.use("/api", (_req, res) => {
  return res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

/* =====================================================
   GLOBAL ERROR HANDLER
===================================================== */

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled server error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
);

/* =====================================================
   START SERVER
===================================================== */

async function startServer() {
  try {
    // Connect MongoDB before starting the server.
    await connectDatabase();

    console.log("Database connection established.");

    /* ================================================
       EMAIL SERVICE
    ================================================ */

    try {
      await verifyEmailConnection();

      console.log("Email API verification completed.");
    } catch (emailError) {
      console.error(
        "Email API verification failed:",
        emailError
      );

      console.warn(
        "Server will continue running. Email features may be unavailable."
      );
    }

    /* ================================================
       BOOKING REMINDER SCHEDULER
    ================================================ */

    startReminderScheduler();

    console.log("Booking reminder scheduler started.");

    /* ================================================
       EXPRESS SERVER
    ================================================ */

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log("----------------------------------------");
      console.log("Dangote Employee Services API");
      console.log("----------------------------------------");

      console.log(`Server running on port ${PORT}`);
      console.log(`Frontend allowed: ${FRONTEND_URL}`);

      console.log("Registered API routes:");
      console.log("  Authentication: /api/auth");
      console.log("  Users:          /api/users");
      console.log("  Rooms:          /api/rooms");
      console.log("  Bookings:       /api/bookings");
      console.log("  Admin:          /api/admin");
      console.log("  Notifications:  /api/notifications");
      console.log("  Leave:          /api/leaves");
      console.log("  Public Display: /api/display");

      console.log("----------------------------------------");
    });

    /* ================================================
       GRACEFUL SHUTDOWN
    ================================================ */

    const shutdown = (signal: string) => {
      console.log(
        `${signal} received. Shutting down server...`
      );

      server.close(() => {
        console.log("Server closed.");
        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("Failed to start server:", error);

    process.exit(1);
  }
}

/* =====================================================
   RUN APPLICATION
===================================================== */

startServer();
