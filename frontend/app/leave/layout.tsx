"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronDown,
  LogOut,
  Menu,
  X,
} from "lucide-react";

import LeaveSidebar from "@/components/leave/LeaveSidebar";
import { useAuth } from "@/context/AuthContext";

export default function LeaveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const employeeName =
    user?.name || user?.email?.split("@")[0] || "Employee";

  const employeeRole =
    (user as { role?: string } | null)?.role || "Employee";

  const initials = employeeName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  const pageTitles: Record<string, string> = {
    "/leave": "Leave Management",
    "/leave/apply": "Apply for Leave",
    "/leave/requests": "My Leave Requests",
    "/leave/calendar": "Leave Calendar",
    "/leave/balance": "Leave Balance",
  };

  const pageTitle = pageTitles[pathname] || "Leave Management";

  async function handleLogout() {
    setProfileMenuOpen(false);

    try {
      await logout();
    } finally {
      router.push("/login");
    }
  }

  return (
    <div className="min-h-screen bg-[#F3F6FB] text-slate-900">
      {/* Desktop: exactly one shared sidebar */}
      <div className="hidden lg:block">
        <LeaveSidebar />
      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-950/50"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="absolute inset-y-0 left-0 w-[250px]">
            <LeaveSidebar
              className="z-[61]"
              onNavigate={() => setMobileMenuOpen(false)}
            />

            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute right-3 top-3 z-[62] rounded-lg p-2 text-white hover:bg-white/10"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Main application area */}
      <div className="flex min-h-screen min-w-0 flex-col lg:ml-[250px]">
        {/* Shared header */}
        <header className="sticky top-0 z-30 flex h-[81px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 lg:hidden"
            >
              <Menu size={20} />
            </button>

            <Link href="/services" className="min-w-0">
              <h1 className="truncate text-lg font-bold text-[#122D59]">
                {pageTitle}
              </h1>
              <p className="text-xs text-slate-500">
                Employee Services
              </p>
            </Link>
          </div>

          {/* Employee profile */}
          <div className="relative ml-3 shrink-0">
            <button
              type="button"
              aria-expanded={profileMenuOpen}
              onClick={() =>
                setProfileMenuOpen((open) => !open)
              }
              className="flex items-center gap-2 rounded-xl p-2 hover:bg-slate-50 sm:gap-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-[#17458B]">
                {initials || "E"}
              </div>

              <div className="hidden text-right sm:block">
                <p className="max-w-[160px] truncate text-sm font-semibold text-slate-900">
                  {employeeName}
                </p>
                <p className="text-xs capitalize text-slate-500">
                  {employeeRole}
                </p>
              </div>

              <ChevronDown
                size={16}
                className="hidden text-slate-500 sm:block"
              />
            </button>

            {profileMenuOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close profile menu"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setProfileMenuOpen(false)}
                />

                <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-2 shadow-xl">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {employeeName}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {user?.email || "Employee account"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={17} />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Each route renders its own page content here */}
        <main className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}