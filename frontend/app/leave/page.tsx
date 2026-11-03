"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Wallet,
  XCircle,
} from "lucide-react";

import AuthGuard from "@/components/auth/AuthGuard";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

type LeaveRequest = {
  _id?: string;
  id?: string;
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  days?: number;
  duration?: number;
  status?: string;
  reason?: string;
  createdAt?: string;
  submittedAt?: string;
};

function formatDate(date?: string) {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDuration(request: LeaveRequest) {
  if (typeof request.days === "number") return request.days;
  if (typeof request.duration === "number") return request.duration;

  if (!request.startDate || !request.endDate) return 0;

  const start = new Date(request.startDate);
  const end = new Date(request.endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  return Math.max(
    1,
    Math.floor(
      (new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime() -
        new Date(
          start.getFullYear(),
          start.getMonth(),
          start.getDate()
        ).getTime()) /
        86400000
    ) + 1
  );
}

function normalizeStatus(status?: string) {
  return (status || "pending").toLowerCase().trim();
}

function getStatusStyles(status?: string) {
  switch (normalizeStatus(status)) {
    case "approved":
      return "bg-emerald-100 text-emerald-800";

    case "rejected":
      return "bg-red-100 text-red-700";

    case "cancelled":
    case "canceled":
      return "bg-slate-100 text-slate-600";

    default:
      return "bg-amber-100 text-amber-800";
  }
}

function StatCard({
  label,
  count,
  icon: Icon,
  color,
}: {
  label: string;
  count: number;
  icon: React.ElementType;
  color: "amber" | "green" | "red" | "slate";
}) {
  const colors = {
    amber: "bg-amber-100 text-amber-600",
    green: "bg-emerald-100 text-emerald-600",
    red: "bg-red-100 text-red-600",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="flex min-h-[102px] items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${colors[color]}`}
      >
        <Icon size={23} strokeWidth={2} />
      </div>

      <div className="min-w-0">
        <p className="text-2xl font-bold leading-tight text-slate-950">
          {count}
        </p>
        <p className="mt-1 text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function LeaveDashboardContent() {
  const router = useRouter();

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/leaves`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message ||
            result?.error ||
            `Unable to load leave requests (HTTP ${response.status}).`
        );
      }

      const data = Array.isArray(result)
        ? result
        : Array.isArray(result?.requests)
          ? result.requests
          : Array.isArray(result?.leaves)
            ? result.leaves
            : Array.isArray(result?.data)
              ? result.data
              : null;

      if (!data) {
        throw new Error(
          "The server returned an unexpected leave-request response."
        );
      }

      setRequests(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading leave requests."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const counts = {
    pending: requests.filter(
      (request) => normalizeStatus(request.status) === "pending"
    ).length,

    approved: requests.filter(
      (request) => normalizeStatus(request.status) === "approved"
    ).length,

    rejected: requests.filter(
      (request) => normalizeStatus(request.status) === "rejected"
    ).length,

    cancelled: requests.filter((request) =>
      ["cancelled", "canceled"].includes(normalizeStatus(request.status))
    ).length,
  };

  const recentRequests = [...requests]
    .sort((a, b) => {
      const dateA = new Date(
        a.createdAt || a.submittedAt || a.startDate || 0
      ).getTime();

      const dateB = new Date(
        b.createdAt || b.submittedAt || b.startDate || 0
      ).getTime();

      return dateB - dateA;
    })
    .slice(0, 5);

  const leaveTaken = requests
    .filter(
      (request) => normalizeStatus(request.status) === "approved"
    )
    .reduce((total, request) => total + getDuration(request), 0);

  return (
    <div className="min-h-full bg-[#F3F6FB]">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
        {/* Dashboard heading */}
        <section className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
                Employee Services
              </p>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[#122D59] sm:text-3xl lg:text-[34px]">
              Leave Dashboard
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Manage your leave requests and track their status.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/leave/apply")}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200"
          >
            <Plus size={19} />
            Apply for Leave
          </button>
        </section>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="mb-6 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-3">
              <AlertCircle
                size={21}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <div className="min-w-0">
                <p className="font-semibold text-red-800">
                  Could not load leave information
                </p>
                <p className="mt-1 break-words text-sm text-red-700">
                  {error}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadRequests()}
              disabled={loading}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 sm:self-center"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Try Again
            </button>
          </div>
        )}

        {/* Statistics */}
        <section
          aria-label="Leave request statistics"
          className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <StatCard
            label="Pending"
            count={counts.pending}
            icon={Clock3}
            color="amber"
          />

          <StatCard
            label="Approved"
            count={counts.approved}
            icon={CheckCircle2}
            color="green"
          />

          <StatCard
            label="Rejected"
            count={counts.rejected}
            icon={XCircle}
            color="red"
          />

          <StatCard
            label="Cancelled"
            count={counts.cancelled}
            icon={Ban}
            color="slate"
          />
        </section>

        {/* Recent leave requests */}
        <section className="mb-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-lg font-bold text-[#122D59] sm:text-xl">
                Recent Leave Requests
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Review the status of your leave applications.
              </p>
            </div>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center self-start rounded-xl bg-blue-50 text-blue-700 sm:self-center">
              <FileText size={20} />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-4 py-12">
              <Loader2 size={28} className="animate-spin text-blue-700" />
              <p className="text-sm text-slate-500">
                Loading your leave requests...
              </p>
            </div>
          ) : error && requests.length === 0 ? (
            <div className="flex min-h-[150px] flex-col items-center justify-center px-5 py-10 text-center">
              <AlertCircle size={26} className="mb-3 text-red-500" />
              <p className="text-sm text-slate-500">
                Your leave requests could not be displayed.
              </p>
            </div>
          ) : requests.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center px-5 py-12 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <CalendarDays size={26} />
              </div>

              <h3 className="font-semibold text-slate-800">
                No leave requests yet
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Your leave applications will appear here once you submit a
                request.
              </p>

              <button
                type="button"
                onClick={() => router.push("/leave/apply")}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                <Plus size={17} />
                Apply for Leave
              </button>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[760px] border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50">
                      {[
                        "Leave Type",
                        "From",
                        "To",
                        "Days",
                        "Status",
                        "Actions",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="whitespace-nowrap px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500 first:pl-6 last:pr-6"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {recentRequests.map((request, index) => {
                      const requestId = request._id || request.id || "";

                      return (
                        <tr
                          key={requestId || `${request.startDate}-${index}`}
                          className="transition hover:bg-slate-50/80"
                        >
                          <td className="px-5 py-5 pl-6 text-sm font-medium text-slate-800">
                            {request.leaveType || "Leave"}
                          </td>

                          <td className="whitespace-nowrap px-5 py-5 text-sm text-slate-600">
                            {formatDate(request.startDate)}
                          </td>

                          <td className="whitespace-nowrap px-5 py-5 text-sm text-slate-600">
                            {formatDate(request.endDate)}
                          </td>

                          <td className="px-5 py-5 text-sm text-slate-600">
                            {getDuration(request)}
                          </td>

                          <td className="px-5 py-5">
                            <span
                              className={`inline-flex whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${getStatusStyles(request.status)}`}
                            >
                              {normalizeStatus(request.status)}
                            </span>
                          </td>

                          <td className="px-5 py-5 pr-6">
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  requestId
                                    ? `/leave/requests?requestId=${encodeURIComponent(requestId)}`
                                    : "/leave/requests"
                                )
                              }
                              className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-blue-700 transition hover:text-blue-900"
                            >
                              <Eye size={16} />
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 p-4 md:hidden">
                {recentRequests.map((request, index) => {
                  const requestId = request._id || request.id || "";

                  return (
                    <article
                      key={requestId || `${request.startDate}-${index}`}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="break-words font-semibold text-slate-900">
                            {request.leaveType || "Leave"}
                          </h3>

                          <p className="mt-1 text-xs text-slate-500">
                            {getDuration(request)} day
                            {getDuration(request) === 1 ? "" : "s"}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold capitalize ${getStatusStyles(request.status)}`}
                        >
                          {normalizeStatus(request.status)}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                        <div>
                          <p className="text-xs text-slate-500">From</p>
                          <p className="mt-1 text-sm font-medium text-slate-800">
                            {formatDate(request.startDate)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">To</p>
                          <p className="mt-1 text-sm font-medium text-slate-800">
                            {formatDate(request.endDate)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            requestId
                              ? `/leave/requests?requestId=${encodeURIComponent(requestId)}`
                              : "/leave/requests"
                          )
                        }
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                      >
                        <Eye size={16} />
                        View Request
                      </button>
                    </article>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-sm text-slate-500">
                  Showing {recentRequests.length} of {requests.length} leave
                  requests
                </p>

                <button
                  type="button"
                  onClick={() => router.push("/leave/requests")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#122D59] transition hover:bg-slate-50"
                >
                  <FileText size={16} />
                  View All Requests
                </button>
              </div>
            </>
          )}
        </section>

        {/* Leave balance summary */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Wallet size={23} />
              </div>

              <div className="min-w-0">
                <h2 className="text-lg font-bold text-[#122D59]">
                  Leave Balance
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Review your leave entitlement and approved leave usage.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push("/leave/balance")}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#122D59] transition hover:bg-slate-50"
            >
              View Leave Balance
              <span aria-hidden="true">→</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 border-t border-slate-100 bg-slate-50/70 p-5 sm:grid-cols-2 sm:p-6">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Approved Leave Taken</p>
              <p className="mt-2 text-2xl font-bold text-[#122D59]">
                {leaveTaken}
                <span className="ml-2 text-sm font-medium text-slate-500">
                  days
                </span>
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Pending Requests</p>
              <p className="mt-2 text-2xl font-bold text-[#122D59]">
                {counts.pending}
                <span className="ml-2 text-sm font-medium text-slate-500">
                  requests
                </span>
              </p>
            </div>
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-slate-400">
          Employee Services · Leave Management
        </p>
      </div>
    </div>
  );
}

export default function LeaveDashboardPage() {
  return (
    <AuthGuard>
      <LeaveDashboardContent />
    </AuthGuard>
  );
}