"use client";

import {
  Building2,
  CalendarDays,
  LayoutDashboard,
  Settings,
  Users,
  BarChart3,
  ClipboardList,
} from "lucide-react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const employeeMenuItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "My Bookings",
    href: "/bookings",
    icon: CalendarDays,
  },
  {
    label: "Rooms",
    href: "/rooms",
    icon: Building2,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

const adminMenuItems = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "All Bookings",
    href: "/admin/bookings",
    icon: ClipboardList,
  },
  {
    label: "Rooms",
    href: "/admin/rooms",
    icon: Building2,
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    label: "Reports",
    href: "/admin/reports",
    icon: BarChart3,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const isAdmin = user?.role === "ADMIN";

  const menuItems = isAdmin
    ? adminMenuItems
    : employeeMenuItems;

  return (
    <aside
      className="
        fixed
        bottom-0
        left-0
        top-[76px]
        z-40
        hidden
        w-[263px]
        flex-col
        overflow-hidden
        border-r
        border-[#173B86]
        bg-[#102D72]
        lg:flex
      "
    >

      {/* =================================================
          BRAND
      ================================================= */}

      <div
        className="
          flex
          h-[98px]
          shrink-0
          items-center
          border-b
          border-[#23458C]
          px-6
        "
      >

        <div
          className="
            flex
            h-12
            w-12
            shrink-0
            items-center
            justify-center
            rounded-xl
            bg-white
          "
        >
          <Building2
            size={24}
            className="text-[#102D72]"
          />
        </div>

        <div className="ml-4 min-w-0">

          <h2 className="text-lg font-bold text-white">
            Conference
          </h2>

          <p className="text-sm text-white/80">
            Room Booking
          </p>

        </div>

      </div>

      {/* =================================================
          NAVIGATION
          ONLY THIS SECTION CAN SCROLL
      ================================================= */}

      <div
        className="
          min-h-0
          flex-1
          overflow-y-auto
          px-4
          py-6
        "
      >

        <p
          className="
            mb-4
            px-3
            text-xs
            font-bold
            uppercase
            tracking-[0.2em]
            text-white/80
          "
        >
          {isAdmin
            ? "Admin Menu"
            : "Menu"}
        </p>

        <nav className="space-y-2">

          {menuItems.map((item) => {
            const Icon = item.icon;

            const isActive =
              pathname === item.href ||
              (
                item.href !== "/dashboard" &&
                item.href !== "/admin" &&
                pathname.startsWith(
                  `${item.href}/`
                )
              );

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex
                  items-center
                  gap-3
                  rounded-xl
                  px-3
                  py-3
                  text-sm
                  font-semibold
                  transition-all
                  duration-200
                  ${
                    isActive
                      ? "bg-[#1D55B8] text-white shadow-sm"
                      : "text-white hover:bg-[#17438F]"
                  }
                `}
              >

                <Icon
                  size={20}
                  className="shrink-0 text-white"
                />

                <span className="text-white">
                  {item.label}
                </span>

              </Link>
            );
          })}

        </nav>

      </div>

      {/* =================================================
          USER — ALWAYS AT BOTTOM OF SCREEN
      ================================================= */}

      <div
        className="
          shrink-0
          border-t
          border-[#23458C]
          bg-[#102D72]
          p-4
        "
      >

        <div
          className="
            flex
            items-center
            gap-3
            rounded-xl
            bg-[#0C245C]
            p-3
          "
        >

          <div
            className="
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-full
              bg-white
              text-sm
              font-bold
              text-[#102D72]
            "
          >
            {user?.name
              ?.trim()
              .split(/\s+/)
              .map(
                (name) => name[0]
              )
              .join("")
              .slice(0, 2)
              .toUpperCase() ||
              "U"}
          </div>

          <div className="min-w-0">

            <p
              className="
                truncate
                text-sm
                font-bold
                text-white
              "
            >
              {user?.name || "User"}
            </p>

            <p
              className="
                truncate
                text-xs
                text-white/80
              "
            >
              {isAdmin
                ? "Administrator"
                : "Employee"}
            </p>

          </div>

        </div>

      </div>

    </aside>
  );
}