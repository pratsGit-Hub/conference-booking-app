
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  History,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";

import AdminGuard from "@/components/auth/AdminGuard";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

const POLLING_INTERVAL = 30_000;
const PAGE_SIZE = 20;

/* =====================================================
   TYPES
===================================================== */

type ActivityType =
  | "BALANCE_ADDED"
  | "BALANCE_REDUCED"
  | "FIRST_LEVEL_ACCEPTED"
  | "FIRST_LEVEL_DECLINED"
  | "ADMIN_APPROVED"
  | "ADMIN_REJECTED";

type LeaveActivity = {
  _id: string;

  actorId?: string;
  actorName?: string;
  actorEmail?: string;
  actorRole?: "ADMIN" | "EMPLOYEE";

  employeeId?: string;
  employeeName?: string;
  employeeEmail?: string;

  activityType: ActivityType;

  leaveType?: string;
  leaveRequestId?: string;

  days?: number;
  previousEntitlement?: number;
  newEntitlement?: number;

  createdAt: string;
  updatedAt?: string;
};

type ActivityResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  activities?: LeaveActivity[];
  total?: number;
  page?: number;
  limit?: number;
  count?: number;
};

type ActivityFilter = ActivityType | "ALL";

type Filters = {
  employeeId: string;
  activityType: ActivityFilter;
  adminId: string;
  from: string;
  to: string;
};

const INITIAL_FILTERS: Filters = {
  employeeId: "",
  activityType: "ALL",
  adminId: "",
  from: "",
  to: "",
};

const ACTIVITY_OPTIONS: {
  value: ActivityFilter;
  label: string;
}[] = [
  { value: "ALL", label: "All Activities" },
  { value: "BALANCE_ADDED", label: "Balance Added" },
  { value: "BALANCE_REDUCED", label: "Balance Reduced" },
  { value: "FIRST_LEVEL_ACCEPTED", label: "First-Level Accepted" },
  { value: "FIRST_LEVEL_DECLINED", label: "First-Level Declined" },
  { value: "ADMIN_APPROVED", label: "Final Approved" },
  { value: "ADMIN_REJECTED", label: "Final Rejected" },
];

/* =====================================================
   HELPERS
===================================================== */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (!isRecord(data)) return fallback;

  if (typeof data.message === "string" && data.message.trim()) {
    return data.message;
  }

  if (typeof data.error === "string" && data.error.trim()) {
    return data.error;
  }

  return fallback;
}

function extractActivities(data: unknown): LeaveActivity[] {
  if (Array.isArray(data)) {
    return data as LeaveActivity[];
  }

  if (!isRecord(data)) return [];

  if (Array.isArray(data.activities)) {
    return data.activities as LeaveActivity[];
  }

  if (Array.isArray(data.data)) {
    return data.data as LeaveActivity[];
  }

  if (isRecord(data.data) && Array.isArray(data.data.activities)) {
    return data.data.activities as LeaveActivity[];
  }

  return [];
}

function extractNumber(
  data: unknown,
  key: "total" | "page" | "limit",
  fallback: number
): number {
  if (!isRecord(data)) return fallback;

  const value = data[key];

  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function formatDateTime(value?: string): string {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDays(value?: number): string {
  if (typeof value !== "number") return "—";

  return `${value} ${value === 1 ? "day" : "days"}`;
}

function getActivityLabel(type: ActivityType): string {
  const labels: Record<ActivityType, string> = {
    BALANCE_ADDED: "Leave Balance Added",
    BALANCE_REDUCED: "Leave Balance Reduced",
    FIRST_LEVEL_ACCEPTED: "First-Level Accepted",
    FIRST_LEVEL_DECLINED: "First-Level Declined",
    ADMIN_APPROVED: "Final Leave Approved",
    ADMIN_REJECTED: "Final Leave Rejected",
  };

  return labels[type] || type.replaceAll("_", " ");
}

function getActivityDescription(activity: LeaveActivity): string {
  const employee = activity.employeeName || "the employee";

  switch (activity.activityType) {
    case "BALANCE_ADDED":
      return `Added ${formatDays(activity.days)} to ${employee}'s leave entitlement.`;

    case "BALANCE_REDUCED":
      return `Reduced ${employee}'s leave entitlement by ${formatDays(activity.days)}.`;

    case "FIRST_LEVEL_ACCEPTED":
      return `Accepted ${employee}'s leave request at the first approval level.`;

    case "FIRST_LEVEL_DECLINED":
      return `Declined ${employee}'s leave request at the first approval level.`;

    case "ADMIN_APPROVED":
      return `Finally approved ${employee}'s leave request.`;

    case "ADMIN_REJECTED":
      return `Rejected ${employee}'s leave request at the final approval level.`;

    default:
      return "Leave management activity recorded.";
  }
}

function getActivityStyle(type: ActivityType) {
  switch (type) {
    case "BALANCE_ADDED":
      return {
        icon: ArrowUpCircle,
        background: "bg-blue-50",
        text: "text-blue-700",
        badge: "bg-blue-50 text-blue-700",
      };

    case "BALANCE_REDUCED":
      return {
        icon: ArrowDownCircle,
        background: "bg-orange-50",
        text: "text-orange-700",
        badge: "bg-orange-50 text-orange-700",
      };

    case "FIRST_LEVEL_ACCEPTED":
      return {
        icon: CheckCircle2,
        background: "bg-cyan-50",
        text: "text-cyan-700",
        badge: "bg-cyan-50 text-cyan-700",
      };

    case "FIRST_LEVEL_DECLINED":
      return {
        icon: XCircle,
        background: "bg-rose-50",
        text: "text-rose-700",
        badge: "bg-rose-50 text-rose-700",
      };

    case "ADMIN_APPROVED":
      return {
        icon: ShieldCheck,
        background: "bg-emerald-50",
        text: "text-emerald-700",
        badge: "bg-emerald-50 text-emerald-700",
      };

    case "ADMIN_REJECTED":
      return {
        icon: XCircle,
        background: "bg-red-50",
        text: "text-red-700",
        badge: "bg-red-50 text-red-700",
      };

    default:
      return {
        icon: Activity,
        background: "bg-slate-50",
        text: "text-slate-700",
        badge: "bg-slate-50 text-slate-700",
      };
  }
}

/* =====================================================
   MAIN COMPONENT
===================================================== */

function LeaveActivityLogContent() {
  const [activities, setActivities] = useState<LeaveActivity[]>([]);

  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<Filters>(INITIAL_FILTERS);

  const [employeeSearch, setEmployeeSearch] = useState("");
  const [adminSearch, setAdminSearch] = useState("");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  /* =====================================================
     BUILD QUERY
  ===================================================== */

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));

    if (appliedFilters.employeeId) {
      params.set("employeeId", appliedFilters.employeeId);
    }

    if (appliedFilters.activityType !== "ALL") {
      params.set("activityType", appliedFilters.activityType);
    }

    if (appliedFilters.adminId) {
      params.set("adminId", appliedFilters.adminId);
    }

    if (appliedFilters.from) {
      params.set("from", appliedFilters.from);
    }

    if (appliedFilters.to) {
      params.set("to", appliedFilters.to);
    }

    return params.toString();
  }, [page, appliedFilters]);

  /* =====================================================
     FETCH ACTIVITIES
  ===================================================== */

  const fetchActivities = useCallback(
    async (silent = false) => {
      try {
        if (!silent) {
          setRefreshing(true);
          setError("");
        }

        const response = await fetch(
          `${API_BASE_URL}/api/leaves/admin/activity-log?${queryString}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
          }
        );

        const data = await parseResponse(response);

        if (!response.ok) {
          throw new Error(
            getErrorMessage(data, "Unable to load leave activity log.")
          );
        }

        const records = extractActivities(data);

        setActivities(records);
        setTotal(extractNumber(data, "total", records.length));
        setLimit(extractNumber(data, "limit", PAGE_SIZE));
        setLastUpdated(new Date());
        setError("");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load leave activity log."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [queryString]
  );

  /* =====================================================
     INITIAL FETCH + AUTO REFRESH
  ===================================================== */

  useEffect(() => {
    void fetchActivities();

    const intervalId = window.setInterval(() => {
      void fetchActivities(true);
    }, POLLING_INTERVAL);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchActivities]);

  /* =====================================================
     FILTER HANDLERS
  ===================================================== */

  function updateFilter<K extends keyof Filters>(
    key: K,
    value: Filters[K]
  ) {
    setFilters((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function applyFilters() {
    if (filters.from && filters.to && filters.from > filters.to) {
      setError("The start date cannot be later than the end date.");
      return;
    }

    setError("");
    setPage(1);
    setAppliedFilters({ ...filters });
  }

  function resetFilters() {
    setFilters({ ...INITIAL_FILTERS });
    setAppliedFilters({ ...INITIAL_FILTERS });
    setEmployeeSearch("");
    setAdminSearch("");
    setPage(1);
    setError("");
  }

  /* =====================================================
     LOCAL SEARCH

     These search fields filter the current page.
     Server-side filters use employeeId/adminId.
  ===================================================== */

  const filteredActivities = useMemo(() => {
    const employeeQuery = employeeSearch.toLowerCase().trim();
    const adminQuery = adminSearch.toLowerCase().trim();

    return activities.filter((activity) => {
      const employeeMatch =
        !employeeQuery ||
        activity.employeeName?.toLowerCase().includes(employeeQuery) ||
        activity.employeeEmail?.toLowerCase().includes(employeeQuery);

      const adminMatch =
        !adminQuery ||
        activity.actorName?.toLowerCase().includes(adminQuery) ||
        activity.actorEmail?.toLowerCase().includes(adminQuery);

      return employeeMatch && adminMatch;
    });
  }, [activities, employeeSearch, adminSearch]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const startRecord = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  /* =====================================================
     SUMMARY COUNTS FOR CURRENT PAGE
  ===================================================== */

  const summary = useMemo(() => {
    return {
      balanceChanges: activities.filter(
        (item) =>
          item.activityType === "BALANCE_ADDED" ||
          item.activityType === "BALANCE_REDUCED"
      ).length,

      firstLevelDecisions: activities.filter(
        (item) =>
          item.activityType === "FIRST_LEVEL_ACCEPTED" ||
          item.activityType === "FIRST_LEVEL_DECLINED"
      ).length,

      finalDecisions: activities.filter(
        (item) =>
          item.activityType === "ADMIN_APPROVED" ||
          item.activityType === "ADMIN_REJECTED"
      ).length,
    };
  }, [activities]);

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="min-h-screen bg-[#EDF3FF]">
      <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8">

        {/* HEADER */}

        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-red-500">
              Administrator Panel
            </p>

            <h1 className="flex items-center gap-3 text-3xl font-bold text-[#172F60] sm:text-4xl">
              <Activity className="shrink-0" size={32} />
              Leave Activity Log
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              View leave balance adjustments, first-level decisions,
              and final approvals performed across the employee portal.
            </p>

            <p className="mt-2 flex items-center gap-2 text-xs text-slate-400">
              <Clock3 size={14} />
              Automatically refreshes every 30 seconds
            </p>
          </div>

          <button
            type="button"
            onClick={() => void fetchActivities()}
            disabled={refreshing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#D6E2F5] bg-white px-5 text-sm font-semibold text-[#172F60] shadow-sm transition hover:bg-blue-50 disabled:opacity-60"
          >
            <RefreshCw
              size={17}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* ERROR */}

        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle size={20} className="shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* SUMMARY */}

        <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[#D6E2F5] bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total Matching Activities
            </p>
            <p className="mt-2 text-3xl font-bold text-[#172F60]">
              {total}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Across all matching pages
            </p>
          </div>

          <div className="rounded-2xl border border-[#D6E2F5] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Balance Adjustments
              </p>
              <WalletIcon />
            </div>
            <p className="mt-2 text-3xl font-bold text-blue-700">
              {summary.balanceChanges}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              On current page
            </p>
          </div>

          <div className="rounded-2xl border border-[#D6E2F5] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                First-Level Decisions
              </p>
              <CheckCircle2 size={22} className="text-cyan-600" />
            </div>
            <p className="mt-2 text-3xl font-bold text-cyan-700">
              {summary.firstLevelDecisions}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              On current page
            </p>
          </div>

          <div className="rounded-2xl border border-[#D6E2F5] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Final Admin Decisions
              </p>
              <ShieldCheck size={22} className="text-emerald-600" />
            </div>
            <p className="mt-2 text-3xl font-bold text-emerald-700">
              {summary.finalDecisions}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              On current page
            </p>
          </div>
        </div>

        {/* FILTER PANEL */}

        <div className="mb-7 rounded-2xl border border-[#D6E2F5] bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <Filter size={19} className="text-blue-700" />
            <h2 className="text-lg font-bold text-[#172F60]">
              Filter Activities
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label
                htmlFor="activityType"
                className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Activity Type
              </label>

              <select
                id="activityType"
                value={filters.activityType}
                onChange={(event) =>
                  updateFilter(
                    "activityType",
                    event.target.value as ActivityFilter
                  )
                }
                className="h-11 w-full rounded-xl border border-[#D6E2F5] bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500"
              >
                {ACTIVITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="employeeId"
                className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Employee ID
              </label>

              <input
                id="employeeId"
                type="text"
                value={filters.employeeId}
                onChange={(event) =>
                  updateFilter("employeeId", event.target.value.trim())
                }
                placeholder="MongoDB employee ID"
                className="h-11 w-full rounded-xl border border-[#D6E2F5] px-3 text-sm text-slate-700 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="adminId"
                className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Admin ID
              </label>

              <input
                id="adminId"
                type="text"
                value={filters.adminId}
                onChange={(event) =>
                  updateFilter("adminId", event.target.value.trim())
                }
                placeholder="MongoDB admin ID"
                className="h-11 w-full rounded-xl border border-[#D6E2F5] px-3 text-sm text-slate-700 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="fromDate"
                className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                From Date
              </label>

              <input
                id="fromDate"
                type="date"
                value={filters.from}
                max={filters.to || undefined}
                onChange={(event) =>
                  updateFilter("from", event.target.value)
                }
                className="h-11 w-full rounded-xl border border-[#D6E2F5] px-3 text-sm text-slate-700 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="toDate"
                className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                To Date
              </label>

              <input
                id="toDate"
                type="date"
                value={filters.to}
                min={filters.from || undefined}
                onChange={(event) =>
                  updateFilter("to", event.target.value)
                }
                className="h-11 w-full rounded-xl border border-[#D6E2F5] px-3 text-sm text-slate-700 outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-end gap-3">
              <button
                type="button"
                onClick={applyFilters}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#173B86] px-4 text-sm font-semibold text-white hover:bg-[#122D59]"
              >
                <Filter size={16} />
                Apply Filters
              </button>

              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                <RotateCcw size={16} />
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* LOCAL SEARCH */}

        <div className="mb-6 rounded-2xl border border-[#D6E2F5] bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="employeeSearch"
                className="mb-2 block text-xs font-semibold text-slate-600"
              >
                Search Employee
              </label>

              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="employeeSearch"
                  value={employeeSearch}
                  onChange={(event) =>
                    setEmployeeSearch(event.target.value)
                  }
                  placeholder="Employee name or email..."
                  className="h-11 w-full rounded-xl border border-[#D6E2F5] pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="adminSearch"
                className="mb-2 block text-xs font-semibold text-slate-600"
              >
                Search Performed By
              </label>

              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="adminSearch"
                  value={adminSearch}
                  onChange={(event) =>
                    setAdminSearch(event.target.value)
                  }
                  placeholder="Admin or approver name/email..."
                  className="h-11 w-full rounded-xl border border-[#D6E2F5] pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-400">
            Name and email searches filter the currently loaded page.
            Use the filters above to query all records by ID, type, or date.
          </p>
        </div>

        {/* ACTIVITY LIST */}

        <div className="overflow-hidden rounded-2xl border border-[#D6E2F5] bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-[#172F60]">
                <History size={20} />
                Activity History
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {total} matching records
                {lastUpdated
                  ? ` · Updated ${lastUpdated.toLocaleTimeString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : ""}
              </p>
            </div>

            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
              <ShieldCheck size={14} />
              Admin Only · Read Only
            </span>
          </div>

          {loading ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
              <Loader2
                size={34}
                className="animate-spin text-blue-700"
              />
              <p className="text-sm text-slate-500">
                Loading leave activities...
              </p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                <Activity size={30} />
              </div>

              <h3 className="mt-5 text-lg font-bold text-[#172F60]">
                No Activities Found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                No leave activity records match the selected filters.
                Try resetting the filters or refreshing the page.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredActivities.map((activity) => {
                const style = getActivityStyle(activity.activityType);
                const Icon = style.icon;

                const isBalanceAdjustment =
                  activity.activityType === "BALANCE_ADDED" ||
                  activity.activityType === "BALANCE_REDUCED";

                return (
                  <div
                    key={activity._id}
                    className="px-5 py-5 transition-colors hover:bg-slate-50/70 sm:px-6"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${style.background} ${style.text}`}
                      >
                        <Icon size={23} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-base font-bold text-[#172F60]">
                            {getActivityLabel(activity.activityType)}
                          </h3>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${style.badge}`}
                          >
                            {activity.activityType.replaceAll("_", " ")}
                          </span>
                        </div>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {getActivityDescription(activity)}
                        </p>

                        <div className="mt-4 grid grid-cols-1 gap-4 rounded-xl bg-[#F6F9FF] p-4 sm:grid-cols-2 xl:grid-cols-3">

                          {/* PERFORMED BY */}

                          <div>
                            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                              <ShieldCheck size={13} />
                              Performed By
                            </p>

                            <p className="break-words text-sm font-semibold text-slate-800">
                              {activity.actorName || "Not available"}
                            </p>

                            <p className="break-all text-xs text-slate-500">
                              {activity.actorEmail || "—"}
                            </p>

                            {activity.actorRole && (
                              <p className="mt-1 text-xs text-blue-600">
                                {activity.actorRole === "ADMIN"
                                  ? "Administrator"
                                  : "First-Level Approver"}
                              </p>
                            )}
                          </div>

                          {/* EMPLOYEE */}

                          <div>
                            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                              <UserRound size={13} />
                              Employee
                            </p>

                            <p className="break-words text-sm font-semibold text-slate-800">
                              {activity.employeeName || "Not available"}
                            </p>

                            <p className="break-all text-xs text-slate-500">
                              {activity.employeeEmail || "—"}
                            </p>
                          </div>

                          {/* DATE */}

                          <div>
                            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                              <CalendarDays size={13} />
                              Date & Time
                            </p>

                            <p className="text-sm font-semibold text-slate-800">
                              {formatDateTime(activity.createdAt)}
                            </p>
                          </div>

                          {/* LEAVE TYPE */}

                          {activity.leaveType && (
                            <div>
                              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Leave Type
                              </p>

                              <p className="text-sm font-semibold text-slate-800">
                                {activity.leaveType}
                              </p>
                            </div>
                          )}

                          {/* DAYS */}

                          {typeof activity.days === "number" && (
                            <div>
                              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                {isBalanceAdjustment
                                  ? "Adjustment Amount"
                                  : "Days"}
                              </p>

                              <p className="text-sm font-semibold text-slate-800">
                                {formatDays(activity.days)}
                              </p>
                            </div>
                          )}

                          {/* PREVIOUS ENTITLEMENT */}

                          {isBalanceAdjustment &&
                            typeof activity.previousEntitlement ===
                              "number" && (
                              <div>
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Previous Entitlement
                                </p>

                                <p className="text-sm font-semibold text-slate-800">
                                  {formatDays(activity.previousEntitlement)}
                                </p>
                              </div>
                            )}

                          {/* NEW ENTITLEMENT */}

                          {isBalanceAdjustment &&
                            typeof activity.newEntitlement ===
                              "number" && (
                              <div>
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  New Entitlement
                                </p>

                                <p className="text-sm font-semibold text-slate-800">
                                  {formatDays(activity.newEntitlement)}
                                </p>
                              </div>
                            )}
                        </div>

                        {activity.leaveRequestId && (
                          <p className="mt-3 break-all text-xs text-slate-400">
                            Leave Request ID: {activity.leaveRequestId}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PAGINATION */}

          {!loading && total > 0 && (
            <div className="flex flex-col gap-4 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs text-slate-500">
                Showing {startRecord}–{endRecord} of {total} records
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setPage((previous) => Math.max(1, previous - 1))
                  }
                  disabled={page <= 1 || refreshing}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <span className="text-sm font-semibold text-[#172F60]">
                  {page} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setPage((previous) =>
                      Math.min(totalPages, previous + 1)
                    )
                  }
                  disabled={page >= totalPages || refreshing}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   SMALL ICON COMPONENT
===================================================== */

function WalletIcon() {
  return <ArrowUpCircle size={22} className="text-blue-600" />;
}

/* =====================================================
   PAGE EXPORT
===================================================== */

export default function LeaveActivityLogPage() {
  return (
    <AdminGuard>
      <LeaveActivityLogContent />
    </AdminGuard>
  );
}
