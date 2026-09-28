"use client";

import { useEffect, useState } from "react";

import {
  Users,
  Building2,
  CalendarDays,
  Clock3,
  CheckCircle2,
  XCircle,
  RefreshCw,
  MapPin,
  BarChart3,
  AlertCircle,
  Activity,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

/* =====================================================
   TYPES
===================================================== */

interface DashboardStats {
  totalUsers: number;
  totalRooms: number;
  activeRooms: number;
  inactiveRooms: number;

  totalBookings: number;
  upcomingBookings: number;
  completedBookings: number;
  cancelledBookings: number;

  todayBookings: number;
}

interface DashboardBooking {
  _id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description?: string;

  status:
    | "UPCOMING"
    | "COMPLETED"
    | "CANCELLED";

  room: {
    _id: string;
    name: string;
    location: string;
  } | null;

  user: {
    _id: string;
    name: string;
    email: string;
    department?: string;
  } | null;
}

interface RoomUtilization {
  roomId: string;
  roomName: string;
  location: string;
  bookingCount: number;
  percentage: number;
}

interface DashboardResponse {
  success: boolean;

  stats: DashboardStats;

  recentBookings:
    | DashboardBooking[]
    | undefined;

  roomUtilization:
    | RoomUtilization[]
    | undefined;

  message?: string;
}

/* =====================================================
   HELPERS
===================================================== */

function formatDate(dateString: string) {
  const date = new Date(
    `${dateString}T00:00:00`
  );

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatTime(timeString: string) {
  try {
    const [hours, minutes] =
      timeString.split(":").map(Number);

    const date = new Date();

    date.setHours(
      hours,
      minutes,
      0,
      0
    );

    return date.toLocaleTimeString(
      "en-IN",
      {
        hour: "numeric",
        minute: "2-digit",
      }
    );
  } catch {
    return timeString;
  }
}

function formatStatus(
  status: DashboardBooking["status"]
) {
  if (status === "UPCOMING") {
    return "UPCOMING";
  }

  if (status === "COMPLETED") {
    return "COMPLETED";
  }

  return "CANCELLED";
}

/* =====================================================
   COMPONENT
===================================================== */

export default function AdminDashboardContent() {
  const [stats, setStats] =
    useState<DashboardStats | null>(null);

  const [recentBookings, setRecentBookings] =
    useState<DashboardBooking[]>([]);

  const [
    roomUtilization,
    setRoomUtilization,
  ] = useState<RoomUtilization[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  /* =====================================================
     FETCH DASHBOARD
  ===================================================== */

  async function fetchDashboard(
    showRefresh = false
  ) {
    try {
      setError("");

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(
        `${API_URL}/api/admin/dashboard`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const result: DashboardResponse =
        await response.json();

      if (!response.ok) {
        setError(
          result.message ||
            "Failed to load dashboard"
        );

        return;
      }

      if (!result.success) {
        setError(
          result.message ||
            "Failed to load dashboard"
        );

        return;
      }

      setStats(result.stats);

      setRecentBookings(
        result.recentBookings || []
      );

      setRoomUtilization(
        result.roomUtilization || []
      );
    } catch (error) {
      console.error(
        "Dashboard fetch error:",
        error
      );

      setError(
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    fetchDashboard();
  }, []);

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#EEF4FF] p-5 md:p-8 lg:p-10">

        <div className="flex min-h-[70vh] items-center justify-center">

          <div className="flex flex-col items-center">

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-[#D5E2F7]">
              <RefreshCw
                size={28}
                className="animate-spin text-[#1D55B8]"
              />
            </div>

            <p className="mt-4 text-sm font-semibold text-[#64748B]">
              Loading admin dashboard...
            </p>

          </div>

        </div>

      </main>
    );
  }

  /* =====================================================
     ERROR
  ===================================================== */

  if (error && !stats) {
    return (
      <main className="min-h-screen bg-[#EEF4FF] p-5 md:p-8 lg:p-10">

        <div className="flex min-h-[70vh] items-center justify-center">

          <div className="w-full max-w-md rounded-3xl border border-[#D5E2F7] bg-white p-8 text-center shadow-sm">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
              <AlertCircle
                size={27}
                className="text-[#E83B32]"
              />
            </div>

            <h2 className="mt-5 text-xl font-bold text-[#10275F]">
              Unable to load dashboard
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                fetchDashboard()
              }
              className="
                mt-6
                inline-flex
                items-center
                gap-2
                rounded-xl
                bg-[#102D72]
                px-5
                py-3
                text-sm
                font-bold
                text-white
                transition
                hover:bg-[#0C245C]
              "
            >
              <RefreshCw size={16} />
              Try Again
            </button>

          </div>

        </div>

      </main>
    );
  }

  if (!stats) {
    return null;
  }

  /* =====================================================
     UI
  ===================================================== */

  return (
    <main className="min-h-screen w-full bg-[#EEF4FF] p-5 md:p-8 lg:p-10">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

        <div>

          <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-[#E83B32]">
            Administration
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-[#10275F] md:text-4xl">
            Dashboard
          </h1>

          <p className="mt-2 text-[#64748B]">
            Overview of your conference room
            booking system.
          </p>

        </div>

        <button
          type="button"
          onClick={() =>
            fetchDashboard(true)
          }
          disabled={refreshing}
          className="
            inline-flex
            h-11
            items-center
            justify-center
            gap-2
            rounded-xl
            border
            border-[#D5E2F7]
            bg-white
            px-5
            text-sm
            font-bold
            text-[#10275F]
            shadow-sm
            transition
            hover:border-[#B8CCEC]
            hover:bg-[#EEF4FF]
            hover:text-[#1D55B8]
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        >
          <RefreshCw
            size={17}
            className={
              refreshing
                ? "animate-spin"
                : ""
            }
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>

      </div>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">

          <div className="flex items-center gap-2">

            <AlertCircle
              size={18}
              className="shrink-0 text-[#E83B32]"
            />

            <span>{error}</span>

          </div>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
            className="text-lg font-bold text-[#E83B32] hover:text-[#CF3028]"
            aria-label="Dismiss error"
          >
            ×
          </button>

        </div>
      )}

      {/* =================================================
          TOP STATISTICS
      ================================================= */}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

        {/* Total Users */}

        <div className="rounded-2xl border border-[#D5E2F7] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

          <div className="flex items-start justify-between">

            <div>

              <p className="text-sm font-semibold text-[#64748B]">
                Total Users
              </p>

              <p className="mt-2 text-3xl font-bold text-[#10275F]">
                {stats.totalUsers}
              </p>

              <p className="mt-2 text-xs text-[#94A3B8]">
                Registered employees
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1D55B8]">
              <Users size={21} />
            </div>

          </div>

        </div>

        {/* Total Rooms */}

        <div className="rounded-2xl border border-[#D5E2F7] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

          <div className="flex items-start justify-between">

            <div>

              <p className="text-sm font-semibold text-[#64748B]">
                Total Rooms
              </p>

              <p className="mt-2 text-3xl font-bold text-[#10275F]">
                {stats.totalRooms}
              </p>

              <p className="mt-2 text-xs text-[#94A3B8]">
                {stats.activeRooms} currently active
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1D55B8]">
              <Building2 size={21} />
            </div>

          </div>

        </div>

        {/* Total Bookings */}

        <div className="rounded-2xl border border-[#D5E2F7] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

          <div className="flex items-start justify-between">

            <div>

              <p className="text-sm font-semibold text-[#64748B]">
                Total Bookings
              </p>

              <p className="mt-2 text-3xl font-bold text-[#10275F]">
                {stats.totalBookings}
              </p>

              <p className="mt-2 text-xs text-[#94A3B8]">
                All reservations
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1D55B8]">
              <CalendarDays size={21} />
            </div>

          </div>

        </div>

        {/* Upcoming */}

        <div className="rounded-2xl border border-[#D5E2F7] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

          <div className="flex items-start justify-between">

            <div>

              <p className="text-sm font-semibold text-[#64748B]">
                Upcoming
              </p>

              <p className="mt-2 text-3xl font-bold text-[#1D55B8]">
                {stats.upcomingBookings}
              </p>

              <p className="mt-2 text-xs text-[#94A3B8]">
                Upcoming reservations
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1D55B8]">
              <Clock3 size={21} />
            </div>

          </div>

        </div>

      </div>

      {/* =================================================
          SECONDARY STATISTICS
      ================================================= */}

      <div className="mt-5 grid gap-5 md:grid-cols-3">

        {/* Today */}

        <div className="rounded-2xl border border-[#D5E2F7] bg-white p-5 shadow-sm">

          <div className="flex items-center gap-4">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1D55B8]">
              <CalendarDays size={21} />
            </div>

            <div>

              <p className="text-sm font-semibold text-[#64748B]">
                Today's Bookings
              </p>

              <p className="mt-1 text-2xl font-bold text-[#10275F]">
                {stats.todayBookings}
              </p>

            </div>

          </div>

        </div>

        {/* Completed */}

        <div className="rounded-2xl border border-[#D5E2F7] bg-white p-5 shadow-sm">

          <div className="flex items-center gap-4">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1D55B8]">
              <CheckCircle2 size={21} />
            </div>

            <div>

              <p className="text-sm font-semibold text-[#64748B]">
                Completed Bookings
              </p>

              <p className="mt-1 text-2xl font-bold text-[#10275F]">
                {stats.completedBookings}
              </p>

            </div>

          </div>

        </div>

        {/* Cancelled */}

        <div className="rounded-2xl border border-[#D5E2F7] bg-white p-5 shadow-sm">

          <div className="flex items-center gap-4">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-[#E83B32]">
              <XCircle size={21} />
            </div>

            <div>

              <p className="text-sm font-semibold text-[#64748B]">
                Cancelled Bookings
              </p>

              <p className="mt-1 text-2xl font-bold text-[#E83B32]">
                {stats.cancelledBookings}
              </p>

            </div>

          </div>

        </div>

      </div>

      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">

        {/* =================================================
            RECENT BOOKINGS
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-[#D5E2F7] bg-white shadow-sm">

          <div className="border-b border-[#E5ECF7] px-5 py-5">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1D55B8]">
                <CalendarDays size={19} />
              </div>

              <div>

                <h2 className="font-bold text-[#10275F]">
                  Recent Bookings
                </h2>

                <p className="mt-1 text-xs text-[#64748B]">
                  Latest room reservations
                </p>

              </div>

            </div>

          </div>

          {recentBookings.length ===
          0 ? (

            <div className="p-10 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#1D55B8]">
                <CalendarDays size={28} />
              </div>

              <p className="mt-4 text-sm font-bold text-[#10275F]">
                No bookings yet
              </p>

              <p className="mt-1 text-xs text-[#64748B]">
                Recent bookings will appear
                here.
              </p>

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full min-w-[760px]">

                <thead>

                  <tr className="border-b border-[#E5ECF7] bg-[#F6F9FF] text-left">

                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-[#64748B]">
                      Employee
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-[#64748B]">
                      Room
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-[#64748B]">
                      Date
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-[#64748B]">
                      Time
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-[#64748B]">
                      Status
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {recentBookings.map(
                    (booking) => (
                      <tr
                        key={
                          booking._id
                        }
                        className="border-b border-[#E5ECF7] last:border-0 hover:bg-[#F6F9FF]"
                      >

                        {/* Employee */}

                        <td className="px-5 py-4">

                          <p className="text-sm font-semibold text-[#10275F]">
                            {booking.user
                              ?.name ||
                              "Unknown User"}
                          </p>

                          <p className="mt-1 text-xs text-[#64748B]">
                            {booking.user
                              ?.email ||
                              "—"}
                          </p>

                        </td>

                        {/* Room */}

                        <td className="px-5 py-4">

                          <p className="text-sm font-semibold text-[#10275F]">
                            {booking.room
                              ?.name ||
                              "Unknown Room"}
                          </p>

                          {booking.room
                            ?.location && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-[#64748B]">

                              <MapPin
                                size={11}
                                className="text-[#1D55B8]"
                              />

                              {
                                booking
                                  .room
                                  .location
                              }

                            </div>
                          )}

                        </td>

                        {/* Date */}

                        <td className="px-5 py-4 text-sm font-medium text-[#475569]">
                          {formatDate(
                            booking.date
                          )}
                        </td>

                        {/* Time */}

                        <td className="px-5 py-4 text-sm font-medium text-[#475569]">

                          <div className="flex items-center gap-1.5">

                            <Clock3
                              size={14}
                              className="text-[#1D55B8]"
                            />

                            {formatTime(
                              booking.startTime
                            )}

                            {" - "}

                            {formatTime(
                              booking.endTime
                            )}

                          </div>

                        </td>

                        {/* Status */}

                        <td className="px-5 py-4">

                          <span
                            className={`
                              inline-flex
                              items-center
                              rounded-full
                              border
                              px-2.5
                              py-1
                              text-[11px]
                              font-bold
                              ${
                                booking.status ===
                                "UPCOMING"
                                  ? "border-blue-200 bg-[#EEF4FF] text-[#1D55B8]"
                                  : booking.status ===
                                      "COMPLETED"
                                    ? "border-slate-200 bg-slate-50 text-slate-600"
                                    : "border-red-200 bg-red-50 text-[#E83B32]"
                              }
                            `}
                          >
                            {formatStatus(
                              booking.status
                            )}
                          </span>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </section>

        {/* =================================================
            ROOM UTILIZATION
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-[#D5E2F7] bg-white shadow-sm">

          <div className="border-b border-[#E5ECF7] px-5 py-5">

            <div className="flex items-center justify-between gap-3">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1D55B8]">
                  <BarChart3 size={19} />
                </div>

                <div>

                  <h2 className="font-bold text-[#10275F]">
                    Room Utilization
                  </h2>

                  <p className="mt-1 text-xs text-[#64748B]">
                    Bookings by room
                  </p>

                </div>

              </div>

              <Activity
                size={19}
                className="text-[#1D55B8]"
              />

            </div>

          </div>

          {roomUtilization.length ===
          0 ? (

            <div className="p-10 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#1D55B8]">
                <Building2 size={28} />
              </div>

              <p className="mt-4 text-sm font-bold text-[#10275F]">
                No room data yet
              </p>

              <p className="mt-1 text-xs text-[#64748B]">
                Room utilization will appear
                here.
              </p>

            </div>

          ) : (

            <div className="space-y-6 p-5">

              {roomUtilization.map(
                (room) => (

                  <div
                    key={
                      room.roomId
                    }
                  >

                    <div className="flex items-start justify-between gap-4">

                      <div className="min-w-0">

                        <p className="truncate text-sm font-bold text-[#10275F]">
                          {room.roomName}
                        </p>

                        <p className="mt-1 flex items-center gap-1 truncate text-xs text-[#64748B]">

                          <MapPin
                            size={11}
                            className="shrink-0 text-[#1D55B8]"
                          />

                          {room.location}

                        </p>

                      </div>

                      <span className="shrink-0 text-sm font-bold text-[#10275F]">
                        {room.bookingCount}
                      </span>

                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E5ECF7]">

                      <div
                        className="h-full rounded-full bg-[#1D55B8] transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            Math.max(
                              room.percentage,
                              0
                            ),
                            100
                          )}%`,
                        }}
                      />

                    </div>

                    <div className="mt-1 flex justify-end">

                      <span className="text-[11px] font-semibold text-[#64748B]">
                        {Math.round(
                          room.percentage
                        )}
                        %
                      </span>

                    </div>

                  </div>

                )
              )}

            </div>
          )}

        </section>

      </div>

    </main>
  );
}