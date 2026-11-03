"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  XCircle,
  CalendarDays,
  UserRound,
  History,
  GitBranch,
  Loader2,
  FileText,
  ShieldCheck,
  CircleDot,
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
  performedBy?: string | Person;
  performedById?: string;
  performedByName?: string;
  performedByEmail?: string;
  comment?: string;
  performedAt?: string;
};

type LeaveRequest = {
  _id: string;

  employeeId?: string | Person;
  employee?: Person;
  applicant?: Person;
  employeeName?: string;
  employeeEmail?: string;
  department?: string;

  leaveType: string;
  startDate: string;
  endDate: string;
  days?: number;
  reason?: string;

  status: string;

  firstLevelApproverId?: string | Person;
  firstLevelApproverName?: string;
  firstLevelApproverEmail?: string;
  firstLevelStatus?: string;
  firstLevelComment?: string;
  firstLevelDecisionAt?: string;

  approvedBy?: string | Person;
  approvedByName?: string;
  approvedByEmail?: string;
  adminComment?: string;
  adminDecisionAt?: string;

  approvalHistory?: ApprovalHistoryItem[];

  createdAt?: string;
  updatedAt?: string;
};

type TrackingResponse = {
  requests: LeaveRequest[];
  total: number;
};

/* =====================================================
   API HELPERS
===================================================== */

async function parseResponse(response: Response): Promise<any> {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function getErrorMessage(
  data: any,
  fallback: string
): string {
  return (
    data?.message ||
    data?.error ||
    fallback
  );
}

function extractRequests(data: any): LeaveRequest[] {
  if (Array.isArray(data)) {
    return data;
  }

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

/* =====================================================
   DISPLAY HELPERS
===================================================== */

function getPerson(
  value?: string | Person,
  fallbackName?: string,
  fallbackEmail?: string
): Person {
  if (value && typeof value === "object") {
    return {
      ...value,
      name: value.name || fallbackName,
      email: value.email || fallbackEmail,
    };
  }

  return {
    name: fallbackName,
    email: fallbackEmail,
  };
}

function getEmployee(request: LeaveRequest): Person {
  if (request.employee && typeof request.employee === "object") {
    return request.employee;
  }

  if (request.applicant && typeof request.applicant === "object") {
    return request.applicant;
  }

  return getPerson(
    request.employeeId,
    request.employeeName,
    request.employeeEmail
  );
}

function getFirstLevelApprover(
  request: LeaveRequest
): Person {
  return getPerson(
    request.firstLevelApproverId,
    request.firstLevelApproverName,
    request.firstLevelApproverEmail
  );
}

function getAdmin(request: LeaveRequest): Person {
  return getPerson(
    request.approvedBy,
    request.approvedByName,
    request.approvedByEmail
  );
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

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    SUBMITTED: "Leave Request Submitted",
    FIRST_LEVEL_ACCEPTED: "First-Level Approver Accepted",
    FIRST_LEVEL_DECLINED: "First-Level Approver Declined",
    ADMIN_APPROVED: "Admin Finally Approved",
    ADMIN_REJECTED: "Admin Rejected",
    CANCELLED: "Leave Request Cancelled",
  };

  return (
    labels[action] ||
    action.replaceAll("_", " ")
  );
}

function getStatusColor(status?: string) {
  switch (status?.toLowerCase()) {
    case "approved":
    case "accepted":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "rejected":
    case "declined":
      return "bg-red-50 text-red-700 border-red-200";

    case "pending":
      return "bg-amber-50 text-amber-700 border-amber-200";

    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function getTimelineIcon(action: string) {
  if (
    action === "FIRST_LEVEL_ACCEPTED" ||
    action === "ADMIN_APPROVED"
  ) {
    return CheckCircle2;
  }

  if (
    action === "FIRST_LEVEL_DECLINED" ||
    action === "ADMIN_REJECTED"
  ) {
    return XCircle;
  }

  if (action === "SUBMITTED") {
    return FileText;
  }

  return CircleDot;
}

/* =====================================================
   TRACKING TIMELINE
===================================================== */

function ApprovalTimeline({
  request,
}: {
  request: LeaveRequest;
}) {
  const history = request.approvalHistory || [];

  const employee = getEmployee(request);
  const approver = getFirstLevelApprover(request);
  const admin = getAdmin(request);

  const firstLevelAccepted =
    request.firstLevelStatus?.toLowerCase() === "accepted";

  const firstLevelDeclined =
    request.firstLevelStatus?.toLowerCase() === "declined";

  const adminApproved =
    request.status?.toLowerCase() === "approved";

  const adminRejected =
    request.status?.toLowerCase() === "rejected";

  const adminDecisionMade =
    adminApproved || adminRejected;

  const hasFirstLevelDecision =
    firstLevelAccepted || firstLevelDeclined;

  return (
    <div className="rounded-xl border border-[#D6E2F5] bg-white p-5 sm:p-6">

      <h3 className="mb-6 flex items-center gap-2 text-base font-bold text-[#172F60]">
        <GitBranch size={19} />
        Approval Workflow
      </h3>

      <div className="space-y-0">

        {/* STEP 1: SUBMITTED */}

        <div className="relative flex gap-4 pb-7">
          <div className="relative flex flex-col items-center">
            <div className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <FileText size={19} />
            </div>

            <div className="absolute top-10 h-full w-0.5 bg-blue-200" />
          </div>

          <div className="min-w-0 flex-1 pb-2">
            <p className="font-semibold text-[#172F60]">
              Leave Request Submitted
            </p>

            <p className="mt-1 text-sm text-slate-600">
              {employee.name || "Employee"}
            </p>

            <p className="text-xs text-slate-400">
              {employee.email || ""}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              {formatDateTime(request.createdAt)}
            </p>

            <span className="mt-2 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              SUBMITTED
            </span>
          </div>
        </div>

        {/* STEP 2: FIRST-LEVEL APPROVAL */}

        <div className="relative flex gap-4 pb-7">
          <div className="relative flex flex-col items-center">
            <div
              className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                firstLevelAccepted
                  ? "bg-emerald-100 text-emerald-700"
                  : firstLevelDeclined
                    ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-700"
              }`}
            >
              {firstLevelAccepted ? (
                <CheckCircle2 size={19} />
              ) : firstLevelDeclined ? (
                <XCircle size={19} />
              ) : (
                <Clock size={19} />
              )}
            </div>

            <div className="absolute top-10 h-full w-0.5 bg-slate-200" />
          </div>

          <div className="min-w-0 flex-1 pb-2">
            <p className="font-semibold text-[#172F60]">
              First-Level Approval
            </p>

            <p className="mt-1 text-sm text-slate-600">
              {approver.name || request.firstLevelApproverName || "Approver not available"}
            </p>

            <p className="text-xs text-slate-400">
              {approver.email || ""}
            </p>

            <span
              className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusColor(
                request.firstLevelStatus
              )}`}
            >
              {request.firstLevelStatus || "PENDING"}
            </span>

            {request.firstLevelDecisionAt && (
              <p className="mt-2 text-xs text-slate-500">
                Decision date: {formatDateTime(request.firstLevelDecisionAt)}
              </p>
            )}

            {request.firstLevelComment && (
              <div className="mt-3 rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-500">
                  Approver Comment
                </p>

                <p className="mt-1 text-sm text-slate-700">
                  {request.firstLevelComment}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* STEP 3: ADMIN FINAL APPROVAL */}

        <div className="relative flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                adminApproved
                  ? "bg-emerald-100 text-emerald-700"
                  : adminRejected
                    ? "bg-red-100 text-red-700"
                    : firstLevelAccepted
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-400"
              }`}
            >
              {adminApproved ? (
                <CheckCircle2 size={19} />
              ) : adminRejected ? (
                <XCircle size={19} />
              ) : (
                <ShieldCheck size={19} />
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[#172F60]">
              Admin Final Decision
            </p>

            <p className="mt-1 text-sm text-slate-600">
              {admin.name || "Administrator"}
            </p>

            {admin.email && (
              <p className="text-xs text-slate-400">
                {admin.email}
              </p>
            )}

            <span
              className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                adminDecisionMade
                  ? getStatusColor(request.status)
                  : firstLevelAccepted
                    ? getStatusColor("Pending")
                    : "border-slate-200 bg-slate-50 text-slate-500"
              }`}
            >
              {adminDecisionMade
                ? request.status
                : firstLevelAccepted
                  ? "AWAITING ADMIN"
                  : "NOT REACHED"}
            </span>

            {request.adminDecisionAt && (
              <p className="mt-2 text-xs text-slate-500">
                Decision date: {formatDateTime(request.adminDecisionAt)}
              </p>
            )}

            {request.adminComment && (
              <div className="mt-3 rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-500">
                  Admin Comment
                </p>

                <p className="mt-1 text-sm text-slate-700">
                  {request.adminComment}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DATABASE APPROVAL HISTORY */}

      {history.length > 0 && (
        <div className="mt-8 border-t border-slate-100 pt-6">
          <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#172F60]">
            <History size={17} />
            Recorded Activity
          </h4>

          <div className="space-y-3">
            {history.map((item, index) => {
              const Icon = getTimelineIcon(item.action);

              const actor =
                typeof item.performedBy === "object"
                  ? item.performedBy
                  : undefined;

              const actorName =
                item.performedByName ||
                actor?.name ||
                "User";

              const actorEmail =
                item.performedByEmail ||
                actor?.email ||
                "";

              return (
                <div
                  key={`${request._id}-history-${index}`}
                  className="flex gap-3 rounded-xl bg-slate-50 p-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-blue-700">
                    <Icon size={17} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">
                      {getActionLabel(item.action)}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      By {actorName}
                      {actorEmail ? ` (${actorEmail})` : ""}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {formatDateTime(item.performedAt)}
                    </p>

                    {item.comment && (
                      <p className="mt-2 text-sm text-slate-600">
                        {item.comment}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* =====================================================
   TRACKING CARD
===================================================== */

function TrackingCard({
  request,
  onToggle,
  expanded,
}: {
  request: LeaveRequest;
  onToggle: () => void;
  expanded: boolean;
}) {
  const employee = getEmployee(request);
  const approver = getFirstLevelApprover(request);

  const firstLevelAccepted =
    request.firstLevelStatus?.toLowerCase() === "accepted";

  const firstLevelDeclined =
    request.firstLevelStatus?.toLowerCase() === "declined";

  const statusColor = getStatusColor(request.status);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#D6E2F5] bg-white shadow-sm">

      {/* CARD HEADER */}

      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-800">
            {employee.name?.charAt(0).toUpperCase() || "E"}
          </div>

          <div className="min-w-0">
            <h3 className="truncate font-bold text-[#172F60]">
              {employee.name || "Employee"}
            </h3>

            <p className="truncate text-sm text-slate-500">
              {employee.email || "Email not available"}
            </p>

            {employee.department && (
              <p className="mt-1 text-xs text-slate-400">
                {employee.department}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-bold ${statusColor}`}
          >
            {request.status || "Unknown"}
          </span>

          <button
            type="button"
            onClick={onToggle}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#D6E2F5] bg-white px-3 text-xs font-semibold text-[#173B86] hover:bg-blue-50"
          >
            {expanded ? "Hide Timeline" : "View Timeline"}
            <ArrowRight
              size={15}
              className={expanded ? "rotate-90" : ""}
            />
          </button>
        </div>
      </div>

      {/* REQUEST DETAILS */}

      <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Leave Type
          </p>

          <p className="mt-2 text-sm font-semibold text-slate-800">
            {request.leaveType || "Not available"}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Leave Duration
          </p>

          <p className="mt-2 text-sm font-semibold text-slate-800">
            {request.days ?? "—"}{" "}
            {request.days === 1 ? "day" : "days"}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Start Date
          </p>

          <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <CalendarDays size={15} className="text-blue-600" />
            {formatDate(request.startDate)}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            End Date
          </p>

          <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <CalendarDays size={15} className="text-blue-600" />
            {formatDate(request.endDate)}
          </p>
        </div>

        {/* FIRST-LEVEL APPROVER */}

        <div className="sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Selected First-Level Approver
          </p>

          <p className="mt-2 text-sm font-semibold text-slate-800">
            {approver.name || request.firstLevelApproverName || "Not available"}
          </p>

          <p className="text-xs text-slate-500">
            {approver.email || request.firstLevelApproverEmail || ""}
          </p>
        </div>

        {/* FIRST-LEVEL STATUS */}

        <div className="sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            First-Level Decision
          </p>

          <span
            className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusColor(
              request.firstLevelStatus
            )}`}
          >
            {request.firstLevelStatus || "Pending"}
          </span>

          {request.firstLevelDecisionAt && (
            <p className="mt-1 text-xs text-slate-400">
              {formatDateTime(request.firstLevelDecisionAt)}
            </p>
          )}
        </div>

        {/* REASON */}

        <div className="sm:col-span-2 lg:col-span-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Leave Reason
          </p>

          <p className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {request.reason || "No reason provided."}
          </p>
        </div>

        {/* QUICK WORKFLOW STATUS */}

        <div className="sm:col-span-2 lg:col-span-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                request.createdAt
                  ? "bg-blue-50 text-blue-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              Submitted
            </span>

            <ArrowRight size={15} className="text-slate-400" />

            <span
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                firstLevelAccepted
                  ? "bg-emerald-50 text-emerald-700"
                  : firstLevelDeclined
                    ? "bg-red-50 text-red-700"
                    : "bg-amber-50 text-amber-700"
              }`}
            >
              {firstLevelAccepted
                ? "First-Level Accepted"
                : firstLevelDeclined
                  ? "First-Level Declined"
                  : "First-Level Pending"}
            </span>

            <ArrowRight size={15} className="text-slate-400" />

            <span
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                request.status === "Approved"
                  ? "bg-emerald-50 text-emerald-700"
                  : request.status === "Rejected"
                    ? "bg-red-50 text-red-700"
                    : firstLevelAccepted
                      ? "bg-amber-50 text-amber-700"
                      : "bg-slate-100 text-slate-500"
              }`}
            >
              {request.status === "Approved"
                ? "Admin Approved"
                : request.status === "Rejected"
                  ? "Admin Rejected"
                  : firstLevelAccepted
                    ? "Awaiting Admin"
                    : "Admin Not Reached"}
            </span>
          </div>
        </div>
      </div>

      {/* EXPANDED TIMELINE */}

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/60 p-4 sm:p-6">
          <ApprovalTimeline request={request} />
        </div>
      )}
    </div>
  );
}

/* =====================================================
   MAIN PAGE
===================================================== */

function AdminTrackingContent() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("ALL");

  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set()
  );

  /* =====================================================
     FETCH TRACKING DATA
  ===================================================== */

  const fetchTracking = useCallback(
    async (showRefresh = false) => {
      try {
        setError("");

        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response = await fetch(
          `${API_BASE_URL}/api/leaves/admin/tracking`,
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
            getErrorMessage(
              data,
              "Unable to load leave approval tracking."
            )
          );
        }

        setRequests(extractRequests(data));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load tracking information."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchTracking();
  }, [fetchTracking]);

  /* =====================================================
     TOGGLE TIMELINE
  ===================================================== */

  function toggleTimeline(id: string) {
    setExpandedIds((current) => {
      const updated = new Set(current);

      if (updated.has(id)) {
        updated.delete(id);
      } else {
        updated.add(id);
      }

      return updated;
    });
  }

  /* =====================================================
     FILTER DATA
  ===================================================== */

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const employee = getEmployee(request);
      const approver = getFirstLevelApprover(request);

      const query = search.toLowerCase().trim();

      const matchesSearch =
        !query ||
        employee.name?.toLowerCase().includes(query) ||
        employee.email?.toLowerCase().includes(query) ||
        approver.name?.toLowerCase().includes(query) ||
        approver.email?.toLowerCase().includes(query) ||
        request.leaveType?.toLowerCase().includes(query) ||
        request._id.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "ALL" ||
        request.status?.toUpperCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [requests, search, statusFilter]);

  /* =====================================================
     SUMMARY COUNTS
  ===================================================== */

  const summary = useMemo(() => {
    return {
      total: requests.length,

      pending: requests.filter(
        (request) => request.status?.toLowerCase() === "pending"
      ).length,

      approved: requests.filter(
        (request) => request.status?.toLowerCase() === "approved"
      ).length,

      rejected: requests.filter(
        (request) => request.status?.toLowerCase() === "rejected"
      ).length,

      firstLevelPending: requests.filter(
        (request) =>
          request.firstLevelStatus?.toLowerCase() === "pending"
      ).length,

      awaitingAdmin: requests.filter(
        (request) =>
          request.firstLevelStatus?.toLowerCase() === "accepted" &&
          request.status?.toLowerCase() === "pending"
      ).length,
    };
  }, [requests]);

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
            Loading approval tracking...
          </p>
        </div>
      </div>
    );
  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="min-h-screen bg-[#EDF3FF]">
      <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8">

        {/* PAGE HEADER */}

        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-red-500">
              Administrator Panel
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-[#172F60] sm:text-4xl">
              Approval Tracking
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Track every leave request from submission through
              first-level review to the final administrator decision.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchTracking(true)}
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

        {/* SUMMARY CARDS */}

        <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-2xl border border-[#D6E2F5] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Requests
                </p>

                <p className="mt-2 text-3xl font-bold text-[#172F60]">
                  {summary.total}
                </p>
              </div>

              <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                <FileText size={25} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#D6E2F5] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  First-Level Pending
                </p>

                <p className="mt-2 text-3xl font-bold text-amber-600">
                  {summary.firstLevelPending}
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
                <p className="text-sm font-medium text-slate-500">
                  Awaiting Admin
                </p>

                <p className="mt-2 text-3xl font-bold text-orange-600">
                  {summary.awaitingAdmin}
                </p>
              </div>

              <div className="rounded-xl bg-orange-50 p-3 text-orange-600">
                <ShieldCheck size={25} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#D6E2F5] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Finally Approved
                </p>

                <p className="mt-2 text-3xl font-bold text-emerald-600">
                  {summary.approved}
                </p>
              </div>

              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                <CheckCircle2 size={25} />
              </div>
            </div>
          </div>
        </div>

        {/* EXTRA STATUS SUMMARY */}

        <div className="mb-6 flex flex-wrap gap-3">
          <div className="rounded-xl border border-[#D6E2F5] bg-white px-4 py-3 text-sm">
            <span className="text-slate-500">
              Rejected:{" "}
            </span>

            <span className="font-bold text-red-600">
              {summary.rejected}
            </span>
          </div>

          <div className="rounded-xl border border-[#D6E2F5] bg-white px-4 py-3 text-sm">
            <span className="text-slate-500">
              Overall Pending:{" "}
            </span>

            <span className="font-bold text-amber-600">
              {summary.pending}
            </span>
          </div>
        </div>

        {/* SEARCH AND FILTER */}

        <div className="mb-6 rounded-2xl border border-[#D6E2F5] bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">

            <div className="relative">
              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search employee, approver, email or leave type..."
                className="h-12 w-full rounded-xl border border-[#D6E2F5] bg-white pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-12 w-full rounded-xl border border-[#D6E2F5] bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {/* REQUEST COUNT */}

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#172F60]">
            Leave Request Records
          </h2>

          <span className="text-sm text-slate-500">
            {filteredRequests.length} record(s)
          </span>
        </div>

        {/* TRACKING LIST */}

        {filteredRequests.length === 0 ? (
          <div className="rounded-2xl border border-[#D6E2F5] bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-700">
              <GitBranch size={32} />
            </div>

            <h2 className="mt-5 text-xl font-bold text-[#172F60]">
              No Tracking Records Found
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              No leave requests match your search or selected status.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredRequests.map((request) => (
              <TrackingCard
                key={request._id}
                request={request}
                expanded={expandedIds.has(request._id)}
                onToggle={() => toggleTimeline(request._id)}
              />
            ))}
          </div>
        )}

        {/* FOOTER */}

        <div className="mt-8 flex items-start gap-3 rounded-xl border border-blue-100 bg-white p-4 text-sm leading-6 text-slate-600">
          <History
            size={20}
            className="mt-0.5 shrink-0 text-blue-700"
          />

          <p>
            Approval tracking displays the workflow information returned
            by your backend. Each request's timeline is based on its
            recorded approval history, first-level decision and final
            administrator decision.
          </p>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   PAGE EXPORT
===================================================== */

export default function AdminTrackingPage() {
  return (
    <AdminGuard>
      <AdminTrackingContent />
    </AdminGuard>
  );
}