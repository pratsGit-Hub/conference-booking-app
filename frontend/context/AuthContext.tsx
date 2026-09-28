"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

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

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext =
  createContext<AuthContextType | undefined>(
    undefined
  );

/* =====================================================
   HELPER
===================================================== */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

/* =====================================================
   PROVIDER
===================================================== */

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] =
    useState<AuthUser | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  /* =====================================================
     GET CURRENT USER
  ===================================================== */

  async function refreshUser() {
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();

      const timeout = setTimeout(() => {
        controller.abort();
      }, 8000);

      try {
        const response = await fetch(
          `${API_URL}/api/auth/me`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        clearTimeout(timeout);

        /*
         * 401 is normal when there is no logged-in user.
         * It should NOT be treated as a fetch error.
         */
        if (response.status === 401) {
          setUser(null);
          return;
        }

        /*
         * Other HTTP errors
         */
        if (!response.ok) {
          setUser(null);

          console.warn(
            `Authentication check returned HTTP ${response.status}.`
          );

          return;
        }

        const data = await response.json();

        if (data?.success && data?.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }

        return;
      } catch (error) {
        clearTimeout(timeout);

        /*
         * Retry once if the browser temporarily
         * cannot reach the backend.
         */
        if (attempt < maxAttempts) {
          await sleep(500);
          continue;
        }

        /*
         * AbortError means our request timed out.
         */
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          console.warn(
            "Authentication check timed out."
          );
        } else {
          console.warn(
            "Authentication check could not reach the server."
          );
        }

        /*
         * Do not crash the application.
         * Treat the user as logged out until the next
         * successful authentication check.
         */
        setUser(null);
      }
    }
  }

  /* =====================================================
     INITIAL AUTH CHECK
  ===================================================== */

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
  }, []);

  /* =====================================================
     LOGOUT
  ===================================================== */

  async function logout() {
    try {
      const response = await fetch(
        `${API_URL}/api/auth/logout`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!response.ok && response.status !== 401) {
        console.warn(
          `Logout request returned HTTP ${response.status}.`
        );
      }
    } catch (error) {
      console.warn(
        "Logout request could not reach the server.",
        error
      );
    } finally {
      setUser(null);
      window.location.href = "/login";
    }
  }

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

/* =====================================================
   AUTH HOOK
===================================================== */

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}