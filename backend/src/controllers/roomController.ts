import { Response } from "express";
import { z } from "zod";

import {
  AuthenticatedRequest,
} from "../middleware/authMiddleware.js";

import { Room } from "../models/Room.js";

/* =====================================================
   VALIDATION SCHEMAS
===================================================== */

const createRoomSchema = z.object({
  name: z
    .string()
    .trim()
    .min(
      2,
      "Room name must be at least 2 characters"
    )
    .max(
      100,
      "Room name is too long"
    ),

  capacity: z
    .number()
    .int(
      "Capacity must be a whole number"
    )
    .min(
      1,
      "Capacity must be at least 1"
    )
    .max(
      1000,
      "Capacity cannot exceed 1000"
    ),

  location: z
    .string()
    .trim()
    .min(
      2,
      "Location is required"
    )
    .max(
      200,
      "Location is too long"
    ),

  description: z
    .string()
    .trim()
    .max(
      1000,
      "Description is too long"
    )
    .optional(),

  facilities: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Facility cannot be empty")
    )
    .max(
      30,
      "Too many facilities"
    )
    .default([]),

  isActive: z
    .boolean()
    .optional()
    .default(true),
});

const updateRoomSchema =
  createRoomSchema.partial();

const roomStatusSchema = z.object({
  isActive: z.boolean(),
});

/* =====================================================
   OBJECT ID VALIDATION
===================================================== */

function isValidObjectId(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    /^[a-fA-F0-9]{24}$/.test(value)
  );
}

/* =====================================================
   ESCAPE REGEX
===================================================== */

function escapeRegex(
  value: string
): string {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

/* =====================================================
   GET ALL ROOMS
   ADMIN ONLY
===================================================== */

export async function getAllRooms(
  _req: AuthenticatedRequest,
  res: Response
) {
  try {
    const rooms = await Room.find({})
      .sort({
        createdAt: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      rooms,
    });
  } catch (error) {
    console.error(
      "Get all rooms error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
}

/* =====================================================
   GET ACTIVE ROOMS
   EMPLOYEE + ADMIN
===================================================== */

export async function getActiveRooms(
  _req: AuthenticatedRequest,
  res: Response
) {
  try {
    const rooms = await Room.find({
      isActive: true,
    })
      .sort({
        name: 1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      rooms,
    });
  } catch (error) {
    console.error(
      "Get active rooms error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
}

/* =====================================================
   CREATE ROOM
   ADMIN ONLY
===================================================== */

export async function createRoom(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    /* -------------------------------------------------
       Validate request
    ------------------------------------------------- */

    const result =
      createRoomSchema.safeParse(
        req.body
      );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message:
          result.error.issues[0]?.message ||
          "Invalid room data",
      });
    }

    const {
      name,
      capacity,
      location,
      description,
      facilities,
      isActive,
    } = result.data;

    /* -------------------------------------------------
       Check duplicate room name
    ------------------------------------------------- */

    const existingRoom =
      await Room.findOne({
        name: {
          $regex: `^${escapeRegex(
            name
          )}$`,
          $options: "i",
        },
      });

    if (existingRoom) {
      return res.status(409).json({
        success: false,
        message:
          "A room with this name already exists",
      });
    }

    /* -------------------------------------------------
       Create room
    ------------------------------------------------- */

    const room = await Room.create({
      name,
      capacity,
      location,
      description:
        description || undefined,
      facilities,
      isActive,
    });

    return res.status(201).json({
      success: true,
      message:
        "Room created successfully",
      room,
    });
  } catch (error) {
    console.error(
      "Create room error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
}

/* =====================================================
   UPDATE ROOM
   ADMIN ONLY
===================================================== */

export async function updateRoom(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    /* -------------------------------------------------
       Validate room ID
    ------------------------------------------------- */

    const id: unknown =
      req.params.id;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid room ID",
      });
    }

    /* -------------------------------------------------
       Validate request body
    ------------------------------------------------- */

    const result =
      updateRoomSchema.safeParse(
        req.body
      );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message:
          result.error.issues[0]?.message ||
          "Invalid room data",
      });
    }

    const updates = result.data;

    /* -------------------------------------------------
       Find room
    ------------------------------------------------- */

    const room =
      await Room.findById(id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    /* -------------------------------------------------
       Check duplicate room name
    ------------------------------------------------- */

    if (updates.name) {
      const duplicate =
        await Room.findOne({
          _id: {
            $ne: room._id,
          },

          name: {
            $regex: `^${escapeRegex(
              updates.name
            )}$`,
            $options: "i",
          },
        });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message:
            "Another room with this name already exists",
        });
      }
    }

    /* -------------------------------------------------
       Apply updates
    ------------------------------------------------- */

    if (
      updates.name !== undefined
    ) {
      room.name =
        updates.name;
    }

    if (
      updates.capacity !== undefined
    ) {
      room.capacity =
        updates.capacity;
    }

    if (
      updates.location !== undefined
    ) {
      room.location =
        updates.location;
    }

    if (
      updates.description !== undefined
    ) {
      room.description =
        updates.description ||
        undefined;
    }

    if (
      updates.facilities !== undefined
    ) {
      room.facilities =
        updates.facilities;
    }

    if (
      updates.isActive !== undefined
    ) {
      room.isActive =
        updates.isActive;
    }

    await room.save();

    return res.status(200).json({
      success: true,
      message:
        "Room updated successfully",
      room,
    });
  } catch (error) {
    console.error(
      "Update room error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
}

/* =====================================================
   UPDATE ROOM STATUS
   ADMIN ONLY
===================================================== */

export async function updateRoomStatus(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    /* -------------------------------------------------
       Validate room ID
    ------------------------------------------------- */

    const id: unknown =
      req.params.id;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid room ID",
      });
    }

    /* -------------------------------------------------
       Validate status
    ------------------------------------------------- */

    const result =
      roomStatusSchema.safeParse(
        req.body
      );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message:
          "isActive must be true or false",
      });
    }

    const {
      isActive,
    } = result.data;

    /* -------------------------------------------------
       Find room
    ------------------------------------------------- */

    const room =
      await Room.findById(id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    /* -------------------------------------------------
       No unnecessary update
    ------------------------------------------------- */

    if (
      room.isActive === isActive
    ) {
      return res.status(400).json({
        success: false,
        message: isActive
          ? "Room is already active"
          : "Room is already inactive",
      });
    }

    /* -------------------------------------------------
       Update status
    ------------------------------------------------- */

    room.isActive =
      isActive;

    await room.save();

    return res.status(200).json({
      success: true,
      message: isActive
        ? "Room activated successfully"
        : "Room deactivated successfully",
      room,
    });
  } catch (error) {
    console.error(
      "Update room status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
}

/* =====================================================
   DELETE ROOM
   ADMIN ONLY
=====================================================

   NOTE:
   This endpoint is intentionally kept for now,
   but the frontend should prefer deactivate instead
   of permanently deleting a room.
===================================================== */

export async function deleteRoom(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    /* -------------------------------------------------
       Validate room ID
    ------------------------------------------------- */

    const id: unknown =
      req.params.id;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid room ID",
      });
    }

    /* -------------------------------------------------
       Find room
    ------------------------------------------------- */

    const room =
      await Room.findById(id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    /* -------------------------------------------------
       Prevent deletion of active rooms
    ------------------------------------------------- */

    if (room.isActive) {
      return res.status(400).json({
        success: false,
        message:
          "Please deactivate the room before deleting it",
      });
    }

    /* -------------------------------------------------
       Delete room
    ------------------------------------------------- */

    await room.deleteOne();

    return res.status(200).json({
      success: true,
      message:
        "Room deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete room error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
}