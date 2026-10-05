"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001";

/* =====================================================
   TYPES
===================================================== */

export interface Booking {
  id: string;
  roomName: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description?: string;
  location: string;
  status:
    | "UPCOMING"
    | "COMPLETED"
    | "CANCELLED";
}

interface BookingContextType {
  bookings: Booking[];
  refreshBookings: () => Promise<void>;
  isLoading: boolean;
  error: string;
}

/* =====================================================
   CONTEXT
===================================================== */

const BookingContext = createContext<
  BookingContextType | undefined
>(undefined);

/* =====================================================
   PROVIDER
===================================================== */

export function BookingProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [bookings, setBookings] = useState<
    Booking[]
  >([]);

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] = useState("");

  /* ===================================================
     FETCH MY BOOKINGS
  =================================================== */

  async function refreshBookings() {
    try {
      setIsLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/bookings/my`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      let result: any = null;

      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok) {
        throw new Error(
          result?.message ||
            "Unable to load bookings"
        );
      }

      /*
       * Convert backend booking objects into
       * the frontend Booking structure.
       *
       * Backend remains the source of truth.
       */
      const formattedBookings: Booking[] = (
        result?.bookings || []
      ).map((booking: any) => ({
        id: booking._id,

        roomName:
          booking.room?.name ||
          "Conference Room",

        title:
          booking.title || "",

        date:
          booking.date || "",

        startTime:
          booking.startTime || "",

        endTime:
          booking.endTime || "",

        description:
          booking.description || "",

        location:
          booking.room?.location ||
          "Main Office",

        status:
          booking.status ||
          "UPCOMING",
      }));

      setBookings(formattedBookings);
    } catch (error) {
      console.error(
        "Fetch bookings error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load bookings"
      );
    } finally {
      setIsLoading(false);
    }
  }

  /* ===================================================
     PROVIDER
  =================================================== */

  return (
    <BookingContext.Provider
      value={{
        bookings,
        refreshBookings,
        isLoading,
        error,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

/* =====================================================
   USE BOOKINGS HOOK
===================================================== */

export function useBookings() {
  const context = useContext(
    BookingContext
  );

  if (!context) {
    throw new Error(
      "useBookings must be used inside BookingProvider"
    );
  }

  return context;
}