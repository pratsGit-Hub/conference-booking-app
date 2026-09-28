"use client";

import {
  CalendarDays,
  Clock,
  Loader2,
  MapPin,
  RefreshCw,
  User,
  X,
  Building2,
  CheckCircle2,
  Ban,
  Users,
} from "lucide-react";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

/* =====================================================
   TYPES
===================================================== */

interface BookingUser {
  _id: string;
  name: string;
  email: string;
  department?: string;
  role?: "ADMIN" | "EMPLOYEE";
}

interface BookingRoom {
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

  status:
    | "UPCOMING"
    | "COMPLETED"
    | "CANCELLED";

  user: BookingUser;
  room: BookingRoom;
}

/* =====================================================
   COMPONENT
===================================================== */

export default function AdminBookingsContent() {
  const [bookings, setBookings] =
    useState<Booking[]>([]);

  const [bookingToCancel, setBookingToCancel] =
    useState<Booking | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isCancelling, setIsCancelling] =
    useState(false);

  const [error, setError] =
    useState("");

  /* =====================================================
     FETCH ALL BOOKINGS
  ===================================================== */

  async function fetchBookings() {
    try {
      setIsLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/bookings`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to load bookings."
        );
      }

      setBookings(data.bookings || []);
    } catch (error) {
      console.error(
        "Fetch admin bookings error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load bookings."
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
        `${API_URL}/api/bookings/${bookingToCancel._id}/admin-cancel`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to cancel booking."
        );
      }

      /* Update UI immediately */

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
      console.error(
        "Admin cancel booking error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to cancel booking."
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
        "MMM d, yyyy"
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
      const [hours, minutes] =
        time.split(":").map(Number);

      const date = new Date();

      date.setHours(
        hours,
        minutes,
        0,
        0
      );

      return format(date, "h:mm a");
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
        return {
          container:
            "border border-blue-200 bg-[#EEF4FF] text-[#1D55B8]",
          icon: CheckCircle2,
        };

      case "COMPLETED":
        return {
          container:
            "border border-slate-200 bg-slate-50 text-slate-600",
          icon: CheckCircle2,
        };

      case "CANCELLED":
        return {
          container:
            "border border-red-200 bg-red-50 text-[#E83B32]",
          icon: Ban,
        };

      default:
        return {
          container:
            "border border-slate-200 bg-slate-50 text-slate-600",
          icon: CheckCircle2,
        };
    }
  }

  /* =====================================================
     SUMMARY COUNTS
  ===================================================== */

  const totalBookings =
    bookings.length;

  const upcomingBookings =
    bookings.filter(
      (booking) =>
        booking.status === "UPCOMING"
    ).length;

  const completedBookings =
    bookings.filter(
      (booking) =>
        booking.status === "COMPLETED"
    ).length;

  const cancelledBookings =
    bookings.filter(
      (booking) =>
        booking.status === "CANCELLED"
    ).length;

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="min-h-screen w-full bg-[#EEF4FF] p-5 md:p-8 lg:p-10">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

        <div>

          <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-[#E83B32]">
            Administration
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-[#10275F] md:text-4xl">
            All Bookings
          </h1>

          <p className="mt-2 text-[#64748B]">
            Manage conference room reservations
            across the organization.
          </p>

        </div>

        <button
          type="button"
          onClick={fetchBookings}
          disabled={isLoading}
          className="
            inline-flex
            h-11
            items-center
            justify-center
            gap-2
            rounded-xl
            border
            border-[#D5E2F7]
            bg-white
            px-5
            text-sm
            font-bold
            text-[#10275F]
            shadow-sm
            transition
            hover:border-[#B8CCEC]
            hover:bg-[#EEF4FF]
            hover:text-[#1D55B8]
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
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

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">

          <Ban
            size={19}
            className="mt-0.5 shrink-0 text-[#E83B32]"
          />

          <p>{error}</p>

        </div>
      )}

      {/* =================================================
          SUMMARY
      ================================================= */}

      {!isLoading && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* Total */}

          <div className="rounded-2xl border border-[#D5E2F7] bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm font-medium text-[#64748B]">
                  Total Bookings
                </p>

                <p className="mt-2 text-3xl font-bold text-[#10275F]">
                  {totalBookings}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1D55B8]">
                <CalendarDays size={21} />
              </div>

            </div>

          </div>

          {/* Upcoming */}

          <div className="rounded-2xl border border-[#D5E2F7] bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm font-medium text-[#64748B]">
                  Upcoming
                </p>

                <p className="mt-2 text-3xl font-bold text-[#1D55B8]">
                  {upcomingBookings}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1D55B8]">
                <CheckCircle2 size={21} />
              </div>

            </div>

          </div>

          {/* Completed */}

          <div className="rounded-2xl border border-[#D5E2F7] bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm font-medium text-[#64748B]">
                  Completed
                </p>

                <p className="mt-2 text-3xl font-bold text-[#64748B]">
                  {completedBookings}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <CheckCircle2 size={21} />
              </div>

            </div>

          </div>

          {/* Cancelled */}

          <div className="rounded-2xl border border-[#D5E2F7] bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm font-medium text-[#64748B]">
                  Cancelled
                </p>

                <p className="mt-2 text-3xl font-bold text-[#E83B32]">
                  {cancelledBookings}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-[#E83B32]">
                <Ban size={21} />
              </div>

            </div>

          </div>

        </div>
      )}

      {/* =================================================
          LOADING
      ================================================= */}

      {isLoading ? (
        <div className="flex min-h-[350px] items-center justify-center rounded-2xl border border-[#D5E2F7] bg-white shadow-sm">

          <div className="flex flex-col items-center gap-3 text-[#64748B]">

            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF4FF]">
              <Loader2
                size={28}
                className="animate-spin text-[#1D55B8]"
              />
            </div>

            <p className="text-sm font-medium">
              Loading bookings...
            </p>

          </div>

        </div>

      ) : bookings.length === 0 ? (

        /* =================================================
           EMPTY
        ================================================= */

        <div className="rounded-2xl border border-[#D5E2F7] bg-white p-12 text-center shadow-sm">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#1D55B8]">
            <CalendarDays size={32} />
          </div>

          <h2 className="mt-5 text-xl font-bold text-[#10275F]">
            No Bookings Found
          </h2>

          <p className="mt-2 text-sm text-[#64748B]">
            There are currently no room
            bookings.
          </p>

        </div>

      ) : (

        /* =================================================
           BOOKINGS
        ================================================= */

        <div className="space-y-5">

          {bookings.map((booking) => {
            const statusStyle =
              getStatusStyle(
                booking.status
              );

            const StatusIcon =
              statusStyle.icon;

            return (
              <div
                key={booking._id}
                className="
                  overflow-hidden
                  rounded-2xl
                  border
                  border-[#D5E2F7]
                  bg-white
                  shadow-sm
                  transition
                  hover:border-[#B8CCEC]
                  hover:shadow-md
                "
              >

                {/* Top Accent */}

                <div className="h-1 bg-[#102D72]" />

                <div className="p-6">

                  <div className="flex flex-col gap-6">

                    {/* =====================================
                        TOP
                    ===================================== */}

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-3">

                          <h2 className="text-xl font-bold text-[#10275F]">
                            {booking.title}
                          </h2>

                          <span
                            className={`
                              inline-flex
                              items-center
                              gap-1.5
                              rounded-full
                              px-3
                              py-1
                              text-xs
                              font-bold
                              ${statusStyle.container}
                            `}
                          >
                            <StatusIcon size={13} />

                            {booking.status}
                          </span>

                        </div>

                        <div className="mt-2 flex items-center gap-2">

                          <Building2
                            size={17}
                            className="text-[#1D55B8]"
                          />

                          <p className="font-semibold text-[#1D55B8]">
                            {booking.room?.name ||
                              "Conference Room"}
                          </p>

                        </div>

                      </div>

                      {booking.status ===
                        "UPCOMING" && (
                        <button
                          type="button"
                          onClick={() =>
                            setBookingToCancel(
                              booking
                            )
                          }
                          className="
                            shrink-0
                            rounded-xl
                            border
                            border-red-200
                            bg-white
                            px-5
                            py-3
                            text-sm
                            font-bold
                            text-[#E83B32]
                            transition
                            hover:bg-red-50
                            hover:border-red-300
                          "
                        >
                          Cancel Booking
                        </button>
                      )}

                    </div>

                    {/* =====================================
                        DETAILS
                    ===================================== */}

                    <div className="grid gap-5 border-t border-[#E5ECF7] pt-5 md:grid-cols-2 xl:grid-cols-4">

                      {/* Employee */}

                      <div className="flex items-start gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1D55B8]">
                          <User size={18} />
                        </div>

                        <div className="min-w-0">

                          <p className="text-xs font-bold uppercase tracking-wide text-[#64748B]">
                            Employee
                          </p>

                          <p className="mt-1 truncate text-sm font-semibold text-[#10275F]">
                            {booking.user?.name ||
                              "Unknown User"}
                          </p>

                          <p className="truncate text-xs text-[#64748B]">
                            {booking.user?.email ||
                              "No email"}
                          </p>

                        </div>

                      </div>

                      {/* Date */}

                      <div className="flex items-start gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1D55B8]">
                          <CalendarDays size={18} />
                        </div>

                        <div>

                          <p className="text-xs font-bold uppercase tracking-wide text-[#64748B]">
                            Date
                          </p>

                          <p className="mt-1 text-sm font-semibold text-[#10275F]">
                            {formatBookingDate(
                              booking.date
                            )}
                          </p>

                        </div>

                      </div>

                      {/* Time */}

                      <div className="flex items-start gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1D55B8]">
                          <Clock size={18} />
                        </div>

                        <div>

                          <p className="text-xs font-bold uppercase tracking-wide text-[#64748B]">
                            Time
                          </p>

                          <p className="mt-1 text-sm font-semibold text-[#10275F]">
                            {formatBookingTime(
                              booking.startTime
                            )}
                            {" - "}
                            {formatBookingTime(
                              booking.endTime
                            )}
                          </p>

                        </div>

                      </div>

                      {/* Location */}

                      <div className="flex items-start gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1D55B8]">
                          <MapPin size={18} />
                        </div>

                        <div className="min-w-0">

                          <p className="text-xs font-bold uppercase tracking-wide text-[#64748B]">
                            Location
                          </p>

                          <p className="mt-1 truncate text-sm font-semibold text-[#10275F]">
                            {booking.room?.location ||
                              "Unknown Location"}
                          </p>

                        </div>

                      </div>

                    </div>

                    {/* =====================================
                        ROOM INFO
                    ===================================== */}

                    <div className="grid gap-4 rounded-xl border border-[#D5E2F7] bg-[#F6F9FF] p-4 sm:grid-cols-2">

                      <div className="flex items-center gap-3">

                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#1D55B8]">
                          <Users size={17} />
                        </div>

                        <div>

                          <p className="text-xs font-medium text-[#64748B]">
                            Room Capacity
                          </p>

                          <p className="text-sm font-bold text-[#10275F]">
                            {booking.room?.capacity ??
                              "—"}{" "}
                            people
                          </p>

                        </div>

                      </div>

                      {booking.room
                        ?.facilities
                        ?.length > 0 && (
                        <div className="flex items-start gap-3">

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#1D55B8]">
                            <Building2 size={17} />
                          </div>

                          <div className="min-w-0">

                            <p className="text-xs font-medium text-[#64748B]">
                              Facilities
                            </p>

                            <p className="mt-1 text-sm font-semibold text-[#10275F]">
                              {booking.room.facilities.join(
                                " • "
                              )}
                            </p>

                          </div>

                        </div>
                      )}

                    </div>

                    {/* =====================================
                        DESCRIPTION
                    ===================================== */}

                    {booking.description && (
                      <div className="rounded-xl border border-[#D5E2F7] bg-[#F6F9FF] p-4">

                        <p className="text-xs font-bold uppercase tracking-wide text-[#64748B]">
                          Description
                        </p>

                        <p className="mt-1 text-sm leading-6 text-[#475569]">
                          {booking.description}
                        </p>

                      </div>
                    )}

                  </div>

                </div>

              </div>
            );
          })}

        </div>
      )}

      {/* =================================================
          CANCEL CONFIRMATION MODAL
      ================================================= */}

      {bookingToCancel && (
        <div
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-center
            justify-center
            bg-[#071B45]/60
            p-4
            backdrop-blur-sm
          "
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-cancel-title"
        >

          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-[#D5E2F7] bg-white shadow-2xl">

            {/* Red Accent */}

            <div className="h-2 bg-[#E83B32]" />

            <div className="p-6 md:p-8">

              {/* Header */}

              <div className="flex items-start justify-between gap-5">

                <div>

                  <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-[#E83B32]">
                    Cancellation
                  </p>

                  <h2
                    id="admin-cancel-title"
                    className="text-2xl font-bold text-[#10275F] md:text-3xl"
                  >
                    Cancel Booking?
                  </h2>

                  <p className="mt-2 text-base text-[#64748B]">
                    Are you sure you want to
                    cancel this booking?
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    !isCancelling &&
                    setBookingToCancel(null)
                  }
                  disabled={isCancelling}
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    text-[#64748B]
                    transition
                    hover:bg-[#EEF4FF]
                    hover:text-[#10275F]
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                  aria-label="Close"
                >
                  <X size={25} />
                </button>

              </div>

              {/* Booking Information */}

              <div className="mt-6 rounded-2xl border border-[#D5E2F7] bg-[#F6F9FF] p-5">

                <p className="text-xl font-bold text-[#10275F]">
                  {bookingToCancel.title}
                </p>

                <p className="mt-1 text-base font-bold text-[#1D55B8]">
                  {bookingToCancel.room?.name ||
                    "Conference Room"}
                </p>

                <div className="mt-5 space-y-4">

                  {/* Date */}

                  <div className="flex items-center gap-3">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#1D55B8]">
                      <CalendarDays size={18} />
                    </div>

                    <div>

                      <p className="text-xs text-[#64748B]">
                        Date
                      </p>

                      <p className="text-sm font-semibold text-[#10275F]">
                        {formatBookingDate(
                          bookingToCancel.date
                        )}
                      </p>

                    </div>

                  </div>

                  {/* Time */}

                  <div className="flex items-center gap-3">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#1D55B8]">
                      <Clock size={18} />
                    </div>

                    <div>

                      <p className="text-xs text-[#64748B]">
                        Time
                      </p>

                      <p className="text-sm font-semibold text-[#10275F]">
                        {formatBookingTime(
                          bookingToCancel.startTime
                        )}
                        {" - "}
                        {formatBookingTime(
                          bookingToCancel.endTime
                        )}
                      </p>

                    </div>

                  </div>

                  {/* Employee */}

                  <div className="flex items-center gap-3">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#1D55B8]">
                      <User size={18} />
                    </div>

                    <div>

                      <p className="text-xs text-[#64748B]">
                        Employee
                      </p>

                      <p className="text-sm font-semibold text-[#10275F]">
                        {bookingToCancel.user?.name ||
                          "Unknown User"}
                      </p>

                    </div>

                  </div>

                  {/* Location */}

                  <div className="flex items-center gap-3">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#1D55B8]">
                      <MapPin size={18} />
                    </div>

                    <div>

                      <p className="text-xs text-[#64748B]">
                        Location
                      </p>

                      <p className="text-sm font-semibold text-[#10275F]">
                        {bookingToCancel.room?.location ||
                          "Unknown Location"}
                      </p>

                    </div>

                  </div>

                </div>

              </div>

              {/* Actions */}

              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={() =>
                    setBookingToCancel(null)
                  }
                  disabled={isCancelling}
                  className="
                    h-12
                    rounded-xl
                    border
                    border-[#D5E2F7]
                    bg-white
                    px-6
                    text-sm
                    font-bold
                    text-[#10275F]
                    transition
                    hover:bg-[#EEF4FF]
                    hover:border-[#B8CCEC]
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  Keep Booking
                </button>

                <button
                  type="button"
                  onClick={
                    confirmCancellation
                  }
                  disabled={isCancelling}
                  className="
                    inline-flex
                    h-12
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-[#E83B32]
                    px-6
                    text-sm
                    font-bold
                    text-white
                    shadow-sm
                    transition
                    hover:bg-[#CF3028]
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >

                  {isCancelling && (
                    <Loader2
                      size={17}
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