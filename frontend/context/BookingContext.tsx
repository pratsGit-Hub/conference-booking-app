"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface Booking {
  id: string;
  roomName: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description?: string;
  location: string;
  status: "UPCOMING" | "COMPLETED" | "CANCELLED";
}

interface BookingContextType {
  bookings: Booking[];
  addBooking: (
    booking: Omit<Booking, "id" | "status">
  ) => void;
  cancelBooking: (id: string) => void;
}

const BookingContext = createContext<
  BookingContextType | undefined
>(undefined);

export function BookingProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load bookings from localStorage
  useEffect(() => {
    try {
      const savedBookings = localStorage.getItem(
        "conference-bookings"
      );

      if (savedBookings) {
        const parsedBookings: Booking[] =
          JSON.parse(savedBookings);

        setBookings(parsedBookings);
      }
    } catch (error) {
      console.error(
        "Failed to load bookings:",
        error
      );
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save bookings to localStorage
  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    try {
      localStorage.setItem(
        "conference-bookings",
        JSON.stringify(bookings)
      );
    } catch (error) {
      console.error(
        "Failed to save bookings:",
        error
      );
    }
  }, [bookings, isLoaded]);

  // Add a new booking
  function addBooking(
    booking: Omit<Booking, "id" | "status">
  ) {
    const newBooking: Booking = {
      ...booking,
      id: crypto.randomUUID(),
      status: "UPCOMING",
    };

    setBookings((currentBookings) => [
      ...currentBookings,
      newBooking,
    ]);
  }

  // Cancel an existing booking
  function cancelBooking(id: string) {
    setBookings((currentBookings) =>
      currentBookings.map((booking) =>
        booking.id === id
          ? {
              ...booking,
              status: "CANCELLED",
            }
          : booking
      )
    );
  }

  return (
    <BookingContext.Provider
      value={{
        bookings,
        addBooking,
        cancelBooking,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBookings() {
  const context = useContext(BookingContext);

  if (!context) {
    throw new Error(
      "useBookings must be used inside BookingProvider"
    );
  }

  return context;
}