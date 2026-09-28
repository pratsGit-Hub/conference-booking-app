import dotenv from "dotenv";
import mongoose from "mongoose";

import { Booking } from "../models/Booking.js";

dotenv.config();

const SLOT_MINUTES = 15;

function timeToMinutes(
  time: string
): number {
  const [hours, minutes] =
    time
      .split(":")
      .map(Number);

  return (
    hours * 60 +
    minutes
  );
}

function minutesToTime(
  totalMinutes: number
): string {
  const hours =
    Math.floor(
      totalMinutes / 60
    );

  const minutes =
    totalMinutes % 60;

  return `${String(hours).padStart(
    2,
    "0"
  )}:${String(minutes).padStart(
    2,
    "0"
  )}`;
}

function generateOccupiedSlots(
  startTime: string,
  endTime: string
): string[] {
  const start =
    timeToMinutes(startTime);

  const end =
    timeToMinutes(endTime);

  const slots: string[] = [];

  for (
    let current = start;
    current < end;
    current += SLOT_MINUTES
  ) {
    slots.push(
      minutesToTime(current)
    );
  }

  return slots;
}

async function migrate() {
  try {
    const mongoUri =
      process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error(
        "MONGODB_URI is missing from .env"
      );
    }

    await mongoose.connect(
      mongoUri
    );

    console.log(
      "Connected to MongoDB"
    );

    const bookings =
      await Booking.find({
        occupiedSlots: {
          $exists: false,
        },
      });

    console.log(
      `Found ${bookings.length} bookings to migrate`
    );

    let updated = 0;

    for (
      const booking of bookings
    ) {
      const occupiedSlots =
        generateOccupiedSlots(
          booking.startTime,
          booking.endTime
        );

      if (
        occupiedSlots.length ===
        0
      ) {
        console.warn(
          `Skipping invalid booking ${booking._id}`
        );

        continue;
      }

      booking.occupiedSlots =
        occupiedSlots;

      await booking.save();

      updated++;

      console.log(
        `Updated booking ${booking._id}`
      );
    }

    console.log(
      `Migration completed. Updated ${updated} bookings.`
    );

    await mongoose.disconnect();

    process.exit(0);
  } catch (error) {
    console.error(
      "Booking slot migration failed:",
      error
    );

    await mongoose.disconnect();

    process.exit(1);
  }
}

migrate();