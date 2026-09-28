import { NextFunction, Response } from "express";

import {
  AuthenticatedRequest,
} from "./authMiddleware.js";

import {
  UserRole,
} from "../models/User.js";

export function requireRole(
  ...allowedRoles: UserRole[]
) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    // User must already be authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Check whether user's role is allowed
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to perform this action",
      });
    }

    // User has the required role
    next();
  };
}