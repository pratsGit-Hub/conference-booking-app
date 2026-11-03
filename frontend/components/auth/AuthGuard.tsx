
"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";

interface AuthGuardProps {
  children: ReactNode;

  // Optional role restriction for pages that need it.
  allowedRoles?: Array<"ADMIN" | "EMPLOYEE">;
}

export default function AuthGuard({
  children,
  allowedRoles,
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();

  const {
    user,
    isAuthenticated,
    isLoading,
  } = useAuth();

  useEffect(() => {
    // Wait until the initial authentication check finishes.
    if (isLoading) {
      return;
    }

    // Redirect users who are not logged in.
    if (!isAuthenticated || !user) {
      const redirectUrl = pathname || "/services";

      router.replace(
        `/login?redirect=${encodeURIComponent(redirectUrl)}`
      );

      return;
    }

    // Apply role restrictions only when a page specifies them.
    if (
      allowedRoles &&
      !allowedRoles.includes(user.role)
    ) {
      router.replace("/services");
    }
  }, [
    isAuthenticated,
    isLoading,
    user,
    pathname,
    router,
    allowedRoles,
  ]);

  // Show loading screen during authentication.
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbf1ef]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-red-700" />

          <p className="text-sm text-gray-500">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  // Do not render protected content when logged out.
  if (!isAuthenticated || !user) {
    return null;
  }

  // Do not render a page when the user's role is not allowed.
  if (
    allowedRoles &&
    !allowedRoles.includes(user.role)
  ) {
    return null;
  }

  return <>{children}</>;
}
