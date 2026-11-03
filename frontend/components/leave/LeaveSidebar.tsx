
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

import {
  CalendarDays,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Plane,
  Wallet,
  ClipboardCheck,
  History,
  GitBranch,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

type LeaveSidebarProps = {
  className?: string;
  onNavigate?: () => void;
};

type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

/* ==========================================
   EMPLOYEE NAVIGATION
========================================== */

const employeeNavigationItems: NavigationItem[] = [
  {
    label: "Leave Management",
    href: "/leave",
    icon: Plane,
  },
  {
    label: "Apply for Leave",
    href: "/leave/apply",
    icon: FileText,
  },
  {
    label: "My Leave Requests",
    href: "/leave/requests",
    icon: ClipboardList,
  },
  {
    label: "Leave Calendar",
    href: "/leave/calendar",
    icon: CalendarDays,
  },
  {
    label: "Leave Balance",
    href: "/leave/balance",
    icon: Wallet,
  },
];

/* ==========================================
   APPROVAL NAVIGATION
========================================== */

const approvalNavigationItems: NavigationItem[] = [
  {
    label: "Leave Approval",
    href: "/leave/approvals",
    icon: ClipboardCheck,
  },
  {
    label: "Approval History",
    href: "/leave/approval-history",
    icon: History,
    adminOnly: true,
  },
  {
    label: "Approval Tracking",
    href: "/leave/tracking",
    icon: GitBranch,
    adminOnly: true,
  },
];

/* ==========================================
   LEAVE SIDEBAR
========================================== */

export default function LeaveSidebar({
  className = "",
  onNavigate,
}: LeaveSidebarProps) {
  const pathname = usePathname();

  // Get logged-in user from existing AuthContext.
  const { user } = useAuth();

  const isAdmin = user?.role === "ADMIN";

  /*
   * Every employee can be a first-level approver.
   * Therefore, Leave Approval is visible to everyone.
   *
   * Only admins can see Approval History and
   * Approval Tracking.
   */

  const navigationItems: NavigationItem[] = [
    ...employeeNavigationItems,
    ...approvalNavigationItems.filter(
      (item) => !item.adminOnly || isAdmin
    ),
  ];

  /* ==========================================
     ACTIVE NAVIGATION
  ========================================== */

  const isActive = (href: string) => {
    if (href === "/leave") {
      return pathname === "/leave";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  };

  /* ==========================================
     RENDER
  ========================================== */

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex h-screen w-[250px] flex-col overflow-hidden bg-[#122D59] text-white ${className}`}
    >
      {/* BRAND */}
      <div className="flex h-[81px] shrink-0 items-center gap-3 border-b border-white/10 px-6">
        <Link
          href="/services"
          aria-label="Go to Employee Services"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-3"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
            <Image
              src="/dangote-logo.png"
              alt="Dangote logo"
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
              priority
            />
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-bold tracking-wide text-white">
              DANGOTE
            </h2>

            <p className="mt-1 whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.18em] text-blue-200">
              Employee Portal
            </p>
          </div>
        </Link>
      </div>

      {/* NAVIGATION */}
      <nav
        aria-label="Leave management navigation"
        className="flex-1 overflow-y-auto px-4 py-6"
      >
        <p className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300">
          Main Menu
        </p>

        <div className="space-y-1.5">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`group flex min-h-[46px] items-center gap-3 rounded-xl px-3 py-3 text-[13px] transition-colors duration-200 ${
                  active
                    ? "bg-white/15 font-semibold text-white shadow-sm ring-1 ring-white/10"
                    : "font-medium text-blue-100 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon
                  size={18}
                  strokeWidth={active ? 2.2 : 1.8}
                  className={`shrink-0 ${
                    active
                      ? "text-white"
                      : "text-blue-200 transition-colors group-hover:text-white"
                  }`}
                />

                <span className="min-w-0 flex-1">
                  {item.label}
                </span>

                {active && (
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-white"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* BOTTOM NAVIGATION */}
      <div className="shrink-0 border-t border-white/10 p-4">
        <Link
          href="/services"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-blue-100 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LayoutDashboard size={18} />
          <span>All Services</span>
        </Link>
      </div>
    </aside>
  );
}
