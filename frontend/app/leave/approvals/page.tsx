"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  UserRound,
  XCircle,
  Loader2,
  FileText,
  MessageSquare,
} from "lucide-react";

import AuthGuard from "@/components/auth/AuthGuard";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

/* =====================================================
   TYPES
===================================================== */

type EmployeeInfo = {
  _id?: string;
  name?: string;
  email?: string;
  department?: string;
};

type LeaveRequest = {
  _id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days?: number;
  reason: string;
  status: string;
  createdAt?: string;

  employee?: EmployeeInfo;
  user?: EmployeeInfo;
  applicant?: EmployeeInfo;

  firstLevelStatus?: string;
  firstLevelApproverId?: string;
  firstLevelApproverName?: string;
  firstLevelApproverEmail?: string;
};

type Decision = "ACCEPT" | "DECLINE";

/* =====================================================
   HELPERS
===================================================== */

async function readResponse(response: Response): Promise<any> {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function getErrorMessage(data: any, fallback: string): string {
  return data?.message || data?.error || fallback;
}

function extractRequests(data: any): LeaveRequest[] {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.requests)) {
    return data.requests;
  }

  if (Array.isArray(data?.leaves)) {
    return data.leaves;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.data?.requests)) {
    return data.data.requests;
  }

  if (Array.isArray(data?.data?.leaves)) {
    return data.data.leaves;
  }

  return [];
}

function formatDate(value?: string) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getApplicant(request: LeaveRequest): EmployeeInfo {
  return (
    request.applicant ||
    request.employee ||
    request.user ||
    {}
  );
}

/* =====================================================
   MAIN COMPONENT
===================================================== */

function FirstLevelApprovalsContent() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(
    null
  );

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");

  const [selectedRequest, setSelectedRequest] =
    useState<LeaveRequest | null>(null);

  const [decision, setDecision] = useState<Decision | null>(null);
  const [comment, setComment] = useState("");

  /* =====================================================
     FETCH FIRST-LEVEL APPROVAL REQUESTS
  ===================================================== */

  const fetchRequests = useCallback(
    async (showRefresh = false) => {
      try {
        setError("");

        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response = await fetch(
          `${API_BASE_URL}/api/leaves/approvals/first-level`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
          }
        );

        const data = await readResponse(response);

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              data,
              "Unable to load approval requests."
            )
          );
        }

        setRequests(extractRequests(data));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load approval requests."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  /* =====================================================
     OPEN DECISION MODAL
  ===================================================== */

  function openDecisionModal(
    request: LeaveRequest,
    selectedDecision: Decision
  ) {
    setSelectedRequest(request);
    setDecision(selectedDecision);
    setComment("");
    setError("");
    setSuccess("");
  }

  function closeDecisionModal() {
    if (processingId) return;

    setSelectedRequest(null);
    setDecision(null);
    setComment("");
  }

  /* =====================================================
     SUBMIT FIRST-LEVEL DECISION
  ===================================================== */

  async function submitDecision() {
    if (!selectedRequest || !decision) return;

    try {
      setProcessingId(selectedRequest._id);
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_BASE_URL}/api/leaves/${selectedRequest._id}/first-level-decision`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            decision,
            comment: comment.trim(),
          }),
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            "Unable to submit your decision."
          )
        );
      }

      setSuccess(
        decision === "ACCEPT"
          ? "Leave request accepted and forwarded for admin approval."
          : "Leave request declined successfully."
      );

      // Remove the completed request from the pending list.
      setRequests((current) =>
        current.filter(
          (request) => request._id !== selectedRequest._id
        )
      );

      setSelectedRequest(null);
      setDecision(null);
      setComment("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit your decision."
      );
    } finally {
      setProcessingId(null);
    }
  }

  /* =====================================================
     FILTER REQUESTS
  ===================================================== */

  const filteredRequests = requests.filter((request) => {
    const applicant = getApplicant(request);

    const searchValue = search.toLowerCase().trim();

    return (
      !searchValue ||
      applicant.name?.toLowerCase().includes(searchValue) ||
      applicant.email?.toLowerCase().includes(searchValue) ||
      request.leaveType?.toLowerCase().includes(searchValue)
    );
  });

  /* =====================================================
     LOADING SCREEN
  ===================================================== */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-blue-700" size={36} />
          <p className="text-sm text-slate-500">
            Loading approval requests...
          </p>
        </div>
      </div>
    );
  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="min-h-full w-full bg-[#EDF3FF]">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* PAGE HEADER */}

        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-red-500">
              Leave Services
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-[#172F60] sm:text-4xl">
              Leave Approvals
            </h1>

            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              Review leave requests assigned to you as the first-level approver.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchRequests(true)}
            disabled={refreshing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#D6E2F5] bg-white px-4 text-sm font-semibold text-[#172F60] shadow-sm transition hover:bg-blue-50 disabled:opacity-60"
          >
            <RefreshCw
              size={17}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* ERROR MESSAGE */}

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle size={20} className="shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* SUCCESS MESSAGE */}

        {success && (
          <div
            role="status"
            className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <CheckCircle2 size={20} className="shrink-0" />
            <p>{success}</p>
          </div>
        )}

        {/* SUMMARY CARD */}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#D6E2F5] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Pending Your Review
                </p>

                <p className="mt-2 text-3xl font-bold text-[#172F60]">
                  {requests.length}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Clock size={24} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#D6E2F5] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Requests Displayed
                </p>

                <p className="mt-2 text-3xl font-bold text-[#172F60]">
                  {filteredRequests.length}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <FileText size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* SEARCH */}

        <div className="mb-6 rounded-2xl border border-[#D6E2F5] bg-white p-4 shadow-sm">
          <div className="relative">
            <Search
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by employee name, email or leave type..."
              className="h-12 w-full rounded-xl border border-[#D6E2F5] bg-white pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* REQUEST LIST */}

        {filteredRequests.length === 0 ? (
          <div className="rounded-2xl border border-[#D6E2F5] bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-700">
              <CheckCircle2 size={32} />
            </div>

            <h2 className="mt-5 text-xl font-bold text-[#172F60]">
              {requests.length === 0
                ? "No Pending Approvals"
                : "No Matching Requests"}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {requests.length === 0
                ? "You do not have any leave requests waiting for your first-level review."
                : "Try searching with another employee name, email or leave type."}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredRequests.map((request) => {
              const applicant = getApplicant(request);

              return (
                <div
                  key={request._id}
                  className="overflow-hidden rounded-2xl border border-[#D6E2F5] bg-white shadow-sm"
                >
                  {/* CARD HEADER */}

                  <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-800">
                        {applicant.name?.charAt(0).toUpperCase() || "E"}
                      </div>

                      <div className="min-w-0">
                        <h2 className="truncate text-base font-bold text-[#172F60]">
                          {applicant.name || "Employee"}
                        </h2>

                        <p className="truncate text-sm text-slate-500">
                          {applicant.email || "Email unavailable"}
                        </p>

                        {applicant.department && (
                          <p className="mt-1 text-xs text-slate-400">
                            {applicant.department}
                          </p>
                        )}
                      </div>
                    </div>

                    <span className="inline-flex w-fit items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                      <Clock size={14} />
                      PENDING YOUR REVIEW
                    </span>
                  </div>

                  {/* CARD BODY */}

                  <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3 sm:p-6">

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Leave Type
                      </p>

                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        {request.leaveType}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Start Date
                      </p>

                      <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <CalendarDays size={16} className="text-blue-600" />
                        {formatDate(request.startDate)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        End Date
                      </p>

                      <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <CalendarDays size={16} className="text-blue-600" />
                        {formatDate(request.endDate)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Duration
                      </p>

                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        {request.days ?? "—"}{" "}
                        {request.days === 1 ? "day" : "days"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Applied On
                      </p>

                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        {formatDate(request.createdAt)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Request ID
                      </p>

                      <p className="mt-2 truncate text-sm font-medium text-slate-600">
                        {request._id}
                      </p>
                    </div>

                    {/* REASON */}

                    <div className="sm:col-span-2 lg:col-span-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Reason for Leave
                      </p>

                      <p className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                        {request.reason || "No reason provided."}
                      </p>
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}

                  <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                    <button
                      type="button"
                      onClick={() =>
                        openDecisionModal(request, "DECLINE")
                      }
                      disabled={processingId === request._id}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      <XCircle size={18} />
                      Decline
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openDecisionModal(request, "ACCEPT")
                      }
                      disabled={processingId === request._id}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircle2 size={18} />
                      Accept
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =====================================================
         DECISION MODAL
      ===================================================== */}

      {selectedRequest && decision && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-[#172F60]">
                  {decision === "ACCEPT"
                    ? "Accept Leave Request"
                    : "Decline Leave Request"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {decision === "ACCEPT"
                    ? "This request will move to the admin for final approval."
                    : "This request will be declined."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeDecisionModal}
                disabled={!!processingId}
                aria-label="Close dialog"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <XCircle size={21} />
              </button>
            </div>

            <div className="space-y-4 p-5">

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Employee
                </p>

                <p className="mt-1 font-semibold text-[#172F60]">
                  {getApplicant(selectedRequest).name || "Employee"}
                </p>

                <p className="text-sm text-slate-500">
                  {getApplicant(selectedRequest).email || ""}
                </p>

                <p className="mt-3 text-xs font-semibold uppercase text-slate-400">
                  Leave Period
                </p>

                <p className="mt-1 text-sm font-medium text-slate-700">
                  {formatDate(selectedRequest.startDate)} –{" "}
                  {formatDate(selectedRequest.endDate)}
                </p>
              </div>

              <div>
                <label
                  htmlFor="approvalComment"
                  className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"
                >
                  <MessageSquare size={17} />
                  Comment (Optional)
                </label>

                <textarea
                  id="approvalComment"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Add a comment for this decision..."
                  disabled={!!processingId}
                  className="w-full resize-y rounded-xl border border-[#D6E2F5] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
                />

                <p className="mt-1 text-right text-xs text-slate-400">
                  {comment.length}/1000
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeDecisionModal}
                  disabled={!!processingId}
                  className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={submitDecision}
                  disabled={!!processingId}
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white transition disabled:opacity-60 ${
                    decision === "ACCEPT"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {processingId ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Processing...
                    </>
                  ) : decision === "ACCEPT" ? (
                    <>
                      <CheckCircle2 size={17} />
                      Confirm Acceptance
                    </>
                  ) : (
                    <>
                      <XCircle size={17} />
                      Confirm Decline
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =====================================================
   PAGE EXPORT
===================================================== */

export default function FirstLevelApprovalsPage() {
  return (
    <AuthGuard>
      <FirstLevelApprovalsContent />
    </AuthGuard>
  );
}