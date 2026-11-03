
"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";

interface AdminGuardProps {
  children: ReactNode;
}

export default function AdminGuard({
  children,
}: AdminGuardProps) {
  const {
    user,
    isLoading,
    isAuthenticated,
  } = useAuth();

  const router = useRouter();

  useEffect(() => {
    // Wait until authentication check finishes.
    if (isLoading) {
      return;
    }

    // Redirect unauthenticated users to login.
    if (!isAuthenticated || !user) {
      router.replace("/login?redirect=/admin");
      return;
    }

    // Non-admin users should return to Services.
    if (user.role !== "ADMIN") {
      router.replace("/services");
    }
  }, [
    isLoading,
    isAuthenticated,
    user,
    router,
  ]);

  // Authentication loading screen.
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbf1ef]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-red-700" />

          <p className="text-sm font-medium text-gray-500">
            Checking permissions...
          </p>
        </div>
      </div>
    );
  }

  // Do not render admin content for unauthenticated users.
  if (!isAuthenticated || !user) {
    return null;
  }

  // Do not render admin content for employees.
  if (user.role !== "ADMIN") {
    return null;
  }

  return <>{children}</>;
}
