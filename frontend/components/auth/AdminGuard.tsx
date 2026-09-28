"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    user,
    isLoading,
    isAuthenticated,
  } = useAuth();

  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/login?redirect=/admin");
      return;
    }

    if (user?.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [
    isLoading,
    isAuthenticated,
    user,
    router,
  ]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbf1ef]">
        <div className="text-sm font-medium text-gray-500">
          Checking permissions...
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "ADMIN") {
    return null;
  }

  return <>{children}</>;
}