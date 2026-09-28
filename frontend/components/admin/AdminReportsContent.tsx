"use client";

import { useEffect, useMemo, useState } from "react";

import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  RefreshCw,
  TrendingUp,
  Users,
  XCircle,
  MapPin,
  Building2,
  Activity,
  AlertCircle,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

/* =====================================================
   TYPES
===================================================== */

type ReportPeriod =
  | "today"
  | "week"
  | "month"
  | "all";

interface Summary {
  totalBookings: number;
  upcomingBookings: number;
  completedBookings: number;
  cancelledBookings: number;
}

interface RoomUtilization {
  roomId: string;
  roomName: string;
  location: string;
  bookingCount: number;
  utilizationPercentage: number;
}

interface EmployeeActivity {
  userId: string;
  name: string;
  email: string;
  department?: string;
  bookingCount: number;
}

interface DailyBooking {
  date: string;
  bookingCount: number;
}

interface RecentBooking {
  _id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;

  user: {
    _id: string;
    name: string;
    email: string;
    department?: string;
  } | null;

  room: {
    _id: string;
    name: string;
    location: string;
  } | null;
}

interface ReportResponse {
  success: boolean;

  period: ReportPeriod;

  dateRange: {
    start: string | null;
    end: string | null;
  };

  summary: Summary;

  roomUtilization: RoomUtilization[];

  employeeActivity: EmployeeActivity[];

  dailyBookings: DailyBooking[];

  recentBookings: RecentBooking[];

  message?: string;
}

/* =====================================================
   CONSTANTS
===================================================== */

const periodLabels: Record<
  ReportPeriod,
  string
> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
  all: "All Time",
};

/* =====================================================
   HELPERS
===================================================== */

function formatDate(dateString: string) {
  if (!dateString) {
    return "-";
  }

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

function formatDateRange(
  start: string | null,
  end: string | null
) {
  if (!start || !end) {
    return "All available booking records";
  }

  return `${formatDate(start)} - ${formatDate(
    end
  )}`;
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

function getStatusClasses(
  status: string
) {
  switch (status) {
    case "UPCOMING":
      return "border border-blue-200 bg-[#EEF4FF] text-[#1D55B8]";

    case "COMPLETED":
      return "border border-slate-200 bg-slate-50 text-slate-600";

    case "CANCELLED":
      return "border border-red-200 bg-red-50 text-[#E83B32]";

    default:
      return "border border-slate-200 bg-slate-50 text-slate-600";
  }
}

/* =====================================================
   COMPONENT
===================================================== */

export default function AdminReportsContent() {
  const [period, setPeriod] =
    useState<ReportPeriod>("month");

  const [report, setReport] =
    useState<ReportResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  /* =====================================================
     FETCH REPORTS
  ===================================================== */

  const fetchReports = async (
    selectedPeriod: ReportPeriod = period,
    isRefresh = false
  ) => {
    try {
      setError("");

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(
        `${API_URL}/api/admin/reports?period=${selectedPeriod}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const data: ReportResponse =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load reports"
        );
      }

      if (!data.success) {
        throw new Error(
          data.message ||
            "Failed to load reports"
        );
      }

      setReport(data);
    } catch (error) {
      console.error(
        "Reports loading error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to load reports"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* =====================================================
     INITIAL LOAD / PERIOD CHANGE
  ===================================================== */

  useEffect(() => {
    fetchReports(period);
  }, [period]);

  /* =====================================================
     CHART HELPERS
  ===================================================== */

  const maxDailyBookings = useMemo(() => {
    if (
      !report?.dailyBookings.length
    ) {
      return 1;
    }

    return Math.max(
      ...report.dailyBookings.map(
        (item) => item.bookingCount
      ),
      1
    );
  }, [report]);

  const maxRoomBookings = useMemo(() => {
    if (
      !report?.roomUtilization.length
    ) {
      return 1;
    }

    return Math.max(
      ...report.roomUtilization.map(
        (room) => room.bookingCount
      ),
      1
    );
  }, [report]);

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#EEF4FF] p-5 md:p-8 lg:p-10">

        <div className="mb-8">

          <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-[#E83B32]">
            Administration
          </p>

          <h1 className="text-3xl font-bold text-[#10275F] md:text-4xl">
            Reports
          </h1>

          <p className="mt-2 text-sm text-[#64748B]">
            View conference room usage and
            booking activity.
          </p>

        </div>

        <div className="flex min-h-[60vh] items-center justify-center rounded-2xl border border-[#D5E2F7] bg-white shadow-sm">

          <div className="flex flex-col items-center">

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF4FF]">
              <RefreshCw
                size={28}
                className="animate-spin text-[#1D55B8]"
              />
            </div>

            <p className="mt-4 text-sm font-semibold text-[#64748B]">
              Loading reports...
            </p>

          </div>

        </div>

      </main>
    );
  }

  /* =====================================================
     ERROR
  ===================================================== */

  if (error) {
    return (
      <main className="min-h-screen bg-[#EEF4FF] p-5 md:p-8 lg:p-10">

        <div className="mb-8">

          <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-[#E83B32]">
            Administration
          </p>

          <h1 className="text-3xl font-bold text-[#10275F] md:text-4xl">
            Reports
          </h1>

          <p className="mt-2 text-sm text-[#64748B]">
            View conference room usage and
            booking activity.
          </p>

        </div>

        <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm">

          <div className="flex flex-col items-start gap-5 sm:flex-row">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50">
              <AlertCircle
                size={24}
                className="text-[#E83B32]"
              />
            </div>

            <div>

              <p className="text-lg font-bold text-[#10275F]">
                Unable to load reports
              </p>

              <p className="mt-1 text-sm leading-6 text-[#64748B]">
                {error}
              </p>

              <button
                type="button"
                onClick={() =>
                  fetchReports(
                    period,
                    true
                  )
                }
                className="
                  mt-5
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

        </div>

      </main>
    );
  }

  if (!report) {
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

      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

        <div>

          <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-[#E83B32]">
            Administration
          </p>

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#102D72] text-white">
              <BarChart3 size={22} />
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-[#10275F] md:text-4xl">
              Reports
            </h1>

          </div>

          <p className="mt-2 text-sm text-[#64748B]">
            View conference room usage,
            booking activity, and employee
            activity.
          </p>

        </div>

        {/* Controls */}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

          {/* Period */}

          <div className="flex items-center gap-3 rounded-xl border border-[#D5E2F7] bg-white px-4 py-2.5 shadow-sm">

            <CalendarDays
              size={18}
              className="text-[#1D55B8]"
            />

            <select
              value={period}
              onChange={(event) =>
                setPeriod(
                  event.target
                    .value as ReportPeriod
                )
              }
              className="
                bg-transparent
                text-sm
                font-bold
                text-[#10275F]
                outline-none
              "
            >
              {Object.entries(
                periodLabels
              ).map(
                ([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                )
              )}
            </select>

          </div>

          {/* Refresh */}

          <button
            type="button"
            onClick={() =>
              fetchReports(
                period,
                true
              )
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
              size={16}
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

      </div>

      {/* =================================================
          REPORT PERIOD
      ================================================= */}

      <div className="mb-6 rounded-2xl border border-[#D5E2F7] bg-white p-5 shadow-sm">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1D55B8]">
              <Clock3 size={19} />
            </div>

            <div>

              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#64748B]">
                Report Period
              </p>

              <p className="mt-1 text-sm font-bold text-[#10275F]">
                {periodLabels[
                  report.period
                ]}
              </p>

            </div>

          </div>

          <div className="rounded-lg bg-[#F6F9FF] px-4 py-2">

            <p className="text-xs font-medium text-[#64748B]">
              Date Range
            </p>

            <p className="mt-0.5 text-sm font-bold text-[#10275F]">
              {formatDateRange(
                report.dateRange.start,
                report.dateRange.end
              )}
            </p>

          </div>

        </div>

      </div>

      {/* =================================================
          SUMMARY CARDS
      ================================================= */}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

        <SummaryCard
          title="Total Bookings"
          value={
            report.summary
              .totalBookings
          }
          icon={
            <FileText size={21} />
          }
          description="Bookings in selected period"
          iconClass="bg-[#EEF4FF] text-[#1D55B8]"
        />

        <SummaryCard
          title="Upcoming"
          value={
            report.summary
              .upcomingBookings
          }
          icon={
            <Clock3 size={21} />
          }
          description="Upcoming bookings"
          iconClass="bg-[#EEF4FF] text-[#1D55B8]"
        />

        <SummaryCard
          title="Completed"
          value={
            report.summary
              .completedBookings
          }
          icon={
            <CheckCircle2
              size={21}
            />
          }
          description="Completed bookings"
          iconClass="bg-slate-100 text-slate-600"
        />

        <SummaryCard
          title="Cancelled"
          value={
            report.summary
              .cancelledBookings
          }
          icon={
            <XCircle size={21} />
          }
          description="Cancelled bookings"
          iconClass="bg-red-50 text-[#E83B32]"
          valueClass="text-[#E83B32]"
        />

      </div>

      {/* =================================================
          ROOM UTILIZATION
      ================================================= */}

      <section className="mt-6 overflow-hidden rounded-2xl border border-[#D5E2F7] bg-white shadow-sm">

        <div className="border-b border-[#E5ECF7] px-5 py-5">

          <div className="flex items-center justify-between gap-4">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1D55B8]">
                <Building2 size={19} />
              </div>

              <div>

                <h2 className="font-bold text-[#10275F]">
                  Room Utilization
                </h2>

                <p className="mt-1 text-xs text-[#64748B]">
                  Booking activity by
                  conference room.
                </p>

              </div>

            </div>

            <TrendingUp
              size={21}
              className="text-[#1D55B8]"
            />

          </div>

        </div>

        {report.roomUtilization
          .length === 0 ? (

          <EmptyState message="No room booking data available for this period." />

        ) : (

          <div className="space-y-6 p-5">

            {report.roomUtilization.map(
              (room) => {

                const percentage =
                  Math.min(
                    Math.max(
                      room.utilizationPercentage,
                      0
                    ),
                    100
                  );

                const relativeActivity =
                  Math.min(
                    Math.max(
                      (room.bookingCount /
                        maxRoomBookings) *
                        100,
                      0
                    ),
                    100
                  );

                return (
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

                        <p className="mt-1 flex items-center gap-1 text-xs text-[#64748B]">

                          <MapPin
                            size={11}
                            className="text-[#1D55B8]"
                          />

                          {room.location}

                        </p>

                      </div>

                      <div className="shrink-0 text-right">

                        <p className="text-sm font-bold text-[#10275F]">
                          {room.bookingCount}
                        </p>

                        <p className="text-xs font-semibold text-[#1D55B8]">
                          {Math.round(
                            percentage
                          )}
                          %
                        </p>

                      </div>

                    </div>

                    {/* Utilization */}

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E5ECF7]">

                      <div
                        className="h-full rounded-full bg-[#1D55B8] transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                        }}
                      />

                    </div>

                    <div className="mt-2 flex justify-between">

                      <span className="text-[11px] text-[#94A3B8]">
                        Utilization
                      </span>

                      <span className="text-[11px] font-semibold text-[#64748B]">
                        {Math.round(
                          relativeActivity
                        )}
                        % relative activity
                      </span>

                    </div>

                  </div>
                );
              }
            )}

          </div>
        )}

      </section>

      {/* =================================================
          DAILY BOOKING TREND
      ================================================= */}

      <section className="mt-6 overflow-hidden rounded-2xl border border-[#D5E2F7] bg-white shadow-sm">

        <div className="border-b border-[#E5ECF7] px-5 py-5">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1D55B8]">
              <BarChart3 size={19} />
            </div>

            <div>

              <h2 className="font-bold text-[#10275F]">
                Daily Booking Trend
              </h2>

              <p className="mt-1 text-xs text-[#64748B]">
                Number of bookings recorded
                for each day.
              </p>

            </div>

          </div>

        </div>

        {report.dailyBookings
          .length === 0 ? (

          <EmptyState message="No daily booking data available for this period." />

        ) : (

          <div className="space-y-4 p-5">

            {report.dailyBookings.map(
              (item) => {

                const width =
                  (item.bookingCount /
                    maxDailyBookings) *
                  100;

                const displayWidth =
                  item.bookingCount > 0
                    ? Math.max(width, 8)
                    : 0;

                return (
                  <div
                    key={item.date}
                    className="
                      grid
                      grid-cols-[82px_1fr_42px]
                      items-center
                      gap-3
                      sm:grid-cols-[100px_1fr_45px]
                    "
                  >

                    <span className="text-xs font-semibold text-[#64748B]">
                      {formatDate(
                        item.date
                      )}
                    </span>

                    <div className="h-8 overflow-hidden rounded-lg bg-[#F1F5F9]">

                      <div
                        className="
                          flex
                          h-full
                          items-center
                          rounded-lg
                          bg-[#1D55B8]
                          px-3
                          text-xs
                          font-bold
                          text-white
                          transition-all
                          duration-500
                        "
                        style={{
                          width: `${displayWidth}%`,
                        }}
                      >
                        {item.bookingCount >
                          0 &&
                          item.bookingCount}
                      </div>

                    </div>

                    <span className="text-right text-sm font-bold text-[#10275F]">
                      {item.bookingCount}
                    </span>

                  </div>
                );
              }
            )}

          </div>
        )}

      </section>

      {/* =================================================
          EMPLOYEE ACTIVITY
      ================================================= */}

      <section className="mt-6 overflow-hidden rounded-2xl border border-[#D5E2F7] bg-white shadow-sm">

        <div className="border-b border-[#E5ECF7] px-5 py-5">

          <div className="flex items-center justify-between gap-4">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1D55B8]">
                <Users size={19} />
              </div>

              <div>

                <h2 className="font-bold text-[#10275F]">
                  Employee Activity
                </h2>

                <p className="mt-1 text-xs text-[#64748B]">
                  Employees with bookings
                  in the selected period.
                </p>

              </div>

            </div>

          </div>

        </div>

        {report.employeeActivity
          .length === 0 ? (

          <EmptyState message="No employee booking activity available." />

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full min-w-[650px]">

              <thead>

                <tr className="border-b border-[#E5ECF7] bg-[#F6F9FF] text-left">

                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-[#64748B]">
                    Employee
                  </th>

                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-[#64748B]">
                    Department
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-[#64748B]">
                    Bookings
                  </th>

                </tr>

              </thead>

              <tbody>

                {report.employeeActivity.map(
                  (employee) => (

                    <tr
                      key={
                        employee.userId
                      }
                      className="border-b border-[#E5ECF7] last:border-0 hover:bg-[#F6F9FF]"
                    >

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-3">

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#102D72] text-xs font-bold text-white">
                            {employee.name
                              .trim()
                              .split(/\s+/)
                              .map(
                                (name) =>
                                  name[0]
                              )
                              .join("")
                              .slice(
                                0,
                                2
                              )
                              .toUpperCase()}
                          </div>

                          <div className="min-w-0">

                            <p className="truncate text-sm font-bold text-[#10275F]">
                              {employee.name}
                            </p>

                            <p className="mt-0.5 truncate text-xs text-[#64748B]">
                              {employee.email}
                            </p>

                          </div>

                        </div>

                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-[#475569]">
                        {employee.department ||
                          "-"}
                      </td>

                      <td className="px-5 py-4 text-right">

                        <span className="inline-flex min-w-10 items-center justify-center rounded-lg bg-[#EEF4FF] px-3 py-1.5 text-sm font-bold text-[#1D55B8]">
                          {
                            employee.bookingCount
                          }
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
          RECENT BOOKINGS
      ================================================= */}

      <section className="mt-6 overflow-hidden rounded-2xl border border-[#D5E2F7] bg-white shadow-sm">

        <div className="border-b border-[#E5ECF7] px-5 py-5">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1D55B8]">
              <FileText size={19} />
            </div>

            <div>

              <h2 className="font-bold text-[#10275F]">
                Recent Bookings
              </h2>

              <p className="mt-1 text-xs text-[#64748B]">
                Latest booking records from
                the selected period.
              </p>

            </div>

          </div>

        </div>

        {report.recentBookings
          .length === 0 ? (

          <EmptyState message="No bookings available for this period." />

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full min-w-[950px]">

              <thead>

                <tr className="border-b border-[#E5ECF7] bg-[#F6F9FF] text-left">

                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-[#64748B]">
                    Booking
                  </th>

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

                  <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-[#64748B]">
                    Status
                  </th>

                </tr>

              </thead>

              <tbody>

                {report.recentBookings.map(
                  (booking) => (

                    <tr
                      key={
                        booking._id
                      }
                      className="border-b border-[#E5ECF7] last:border-0 hover:bg-[#F6F9FF]"
                    >

                      {/* Booking */}

                      <td className="px-5 py-4">

                        <p className="max-w-[220px] truncate text-sm font-bold text-[#10275F]">
                          {booking.title}
                        </p>

                      </td>

                      {/* Employee */}

                      <td className="px-5 py-4">

                        <p className="text-sm font-semibold text-[#10275F]">
                          {booking.user
                            ?.name ||
                            "Unknown"}
                        </p>

                        <p className="mt-0.5 text-xs text-[#64748B]">
                          {booking.user
                            ?.email ||
                            "-"}
                        </p>

                      </td>

                      {/* Room */}

                      <td className="px-5 py-4">

                        <p className="flex items-center gap-1.5 text-sm font-semibold text-[#10275F]">

                          <Building2
                            size={14}
                            className="text-[#1D55B8]"
                          />

                          {booking.room
                            ?.name ||
                            "Unknown"}

                        </p>

                        <p className="mt-1 flex items-center gap-1 text-xs text-[#64748B]">

                          <MapPin
                            size={11}
                            className="text-[#1D55B8]"
                          />

                          {booking.room
                            ?.location ||
                            "-"}

                        </p>

                      </td>

                      {/* Date */}

                      <td className="px-5 py-4 text-sm font-medium text-[#475569]">
                        {formatDate(
                          booking.date
                        )}
                      </td>

                      {/* Time */}

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-1.5 text-sm font-medium text-[#475569]">

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

                      <td className="px-5 py-4 text-right">

                        <span
                          className={`
                            inline-flex
                            rounded-full
                            px-3
                            py-1
                            text-xs
                            font-bold
                            ${getStatusClasses(
                              booking.status
                            )}
                          `}
                        >
                          {booking.status}
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

    </main>
  );
}

/* =====================================================
   SUMMARY CARD
===================================================== */

interface SummaryCardProps {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  iconClass: string;
  valueClass?: string;
}

function SummaryCard({
  title,
  value,
  description,
  icon,
  iconClass,
  valueClass = "text-[#10275F]",
}: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-[#D5E2F7] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

      <div className="flex items-start justify-between">

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>

        <span className="text-xs font-bold text-[#94A3B8]">
          Report
        </span>

      </div>

      <p className="mt-5 text-sm font-semibold text-[#64748B]">
        {title}
      </p>

      <p
        className={`mt-1 text-3xl font-bold ${valueClass}`}
      >
        {value}
      </p>

      <p className="mt-1 text-xs text-[#94A3B8]">
        {description}
      </p>

    </div>
  );
}

/* =====================================================
   EMPTY STATE
===================================================== */

function EmptyState({
  message,
}: {
  message: string;
}) {
  return (
    <div className="m-5 rounded-xl border border-dashed border-[#D5E2F7] bg-[#F6F9FF] p-8 text-center">

      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#1D55B8] shadow-sm">
        <BarChart3 size={22} />
      </div>

      <p className="mt-3 text-sm font-semibold text-[#64748B]">
        {message}
      </p>

    </div>
  );
}