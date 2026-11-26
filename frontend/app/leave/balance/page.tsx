
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
  Palmtree,
} from "lucide-react";

import AuthGuard from "@/components/auth/AuthGuard";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

/* ==========================================
   TYPES
========================================== */

type LeaveBalanceItem = {
  leaveType: string;
  entitlement: number;
  approvedDays: number;
  pendingDays: number;
  availableDays: number;
};

type BalanceSummary = {
  totalEntitlement: number;
  leaveTaken: number;
  pendingLeave: number;
  remainingBalance: number;
};

type BalanceApiResponse = {
  success: boolean;
  message?: string;
  year?: number;
  employee?: {
    id: string;
    name: string;
    email: string;
    department?: string;
  };
  summary?: BalanceSummary;
  breakdown?: LeaveBalanceItem[];
};

type LeaveCategoryDisplay = LeaveBalanceItem & {
  description: string;
  icon: typeof CalendarDays;
  usage: number;
};

/* ==========================================
   HELPERS
========================================== */

function normalizeLeaveType(value: string): string {
  return value.trim().toLowerCase();
}

function formatLeaveType(value: string): string {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDays(value: number): string {
  if (!Number.isFinite(value)) return "0";

  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(1);
}

function getLeaveDescription(leaveType: string): string {
  const descriptions: Record<string, string> = {
    "annual leave": "Planned holidays and vacations",
    "casual leave": "Personal work and short absences",
    "sick leave": "Health-related absences",
    "maternity leave": "Maternity-related absence",
    "paternity leave": "Paternity-related absence",
    "unpaid leave": "Unpaid time away from work",
    other: "Other approved leave categories",
  };

  return (
    descriptions[normalizeLeaveType(leaveType)] ||
    "Employee leave entitlement"
  );
}

function getLeaveIcon(leaveType: string): typeof CalendarDays {
  const normalized = normalizeLeaveType(leaveType);

  if (normalized === "casual leave") return TreePalm;
  if (normalized === "sick leave") return HeartPulse;
  if (normalized === "annual leave") return CalendarDays;
  if (normalized === "maternity leave") return HeartPulse;
  if (normalized === "paternity leave") return BriefcaseBusiness;
  if (normalized === "unpaid leave") return Coffee;

  return Palmtree;
}

async function readApiResponse(
  response: Response
): Promise<BalanceApiResponse> {
  try {
    return (await response.json()) as BalanceApiResponse;
  } catch {
    throw new Error("The server returned an invalid response.");
  }
}

/* ==========================================
   SUMMARY CARD
========================================== */

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
              {formatDays(value)}
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

/* ==========================================
   MAIN PAGE CONTENT
========================================== */

function LeaveBalanceContent() {
  const router = useRouter();

  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [balanceData, setBalanceData] =
    useState<BalanceApiResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  /* ==========================================
     LOAD ACTUAL EMPLOYEE BALANCE
  ========================================== */

  const loadBalance = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/leaves/balance?year=${selectedYear}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      const payload = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          payload.message ||
            `Unable to load leave balance (HTTP ${response.status}).`
        );
      }

      if (!payload.success || !payload.summary || !payload.breakdown) {
        throw new Error(
          payload.message || "Invalid leave balance data received."
        );
      }

      setBalanceData(payload);
      setLastUpdated(new Date());
    } catch (err) {
      setBalanceData(null);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading your leave balance."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    void loadBalance();
  }, [loadBalance]);

  /* ==========================================
     FORMAT LEAVE BREAKDOWN
  ========================================== */

  const breakdown = useMemo<LeaveCategoryDisplay[]>(() => {
    if (!balanceData?.breakdown) {
      return [];
    }

    return balanceData.breakdown.map((item) => {
      const entitlement = Number(item.entitlement) || 0;
      const approvedDays = Number(item.approvedDays) || 0;

      const usage =
        entitlement > 0
          ? Math.min(
              100,
              Math.round((approvedDays / entitlement) * 100)
            )
          : 0;

      return {
        ...item,
        entitlement,
        approvedDays,
        pendingDays: Number(item.pendingDays) || 0,
        availableDays: Number(item.availableDays) || 0,
        description: getLeaveDescription(item.leaveType),
        icon: getLeaveIcon(item.leaveType),
        usage,
      };
    });
  }, [balanceData]);

  const summary = balanceData?.summary;

  /* ==========================================
     RENDER
  ========================================== */

  return (
    <div className="min-h-full bg-[#F3F6FB] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">

        {/* PAGE HEADING */}

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
              View your actual leave entitlement, approved leave,
              pending requests and available balance.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {/* YEAR SELECTOR */}

            <select
              value={selectedYear}
              onChange={(event) =>
                setSelectedYear(Number(event.target.value))
              }
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              aria-label="Select leave year"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map(
                (year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                )
              )}
            </select>

            {/* REFRESH BUTTON */}

            <button
              type="button"
              onClick={() => void loadBalance()}
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
        </div>

        {/* POLICY NOTICE */}

        <section className="flex gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
          <ShieldCheck
            size={22}
            className="mt-0.5 shrink-0 text-blue-700"
          />

          <div>
            <h2 className="text-sm font-semibold text-[#122D59]">
              Your official leave balance
            </h2>

            <p className="mt-1 text-sm leading-6 text-blue-800/80">
              These figures are retrieved from your employee leave
              balance records. Approved leave is deducted from your
              available balance. Pending leave is displayed separately.
            </p>
          </div>
        </section>

        {/* ERROR MESSAGE */}

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
                  Could not load leave balance
                </p>

                <p className="mt-1 text-sm leading-6 text-red-700">
                  {error}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadBalance()}
              disabled={loading}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        )}

        {/* LOADING STATE */}

        {loading && !balanceData && (
          <div className="flex min-h-[250px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <Loader2
              size={32}
              className="animate-spin text-blue-700"
            />

            <p className="mt-4 text-sm font-medium text-slate-600">
              Loading your leave balance...
            </p>
          </div>
        )}

        {/* BALANCE CONTENT */}

        {balanceData && summary && (
          <>
            {/* SUMMARY CARDS */}

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <BalanceStat
                title="Total Entitlement"
                value={summary.totalEntitlement}
                icon={CalendarDays}
                iconClass="bg-blue-50 text-blue-700"
                description={`Total allocated days for ${selectedYear}`}
              />

              <BalanceStat
                title="Leave Taken"
                value={summary.leaveTaken}
                icon={CheckCircle2}
                iconClass="bg-emerald-50 text-emerald-600"
                description="Approved leave days"
              />

              <BalanceStat
                title="Pending Leave"
                value={summary.pendingLeave}
                icon={Clock3}
                iconClass="bg-amber-50 text-amber-700"
                description="Awaiting approval"
              />

              <BalanceStat
                title="Remaining Balance"
                value={summary.remainingBalance}
                icon={Wallet}
                iconClass="bg-violet-50 text-violet-700"
                description="Available leave days"
              />
            </section>

            {/* EMPLOYEE INFORMATION */}

            {balanceData.employee && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Employee
                    </p>

                    <h2 className="mt-1 text-lg font-bold text-slate-900">
                      {balanceData.employee.name}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {balanceData.employee.email}
                    </p>
                  </div>

                  {balanceData.employee.department && (
                    <div className="rounded-xl bg-slate-50 px-4 py-3">
                      <p className="text-xs text-slate-400">
                        Department
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {balanceData.employee.department}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* LEAVE BREAKDOWN */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Leave Breakdown
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Your actual entitlement and usage by leave category
                  </p>
                </div>

                <div className="inline-flex w-fit items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                  <CalendarDays size={15} />
                  {selectedYear} Overview
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left">
                  <thead className="bg-slate-50">
                    <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-6 py-4">Leave Type</th>
                      <th className="px-4 py-4">Entitlement</th>
                      <th className="px-4 py-4">Taken</th>
                      <th className="px-4 py-4">Pending</th>
                      <th className="px-4 py-4">Available</th>
                      <th className="px-6 py-4">Usage</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {breakdown.map((category) => {
                      const Icon = category.icon;

                      return (
                        <tr
                          key={category.leaveType}
                          className="transition hover:bg-slate-50/70"
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#17458B]">
                                <Icon size={21} />
                              </div>

                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {formatLeaveType(category.leaveType)}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {category.description}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-4 py-5">
                            <span className="text-sm font-semibold text-slate-700">
                              {formatDays(category.entitlement)} days
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-4 py-5">
                            <span className="text-sm font-semibold text-emerald-700">
                              {formatDays(category.approvedDays)}
                            </span>

                            <span className="ml-1 text-xs text-slate-400">
                              days
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-4 py-5">
                            <span className="text-sm font-semibold text-amber-700">
                              {formatDays(category.pendingDays)}
                            </span>

                            <span className="ml-1 text-xs text-slate-400">
                              days
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-4 py-5">
                            <span className="text-sm font-semibold text-slate-900">
                              {formatDays(category.availableDays)}
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
                                aria-label={`${category.leaveType} usage`}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={category.usage}
                              >
                                <div
                                  className="h-full rounded-full bg-blue-600 transition-all"
                                  style={{
                                    width: `${category.usage}%`,
                                  }}
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

              {breakdown.length === 0 && (
                <div className="px-5 py-10 text-center text-sm text-slate-500">
                  No leave categories are configured for this year.
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center gap-2 border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
                  <Loader2 size={17} className="animate-spin" />
                  Refreshing leave information...
                </div>
              )}
            </section>

            {/* SUPPORTING INFORMATION */}

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
                    Approved leave days are deducted from your
                    available entitlement.
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
                    Pending applications are displayed separately
                    and are not deducted until approved.
                  </p>
                </div>
              </div>
            </section>

            {/* LAST UPDATED */}

            <div className="flex items-start gap-2 pb-2 text-xs leading-5 text-slate-400">
              <BriefcaseBusiness
                size={15}
                className="mt-0.5 shrink-0"
              />

              <p>
                {lastUpdated
                  ? `Balance last refreshed at ${lastUpdated.toLocaleTimeString(
                      "en-IN",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}.`
                  : "Refresh to retrieve the latest leave information."}
                {" "}Your balance is retrieved directly from the HR backend.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ==========================================
   PAGE EXPORT
========================================== */

export default function LeaveBalancePage() {
  return (
    <AuthGuard>
      <LeaveBalanceContent />
    </AuthGuard>
  );
}
