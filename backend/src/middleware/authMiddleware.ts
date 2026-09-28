import { NextFunction, Request, Response } from "express";

import { verifyToken } from "../utils/jwt.js";

/* =====================================================
   AUTHENTICATED REQUEST
===================================================== */

export interface AuthenticatedRequest
  extends Request {
  user?: {
    userId: string;
    role: "ADMIN" | "EMPLOYEE";
  };
}

/* =====================================================
   AUTH MIDDLEWARE
===================================================== */

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    /* -------------------------------------------------
       Get JWT from HTTP-only cookie
    ------------------------------------------------- */

    const token = req.cookies?.access_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    /* -------------------------------------------------
       Verify JWT
    ------------------------------------------------- */

    const payload = verifyToken(token);

    /* -------------------------------------------------
       Store authenticated user information
       on the request
    ------------------------------------------------- */

    req.user = {
      userId: payload.userId,
      role: payload.role,
    };

    /* -------------------------------------------------
       Continue to protected route
    ------------------------------------------------- */

    next();
  } catch (error) {
    console.error(
      "Authentication error:",
      error
    );

    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
}