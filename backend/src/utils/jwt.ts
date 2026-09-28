import jwt from "jsonwebtoken";

interface JwtPayload {
  userId: string;
  role: "ADMIN" | "EMPLOYEE";
}

const JWT_EXPIRES_IN = "7d";

export function generateToken(
  userId: string,
  role: "ADMIN" | "EMPLOYEE"
): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      "JWT_SECRET is not defined in environment variables"
    );
  }

  return jwt.sign(
    {
      userId,
      role,
    },
    secret,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );
}

export function verifyToken(
  token: string
): JwtPayload {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      "JWT_SECRET is not defined in environment variables"
    );
  }

  return jwt.verify(token, secret) as JwtPayload;
}