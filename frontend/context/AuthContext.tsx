"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// =====================================================
// API CONFIGURATION
// =====================================================

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

// =====================================================
// AUTH USER TYPE
// =====================================================

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  department?: string;

  role: "ADMIN" | "EMPLOYEE";

  profileImage?: string;

  defaultLocation?: string;
  favoriteRoom?: string;

  defaultDuration: number;

  calendarView: "DAY" | "WEEK" | "MONTH";

  timezone: string;

  notifications: {
    bookingConfirmation: boolean;
    bookingCancellation: boolean;
    bookingReminder: boolean;
    roomAvailable: boolean;
  };

  workingHours: {
    [day: string]: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
}

// =====================================================
// AUTH CONTEXT TYPE
// =====================================================

interface AuthContextType {
  user: AuthUser | null;

  isLoading: boolean;

  isAuthenticated: boolean;

  refreshUser: () => Promise<void>;

  logout: () => Promise<void>;
}

// =====================================================
// CREATE CONTEXT
// =====================================================

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

// =====================================================
// HELPER: SLEEP
// =====================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// =====================================================
// PROVIDER
// =====================================================

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  // =====================================================
  // GET CURRENT AUTHENTICATED USER
  // =====================================================

  const refreshUser = useCallback(async (): Promise<void> => {
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();

      const timeout = setTimeout(() => {
        controller.abort();
      }, 8000);

      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          method: "GET",

          credentials: "include",

          cache: "no-store",

          signal: controller.signal,

          headers: {
            "Content-Type": "application/json",
          },
        });

        clearTimeout(timeout);

        // -------------------------------------------------
        // USER NOT AUTHENTICATED
        // -------------------------------------------------

        if (response.status === 401) {
          setUser(null);
          return;
        }

        // -------------------------------------------------
        // OTHER HTTP ERRORS
        // -------------------------------------------------

        if (!response.ok) {
          console.warn(
            `Authentication check returned HTTP ${response.status}.`
          );

          setUser(null);
          return;
        }

        // -------------------------------------------------
        // PARSE RESPONSE
        // -------------------------------------------------

        const data = await response.json();

        // -------------------------------------------------
        // VALIDATE USER RESPONSE
        // -------------------------------------------------

        if (
          data?.success &&
          data?.user &&
          (data.user.role === "ADMIN" ||
            data.user.role === "EMPLOYEE")
        ) {
          setUser(data.user as AuthUser);
        } else {
          console.warn(
            "Authentication response did not contain a valid user."
          );

          setUser(null);
        }

        return;
      } catch (error) {
        clearTimeout(timeout);

        // -------------------------------------------------
        // RETRY TEMPORARY CONNECTION FAILURE
        // -------------------------------------------------

        if (attempt < maxAttempts) {
          await sleep(500);
          continue;
        }

        // -------------------------------------------------
        // HANDLE TIMEOUT
        // -------------------------------------------------

        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          console.warn("Authentication check timed out.");
        } else {
          console.warn(
            "Authentication check could not reach the backend.",
            error
          );
        }

        setUser(null);
      } finally {
        clearTimeout(timeout);
      }
    }
  }, []);

  // =====================================================
  // INITIAL AUTHENTICATION CHECK
  // =====================================================

  useEffect(() => {
    let mounted = true;

    async function checkAuthentication() {
      try {
        await refreshUser();
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    checkAuthentication();

    return () => {
      mounted = false;
    };
  }, [refreshUser]);

  // =====================================================
  // LOGOUT
  // =====================================================

  const logout = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",

        credentials: "include",

        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok && response.status !== 401) {
        console.warn(
          `Logout request returned HTTP ${response.status}.`
        );
      }
    } catch (error) {
      console.warn(
        "Logout request could not reach the backend.",
        error
      );
    } finally {
      setUser(null);

      window.location.replace("/login");
    }
  }, []);

  // =====================================================
  // CONTEXT PROVIDER
  // =====================================================

  return (
    <AuthContext.Provider
      value={{
        user,

        isLoading,

        isAuthenticated: Boolean(user),

        refreshUser,

        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// =====================================================
// AUTH HOOK
// =====================================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}