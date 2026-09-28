import dotenv from "dotenv";

import { connectDatabase } from "../config/database.js";
import { User } from "../models/User.js";
import { hashPassword } from "../utils/password.js";

dotenv.config();

async function createAdmin() {
  try {
    const name = process.env.ADMIN_NAME;
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const department = process.env.ADMIN_DEPARTMENT;

    if (!name || !email || !password) {
      throw new Error(
        "ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD are required"
      );
    }

    if (password.length < 8) {
      throw new Error(
        "Admin password must be at least 8 characters"
      );
    }

    await connectDatabase();

    const normalizedEmail =
      email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      existingUser.name = name.trim();
      existingUser.role = "ADMIN";

      if (department) {
        existingUser.department =
          department.trim();
      }

      existingUser.passwordHash =
        await hashPassword(password);

      await existingUser.save();

      console.log(
        `Admin role assigned successfully to ${normalizedEmail}`
      );

      process.exit(0);
    }

    const passwordHash =
      await hashPassword(password);

    const admin = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      department:
        department?.trim() || undefined,
      role: "ADMIN",
    });

    console.log(
      `Admin created successfully: ${admin.email}`
    );

    process.exit(0);
  } catch (error) {
    console.error(
      "Failed to create admin:",
      error
    );

    process.exit(1);
  }
}

createAdmin();