
"use client";

import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Plane,
  ArrowRight,
  LogOut,
  Building2,
  ClipboardList,
} from "lucide-react";

import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/context/AuthContext";

function ServiceSelectionContent() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const firstName =
    user?.name?.trim().split(/\s+/)[0] || "Employee";

  const initials =
    user?.name
      ?.trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const openConferenceBooking = () => {
    router.push("/dashboard");
  };

  const openLeaveManagement = () => {
    router.push("/leave");
  };

  return (
    <main className="min-h-screen bg-[#F4F7FC]">
      {/* HEADER */}
      <header className="w-full border-b border-[#D5DEEF] bg-white">
        <div className="flex min-h-[76px] w-full items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          {/* LOGO AND PORTAL NAME */}
          <div className="flex min-w-0 items-center gap-4">
            <img
              src="/dangote-logo.png"
              alt="Dangote"
              className="h-auto w-24 shrink-0 object-contain sm:w-32"
            />

            <div className="hidden h-9 w-px bg-[#D5DEEF] sm:block" />

            <div className="min-w-0">
              <h1 className="text-sm font-bold text-[#10275F] sm:text-base">
                Employee Services Portal
              </h1>

              <p className="mt-1 hidden text-xs text-slate-500 sm:block">
                Your workplace, all in one place
              </p>
            </div>
          </div>

          {/* USER PROFILE */}
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DCE9FF] text-sm font-bold text-[#10275F]">
              {initials}
            </div>

            <div className="hidden min-w-0 flex-col justify-center sm:flex">
              <p className="max-w-[160px] truncate text-sm font-semibold leading-5 text-[#10275F] lg:max-w-[200px]">
                {user?.name || "Employee"}
              </p>

              <p className="max-w-[160px] truncate text-xs leading-4 text-slate-500 lg:max-w-[200px]">
                {user?.role === "ADMIN"
                  ? "Administrator"
                  : user?.department || "Employee"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void logout()}
              title="Log out"
              aria-label="Log out"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-[#E83B32]"
            >
              <LogOut size={19} />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <section className="mx-auto flex w-full max-w-6xl flex-col items-center px-5 py-12 sm:px-8 sm:py-16 lg:py-20">
        {/* WELCOME HEADING */}
        <div className="mb-10 text-center sm:mb-14">
          <div className="mx-auto mb-5 h-1 w-14 rounded-full bg-[#E83B32]" />

          <h2 className="text-3xl font-bold tracking-tight text-[#10275F] sm:text-4xl lg:text-5xl">
            Welcome, {firstName}!
          </h2>

          <p className="mt-4 text-base text-slate-500 sm:text-lg">
            What would you like to do today?
          </p>

          <p className="mt-2 text-sm text-slate-400">
            Choose a service to get started.
          </p>
        </div>

        {/* SERVICE CARDS */}
        <div className="grid w-full max-w-4xl grid-cols-1 items-stretch gap-6 md:grid-cols-2 md:gap-8">
          {/* CONFERENCE ROOM BOOKING */}
          <article className="group flex h-full min-h-[465px] flex-col overflow-hidden rounded-2xl border border-[#D5E2F7] bg-white shadow-[0_8px_30px_rgba(16,39,95,0.05)] transition duration-300 hover:-translate-y-1 hover:border-[#A9C5F0] hover:shadow-[0_18px_45px_rgba(16,39,95,0.10)]">
            <div className="h-1.5 shrink-0 bg-[#1D55B8]" />

            <div className="flex flex-1 flex-col items-center px-6 pb-8 pt-8 text-center sm:px-8 sm:pt-10">
              <div className="mb-6 flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#6254E8] transition duration-300 group-hover:scale-105">
                <CalendarDays size={42} strokeWidth={2.2} />
              </div>

              <h3 className="min-h-[60px] text-xl font-bold leading-7 text-[#10275F] sm:text-2xl sm:leading-8">
                Conference Room
                <br />
                Booking
              </h3>

              <p className="mt-4 min-h-[72px] max-w-xs text-sm leading-6 text-slate-500">
                Find and reserve meeting spaces for your team. Manage your
                conference room bookings in one place.
              </p>

              <div className="mt-5 flex min-h-[30px] flex-wrap justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF4FF] px-3 py-1.5 text-xs font-medium text-[#1D55B8]">
                  <Building2 size={13} />
                  Room Reservations
                </span>
              </div>

              <button
                type="button"
                onClick={openConferenceBooking}
                className="mt-auto inline-flex h-12 w-full max-w-xs shrink-0 items-center justify-center gap-3 rounded-xl bg-[#0756BC] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#06469A] focus:outline-none focus:ring-4 focus:ring-[#0756BC]/20"
              >
                Enter

                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </button>
            </div>
          </article>

          {/* LEAVE MANAGEMENT */}
          <article className="group flex h-full min-h-[465px] flex-col overflow-hidden rounded-2xl border border-[#D8EBDD] bg-white shadow-[0_8px_30px_rgba(16,39,95,0.05)] transition duration-300 hover:-translate-y-1 hover:border-[#A8D5B4] hover:shadow-[0_18px_45px_rgba(16,39,95,0.10)]">
            <div className="h-1.5 shrink-0 bg-[#18834A]" />

            <div className="flex flex-1 flex-col items-center px-6 pb-8 pt-8 text-center sm:px-8 sm:pt-10">
              <div className="mb-6 flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#EAF7EE] text-[#18834A] transition duration-300 group-hover:scale-105">
                <Plane size={44} strokeWidth={2.2} />
              </div>

              <h3 className="min-h-[60px] text-xl font-bold leading-7 text-[#10275F] sm:text-2xl sm:leading-8">
                Apply for Leave
              </h3>

              <p className="mt-4 min-h-[72px] max-w-xs text-sm leading-6 text-slate-500">
                Submit and track your leave requests. Apply for time off and
                check the status of your applications.
              </p>

              <div className="mt-5 flex min-h-[30px] flex-wrap justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF7EE] px-3 py-1.5 text-xs font-medium text-[#18834A]">
                  <ClipboardList size={13} />
                  Leave Requests
                </span>
              </div>

              <button
                type="button"
                onClick={openLeaveManagement}
                className="mt-auto inline-flex h-12 w-full max-w-xs shrink-0 items-center justify-center gap-3 rounded-xl bg-[#18834A] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#126A3B] focus:outline-none focus:ring-4 focus:ring-[#18834A]/20"
              >
                Enter

                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </button>
            </div>
          </article>
        </div>

        {/* FOOTER */}
        <p className="mt-10 text-center text-xs leading-5 text-slate-400 sm:mt-12">
          Employee Services Portal
          <span className="mx-2">•</span>
          Select a service to continue
        </p>
      </section>
    </main>
  );
}

// =====================================================
// SERVICES PAGE
// =====================================================

export default function ServicesPage() {
  return (
    <AuthGuard>
      <ServiceSelectionContent />
    </AuthGuard>
  );
}
