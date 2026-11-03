"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Eye,
  FileText,
  Loader2,
  Plane,
  RefreshCw,
  Search,
  X,
  XCircle,
  Ban,
} from "lucide-react";

import AuthGuard from "@/components/auth/AuthGuard";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

type LeaveStatus =
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Cancelled"
  | "Unknown";

type StatusFilter =
  | "All"
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Cancelled";

type LeaveRequest = {
  _id?: string;
  id?: string | number;
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  days?: number;
  duration?: number;
  reason?: string;
  status?: string;
  createdAt?: string;
  submittedAt?: string;
  updatedAt?: string;
  employeeName?: string;
  employeeEmail?: string;
  department?: string;
  approverComment?: string;
  rejectionReason?: string;
};

const FILTERS: StatusFilter[] = [
  "All",
  "Pending",
  "Approved",
  "Rejected",
  "Cancelled",
];

function normalizeStatus(status?: string): LeaveStatus {
  switch ((status || "Pending").trim().toLowerCase()) {
    case "pending":
      return "Pending";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "cancelled":
    case "canceled":
      return "Cancelled";
    default:
      return "Unknown";
  }
}

function getRequestId(request: LeaveRequest) {
  return String(request._id ?? request.id ?? "");
}

function getSubmittedDate(request: LeaveRequest) {
  return request.submittedAt || request.createdAt;
}

function formatDate(value?: string) {
  if (!value) return "Not available";

  // Parse date-only values locally to avoid UTC timezone shifts.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  const date = dateOnly
    ? new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3])
      )
    : new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value?: string) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDuration(request: LeaveRequest) {
  if (typeof request.days === "number") return request.days;
  if (typeof request.duration === "number") return request.duration;

  if (!request.startDate || !request.endDate) return 0;

  const parseDate = (value: string) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    return match
      ? new Date(
          Number(match[1]),
          Number(match[2]) - 1,
          Number(match[3])
        )
      : new Date(value);
  };

  const start = parseDate(request.startDate);
  const end = parseDate(request.endDate);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end < start
  ) {
    return 0;
  }

  const startDay = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );

  const endDay = Date.UTC(
    end.getFullYear(),
    end.getMonth(),
    end.getDate()
  );

  return Math.floor((endDay - startDay) / 86400000) + 1;
}

function statusClasses(status: LeaveStatus) {
  switch (status) {
    case "Pending":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    case "Approved":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    case "Rejected":
      return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
    case "Cancelled":
      return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
    default:
      return "bg-gray-100 text-gray-600 ring-1 ring-gray-200";
  }
}

function StatusBadge({ status }: { status?: string }) {
  const normalized = normalizeStatus(status);

  const Icon =
    normalized === "Pending"
      ? Clock3
      : normalized === "Approved"
        ? CheckCircle2
        : normalized === "Rejected"
          ? XCircle
          : normalized === "Cancelled"
            ? Ban
            : AlertCircle;

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${statusClasses(normalized)}`}
    >
      <Icon size={14} />
      {normalized}
    </span>
  );
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconClass,
}: {
  title: string;
  value: number;
  description: string;
  icon: typeof ClipboardList;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h3 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </h3>
          <p className="mt-2 text-xs text-slate-500">{description}</p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function LeaveRequestsContent() {
  const router = useRouter();

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] =
    useState<LeaveRequest | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadRequests = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/leaves`, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          "Your session may have expired. Please log in again."
        );
      }

      if (response.status === 404) {
        throw new Error(
          "The leave requests API returned 404. Check that your backend has a GET /api/leaves route and that NEXT_PUBLIC_API_URL points to the correct server."
        );
      }

      if (!response.ok) {
        throw new Error(
          `Unable to load leave requests (${response.status}).`
        );
      }

      const data = await response.json();

      const list: LeaveRequest[] | null = Array.isArray(data)
        ? data
        : Array.isArray(data?.requests)
          ? data.requests
          : Array.isArray(data?.leaves)
            ? data.leaves
            : Array.isArray(data?.data)
              ? data.data
              : null;

      if (!list) {
        throw new Error(
          "The server returned an unexpected leave-request response."
        );
      }

      setRequests(list);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading leave requests."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const counts = useMemo(
    () => ({
      all: requests.length,
      pending: requests.filter(
        (request) => normalizeStatus(request.status) === "Pending"
      ).length,
      approved: requests.filter(
        (request) => normalizeStatus(request.status) === "Approved"
      ).length,
      rejected: requests.filter(
        (request) => normalizeStatus(request.status) === "Rejected"
      ).length,
      cancelled: requests.filter(
        (request) => normalizeStatus(request.status) === "Cancelled"
      ).length,
    }),
    [requests]
  );

  const filteredRequests = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return requests
      .filter((request) => {
        const status = normalizeStatus(request.status);

        if (activeFilter !== "All" && status !== activeFilter) {
          return false;
        }

        if (!query) return true;

        const searchable = [
          request.leaveType,
          request.reason,
          request.status,
          request._id,
          request.id,
          formatDate(request.startDate),
          formatDate(request.endDate),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(query);
      })
      .sort((a, b) => {
        const aDate = new Date(
          getSubmittedDate(a) || a.startDate || 0
        ).getTime();

        const bDate = new Date(
          getSubmittedDate(b) || b.startDate || 0
        ).getTime();

        return bDate - aDate;
      });
  }, [requests, activeFilter, searchTerm]);

  async function handleCancelRequest(request: LeaveRequest) {
    const requestId = getRequestId(request);

    if (!requestId) {
      setError("This request has no valid ID and cannot be cancelled.");
      return;
    }

    if (normalizeStatus(request.status) !== "Pending") {
      setError("Only pending leave requests can be cancelled.");
      return;
    }

    if (
      !window.confirm(
        "Are you sure you want to cancel this leave request?"
      )
    ) {
      return;
    }

    setCancellingId(requestId);
    setError("");
    setSuccessMessage("");

    try {
      // This route must exist in your backend.
      const response = await fetch(
        `${API_BASE_URL}/api/leaves/${encodeURIComponent(requestId)}/cancel`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result?.message ||
            result?.error ||
            `Unable to cancel this request (${response.status}).`
        );
      }

      setRequests((current) =>
        current.map((item) =>
          getRequestId(item) === requestId
            ? { ...item, status: "Cancelled" }
            : item
        )
      );

      setSelectedRequest((current) =>
        current && getRequestId(current) === requestId
          ? { ...current, status: "Cancelled" }
          : current
      );

      setSuccessMessage("Your leave request has been cancelled.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to cancel the leave request."
      );
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="min-h-full bg-[#F4F7FB] px-4 py-7 text-slate-800 sm:px-7 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-[1500px]">
        {/* Page heading: no sidebar or application header here */}
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#17458C]">
              <ClipboardList size={14} />
              LEAVE MANAGEMENT
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              My Leave Requests
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Track your submitted leave applications, check their
              status, and cancel requests that are still pending.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/leave/apply")}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-[#17458C] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#10376F] sm:self-auto"
          >
            <FileText size={17} />
            Apply for Leave
          </button>
        </div>

        {/* Error alert */}
        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div className="flex-1">{error}</div>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
              className="rounded p-1 hover:bg-rose-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Success alert */}
        {successMessage && (
          <div
            role="status"
            className="mb-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
          >
            <CheckCircle2 size={18} />
            <span className="flex-1">{successMessage}</span>

            <button
              type="button"
              onClick={() => setSuccessMessage("")}
              aria-label="Dismiss success message"
              className="rounded p-1 hover:bg-emerald-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Statistics */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Requests"
            value={counts.all}
            description="All submitted applications"
            icon={ClipboardList}
            iconClass="bg-blue-50 text-[#17458C]"
          />

          <StatCard
            title="Pending"
            value={counts.pending}
            description="Awaiting a decision"
            icon={Clock3}
            iconClass="bg-amber-50 text-amber-600"
          />

          <StatCard
            title="Approved"
            value={counts.approved}
            description="Approved leave applications"
            icon={CheckCircle2}
            iconClass="bg-emerald-50 text-emerald-600"
          />

          <StatCard
            title="Rejected"
            value={counts.rejected}
            description="Applications not approved"
            icon={XCircle}
            iconClass="bg-rose-50 text-rose-600"
          />
        </div>

        {/* Leave history */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Leave Application History
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {filteredRequests.length}{" "}
                  {filteredRequests.length === 1 ? "request" : "requests"}{" "}
                  displayed
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative min-w-0 sm:w-64">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search leave requests..."
                    aria-label="Search leave requests"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void loadRequests(true)}
                  disabled={loading || refreshing}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    size={16}
                    className={refreshing ? "animate-spin" : ""}
                  />
                  Refresh
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
              {FILTERS.map((filter) => {
                const active = activeFilter === filter;

                const count =
                  filter === "All"
                    ? counts.all
                    : filter === "Pending"
                      ? counts.pending
                      : filter === "Approved"
                        ? counts.approved
                        : filter === "Rejected"
                          ? counts.rejected
                          : counts.cancelled;

                return (
                  <button
                    type="button"
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                      active
                        ? "bg-[#17458C] text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {filter}

                    <span
                      className={`rounded-md px-1.5 py-0.5 text-xs ${
                        active
                          ? "bg-white/15 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-5 py-12">
              <Loader2
                size={32}
                className="animate-spin text-[#17458C]"
              />
              <p className="mt-4 text-sm font-medium text-slate-600">
                Loading your leave requests...
              </p>
            </div>
          ) : filteredRequests.length === 0 ? (
            /* Empty state */
            <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-[#17458C]">
                <CalendarCheck size={30} />
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-900">
                {requests.length === 0
                  ? "No leave requests yet"
                  : "No matching requests"}
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                {requests.length === 0
                  ? "Your leave applications will appear here after you submit your first request."
                  : "Try selecting another status or changing your search term."}
              </p>

              {requests.length === 0 ? (
                <button
                  type="button"
                  onClick={() => router.push("/leave/apply")}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#17458C] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#10376F]"
                >
                  <FileText size={17} />
                  Apply for Leave
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilter("All");
                    setSearchTerm("");
                  }}
                  className="mt-5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[850px] text-left">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200">
                      {[
                        "Leave Type",
                        "Leave Dates",
                        "Duration",
                        "Submitted On",
                        "Status",
                        "Actions",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className={`px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 ${
                            heading === "Actions" ? "text-right" : ""
                          }`}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredRequests.map((request, index) => {
                      const requestId = getRequestId(request);
                      const status = normalizeStatus(request.status);
                      const duration = getDuration(request);

                      return (
                        <tr
                          key={requestId || `request-${index}`}
                          className="transition hover:bg-slate-50/80"
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#17458C]">
                                <Plane size={19} />
                              </div>

                              <div>
                                <p className="font-semibold text-slate-800">
                                  {request.leaveType || "Leave"}
                                </p>
                                <p className="mt-1 max-w-[180px] truncate text-xs text-slate-500">
                                  {request.reason || "No reason provided"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-5">
                            <p className="text-sm font-medium text-slate-800">
                              {formatDate(request.startDate)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              to {formatDate(request.endDate)}
                            </p>
                          </td>

                          <td className="px-6 py-5 text-sm font-semibold text-slate-800">
                            {duration} {duration === 1 ? "day" : "days"}
                          </td>

                          <td className="px-6 py-5 text-sm text-slate-600">
                            {formatDate(getSubmittedDate(request))}
                          </td>

                          <td className="px-6 py-5">
                            <StatusBadge status={request.status} />
                          </td>

                          <td className="px-6 py-5">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedRequest(request)}
                                title="View details"
                                aria-label="View leave request details"
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-[#17458C]"
                              >
                                <Eye size={16} />
                              </button>

                              {status === "Pending" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleCancelRequest(request)
                                  }
                                  disabled={cancellingId === requestId}
                                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                                >
                                  {cancellingId === requestId ? (
                                    <Loader2
                                      size={14}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <X size={14} />
                                  )}
                                  Cancel
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 p-4 md:hidden">
                {filteredRequests.map((request, index) => {
                  const requestId = getRequestId(request);
                  const status = normalizeStatus(request.status);
                  const duration = getDuration(request);

                  return (
                    <article
                      key={requestId || `mobile-request-${index}`}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#17458C]">
                            <Plane size={19} />
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate font-semibold text-slate-900">
                              {request.leaveType || "Leave"}
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                              {duration} {duration === 1 ? "day" : "days"}
                            </p>
                          </div>
                        </div>

                        <StatusBadge status={request.status} />
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-slate-500">Start Date</p>
                          <p className="mt-1 font-medium">
                            {formatDate(request.startDate)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">End Date</p>
                          <p className="mt-1 font-medium">
                            {formatDate(request.endDate)}
                          </p>
                        </div>

                        <div className="col-span-2">
                          <p className="text-xs text-slate-500">
                            Submitted On
                          </p>
                          <p className="mt-1 font-medium">
                            {formatDate(getSubmittedDate(request))}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          onClick={() => setSelectedRequest(request)}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Eye size={15} />
                          Details
                        </button>

                        {status === "Pending" && (
                          <button
                            type="button"
                            onClick={() => void handleCancelRequest(request)}
                            disabled={cancellingId === requestId}
                            className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                          >
                            {cancellingId === requestId ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <X size={15} />
                            )}
                            Cancel
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Request details modal */}
      {selectedRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedRequest(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-request-title"
            className="my-auto w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2
                  id="leave-request-title"
                  className="text-xl font-bold text-slate-900"
                >
                  Leave Request Details
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review your leave application information.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                aria-label="Close request details"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-500">Current status</span>
                <StatusBadge status={selectedRequest.status} />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Leave Type</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {selectedRequest.leaveType || "Not provided"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Duration</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {getDuration(selectedRequest)} days
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Start Date</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {formatDate(selectedRequest.startDate)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">End Date</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {formatDate(selectedRequest.endDate)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
                  <p className="text-xs text-slate-500">Submitted On</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {formatDateTime(getSubmittedDate(selectedRequest))}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
                  <p className="text-xs text-slate-500">Reason</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                    {selectedRequest.reason || "No reason provided."}
                  </p>
                </div>

                {selectedRequest.approverComment && (
                  <div className="rounded-xl bg-emerald-50 p-4 sm:col-span-2">
                    <p className="text-xs font-semibold text-emerald-700">
                      Approver Comment
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-emerald-900">
                      {selectedRequest.approverComment}
                    </p>
                  </div>
                )}

                {selectedRequest.rejectionReason && (
                  <div className="rounded-xl bg-rose-50 p-4 sm:col-span-2">
                    <p className="text-xs font-semibold text-rose-700">
                      Rejection Reason
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-rose-900">
                      {selectedRequest.rejectionReason}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 px-6 py-4">
              {normalizeStatus(selectedRequest.status) === "Pending" && (
                <button
                  type="button"
                  onClick={() => void handleCancelRequest(selectedRequest)}
                  disabled={
                    cancellingId === getRequestId(selectedRequest)
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                >
                  {cancellingId === getRequestId(selectedRequest) ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <X size={16} />
                  )}
                  Cancel Request
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="rounded-xl bg-[#17458C] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#10376F]"
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default function LeaveRequestsPage() {
  return (
    <AuthGuard>
      <LeaveRequestsContent />
    </AuthGuard>
  );
}