"use client";

import {
  Menu,
  LogOut,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useAuth } from "@/context/AuthContext";

import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const { user, logout } = useAuth();

  const [
    isUserMenuOpen,
    setIsUserMenuOpen,
  ] = useState(false);

  const userMenuRef =
    useRef<HTMLDivElement>(null);

  const firstName =
    user?.name
      ?.trim()
      .split(/\s+/)[0] ||
    "User";

  const role =
    user?.role === "ADMIN"
      ? "Admin"
      : "Employee";

  const initials =
    user?.name
      ?.trim()
      .split(/\s+/)
      .map(
        (name) => name[0]
      )
      .join("")
      .slice(0, 2)
      .toUpperCase() ||
    "U";

  /* =====================================================
     CLOSE USER MENU WHEN CLICKING OUTSIDE
  ===================================================== */

  useEffect(() => {
    function handleClickOutside(
      event: MouseEvent
    ) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(
          event.target as Node
        )
      ) {
        setIsUserMenuOpen(false);
      }
    }

    if (isUserMenuOpen) {
      document.addEventListener(
        "mousedown",
        handleClickOutside
      );
    }

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, [isUserMenuOpen]);

  /* =====================================================
     LOGOUT
  ===================================================== */

  async function handleLogout() {
    setIsUserMenuOpen(false);

    await logout();
  }

  return (
    <header
      className="
        sticky
        top-0
        z-50
        flex
        h-[76px]
        items-center
        justify-between
        border-b
        border-[#D5E2F7]
        bg-white
        px-5
        md:px-8
      "
    >

      {/* =====================================================
          DANGOTE LOGO
      ===================================================== */}

      <div className="flex items-center">
        <img
          src="/dangote-dark-logo.png"
          alt="Dangote"
          className="
            h-12
            w-auto
            object-contain
          "
        />
      </div>

      {/* =====================================================
          RIGHT SIDE
      ===================================================== */}

      <div className="flex items-center gap-4">

        {/* =================================================
            REAL DATABASE NOTIFICATIONS
        ================================================= */}

        <NotificationBell />

        {/* =================================================
            USER MENU
        ================================================= */}

        <div
          ref={userMenuRef}
          className="
            relative
            border-l
            border-[#D5E2F7]
            pl-4
          "
        >

          {/* =================================================
              USER BUTTON
          ================================================= */}

          <button
            type="button"
            onClick={() =>
              setIsUserMenuOpen(
                (previous) =>
                  !previous
              )
            }
            className="
              flex
              items-center
              gap-3
              rounded-xl
              px-2
              py-1.5
              transition
              hover:bg-[#EEF4FF]
              focus:outline-none
              focus:ring-2
              focus:ring-[#10275F]/20
            "
            aria-expanded={
              isUserMenuOpen
            }
            aria-haspopup="menu"
            aria-label={`Open ${firstName} account menu`}
          >

            {/* =================================================
                INITIALS
            ================================================= */}

            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-full
                bg-[#10275F]
                font-bold
                text-white
              "
            >
              {initials}
            </div>

            {/* =================================================
                USER INFORMATION
            ================================================= */}

            <div className="hidden text-left lg:block">

              <p
                className="
                  text-sm
                  font-semibold
                  text-[#10275F]
                "
              >
                {firstName}
              </p>

              <p
                className="
                  text-xs
                  text-[#64748B]
                "
              >
                {role}
              </p>

            </div>

            {/* =================================================
                SMALL ARROW
            ================================================= */}

            <svg
              className={`
                hidden
                h-4
                w-4
                text-[#64748B]
                transition-transform
                lg:block
                ${
                  isUserMenuOpen
                    ? "rotate-180"
                    : ""
                }
              `}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>

          </button>

          {/* =================================================
              LOGOUT DROPDOWN
          ================================================= */}

          {isUserMenuOpen && (
            <div
              role="menu"
              className="
                absolute
                right-0
                top-full
                mt-3
                w-44
                overflow-hidden
                rounded-xl
                border
                border-[#D5E2F7]
                bg-white
                p-1.5
                shadow-lg
              "
            >

              <button
                type="button"
                role="menuitem"
                onClick={
                  handleLogout
                }
                className="
                  flex
                  w-full
                  items-center
                  gap-3
                  rounded-lg
                  px-3
                  py-2.5
                  text-left
                  text-sm
                  font-medium
                  text-[#475569]
                  transition
                  hover:bg-[#EEF4FF]
                  hover:text-[#10275F]
                "
              >

                <LogOut
                  size={17}
                  strokeWidth={2}
                />

                <span>
                  Log out
                </span>

              </button>

            </div>
          )}

        </div>

        {/* =================================================
            MOBILE MENU
        ================================================= */}

        <button
          type="button"
          className="
            rounded-xl
            p-2
            text-[#64748B]
            transition
            hover:bg-[#EEF4FF]
            hover:text-[#10275F]
            lg:hidden
          "
          title="Menu"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>

      </div>

    </header>
  );
}