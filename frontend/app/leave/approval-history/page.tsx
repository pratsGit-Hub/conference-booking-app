"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  XCircle,
  Loader2,
  CalendarDays,
  MessageSquare,
  History,
  ClipboardCheck,
} from "lucide-react";

import AdminGuard from "@/components/auth/AdminGuard";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

/* =====================================================
   TYPES
===================================================== */

type Person = {
  _id?: string;
  name?: string;
  email?: string;
  department?: string;
};

type ApprovalHistoryItem = {
  action: string;
  performedByName?: string;
  performedByEmail?: string;
  comment?: string;
  performedAt?: string;
};

type LeaveRequest = {
  _id: string;
  employeeId?: Person | string;
  employeeName?: string;
  employeeEmail?: string;
  department?: string;

  firstLevelApproverId?: Person | string;
  firstLevelApproverName?: string;
  firstLevelApproverEmail?: string;
  firstLevelStatus?: string;
  firstLevelComment?: string;
  firstLevelDecisionAt?: string;

  approvedBy?: Person | string;
  approvedByName?: string;
  approvedByEmail?: string;

  leaveType: string;
  startDate: string;
  endDate: string;
  days?: number;
  reason?: string;

  status: string;
  adminComment?: string;
  adminDecisionAt?: string;
  createdAt?: string;

  approvalHistory?: ApprovalHistoryItem[];
};

type Decision = "APPROVE" | "REJECT";
type Tab = "pending" | "history";

/* =====================================================
   HELPERS
===================================================== */

async function parseResponse(response: Response): Promise<any> {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function getMessage(data: any, fallback: string): string {
  return data?.message || data?.error || fallback;
}

function extractRequests(data: any): LeaveRequest[] {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.requests)) {
    return data.requests;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.data?.requests)) {
    return data.data.requests;
  }

  return [];
}

function getPersonName(
  person?: Person | string,
  fallback?: string
): string {
  if (typeof person === "string") {
    return fallback || "Not available";
  }

  return person?.name || fallback || "Not available";
}

function getPersonEmail(
  person?: Person | string,
  fallback?: string
): string {
  if (typeof person === "string") {
    return fallback || "";
  }

  return person?.email || fallback || "";
}

function formatDate(value?: string): string {
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

function formatDateTime(value?: string): string {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* =====================================================
   MAIN COMPONENT
===================================================== */

function AdminApprovalHistoryContent() {
  const [activeTab, setActiveTab] = useState<Tab>("pending");

  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>(
    []
  );

  const [historyRequests, setHistoryRequests] = useState<LeaveRequest[]>(
    []
  );

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
     FETCH ADMIN PENDING APPROVALS
  ===================================================== */

  const fetchPendingApprovals = useCallback(async () => {
    const response = await fetch(
      `${API_BASE_URL}/api/leaves/admin/approvals`,
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
        getMessage(data, "Unable to load pending approvals.")
      );
    }

    return extractRequests(data);
  }, []);

  /* =====================================================
     FETCH APPROVAL HISTORY
  ===================================================== */

  const fetchApprovalHistory = useCallback(async () => {
    const response = await fetch(
      `${API_BASE_URL}/api/leaves/admin/history`,
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
        getMessage(data, "Unable to load approval history.")
      );
    }

    return extractRequests(data);
  }, []);

  /* =====================================================
     LOAD BOTH SECTIONS
  ===================================================== */

  const fetchAllData = useCallback(
    async (showRefresh = false) => {
      try {
        setError("");

        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const [pending, history] = await Promise.all([
          fetchPendingApprovals(),
          fetchApprovalHistory(),
        ]);

        setPendingRequests(pending);
        setHistoryRequests(history);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load leave approval data."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchPendingApprovals, fetchApprovalHistory]
  );

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  /* =====================================================
     OPEN DECISION MODAL
  ===================================================== */

  function openDecision(
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
     ADMIN FINAL DECISION
  ===================================================== */

  async function submitAdminDecision() {
    if (!selectedRequest || !decision) return;

    try {
      setProcessingId(selectedRequest._id);
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_BASE_URL}/api/leaves/${selectedRequest._id}/admin-decision`,
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

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          getMessage(data, "Unable to process admin decision.")
        );
      }

      setSuccess(
        decision === "APPROVE"
          ? "Leave request has been finally approved."
          : "Leave request has been rejected by the administrator."
      );

      setSelectedRequest(null);
      setDecision(null);
      setComment("");

      // Reload both lists so the request moves into history.
      await fetchAllData(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to process admin decision."
      );
    } finally {
      setProcessingId(null);
    }
  }

  /* =====================================================
     SEARCH FILTER
  ===================================================== */

  const currentRequests =
    activeTab === "pending"
      ? pendingRequests
      : historyRequests;

  const filteredRequests = currentRequests.filter((request) => {
    const employeeName = getPersonName(
      request.employeeId,
      request.employeeName
    );

    const employeeEmail = getPersonEmail(
      request.employeeId,
      request.employeeEmail
    );

    const query = search.toLowerCase().trim();

    if (!query) return true;

    return (
      employeeName.toLowerCase().includes(query) ||
      employeeEmail.toLowerCase().includes(query) ||
      request.leaveType?.toLowerCase().includes(query) ||
      request.status?.toLowerCase().includes(query)
    );
  });

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#EDF3FF]">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            size={36}
            className="animate-spin text-blue-700"
          />
          <p className="text-sm text-slate-500">
            Loading admin leave approvals...
          </p>
        </div>
      </div>
    );
  }

  /* =====================================================
     UI
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

            <h1 className="text-3xl font-bold text-[#172F60] sm:text-4xl">
              Leave Approval Management
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Review requests accepted by first-level approvers and manage
              final leave decisions.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchAllData(true)}
            disabled={refreshing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#D6E2F5] bg-white px-4 text-sm font-semibold text-[#172F60] shadow-sm hover:bg-blue-50 disabled:opacity-60"
          >
            <RefreshCw
              size={17}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* ALERTS */}

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={20} className="shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 size={20} className="shrink-0" />
            <p>{success}</p>
          </div>
        )}

        {/* SUMMARY */}

        <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#D6E2F5] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Awaiting Final Approval
                </p>
                <p className="mt-2 text-3xl font-bold text-amber-600">
                  {pendingRequests.length}
                </p>
              </div>

              <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
                <Clock size={25} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#D6E2F5] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Approved
                </p>
                <p className="mt-2 text-3xl font-bold text-emerald-600">
                  {
                    historyRequests.filter(
                      (request) => request.status === "Approved"
                    ).length
                  }
                </p>
              </div>

              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                <CheckCircle2 size={25} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#D6E2F5] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Rejected
                </p>
                <p className="mt-2 text-3xl font-bold text-red-600">
                  {
                    historyRequests.filter(
                      (request) => request.status === "Rejected"
                    ).length
                  }
                </p>
              </div>

              <div className="rounded-xl bg-red-50 p-3 text-red-600">
                <XCircle size={25} />
              </div>
            </div>
          </div>
        </div>

        {/* TABS */}

        <div className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-[#D6E2F5] bg-white p-2 shadow-sm">
          <button
            type="button"
            onClick={() => {
              setActiveTab("pending");
              setSearch("");
            }}
            className={`inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold transition ${
              activeTab === "pending"
                ? "bg-[#173B86] text-white"
                : "text-slate-600 hover:bg-blue-50"
            }`}
          >
            <ClipboardCheck size={18} />
            Pending Final Approvals
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
              {pendingRequests.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("history");
              setSearch("");
            }}
            className={`inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold transition ${
              activeTab === "history"
                ? "bg-[#173B86] text-white"
                : "text-slate-600 hover:bg-blue-50"
            }`}
          >
            <History size={18} />
            Approval History
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
              {historyRequests.length}
            </span>
          </button>
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
              placeholder="Search employee, email, leave type or status..."
              className="h-12 w-full rounded-xl border border-[#D6E2F5] pl-11 pr-4 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* REQUEST LIST */}

        {filteredRequests.length === 0 ? (
          <div className="rounded-2xl border border-[#D6E2F5] bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-700">
              {activeTab === "pending" ? (
                <CheckCircle2 size={32} />
              ) : (
                <History size={32} />
              )}
            </div>

            <h2 className="mt-5 text-xl font-bold text-[#172F60]">
              {activeTab === "pending"
                ? "No Pending Final Approvals"
                : "No Approval History"}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {activeTab === "pending"
                ? "Leave requests accepted by their first-level approvers will appear here."
                : "Finalized leave requests will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredRequests.map((request) => {
              const employeeName = getPersonName(
                request.employeeId,
                request.employeeName
              );

              const employeeEmail = getPersonEmail(
                request.employeeId,
                request.employeeEmail
              );

              const approverName = getPersonName(
                request.firstLevelApproverId,
                request.firstLevelApproverName
              );

              const approverEmail = getPersonEmail(
                request.firstLevelApproverId,
                request.firstLevelApproverEmail
              );

              const adminName = getPersonName(
                request.approvedBy,
                request.approvedByName
              );

              const isPending = activeTab === "pending";

              return (
                <div
                  key={request._id}
                  className="overflow-hidden rounded-2xl border border-[#D6E2F5] bg-white shadow-sm"
                >
                  {/* EMPLOYEE HEADER */}

                  <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-800">
                        {employeeName.charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <h2 className="font-bold text-[#172F60]">
                          {employeeName}
                        </h2>
                        <p className="text-sm text-slate-500">
                          {employeeEmail}
                        </p>
                        {request.department && (
                          <p className="text-xs text-slate-400">
                            {request.department}
                          </p>
                        )}
                      </div>
                    </div>

                    <span
                      className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
                        isPending
                          ? "bg-amber-50 text-amber-700"
                          : request.status === "Approved"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                      }`}
                    >
                      {isPending ? (
                        <Clock size={14} />
                      ) : request.status === "Approved" ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <XCircle size={14} />
                      )}

                      {isPending
                        ? "AWAITING ADMIN DECISION"
                        : request.status.toUpperCase()}
                    </span>
                  </div>

                  {/* LEAVE DETAILS */}

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
                        First-Level Approver
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        {approverName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {approverEmail}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        First-Level Decision
                      </p>
                      <p className="mt-2 text-sm font-semibold text-emerald-700">
                        {request.firstLevelStatus || "Not available"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDateTime(request.firstLevelDecisionAt)}
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

                    {/* FIRST-LEVEL COMMENT */}

                    {request.firstLevelComment && (
                      <div className="sm:col-span-2 lg:col-span-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          First-Level Approver Comment
                        </p>
                        <p className="mt-2 rounded-xl bg-blue-50 p-4 text-sm text-slate-700">
                          {request.firstLevelComment}
                        </p>
                      </div>
                    )}

                    {/* ADMIN DECISION DETAILS */}

                    {!isPending && (
                      <>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Final Decision By
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-800">
                            {adminName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {getPersonEmail(
                              request.approvedBy,
                              request.approvedByEmail
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Final Decision Date
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-800">
                            {formatDateTime(request.adminDecisionAt)}
                          </p>
                        </div>

                        {request.adminComment && (
                          <div className="sm:col-span-2 lg:col-span-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Admin Comment
                            </p>
                            <p className="mt-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                              {request.adminComment}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* APPROVAL HISTORY */}

                  {request.approvalHistory &&
                    request.approvalHistory.length > 0 && (
                      <div className="border-t border-slate-100 px-5 py-5 sm:px-6">
                        <p className="mb-3 flex items-center gap-2 text-sm font-bold text-[#172F60]">
                          <History size={17} />
                          Approval Timeline
                        </p>

                        <div className="space-y-3">
                          {request.approvalHistory.map(
                            (item, index) => (
                              <div
                                key={`${request._id}-${item.action}-${index}`}
                                className="rounded-xl bg-slate-50 p-3"
                              >
                                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                  <p className="text-sm font-semibold text-slate-700">
                                    {item.action.replaceAll("_", " ")}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    {formatDateTime(item.performedAt)}
                                  </p>
                                </div>

                                <p className="mt-1 text-xs text-slate-500">
                                  By: {item.performedByName || "User"}
                                  {item.performedByEmail
                                    ? ` (${item.performedByEmail})`
                                    : ""}
                                </p>

                                {item.comment && (
                                  <p className="mt-2 text-sm text-slate-600">
                                    {item.comment}
                                  </p>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* ADMIN ACTIONS */}

                  {isPending && (
                    <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                      <button
                        type="button"
                        onClick={() =>
                          openDecision(request, "REJECT")
                        }
                        disabled={processingId === request._id}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        <XCircle size={18} />
                        Reject
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openDecision(request, "APPROVE")
                        }
                        disabled={processingId === request._id}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <CheckCircle2 size={18} />
                        Final Approve
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =====================================================
         ADMIN DECISION MODAL
      ===================================================== */}

      {selectedRequest && decision && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-[#172F60]">
                  {decision === "APPROVE"
                    ? "Final Leave Approval"
                    : "Reject Leave Request"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  This is the final administrator decision.
                </p>
              </div>

              <button
                type="button"
                onClick={closeDecisionModal}
                disabled={!!processingId}
                aria-label="Close modal"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
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
                  {getPersonName(
                    selectedRequest.employeeId,
                    selectedRequest.employeeName
                  )}
                </p>

                <p className="text-sm text-slate-500">
                  {getPersonEmail(
                    selectedRequest.employeeId,
                    selectedRequest.employeeEmail
                  )}
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
                  htmlFor="adminComment"
                  className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"
                >
                  <MessageSquare size={17} />
                  Admin Comment (Optional)
                </label>

                <textarea
                  id="adminComment"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={4}
                  maxLength={2000}
                  disabled={!!processingId}
                  placeholder="Enter your final decision comment..."
                  className="w-full resize-y rounded-xl border border-[#D6E2F5] px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
                />

                <p className="mt-1 text-right text-xs text-slate-400">
                  {comment.length}/2000
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeDecisionModal}
                  disabled={!!processingId}
                  className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={submitAdminDecision}
                  disabled={!!processingId}
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white disabled:opacity-60 ${
                    decision === "APPROVE"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {processingId ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Processing...
                    </>
                  ) : decision === "APPROVE" ? (
                    <>
                      <CheckCircle2 size={17} />
                      Confirm Final Approval
                    </>
                  ) : (
                    <>
                      <XCircle size={17} />
                      Confirm Rejection
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

export default function AdminApprovalHistoryPage() {
  return (
    <AdminGuard>
      <AdminApprovalHistoryContent />
    </AdminGuard>
  );
}