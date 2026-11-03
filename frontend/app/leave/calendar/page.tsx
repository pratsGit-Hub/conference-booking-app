"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import AuthGuard from "@/components/auth/AuthGuard";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"
).replace(/\/$/, "");

type LeaveRequest = {
  _id?: string;
  id?: string;
  leaveType?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  days?: number;
  duration?: number;
  reason?: string;
  status?: string;
  createdAt?: string;
  submittedAt?: string;
  employeeName?: string;
  employeeEmail?: string;
  department?: string;
  approverComment?: string;
  rejectionReason?: string;
};

function getRequestId(request: LeaveRequest) {
  return request._id || request.id || "";
}

function parseDate(value?: string): Date | null {
  if (!value) return null;

  // Parse date-only strings in local time to avoid timezone shifts.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (match) {
    const [, year, month, day] = match;

    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value?: string | Date) {
  if (!value) return "Not provided";

  const date = value instanceof Date ? value : parseDate(value);

  if (!date) return "Invalid date";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getLeaveType(request: LeaveRequest) {
  return request.leaveType || request.type || "Leave";
}

function getDuration(request: LeaveRequest) {
  if (typeof request.days === "number") return request.days;
  if (typeof request.duration === "number") return request.duration;

  const start = parseDate(request.startDate);
  const end = parseDate(request.endDate);

  if (!start || !end) return 0;

  return (
    Math.floor(
      (startOfDay(end).getTime() - startOfDay(start).getTime()) /
        (24 * 60 * 60 * 1000),
    ) + 1
  );
}

function getStatus(request: LeaveRequest) {
  return (request.status || "pending").toLowerCase();
}

function getRequestsFromResponse(payload: unknown): LeaveRequest[] {
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

function LeaveCalendarContent() {
  const router = useRouter();

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedRequest, setSelectedRequest] =
    useState<LeaveRequest | null>(null);

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
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            "Your session may have expired. Please sign in again.",
          );
        }

        if (response.status === 404) {
          throw new Error(
            "The leave requests API returned 404. Check that your backend provides GET /api/leaves and that NEXT_PUBLIC_API_URL points to the correct server.",
          );
        }

        throw new Error(
          `Unable to load leave requests (HTTP ${response.status}).`,
        );
      }

      const payload: unknown = await response.json();
      const allRequests = getRequestsFromResponse(payload);

      setRequests(allRequests);
    } catch (err) {
      setRequests([]);

      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while loading leave requests.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const approvedRequests = useMemo(
    () =>
      requests.filter((request) => {
        const status = getStatus(request);

        return status === "approved";
      }),
    [requests],
  );

  const calendarDays = useMemo(() => {
    const firstDay = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth(),
      1,
    );

    // Calendar starts on Sunday and always displays complete weeks.
    const gridStart = new Date(
      firstDay.getFullYear(),
      firstDay.getMonth(),
      1 - firstDay.getDay(),
    );

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + index,
      );

      return {
        date,
        key: dateKey(date),
        isCurrentMonth: date.getMonth() === visibleMonth.getMonth(),
        isToday: dateKey(date) === dateKey(new Date()),
        isSelected: dateKey(date) === dateKey(selectedDate),
      };
    });
  }, [visibleMonth, selectedDate]);

  const requestsByDate = useMemo(() => {
    const grouped = new Map<string, LeaveRequest[]>();

    approvedRequests.forEach((request) => {
      const start = parseDate(request.startDate);
      const end = parseDate(request.endDate);

      if (!start || !end) return;

      const startDay = startOfDay(start);
      const endDay = startOfDay(end);

      if (endDay < startDay) return;

      // Protect the calendar from unexpectedly large or malformed ranges.
      const maximumDays = 366;
      const totalDays =
        Math.floor(
          (endDay.getTime() - startDay.getTime()) / (24 * 60 * 60 * 1000),
        ) + 1;

      for (let index = 0; index < Math.min(totalDays, maximumDays); index++) {
        const current = new Date(
          startDay.getFullYear(),
          startDay.getMonth(),
          startDay.getDate() + index,
        );

        const key = dateKey(current);
        const existing = grouped.get(key) || [];

        existing.push(request);
        grouped.set(key, existing);
      }
    });

    return grouped;
  }, [approvedRequests]);

  const selectedDateRequests = useMemo(
    () => requestsByDate.get(dateKey(selectedDate)) || [],
    [requestsByDate, selectedDate],
  );

  function changeMonth(amount: number) {
    setVisibleMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + amount, 1),
    );
  }

  function goToToday() {
    const today = new Date();

    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  }

  return (
    <div className="min-h-full bg-[#F3F6FB] px-4 py-6 sm:px-6 lg:px-8">
      {/* Page heading: the shared header and sidebar are provided by layout.tsx. */}
      <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#17458B]">
            <CalendarDays size={14} />
            Leave Management
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Leave Calendar
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-500 sm:text-base">
            View approved leave dates, navigate between months, and select a
            leave entry to see its details.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void loadRequests(true)}
            disabled={loading || refreshing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <RefreshCw size={17} />
            )}
            Refresh
          </button>

          <button
            type="button"
            onClick={() => router.push("/leave/apply")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#17458B] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#12386F]"
          >
            <FileText size={17} />
            Apply for Leave
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700"
        >
          <AlertCircle size={19} className="mt-0.5 shrink-0" />

          <div className="min-w-0 flex-1">
            <p className="font-semibold">Unable to load leave requests</p>
            <p className="mt-1 break-words">{error}</p>
          </div>

          <button
            type="button"
            onClick={() => void loadRequests(true)}
            className="shrink-0 rounded-lg px-2 py-1 font-semibold hover:bg-rose-100"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 2xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
        {/* Calendar */}
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {visibleMonth.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Approved leave requests
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => changeMonth(-1)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
              >
                <ChevronLeft size={19} />
              </button>

              <button
                type="button"
                onClick={goToToday}
                className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Today
              </button>

              <button
                type="button"
                aria-label="Next month"
                onClick={() => changeMonth(1)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
              >
                <ChevronRight size={19} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Approved Leave
            </span>

            <span className="text-xs text-slate-500">
              Select a highlighted date or leave entry for details.
            </span>
          </div>

          <div className="p-3 sm:p-5">
            <div className="grid grid-cols-7 gap-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                (day) => (
                  <div
                    key={day}
                    className="flex h-10 items-center justify-center text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:text-xs"
                  >
                    {day}
                  </div>
                ),
              )}

              {calendarDays.map(
                ({ date, key, isCurrentMonth, isToday, isSelected }) => {
                  const dayRequests = requestsByDate.get(key) || [];

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSelectedDate(date);
                        setSelectedRequest(null);
                      }}
                      aria-label={`${formatDate(date)}, ${dayRequests.length} approved leave requests`}
                      aria-pressed={isSelected}
                      className={`relative flex min-h-[76px] flex-col items-start rounded-lg border p-2 text-left transition sm:min-h-[94px] sm:p-3 ${
                        isSelected
                          ? "border-[#17458B] bg-blue-50 ring-1 ring-[#17458B]"
                          : isCurrentMonth
                            ? "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40"
                            : "border-slate-100 bg-slate-50 text-slate-400"
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                          isToday
                            ? "bg-[#17458B] text-white"
                            : isSelected
                              ? "text-[#17458B]"
                              : isCurrentMonth
                                ? "text-slate-800"
                                : "text-slate-400"
                        }`}
                      >
                        {date.getDate()}
                      </span>

                      {dayRequests.length > 0 && (
                        <div className="mt-2 flex w-full flex-col gap-1">
                          {dayRequests.slice(0, 2).map((request, index) => (
                            <span
                              key={`${getRequestId(request)}-${index}`}
                              className="w-full truncate rounded-md bg-emerald-100 px-1.5 py-1 text-[9px] font-semibold text-emerald-800 sm:text-[10px]"
                            >
                              {getLeaveType(request)}
                            </span>
                          ))}

                          {dayRequests.length > 2 && (
                            <span className="text-[9px] font-semibold text-emerald-700">
                              +{dayRequests.length - 2} more
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                },
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-4 text-xs text-slate-500 sm:px-6">
            <span>
              {approvedRequests.length} approved request
              {approvedRequests.length === 1 ? "" : "s"} total
            </span>

            {loading && (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Loading requests…
              </span>
            )}
          </div>
        </section>

        {/* Selected date details */}
        <aside className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-5 py-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <CalendarDays size={21} />
            </div>

            <div className="min-w-0">
              <p className="text-xs text-slate-500">Selected Date</p>
              <h2 className="mt-1 font-bold text-slate-900">
                {formatDate(selectedDate)}
              </h2>
            </div>
          </div>

          <div className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-bold text-slate-900">Approved Leave</h3>

              <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                {selectedDateRequests.length}
              </span>
            </div>

            {loading ? (
              <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 text-center">
                <Loader2
                  size={28}
                  className="animate-spin text-[#17458B]"
                />
                <p className="mt-3 text-sm text-slate-500">
                  Loading approved leave…
                </p>
              </div>
            ) : selectedDateRequests.length === 0 ? (
              <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-5 text-center">
                <CalendarDays size={30} className="text-slate-300" />

                <p className="mt-4 font-semibold text-slate-800">
                  No approved leave
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  There are no approved leave requests for this date.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateRequests.map((request, index) => (
                  <button
                    key={`${getRequestId(request) || "request"}-${index}`}
                    type="button"
                    onClick={() =>
                      setSelectedRequest((current) =>
                        getRequestId(current || {}) === getRequestId(request)
                          ? null
                          : request,
                      )
                    }
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      getRequestId(selectedRequest || {}) ===
                      getRequestId(request)
                        ? "border-[#17458B] bg-blue-50"
                        : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">
                          {getLeaveType(request)}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(request.startDate)} –{" "}
                          {formatDate(request.endDate)}
                        </p>
                      </div>

                      <CheckCircle2
                        size={18}
                        className="shrink-0 text-emerald-600"
                      />
                    </div>

                    <p className="mt-3 text-xs font-medium text-[#17458B]">
                      {getDuration(request)} day
                      {getDuration(request) === 1 ? "" : "s"} · View details
                    </p>
                  </button>
                ))}
              </div>
            )}

            {selectedRequest && (
              <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="font-bold text-slate-900">
                    Request Details
                  </h3>

                  <button
                    type="button"
                    aria-label="Close request details"
                    onClick={() => setSelectedRequest(null)}
                    className="rounded-lg p-1 text-slate-500 hover:bg-white"
                  >
                    <X size={17} />
                  </button>
                </div>

                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Leave Type</dt>
                    <dd className="mt-1 font-semibold text-slate-800">
                      {getLeaveType(selectedRequest)}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs text-slate-500">Start Date</dt>
                    <dd className="mt-1 text-slate-800">
                      {formatDate(selectedRequest.startDate)}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs text-slate-500">End Date</dt>
                    <dd className="mt-1 text-slate-800">
                      {formatDate(selectedRequest.endDate)}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs text-slate-500">Duration</dt>
                    <dd className="mt-1 text-slate-800">
                      {getDuration(selectedRequest)} day
                      {getDuration(selectedRequest) === 1 ? "" : "s"}
                    </dd>
                  </div>

                  {selectedRequest.reason && (
                    <div>
                      <dt className="text-xs text-slate-500">Reason</dt>
                      <dd className="mt-1 break-words text-slate-800">
                        {selectedRequest.reason}
                      </dd>
                    </div>
                  )}

                  {selectedRequest.approverComment && (
                    <div>
                      <dt className="text-xs text-slate-500">
                        Approver Comment
                      </dt>
                      <dd className="mt-1 break-words text-slate-800">
                        {selectedRequest.approverComment}
                      </dd>
                    </div>
                  )}

                  <div>
                    <dt className="text-xs text-slate-500">Status</dt>
                    <dd className="mt-1 inline-flex items-center gap-1.5 font-semibold capitalize text-emerald-700">
                      <CheckCircle2 size={15} />
                      {getStatus(selectedRequest)}
                    </dd>
                  </div>

                  {selectedRequest.createdAt ||
                  selectedRequest.submittedAt ? (
                    <div>
                      <dt className="text-xs text-slate-500">
                        Submitted On
                      </dt>
                      <dd className="mt-1 flex items-center gap-2 text-slate-800">
                        <Clock size={14} />
                        {formatDate(
                          selectedRequest.createdAt ||
                            selectedRequest.submittedAt,
                        )}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            )}

            <button
              type="button"
              onClick={() => router.push("/leave/requests")}
              className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ClipboardListIcon />
              View My Leave Requests
              <ChevronRight size={16} />
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ClipboardListIcon() {
  return <FileText size={16} />;
}

export default function LeaveCalendarPage() {
  return (
    <AuthGuard>
      <LeaveCalendarContent />
    </AuthGuard>
  );
}