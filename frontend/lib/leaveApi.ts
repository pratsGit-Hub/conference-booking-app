
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001";

const LEAVE_API = `${API_BASE_URL}/api/leaves`;

/* =====================================================
   API ERROR
===================================================== */

export class LeaveApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "LeaveApiError";
    this.status = status;
  }
}

/* =====================================================
   GENERIC API REQUEST
===================================================== */

async function leaveRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${LEAVE_API}${endpoint}`, {
      ...options,
      credentials: "include",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new LeaveApiError(
      "Unable to connect to the server. Please try again.",
      0
    );
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new LeaveApiError(
      data?.message ||
        `Request failed with status ${response.status}`,
      response.status
    );
  }

  if (data?.success === false) {
    throw new LeaveApiError(
      data.message || "The request was unsuccessful.",
      response.status
    );
  }

  return data as T;
}

/* =====================================================
   EMPLOYEE APIs
===================================================== */

export const leaveApi = {
  // Retrieve logged-in employee's leave requests
  getMyRequests() {
    return leaveRequest<{
      success: boolean;
      count: number;
      counts: {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
        cancelled: number;
      };
      requests: any[];
    }>("/");
  },

  // Submit a leave request
  applyForLeave(payload: {
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
  }) {
    return leaveRequest<{
      success: boolean;
      message: string;
      request: any;
    }>("/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // Get a particular leave request
  getRequestById(id: string) {
    return leaveRequest<{
      success: boolean;
      request: any;
    }>(`/${encodeURIComponent(id)}`);
  },

  // Cancel pending leave
  cancelRequest(id: string) {
    return leaveRequest<{
      success: boolean;
      message: string;
      request: any;
    }>(`/${encodeURIComponent(id)}/cancel`, {
      method: "PATCH",
    });
  },

  // Retrieve leave balance
  getBalance(year?: number) {
    const query = year ? `?year=${year}` : "";

    return leaveRequest<{
      success: boolean;
      year: number;
      summary: {
        totalEntitlement: number;
        leaveTaken: number;
        pendingLeave: number;
        remainingBalance: number;
      };
      breakdown: any[];
    }>(`/balance${query}`);
  },

  /* ===============================================
     ADMIN APIs
  =============================================== */

  // Retrieve all employee leave requests
  getAllRequests(status?: string, page = 1, limit = 10) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    if (status && status !== "All") {
      params.set("status", status);
    }

    return leaveRequest<{
      success: boolean;
      count: number;
      total: number;
      page: number;
      pages: number;
      requests: any[];
    }>(`/admin?${params.toString()}`);
  },

  // Approve a leave request
  approveRequest(id: string, approverComment = "") {
    return leaveRequest(
      `/${encodeURIComponent(id)}/approve`,
      {
        method: "PATCH",
        body: JSON.stringify({ approverComment }),
      }
    );
  },

  // Reject a leave request
  rejectRequest(id: string, approverComment = "") {
    return leaveRequest(
      `/${encodeURIComponent(id)}/reject`,
      {
        method: "PATCH",
        body: JSON.stringify({ approverComment }),
      }
    );
  },
};
