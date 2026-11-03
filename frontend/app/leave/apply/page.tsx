"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  FileText,
  Loader2,
  Send,
  UserRound,
  Search,
  X,
  UserCheck,
} from "lucide-react";

import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/context/AuthContext";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

/* ==========================================
   TYPES
========================================== */

type LeaveForm = {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
};

type Employee = {
  _id: string;
  name: string;
  email: string;
  department?: string;
  role?: "ADMIN" | "EMPLOYEE";
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  employees?: Employee[];
  data?: Employee[] | { employees?: Employee[] };
};

const initialForm: LeaveForm = {
  leaveType: "",
  startDate: "",
  endDate: "",
  reason: "",
};

/* ==========================================
   HELPERS
========================================== */

function getErrorMessage(
  data: unknown,
  fallback: string
): string {
  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (data && typeof data === "object") {
    const response = data as {
      message?: string;
      error?: string;
    };

    return response.message || response.error || fallback;
  }

  return fallback;
}

async function readResponse(response: Response): Promise<unknown> {
  const responseText = await response.text();

  if (!responseText) {
    return {};
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return responseText;
  }
}

function getEmployeesFromResponse(data: unknown): unknown[] {
  if (!data || typeof data !== "object") {
    return [];
  }

  const response = data as ApiResponse;

  if (Array.isArray(response.employees)) {
    return response.employees;
  }

  if (Array.isArray(response.data)) {
    return response.data;
  }

  if (
    response.data &&
    typeof response.data === "object" &&
    Array.isArray(response.data.employees)
  ) {
    return response.data.employees;
  }

  return [];
}

/**
 * Normalize and de-duplicate API results before rendering.
 *
 * Supports both MongoDB `_id` and regular `id`.
 * Uses email as a fallback identity when an ID is missing.
 */
function normalizeEmployees(items: unknown[]): Employee[] {
  const normalized: Employee[] = [];
  const seenEmails = new Set<string>();
  const seenKeys = new Set<string>();

  for (const item of items) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const candidate = item as {
      _id?: unknown;
      id?: unknown;
      name?: unknown;
      email?: unknown;
      department?: unknown;
      role?: unknown;
    };

    if (
      typeof candidate.email !== "string" ||
      !candidate.email.trim()
    ) {
      continue;
    }

    const email = candidate.email.trim();
    const normalizedEmail = email.toLowerCase();

    // Remove duplicate employees based on email.
    if (seenEmails.has(normalizedEmail)) {
      continue;
    }

    const rawId =
      typeof candidate._id === "string" && candidate._id.trim()
        ? candidate._id.trim()
        : typeof candidate.id === "string" && candidate.id.trim()
          ? candidate.id.trim()
          : "";

    // Use email if the API does not provide an ID.
    const baseKey = rawId || normalizedEmail;

    const uniqueKey = seenKeys.has(baseKey)
      ? `${baseKey}:${normalizedEmail}`
      : baseKey;

    if (seenKeys.has(uniqueKey)) {
      continue;
    }

    const name =
      typeof candidate.name === "string" &&
      candidate.name.trim()
        ? candidate.name.trim()
        : email.split("@")[0];

    normalized.push({
      _id: uniqueKey,
      name,
      email,
      department:
        typeof candidate.department === "string"
          ? candidate.department
          : undefined,
      role:
        candidate.role === "ADMIN" ||
        candidate.role === "EMPLOYEE"
          ? candidate.role
          : undefined,
    });

    seenEmails.add(normalizedEmail);
    seenKeys.add(uniqueKey);
  }

  return normalized;
}

/* ==========================================
   MAIN FORM
========================================== */

function LeaveApplyContent() {
  const router = useRouter();
  const { user } = useAuth();

  const [form, setForm] = useState<LeaveForm>(initialForm);

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // First-level approver search state.
  const [approverSearch, setApproverSearch] = useState("");
  const [approverResults, setApproverResults] = useState<Employee[]>([]);

  const [selectedApprover, setSelectedApprover] =
    useState<Employee | null>(null);

  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [showApproverResults, setShowApproverResults] =
    useState(false);

  const employee = user as
    | {
        name?: string;
        email?: string;
        department?: string;
        employeeId?: string;
      }
    | null;

  const employeeName =
    employee?.name ||
    employee?.email?.split("@")[0] ||
    "Employee";

  const department = employee?.department || "Not provided";

  /* ==========================================
     DATE VALIDATION
  ========================================== */

  const today = new Date();

  const minimumDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  useEffect(() => {
    if (
      form.startDate &&
      form.endDate &&
      form.endDate < form.startDate
    ) {
      setForm((current) => ({
        ...current,
        endDate: "",
      }));
    }
  }, [form.startDate, form.endDate]);

  /* ==========================================
     SEARCH REGISTERED EMPLOYEES
  ========================================== */

  useEffect(() => {
    const query = approverSearch.trim();

    if (selectedApprover || query.length < 2) {
      setApproverResults([]);
      setSearchLoading(false);
      setSearchError("");
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      try {
        setSearchLoading(true);
        setSearchError("");

        const response = await fetch(
          `${API_BASE_URL}/api/leaves/employees/search?q=${encodeURIComponent(query)}`,
          {
            method: "GET",
            credentials: "include",
            signal: controller.signal,
            headers: {
              Accept: "application/json",
            },
          }
        );

        const responseData = await readResponse(response);

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              responseData,
              "Unable to search employees."
            )
          );
        }

        const employees = normalizeEmployees(
          getEmployeesFromResponse(responseData)
        );

        // Exclude the currently logged-in employee.
        const filteredEmployees = employees.filter(
          (item) =>
            item.email.toLowerCase() !==
            employee?.email?.toLowerCase()
        );

        setApproverResults(filteredEmployees);
        setShowApproverResults(true);
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === "AbortError"
        ) {
          return;
        }

        setApproverResults([]);

        setSearchError(
          error instanceof Error
            ? error.message
            : "Unable to search employees."
        );
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    approverSearch,
    selectedApprover,
    employee?.email,
  ]);

  /* ==========================================
     FORM HELPERS
  ========================================== */

  function updateField<K extends keyof LeaveForm>(
    field: K,
    value: LeaveForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setErrorMessage("");
    setSuccessMessage("");
  }

  function handleApproverSearch(value: string) {
    setApproverSearch(value);
    setSelectedApprover(null);
    setApproverResults([]);
    setSearchError("");
    setShowApproverResults(true);
    setErrorMessage("");
  }

  function selectApprover(approver: Employee) {
    setSelectedApprover(approver);

    setApproverSearch(
      `${approver.name} (${approver.email})`
    );

    setApproverResults([]);
    setShowApproverResults(false);
    setSearchError("");
    setErrorMessage("");
  }

  function clearApprover() {
    setSelectedApprover(null);
    setApproverSearch("");
    setApproverResults([]);
    setShowApproverResults(false);
    setSearchError("");
  }

  function calculateLeaveDays(): number {
    if (!form.startDate || !form.endDate) {
      return 0;
    }

    const start = new Date(`${form.startDate}T00:00:00`);
    const end = new Date(`${form.endDate}T00:00:00`);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      return 0;
    }

    return (
      Math.floor(
        (end.getTime() - start.getTime()) / 86400000
      ) + 1
    );
  }

  /* ==========================================
     SUBMIT LEAVE APPLICATION
  ========================================== */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!form.leaveType) {
      setErrorMessage("Please select a leave type.");
      return;
    }

    if (!form.startDate || !form.endDate) {
      setErrorMessage(
        "Please select both the start date and end date."
      );
      return;
    }

    if (form.startDate < minimumDate) {
      setErrorMessage("The start date cannot be in the past.");
      return;
    }

    if (form.endDate < form.startDate) {
      setErrorMessage(
        "The end date cannot be before the start date."
      );
      return;
    }

    if (!form.reason.trim()) {
      setErrorMessage("Please provide a reason for your leave.");
      return;
    }

    if (form.reason.trim().length < 10) {
      setErrorMessage(
        "Please provide a reason of at least 10 characters."
      );
      return;
    }

    if (!selectedApprover) {
      setErrorMessage(
        "Please search and select a first-level approver."
      );
      return;
    }

    if (
      selectedApprover.email.toLowerCase() ===
      employee?.email?.toLowerCase()
    ) {
      setErrorMessage(
        "You cannot select yourself as your first-level approver."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/leaves`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            leaveType: form.leaveType,
            startDate: form.startDate,
            endDate: form.endDate,
            reason: form.reason.trim(),
            days: calculateLeaveDays(),

            // Required by the updated backend controller.
            firstLevelApproverEmail: selectedApprover.email,
          }),
        }
      );

      const responseData = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            responseData,
            `Unable to submit leave request (HTTP ${response.status}).`
          )
        );
      }

      setSuccessMessage(
        "Your leave request has been submitted successfully. Your selected approver will review it first."
      );

      setForm(initialForm);
      clearApprover();

      window.setTimeout(() => {
        router.push("/leave/requests");
      }, 1800);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while submitting your request."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ==========================================
     RENDER
  ========================================== */

  return (
    <div className="min-h-full w-full bg-[#EDF3FF]">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">

        {/* PAGE HEADING */}

        <div className="mb-7">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-red-500">
            Leave Services
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight text-[#172F60] sm:text-4xl">
                Apply for Leave
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Complete the form below to submit your leave request for approval.
              </p>
            </div>

            <div className="hidden shrink-0 items-center gap-2 rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm md:flex">
              <CalendarDays size={18} className="text-blue-700" />
              <span>Leave Application</span>
            </div>
          </div>
        </div>

        {/* ERROR ALERT */}

        {errorMessage && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700"
          >
            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                Unable to submit leave request
              </p>

              <p className="mt-1 break-words">
                {errorMessage}
              </p>
            </div>

            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setErrorMessage("")}
              className="shrink-0 rounded-lg px-2 py-1 font-medium hover:bg-red-100"
            >
              ×
            </button>
          </div>
        )}

        {/* SUCCESS ALERT */}

        {successMessage && (
          <div
            role="status"
            className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800"
          >
            <CheckCircle2
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-semibold">
                Request submitted
              </p>

              <p className="mt-1">
                {successMessage}
              </p>

              <p className="mt-1 text-xs text-emerald-700">
                Redirecting you to your leave requests...
              </p>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="w-full space-y-6"
        >

          {/* ======================================
              EMPLOYEE INFORMATION
          ====================================== */}

          <section className="overflow-hidden rounded-2xl border border-[#D6E2F5] bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <UserRound size={22} />
              </div>

              <div className="min-w-0">
                <h2 className="text-base font-bold text-[#172F60] sm:text-lg">
                  Employee Information
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                  Your details are taken from your logged-in account.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <div className="min-w-0">
                <label
                  htmlFor="employeeName"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Employee Name
                </label>

                <input
                  id="employeeName"
                  type="text"
                  value={employeeName}
                  readOnly
                  className="h-12 w-full rounded-xl border border-[#D6E2F5] bg-[#F4F7FC] px-4 text-sm text-slate-700 outline-none"
                />
              </div>

              <div className="min-w-0">
                <label
                  htmlFor="department"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Department
                </label>

                <input
                  id="department"
                  type="text"
                  value={department}
                  readOnly
                  className="h-12 w-full rounded-xl border border-[#D6E2F5] bg-[#F4F7FC] px-4 text-sm text-slate-700 outline-none"
                />
              </div>

              {employee?.email && (
                <div className="min-w-0 sm:col-span-2">
                  <label
                    htmlFor="employeeEmail"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Email Address
                  </label>

                  <input
                    id="employeeEmail"
                    type="email"
                    value={employee.email}
                    readOnly
                    className="h-12 w-full rounded-xl border border-[#D6E2F5] bg-[#F4F7FC] px-4 text-sm text-slate-700 outline-none"
                  />
                </div>
              )}
            </div>
          </section>

          {/* ======================================
              LEAVE DETAILS
          ====================================== */}

          <section className="overflow-hidden rounded-2xl border border-[#D6E2F5] bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <CalendarDays size={22} />
              </div>

              <div className="min-w-0">
                <h2 className="text-base font-bold text-[#172F60] sm:text-lg">
                  Leave Details
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                  Select your leave type and the dates you need off.
                </p>
              </div>
            </div>

            <div className="space-y-5 p-5 sm:p-6">

              {/* LEAVE TYPE */}

              <div className="min-w-0">
                <label
                  htmlFor="leaveType"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Leave Type <span className="text-red-500">*</span>
                </label>

                <select
                  id="leaveType"
                  name="leaveType"
                  value={form.leaveType}
                  onChange={(event) =>
                    updateField("leaveType", event.target.value)
                  }
                  required
                  className="h-12 w-full appearance-none rounded-xl border border-[#D6E2F5] bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="">Select leave type</option>
                  <option value="Annual Leave">Annual Leave</option>
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Maternity Leave">Maternity Leave</option>
                  <option value="Paternity Leave">Paternity Leave</option>
                  <option value="Unpaid Leave">Unpaid Leave</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* DATE FIELDS */}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="min-w-0">
                  <label
                    htmlFor="startDate"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Start Date <span className="text-red-500">*</span>
                  </label>

                  <input
                    id="startDate"
                    name="startDate"
                    type="date"
                    value={form.startDate}
                    min={minimumDate}
                    onChange={(event) =>
                      updateField("startDate", event.target.value)
                    }
                    required
                    className="h-12 w-full min-w-0 rounded-xl border border-[#D6E2F5] bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div className="min-w-0">
                  <label
                    htmlFor="endDate"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    End Date <span className="text-red-500">*</span>
                  </label>

                  <input
                    id="endDate"
                    name="endDate"
                    type="date"
                    value={form.endDate}
                    min={form.startDate || minimumDate}
                    onChange={(event) =>
                      updateField("endDate", event.target.value)
                    }
                    required
                    className="h-12 w-full min-w-0 rounded-xl border border-[#D6E2F5] bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* DURATION */}

              {form.startDate &&
                form.endDate &&
                calculateLeaveDays() > 0 && (
                  <div className="flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-blue-700">
                        <CalendarDays size={19} />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-[#172F60]">
                          Requested Duration
                        </p>

                        <p className="mt-1 text-xs text-slate-600">
                          Calendar days, including the start and end dates.
                        </p>
                      </div>
                    </div>

                    <p className="text-xl font-bold text-blue-800">
                      {calculateLeaveDays()}{" "}
                      <span className="text-sm font-medium">
                        {calculateLeaveDays() === 1
                          ? "day"
                          : "days"}
                      </span>
                    </p>
                  </div>
                )}

              {/* REASON */}

              <div className="min-w-0">
                <label
                  htmlFor="reason"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Reason for Leave <span className="text-red-500">*</span>
                </label>

                <textarea
                  id="reason"
                  name="reason"
                  value={form.reason}
                  onChange={(event) =>
                    updateField("reason", event.target.value)
                  }
                  required
                  minLength={10}
                  maxLength={1000}
                  rows={5}
                  placeholder="Please explain why you need leave..."
                  className="w-full resize-y rounded-xl border border-[#D6E2F5] bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />

                <div className="mt-2 flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                  <span>Please provide at least 10 characters.</span>
                  <span>{form.reason.length}/1000</span>
                </div>
              </div>
            </div>
          </section>

          {/* ======================================
              FIRST-LEVEL APPROVER
          ====================================== */}

          <section className="overflow-visible rounded-2xl border border-[#D6E2F5] bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <UserCheck size={22} />
              </div>

              <div className="min-w-0">
                <h2 className="text-base font-bold text-[#172F60] sm:text-lg">
                  First-Level Approver
                  <span className="ml-1 text-red-500">*</span>
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                  Select a registered Dangote employee to review your request first.
                </p>
              </div>
            </div>

            <div className="space-y-4 p-5 sm:p-6">
              <div className="relative">
                <label
                  htmlFor="approverSearch"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Search employee by name or email
                </label>

                <div className="relative">
                  <Search
                    size={19}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="approverSearch"
                    type="text"
                    value={approverSearch}
                    onChange={(event) =>
                      handleApproverSearch(event.target.value)
                    }
                    onFocus={() => {
                      if (
                        !selectedApprover &&
                        approverResults.length > 0
                      ) {
                        setShowApproverResults(true);
                      }
                    }}
                    autoComplete="off"
                    placeholder="Type employee name or email..."
                    className="h-12 w-full rounded-xl border border-[#D6E2F5] bg-white pl-11 pr-12 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />

                  {searchLoading && (
                    <Loader2
                      size={19}
                      className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-blue-600"
                    />
                  )}

                  {!searchLoading && approverSearch && (
                    <button
                      type="button"
                      onClick={clearApprover}
                      aria-label="Clear approver search"
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>

                {/* SEARCH HINT */}

                {!selectedApprover &&
                  approverSearch.trim().length < 2 && (
                    <p className="mt-2 text-xs text-slate-500">
                      Enter at least 2 characters to search registered employees.
                    </p>
                  )}

                {/* SEARCH ERROR */}

                {searchError && (
                  <p className="mt-2 text-sm text-red-600">
                    {searchError}
                  </p>
                )}

                {/* SEARCH RESULTS */}

                {showApproverResults &&
                  !selectedApprover &&
                  approverSearch.trim().length >= 2 && (
                    <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-64 overflow-y-auto rounded-xl border border-[#D6E2F5] bg-white shadow-xl">
                      {searchLoading ? (
                        <div className="flex items-center gap-2 px-4 py-4 text-sm text-slate-500">
                          <Loader2
                            size={17}
                            className="animate-spin"
                          />
                          Searching employees...
                        </div>
                      ) : approverResults.length > 0 ? (
                        approverResults.map((approver) => (
                          <button
                            key={approver._id}
                            type="button"
                            onClick={() =>
                              selectApprover(approver)
                            }
                            className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition last:border-0 hover:bg-blue-50"
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                              {approver.name
                                ?.charAt(0)
                                .toUpperCase() || "E"}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-[#172F60]">
                                {approver.name}
                              </p>

                              <p className="truncate text-xs text-slate-500">
                                {approver.email}
                              </p>

                              {approver.department && (
                                <p className="mt-0.5 text-xs text-slate-400">
                                  {approver.department}
                                </p>
                              )}
                            </div>

                            <UserCheck
                              size={18}
                              className="shrink-0 text-blue-600"
                            />
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-5 text-center">
                          <p className="text-sm font-medium text-slate-600">
                            No employees found.
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            Try another name or email address.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
              </div>

              {/* SELECTED APPROVER */}

              {selectedApprover && (
                <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                      {selectedApprover.name
                        ?.charAt(0)
                        .toUpperCase() || "E"}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        Selected First-Level Approver
                      </p>

                      <p className="mt-1 truncate text-sm font-bold text-emerald-900">
                        {selectedApprover.name}
                      </p>

                      <p className="truncate text-xs text-emerald-700">
                        {selectedApprover.email}
                      </p>

                      {selectedApprover.department && (
                        <p className="mt-0.5 text-xs text-emerald-600">
                          {selectedApprover.department}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={clearApprover}
                    className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
                  >
                    <X size={15} />
                    Change
                  </button>
                </div>
              )}

              <div className="rounded-lg bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">
                Your selected approver will receive the application first.
                If they accept it, the request will move to the admin for
                final approval.
              </div>
            </div>
          </section>

          {/* ======================================
              SUBMISSION INFORMATION
          ====================================== */}

          <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-white px-4 py-4 text-sm leading-6 text-slate-600">
            <FileText
              size={20}
              className="mt-0.5 shrink-0 text-blue-700"
            />

            <p>
              Your request will first be reviewed by your selected
              first-level approver. After acceptance, it will be
              forwarded to the admin for final approval. You can track
              your request from the{" "}
              <strong>My Leave Requests</strong> page.
            </p>
          </div>

          {/* ======================================
              ACTION BUTTONS
          ====================================== */}

          <div className="flex flex-col-reverse gap-3 border-t border-blue-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.push("/leave")}
              disabled={loading}
              className="inline-flex h-12 items-center justify-center rounded-xl border border-[#D6E2F5] bg-white px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading || !selectedApprover}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={17} />
                  Submit Leave Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ==========================================
   PAGE EXPORT
========================================== */

export default function LeaveApplyPage() {
  return (
    <AuthGuard>
      <LeaveApplyContent />
    </AuthGuard>
  );
}