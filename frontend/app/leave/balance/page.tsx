"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Wallet,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  TreePalm,
  HeartPulse,
  BriefcaseBusiness,
  Coffee,
  Loader2,
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
  createdAt?: string;
  submittedAt?: string;
};

type LeaveCategory = {
  name: string;
  description: string;
  entitlement: number;
  icon: typeof TreePalm;
};

const LEAVE_CATEGORIES: LeaveCategory[] = [
  {
    name: "Casual Leave",
    description: "Personal work and short absences",
    entitlement: 12,
    icon: TreePalm,
  },
  {
    name: "Sick Leave",
    description: "Health-related absences",
    entitlement: 12,
    icon: HeartPulse,
  },
  {
    name: "Annual Leave",
    description: "Planned holidays and vacations",
    entitlement: 15,
    icon: CalendarDays,
  },
];

const TOTAL_ENTITLEMENT = LEAVE_CATEGORIES.reduce(
  (total, category) => total + category.entitlement,
  0
);

function getDuration(request: LeaveRequest): number {
  if (
    typeof request.days === "number" &&
    Number.isFinite(request.days) &&
    request.days > 0
  ) {
    return request.days;
  }

  if (
    typeof request.duration === "number" &&
    Number.isFinite(request.duration) &&
    request.duration > 0
  ) {
    return request.duration;
  }

  if (!request.startDate || !request.endDate) {
    return 0;
  }

  const start = new Date(request.startDate);
  const end = new Date(request.endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
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

  return Math.max(0, Math.round((endDay - startDay) / 86400000) + 1);
}

function normalizeStatus(status?: string): string {
  return (status || "").trim().toLowerCase();
}

function normalizeLeaveType(leaveType?: string): string {
  return (leaveType || "").trim().toLowerCase();
}

function formatLeaveType(leaveType: string): string {
  return leaveType
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(dateString?: string): string {
  if (!dateString) return "—";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function extractRequests(payload: unknown): LeaveRequest[] {
  if (Array.isArray(payload)) {
    return payload as LeaveRequest[];
  }

  if (payload && typeof payload === "object") {
    const data = payload as Record<string, unknown>;

    if (Array.isArray(data.requests)) {
      return data.requests as LeaveRequest[];
    }

    if (Array.isArray(data.leaves)) {
      return data.leaves as LeaveRequest[];
    }

    if (Array.isArray(data.data)) {
      return data.data as LeaveRequest[];
    }
  }

  return [];
}

function BalanceStat({
  title,
  value,
  icon: Icon,
  iconClass,
  description,
}: {
  title: string;
  value: number;
  icon: typeof CalendarDays;
  iconClass: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{title}</p>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900">
              {value}
            </span>
            <span className="text-sm text-slate-400">days</span>
          </div>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon size={23} />
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function LeaveBalanceContent() {
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

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            "Your session may have expired. Please sign in again."
          );
        }

        if (response.status === 404) {
          throw new Error(
            "Unable to load leave requests (HTTP 404). Check the backend API route."
          );
        }

        throw new Error(
          `Unable to load leave requests (HTTP ${response.status}).`
        );
      }

      const payload: unknown = await response.json();
      setRequests(extractRequests(payload));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading leave information."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const balance = useMemo(() => {
    let leaveTaken = 0;
    let pendingLeave = 0;

    const breakdown = LEAVE_CATEGORIES.map((category) => ({
      ...category,
      taken: 0,
      pending: 0,
    }));

    requests.forEach((request) => {
      const status = normalizeStatus(request.status);

      if (status !== "approved" && status !== "pending") {
        return;
      }

      const duration = getDuration(request);
      const leaveType = normalizeLeaveType(request.leaveType);

      const category = breakdown.find(
        (item) => normalizeLeaveType(item.name) === leaveType
      );

      if (status === "approved") {
        leaveTaken += duration;

        if (category) {
          category.taken += duration;
        }
      } else {
        pendingLeave += duration;

        if (category) {
          category.pending += duration;
        }
      }
    });

    const remainingBalance = Math.max(0, TOTAL_ENTITLEMENT - leaveTaken);

    return {
      leaveTaken,
      pendingLeave,
      remainingBalance,
      breakdown: breakdown.map((category) => ({
        ...category,
        remaining: Math.max(
          0,
          category.entitlement - category.taken
        ),
        usage:
          category.entitlement > 0
            ? Math.min(
                100,
                Math.round((category.taken / category.entitlement) * 100)
              )
            : 0,
      })),
    };
  }, [requests]);

  return (
    <div className="min-h-full bg-[#F3F6FB] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        {/* Page heading */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <button
              type="button"
              onClick={() => router.push("/leave")}
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700 transition hover:text-blue-700"
            >
              <ArrowLeft size={17} />
              Back to Leave Dashboard
            </button>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Your Leave Balance
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Track your annual entitlement, approved leave, pending requests,
              and available balance.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadRequests()}
            disabled={loading}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <RefreshCw size={17} />
            )}
            Refresh Balance
          </button>
        </div>

        {/* Policy notice */}
        <section className="flex gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
          <ShieldCheck
            size={22}
            className="mt-0.5 shrink-0 text-blue-700"
          />

          <div>
            <h2 className="text-sm font-semibold text-[#122D59]">
              Leave policy information
            </h2>

            <p className="mt-1 text-sm leading-6 text-blue-800/80">
              The entitlement figures on this page are example values, not
              verified company policy. Confirm your organization&apos;s HR
              rules before relying on these figures. For accurate,
              employee-specific balances, entitlements should be provided by
              the HR backend.
            </p>
          </div>
        </section>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <AlertCircle
                size={21}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <div>
                <p className="text-sm font-semibold text-red-800">
                  Could not load leave information
                </p>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadRequests()}
              disabled={loading}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        )}

        {/* Balance summary */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <BalanceStat
            title="Total Entitlement"
            value={TOTAL_ENTITLEMENT}
            icon={CalendarDays}
            iconClass="bg-blue-50 text-blue-700"
            description="Days allocated per year"
          />

          <BalanceStat
            title="Leave Taken"
            value={balance.leaveTaken}
            icon={CheckCircle2}
            iconClass="bg-emerald-50 text-emerald-600"
            description="Approved leave days"
          />

          <BalanceStat
            title="Pending Leave"
            value={balance.pendingLeave}
            icon={Clock3}
            iconClass="bg-amber-50 text-amber-700"
            description="Awaiting approval"
          />

          <BalanceStat
            title="Remaining Balance"
            value={balance.remainingBalance}
            icon={Wallet}
            iconClass="bg-violet-50 text-violet-700"
            description="Entitlement minus leave taken"
          />
        </section>

        {/* Leave breakdown */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Leave Breakdown
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Entitlement and usage by leave category
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
              <CalendarDays size={15} />
              Annual overview
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left">
              <thead className="bg-slate-50">
                <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">Leave Type</th>
                  <th className="px-4 py-4">Entitlement</th>
                  <th className="px-4 py-4">Taken</th>
                  <th className="px-4 py-4">Pending</th>
                  <th className="px-4 py-4">Remaining</th>
                  <th className="px-6 py-4">Usage</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {balance.breakdown.map((category) => {
                  const Icon = category.icon;

                  return (
                    <tr
                      key={category.name}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#17458B]">
                            <Icon size={21} />
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {category.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {category.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-5">
                        <span className="text-sm font-semibold text-slate-700">
                          {category.entitlement} days
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-5">
                        <span className="text-sm font-semibold text-emerald-700">
                          {category.taken}
                        </span>
                        <span className="ml-1 text-xs text-slate-400">
                          days
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-5">
                        <span className="text-sm font-semibold text-amber-700">
                          {category.pending}
                        </span>
                        <span className="ml-1 text-xs text-slate-400">
                          days
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-5">
                        <span className="text-sm font-semibold text-slate-900">
                          {category.remaining}
                        </span>
                        <span className="ml-1 text-xs text-slate-400">
                          days
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <div className="min-w-[100px]">
                          <p className="mb-2 text-xs font-semibold text-slate-600">
                            {category.usage}%
                          </p>

                          <div
                            className="h-2 overflow-hidden rounded-full bg-slate-100"
                            role="progressbar"
                            aria-label={`${category.name} usage`}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={category.usage}
                          >
                            <div
                              className="h-full rounded-full bg-blue-600 transition-all"
                              style={{ width: `${category.usage}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
              <Loader2 size={17} className="animate-spin" />
              Loading leave information...
            </div>
          )}

          {!loading && !error && requests.length === 0 && (
            <div className="border-t border-slate-100 px-5 py-4 text-center text-xs text-slate-400">
              No leave requests found. Your balance is currently based on the
              example entitlement values above.
            </div>
          )}
        </section>

        {/* Supporting information */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 size={20} />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Approved requests
              </h3>
              <p className="mt-1 text-sm leading-5 text-slate-500">
                Approved leave days are included in the leave taken
                calculation.
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Coffee size={20} />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Pending requests
              </h3>
              <p className="mt-1 text-sm leading-5 text-slate-500">
                Pending applications are displayed separately and are not
                deducted from the remaining balance.
              </p>
            </div>
          </div>
        </section>

        <div className="flex items-start gap-2 pb-2 text-xs leading-5 text-slate-400">
          <BriefcaseBusiness size={15} className="mt-0.5 shrink-0" />
          <p>
            The displayed entitlement is an example configuration. Confirm
            official leave rules and employee-specific balances with HR before
            using these figures for actual leave planning.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LeaveBalancePage() {
  return (
    <AuthGuard>
      <LeaveBalanceContent />
    </AuthGuard>
  );
}