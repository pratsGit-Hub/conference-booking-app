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

import {
  startReminderScheduler,
} from "./utils/reminderScheduler.js";

import {
  verifyEmailConnection,
} from "./utils/emailService.js";

/* =====================================================
   APPLICATION
===================================================== */

const app = express();

/* =====================================================
   CONFIGURATION
===================================================== */

const PORT =
  Number(process.env.PORT) || 5000;

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "http://localhost:3000";

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

const apiLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    max: 200,

    standardHeaders: true,

    legacyHeaders: false,
  });

app.use(
  "/api",
  apiLimiter
);

/* =====================================================
   BODY PARSING
===================================================== */

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

/* =====================================================
   COOKIES
===================================================== */

app.use(
  cookieParser()
);

/* =====================================================
   HEALTH CHECK
===================================================== */

app.get(
  "/api/health",
  (_req, res) => {
    res.status(200).json({
      success: true,

      message:
        "Conference Booking API is running",
    });
  }
);

/* =====================================================
   AUTHENTICATION
===================================================== */

app.use(
  "/api/auth",
  authRoutes
);

/* =====================================================
   USER MANAGEMENT
===================================================== */

app.use(
  "/api/users",
  userRoutes
);

/* =====================================================
   ROOM MANAGEMENT
===================================================== */

app.use(
  "/api/rooms",
  roomRoutes
);

/* =====================================================
   BOOKING MANAGEMENT
===================================================== */

app.use(
  "/api/bookings",
  bookingRoutes
);

/* =====================================================
   ADMIN MANAGEMENT
===================================================== */

app.use(
  "/api/admin",
  adminRoutes
);

/* =====================================================
   NOTIFICATION MANAGEMENT
===================================================== */

app.use(
  "/api/notifications",
  notificationRoutes
);

/* =====================================================
   404 HANDLER
===================================================== */

app.use(
  "/api",
  (_req, res) => {
    res.status(404).json({
      success: false,

      message:
        "API endpoint not found",
    });
  }
);

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
    console.error(
      "Unhandled server error:",
      error
    );

    res.status(500).json({
      success: false,

      message:
        "Internal server error",
    });
  }
);

/* =====================================================
   START SERVER
===================================================== */

async function startServer() {
  try {
    /* ---------------------------------------------
       CONNECT TO DATABASE FIRST
    --------------------------------------------- */

    await connectDatabase();

    console.log(
      "Database connection established."
    );

    /* ---------------------------------------------
       VERIFY EMAIL / SMTP CONNECTION
       
       This checks whether the Gmail SMTP
       credentials from .env are valid.
    --------------------------------------------- */

    await verifyEmailConnection();

    /* ---------------------------------------------
       START BOOKING REMINDER SCHEDULER
       
       This checks every minute for bookings
       starting approximately one hour later.
    --------------------------------------------- */

    startReminderScheduler();

    /* ---------------------------------------------
       START EXPRESS SERVER
    --------------------------------------------- */

    const server =
      app.listen(
        PORT,
        () => {
          console.log(
            `Server running on http://localhost:${PORT}`
          );

          console.log(
            `Frontend allowed: ${FRONTEND_URL}`
          );

          console.log(
            "Email and booking reminder services are ready."
          );
        }
      );

    /* =================================================
       GRACEFUL SHUTDOWN
    ================================================= */

    const shutdown = (
      signal: string
    ) => {
      console.log(
        `${signal} received. Shutting down server...`
      );

      server.close(
        () => {
          console.log(
            "Server closed."
          );

          process.exit(0);
        }
      );
    };

    process.on(
      "SIGINT",
      () => {
        shutdown("SIGINT");
      }
    );

    process.on(
      "SIGTERM",
      () => {
        shutdown("SIGTERM");
      }
    );
  } catch (error) {
    console.error(
      "Failed to start server:",
      error
    );

    process.exit(1);
  }
}

/* =====================================================
   RUN APPLICATION
===================================================== */

startServer();