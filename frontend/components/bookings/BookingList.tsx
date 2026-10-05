"use client";

import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  RefreshCw,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

interface Room {
  _id: string;
  name: string;
  capacity: number;
  location: string;
  facilities: string[];
}

interface Booking {
  _id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description?: string;
  status: "UPCOMING" | "COMPLETED" | "CANCELLED";
  room: Room;
}

export default function BookingList() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingToCancel, setBookingToCancel] =
    useState<Booking | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState("");

  /* =====================================================
     FETCH MY BOOKINGS
  ===================================================== */

  async function fetchBookings() {
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

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to load bookings"
        );
      }

      setBookings(result.bookings || []);
    } catch (error) {
      console.error("Fetch bookings error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load your bookings"
      );
    } finally {
      setIsLoading(false);
    }
  }

  /* =====================================================
     LOAD BOOKINGS
  ===================================================== */

  useEffect(() => {
    fetchBookings();
  }, []);

  /* =====================================================
     GROUP BOOKINGS BY STATUS
  ===================================================== */

  const upcomingBookings = useMemo(
    () =>
      bookings.filter(
        (booking) => booking.status === "UPCOMING"
      ),
    [bookings]
  );

  const completedBookings = useMemo(
    () =>
      bookings.filter(
        (booking) => booking.status === "COMPLETED"
      ),
    [bookings]
  );

  const cancelledBookings = useMemo(
    () =>
      bookings.filter(
        (booking) => booking.status === "CANCELLED"
      ),
    [bookings]
  );

  /* =====================================================
     CANCEL BOOKING
  ===================================================== */

  async function confirmCancellation() {
    if (!bookingToCancel) {
      return;
    }

    try {
      setIsCancelling(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/bookings/${bookingToCancel._id}/cancel`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to cancel booking"
        );
      }

      /*
        Update the booking locally so the UI changes
        immediately without requiring a full page refresh.
      */
      setBookings((currentBookings) =>
        currentBookings.map((booking) =>
          booking._id === bookingToCancel._id
            ? {
                ...booking,
                status: "CANCELLED",
              }
            : booking
        )
      );

      setBookingToCancel(null);
    } catch (error) {
      console.error("Cancel booking error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to cancel booking"
      );
    } finally {
      setIsCancelling(false);
    }
  }

  /* =====================================================
     FORMAT DATE
  ===================================================== */

  function formatBookingDate(date: string) {
    try {
      return format(
        parseISO(date),
        "EEEE, MMMM d, yyyy"
      );
    } catch {
      return date;
    }
  }

  /* =====================================================
     FORMAT TIME
  ===================================================== */

  function formatBookingTime(time: string) {
    try {
      const [hours, minutes] = time
        .split(":")
        .map(Number);

      const timeDate = new Date();

      timeDate.setHours(
        hours,
        minutes,
        0,
        0
      );

      return format(
        timeDate,
        "h:mm a"
      );
    } catch {
      return time;
    }
  }

  /* =====================================================
     STATUS STYLE
  ===================================================== */

  function getStatusStyle(
    status: Booking["status"]
  ) {
    switch (status) {
      case "UPCOMING":
        return "border border-emerald-200 bg-emerald-50 text-emerald-700";

      case "CANCELLED":
        return "border border-red-200 bg-red-50 text-red-600";

      case "COMPLETED":
        return "border border-slate-200 bg-slate-100 text-slate-600";

      default:
        return "border border-slate-200 bg-slate-100 text-slate-600";
    }
  }

  /* =====================================================
     BOOKING CARD
  ===================================================== */

  function BookingCard({
    booking,
  }: {
    booking: Booking;
  }) {
    return (
      <div className="overflow-hidden rounded-2xl border border-[#D5E2F7] bg-white shadow-sm transition hover:border-[#B8CCEC] hover:shadow-md">
        {/* Top accent */}
        <div
          className={`h-1 ${
            booking.status === "UPCOMING"
              ? "bg-[#102D72]"
              : booking.status === "COMPLETED"
              ? "bg-slate-400"
              : "bg-[#E83B32]"
          }`}
        />

        <div className="p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            {/* BOOKING INFORMATION */}
            <div className="min-w-0">
              {/* Title + Status */}
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold text-[#10275F]">
                  {booking.title}
                </h2>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyle(
                    booking.status
                  )}`}
                >
                  {booking.status}
                </span>
              </div>

              {/* Room */}
              <p className="font-semibold text-[#1D55B8]">
                {booking.room?.name ||
                  "Conference Room"}
              </p>

              {/* Date / Time / Location */}
              <div className="mt-4 flex flex-col gap-3 text-sm text-[#64748B] sm:flex-row sm:flex-wrap sm:gap-6">
                <span className="flex items-center gap-2">
                  <CalendarDays
                    size={16}
                    className="shrink-0 text-[#1D55B8]"
                  />

                  {formatBookingDate(
                    booking.date
                  )}
                </span>

                <span className="flex items-center gap-2">
                  <Clock
                    size={16}
                    className="shrink-0 text-[#1D55B8]"
                  />

                  {formatBookingTime(
                    booking.startTime
                  )}

                  {" - "}

                  {formatBookingTime(
                    booking.endTime
                  )}
                </span>

                <span className="flex items-center gap-2">
                  <MapPin
                    size={16}
                    className="shrink-0 text-[#1D55B8]"
                  />

                  {booking.room?.location ||
                    "Main Office"}
                </span>
              </div>

              {/* Description */}
              {booking.description && (
                <p className="mt-4 max-w-2xl text-sm leading-6 text-[#64748B]">
                  {booking.description}
                </p>
              )}
            </div>

            {/* STATUS / CANCEL BUTTON */}
            <div className="shrink-0">
              {booking.status === "UPCOMING" && (
                <button
                  type="button"
                  onClick={() =>
                    setBookingToCancel(booking)
                  }
                  className="rounded-xl border border-red-200 px-5 py-3 text-sm font-bold text-[#E83B32] transition hover:border-red-300 hover:bg-red-50"
                >
                  Cancel Booking
                </button>
              )}

              {booking.status === "COMPLETED" && (
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                  <CheckCircle2 size={17} />
                  Completed
                </div>
              )}

              {booking.status === "CANCELLED" && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-500">
                  <XCircle size={17} />
                  Cancelled
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =====================================================
     BOOKING SECTION
  ===================================================== */

  function BookingSection({
    title,
    description,
    bookings: sectionBookings,
    icon,
    emptyMessage,
  }: {
    title: string;
    description: string;
    bookings: Booking[];
    icon: React.ReactNode;
    emptyMessage: string;
  }) {
    return (
      <section className="space-y-4">
        {/* Section Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
            {icon}
          </div>

          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-[#10275F]">
                {title}
              </h2>

              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#1D55B8] shadow-sm">
                {sectionBookings.length}
              </span>
            </div>

            <p className="text-sm text-[#64748B]">
              {description}
            </p>
          </div>
        </div>

        {/* Section Content */}
        {sectionBookings.length === 0 ? (
          <div className="rounded-2xl border border-[#D5E2F7] bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-medium text-[#64748B]">
              {emptyMessage}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {sectionBookings.map((booking) => (
              <BookingCard
                key={booking._id}
                booking={booking}
              />
            ))}
          </div>
        )}
      </section>
    );
  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="min-h-screen bg-[#EEF4FF] p-5 md:p-8 lg:p-10">
      {/* HEADER */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-[#E83B32]">
            Reservations
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-[#10275F] md:text-4xl">
            My Bookings
          </h1>

          <p className="mt-2 text-[#64748B]">
            Manage your conference room reservations.
          </p>
        </div>

        {/* REFRESH */}
        <button
          type="button"
          onClick={fetchBookings}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D5E2F7] bg-white px-4 py-3 text-sm font-bold text-[#10275F] shadow-sm transition hover:border-[#B8CCEC] hover:bg-[#F6F9FF] hover:text-[#1D55B8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            size={17}
            className={
              isLoading
                ? "animate-spin"
                : ""
            }
          />

          Refresh
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* LOADING */}
      {isLoading ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-[#D5E2F7] bg-white shadow-sm">
          <div className="flex flex-col items-center gap-3 text-[#64748B]">
            <Loader2
              size={32}
              className="animate-spin text-[#1D55B8]"
            />

            <p className="text-sm font-medium">
              Loading your bookings...
            </p>
          </div>
        </div>
      ) : bookings.length === 0 ? (
        /* EMPTY STATE */
        <div className="rounded-2xl border border-[#D5E2F7] bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EEF4FF]">
            <CalendarDays
              size={32}
              className="text-[#1D55B8]"
            />
          </div>

          <h2 className="mt-5 text-xl font-bold text-[#10275F]">
            No Bookings Yet
          </h2>

          <p className="mt-2 text-sm text-[#64748B]">
            You don't have any conference room
            bookings yet.
          </p>
        </div>
      ) : (
        /* BOOKING SECTIONS */
        <div className="space-y-10">
          {/* UPCOMING */}
          <BookingSection
            title="Upcoming Bookings"
            description="Your scheduled conference room reservations."
            bookings={upcomingBookings}
            icon={
              <Clock
                size={20}
                className="text-emerald-600"
              />
            }
            emptyMessage="You don't have any upcoming bookings."
          />

          {/* COMPLETED */}
          <BookingSection
            title="Completed Bookings"
            description="Conference room reservations that have already finished."
            bookings={completedBookings}
            icon={
              <CheckCircle2
                size={20}
                className="text-slate-500"
              />
            }
            emptyMessage="You don't have any completed bookings yet."
          />

          {/* CANCELLED */}
          <BookingSection
            title="Cancelled Bookings"
            description="Conference room reservations that were cancelled."
            bookings={cancelledBookings}
            icon={
              <XCircle
                size={20}
                className="text-red-500"
              />
            }
            emptyMessage="You don't have any cancelled bookings."
          />
        </div>
      )}

      {/* =================================================
          CANCEL CONFIRMATION MODAL
      ================================================= */}

      {bookingToCancel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#071B45]/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-booking-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#D5E2F7] bg-white shadow-2xl">
            {/* Modal top accent */}
            <div className="h-1 bg-[#E83B32]" />

            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-[0.15em] text-[#E83B32]">
                    Cancellation
                  </p>

                  <h2
                    id="cancel-booking-title"
                    className="text-xl font-bold text-[#10275F]"
                  >
                    Cancel Booking?
                  </h2>

                  <p className="mt-2 text-sm text-[#64748B]">
                    Are you sure you want to cancel
                    this booking?
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    !isCancelling &&
                    setBookingToCancel(null)
                  }
                  disabled={isCancelling}
                  className="rounded-full p-2 text-[#64748B] transition hover:bg-[#EEF4FF] hover:text-[#10275F] disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Close confirmation"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Booking Preview */}
              <div className="mt-5 rounded-xl border border-[#D5E2F7] bg-[#F6F9FF] p-4">
                <p className="font-bold text-[#10275F]">
                  {bookingToCancel.title}
                </p>

                <p className="mt-1 text-sm font-semibold text-[#1D55B8]">
                  {bookingToCancel.room?.name ||
                    "Conference Room"}
                </p>

                <div className="mt-3 space-y-2">
                  <p className="flex items-center gap-2 text-sm text-[#64748B]">
                    <CalendarDays
                      size={15}
                      className="text-[#1D55B8]"
                    />

                    {formatBookingDate(
                      bookingToCancel.date
                    )}
                  </p>

                  <p className="flex items-center gap-2 text-sm text-[#64748B]">
                    <Clock
                      size={15}
                      className="text-[#1D55B8]"
                    />

                    {formatBookingTime(
                      bookingToCancel.startTime
                    )}

                    {" - "}

                    {formatBookingTime(
                      bookingToCancel.endTime
                    )}
                  </p>

                  <p className="flex items-center gap-2 text-sm text-[#64748B]">
                    <MapPin
                      size={15}
                      className="text-[#1D55B8]"
                    />

                    {bookingToCancel.room?.location ||
                      "Main Office"}
                  </p>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setBookingToCancel(null)
                  }
                  disabled={isCancelling}
                  className="rounded-xl border border-[#D5E2F7] px-5 py-3 text-sm font-bold text-[#10275F] transition hover:bg-[#EEF4FF] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Keep Booking
                </button>

                <button
                  type="button"
                  onClick={confirmCancellation}
                  disabled={isCancelling}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E83B32] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#CF3028] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCancelling && (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  )}

                  {isCancelling
                    ? "Cancelling..."
                    : "Cancel Booking"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}