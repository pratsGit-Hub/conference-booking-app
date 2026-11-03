
import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt.js";

/* =====================================================
   AUTHENTICATED USER TYPES
===================================================== */

export type AuthenticatedUserRole = "ADMIN" | "EMPLOYEE";

export interface AuthenticatedUser {
  userId: string;
  role: AuthenticatedUserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/* =====================================================
   AUTH MIDDLEWARE
===================================================== */

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    // Get JWT from HTTP-only cookie
    const token = req.cookies?.access_token;

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    // Verify JWT
    const payload = verifyToken(token);

    // Validate decoded user information
    if (
      !payload ||
      typeof payload.userId !== "string" ||
      !["ADMIN", "EMPLOYEE"].includes(payload.role)
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
      return;
    }

    // Attach authenticated user to request
    req.user = {
      userId: payload.userId,
      role: payload.role as AuthenticatedUserRole,
    };

    // Continue to protected route
    next();
  } catch (error) {
    console.error("Authentication error:", error);

    res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
}

/* =====================================================
   COMPATIBILITY EXPORTS
===================================================== */

// Supports: import authMiddleware from "...";
export default requireAuth;

// Supports: import { authMiddleware } from "...";
export const authMiddleware = requireAuth;

// Supports: import { requireAuth } from "...";
