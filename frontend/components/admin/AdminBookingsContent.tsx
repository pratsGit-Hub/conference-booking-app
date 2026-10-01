"use client";

import AppShell from "@/components/layout/AppShell";
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
  Pencil,
  Save,
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
  isActive?: boolean;
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

  const [rooms, setRooms] =
    useState<BookingRoom[]>([]);

  const [bookingToCancel, setBookingToCancel] =
    useState<Booking | null>(null);

  const [bookingToEdit, setBookingToEdit] =
    useState<Booking | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isCancelling, setIsCancelling] =
    useState(false);

  const [isEditing, setIsEditing] =
    useState(false);

  const [isLoadingRooms, setIsLoadingRooms] =
    useState(false);

  const [error, setError] =
    useState("");

  const [editError, setEditError] =
    useState("");

  const [editSuccess, setEditSuccess] =
    useState("");

  const [editForm, setEditForm] = useState({
    title: "",
    roomId: "",
    date: "",
    startTime: "",
    endTime: "",
    description: "",
  });

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
     FETCH ROOMS
  ===================================================== */

  async function fetchRooms() {
    try {
      setIsLoadingRooms(true);

      const response = await fetch(
        `${API_URL}/api/rooms`,
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
            "Unable to load rooms."
        );
      }

      setRooms(data.rooms || []);
    } catch (error) {
      console.error(
        "Fetch admin rooms error:",
        error
      );
    } finally {
      setIsLoadingRooms(false);
    }
  }

  /* =====================================================
     LOAD DATA
  ===================================================== */

  useEffect(() => {
    fetchBookings();
    fetchRooms();
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
     OPEN EDIT MODAL
  ===================================================== */

  function openEditModal(booking: Booking) {
    setBookingToEdit(booking);

    setEditError("");
    setEditSuccess("");

    setEditForm({
      title: booking.title || "",
      roomId: booking.room?._id || "",
      date: booking.date
        ? booking.date.slice(0, 10)
        : "",
      startTime: booking.startTime || "",
      endTime: booking.endTime || "",
      description: booking.description || "",
    });
  }

  /* =====================================================
     CLOSE EDIT MODAL
  ===================================================== */

  function closeEditModal() {
    if (isEditing) {
      return;
    }

    setBookingToEdit(null);
    setEditError("");
    setEditSuccess("");
  }

  /* =====================================================
     EDIT FORM CHANGE
  ===================================================== */

  function handleEditChange(
    field:
      | "title"
      | "roomId"
      | "date"
      | "startTime"
      | "endTime"
      | "description",
    value: string
  ) {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }));

    setEditError("");
    setEditSuccess("");
  }

  /* =====================================================
     SUBMIT EDIT
  ===================================================== */

  async function submitEditBooking(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!bookingToEdit) {
      return;
    }

    setEditError("");
    setEditSuccess("");

    /* Basic frontend validation */

    if (!editForm.title.trim()) {
      setEditError(
        "Meeting title is required."
      );
      return;
    }

    if (!editForm.roomId) {
      setEditError(
        "Please select a conference room."
      );
      return;
    }

    if (!editForm.date) {
      setEditError(
        "Please select a date."
      );
      return;
    }

    if (!editForm.startTime) {
      setEditError(
        "Please select a start time."
      );
      return;
    }

    if (!editForm.endTime) {
      setEditError(
        "Please select an end time."
      );
      return;
    }

    if (
      editForm.startTime >=
      editForm.endTime
    ) {
      setEditError(
        "End time must be after start time."
      );
      return;
    }

    try {
      setIsEditing(true);

      const response = await fetch(
        `${API_URL}/api/bookings/${bookingToEdit._id}/edit`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: editForm.title.trim(),
            roomId: editForm.roomId,
            date: editForm.date,
            startTime: editForm.startTime,
            endTime: editForm.endTime,
            description:
              editForm.description.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to update booking."
        );
      }

      /*
       * Backend normally returns the updated booking.
       * If available, use it directly.
       */

      const updatedBooking =
        data.booking;

      if (updatedBooking) {
        setBookings((currentBookings) =>
          currentBookings.map((booking) =>
            booking._id ===
            bookingToEdit._id
              ? updatedBooking
              : booking
          )
        );
      } else {
        /*
         * Fallback:
         * Refresh bookings if backend
         * doesn't return the updated object.
         */
        await fetchBookings();
      }

      setEditSuccess(
        "Booking updated successfully."
      );

      /*
       * Close modal shortly after success
       * so admin can immediately see the
       * updated booking.
       */
      setTimeout(() => {
        setBookingToEdit(null);
        setEditSuccess("");
      }, 900);
    } catch (error) {
      console.error(
        "Admin edit booking error:",
        error
      );

      setEditError(
        error instanceof Error
          ? error.message
          : "Unable to update booking."
      );
    } finally {
      setIsEditing(false);
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
          onClick={() => {
            fetchBookings();
            fetchRooms();
          }}
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

                      {/* ACTIONS */}

                      {booking.status ===
                        "UPCOMING" && (

                        <div className="flex flex-col gap-2 sm:flex-row">

                          {/* EDIT */}

                          <button
                            type="button"
                            onClick={() =>
                              openEditModal(
                                booking
                              )
                            }
                            className="
                              inline-flex
                              shrink-0
                              items-center
                              justify-center
                              gap-2
                              rounded-xl
                              border
                              border-[#B8CCEC]
                              bg-[#EEF4FF]
                              px-5
                              py-3
                              text-sm
                              font-bold
                              text-[#1D55B8]
                              transition
                              hover:bg-[#DCE9FF]
                              hover:border-[#9DBAE8]
                            "
                          >

                            <Pencil size={16} />

                            Edit Booking

                          </button>

                          {/* CANCEL */}

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

                        </div>

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
          EDIT BOOKING MODAL
      ================================================= */}

      {bookingToEdit && (

        <div
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-center
            justify-center
            overflow-y-auto
            bg-[#071B45]/60
            p-4
            backdrop-blur-sm
          "
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-edit-title"
        >

          <div className="my-8 w-full max-w-2xl overflow-hidden rounded-3xl border border-[#D5E2F7] bg-white shadow-2xl">

            {/* Blue Accent */}

            <div className="h-2 bg-[#102D72]" />

            <form
              onSubmit={submitEditBooking}
            >

              <div className="p-6 md:p-8">

                {/* HEADER */}

                <div className="flex items-start justify-between gap-5">

                  <div>

                    <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-[#1D55B8]">
                      Administration
                    </p>

                    <h2
                      id="admin-edit-title"
                      className="text-2xl font-bold text-[#10275F] md:text-3xl"
                    >
                      Edit Booking
                    </h2>

                    <p className="mt-2 text-sm text-[#64748B]">
                      Update the meeting details
                      below.
                    </p>

                  </div>

                  <button
                    type="button"
                    onClick={closeEditModal}
                    disabled={isEditing}
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

                {/* ERROR */}

                {editError && (

                  <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">

                    <Ban
                      size={19}
                      className="mt-0.5 shrink-0 text-[#E83B32]"
                    />

                    <p>
                      {editError}
                    </p>

                  </div>

                )}

                {/* SUCCESS */}

                {editSuccess && (

                  <div className="mt-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">

                    <CheckCircle2
                      size={19}
                      className="mt-0.5 shrink-0"
                    />

                    <p>
                      {editSuccess}
                    </p>

                  </div>

                )}

                {/* FORM */}

                <div className="mt-7 space-y-5">

                  {/* TITLE */}

                  <div>

                    <label
                      htmlFor="admin-edit-title-input"
                      className="mb-2 block text-sm font-bold text-[#10275F]"
                    >
                      Meeting Title
                    </label>

                    <input
                      id="admin-edit-title-input"
                      type="text"
                      value={editForm.title}
                      onChange={(event) =>
                        handleEditChange(
                          "title",
                          event.target.value
                        )
                      }
                      disabled={isEditing}
                      maxLength={150}
                      placeholder="Enter meeting title"
                      className="
                        h-12
                        w-full
                        rounded-xl
                        border
                        border-[#D5E2F7]
                        bg-white
                        px-4
                        text-sm
                        font-medium
                        text-[#10275F]
                        outline-none
                        transition
                        placeholder:text-[#94A3B8]
                        focus:border-[#1D55B8]
                        focus:ring-4
                        focus:ring-[#1D55B8]/10
                        disabled:cursor-not-allowed
                        disabled:bg-slate-50
                      "
                    />

                  </div>

                  {/* ROOM */}

                  <div>

                    <label
                      htmlFor="admin-edit-room"
                      className="mb-2 block text-sm font-bold text-[#10275F]"
                    >
                      Conference Room
                    </label>

                    <div className="relative">

                      <Building2
                        size={18}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#1D55B8]"
                      />

                      <select
                        id="admin-edit-room"
                        value={editForm.roomId}
                        onChange={(event) =>
                          handleEditChange(
                            "roomId",
                            event.target.value
                          )
                        }
                        disabled={
                          isEditing ||
                          isLoadingRooms
                        }
                        className="
                          h-12
                          w-full
                          appearance-none
                          rounded-xl
                          border
                          border-[#D5E2F7]
                          bg-white
                          pl-11
                          pr-4
                          text-sm
                          font-medium
                          text-[#10275F]
                          outline-none
                          transition
                          focus:border-[#1D55B8]
                          focus:ring-4
                          focus:ring-[#1D55B8]/10
                          disabled:cursor-not-allowed
                          disabled:bg-slate-50
                        "
                      >

                        <option value="">
                          {isLoadingRooms
                            ? "Loading rooms..."
                            : "Select a room"}
                        </option>

                        {rooms
                          .filter(
                            (room) =>
                              room.isActive !==
                                false ||
                              room._id ===
                                editForm.roomId
                          )
                          .map((room) => (

                            <option
                              key={room._id}
                              value={room._id}
                            >
                              {room.name}
                              {" — "}
                              {room.location}
                              {" — "}
                              {room.capacity}
                              {" people"}
                            </option>

                          ))}

                      </select>

                    </div>

                  </div>

                  {/* DATE */}

                  <div>

                    <label
                      htmlFor="admin-edit-date"
                      className="mb-2 block text-sm font-bold text-[#10275F]"
                    >
                      Date
                    </label>

                    <div className="relative">

                      <CalendarDays
                        size={18}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#1D55B8]"
                      />

                      <input
                        id="admin-edit-date"
                        type="date"
                        value={editForm.date}
                        onChange={(event) =>
                          handleEditChange(
                            "date",
                            event.target.value
                          )
                        }
                        disabled={isEditing}
                        className="
                          h-12
                          w-full
                          rounded-xl
                          border
                          border-[#D5E2F7]
                          bg-white
                          px-4
                          pl-11
                          text-sm
                          font-medium
                          text-[#10275F]
                          outline-none
                          transition
                          focus:border-[#1D55B8]
                          focus:ring-4
                          focus:ring-[#1D55B8]/10
                          disabled:cursor-not-allowed
                          disabled:bg-slate-50
                        "
                      />

                    </div>

                  </div>

                  {/* TIME */}

                  <div className="grid gap-5 sm:grid-cols-2">

                    {/* START */}

                    <div>

                      <label
                        htmlFor="admin-edit-start-time"
                        className="mb-2 block text-sm font-bold text-[#10275F]"
                      >
                        Start Time
                      </label>

                      <div className="relative">

                        <Clock
                          size={18}
                          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#1D55B8]"
                        />

                        <input
                          id="admin-edit-start-time"
                          type="time"
                          value={
                            editForm.startTime
                          }
                          onChange={(event) =>
                            handleEditChange(
                              "startTime",
                              event.target.value
                            )
                          }
                          disabled={isEditing}
                          step="900"
                          className="
                            h-12
                            w-full
                            rounded-xl
                            border
                            border-[#D5E2F7]
                            bg-white
                            px-4
                            pl-11
                            text-sm
                            font-medium
                            text-[#10275F]
                            outline-none
                            transition
                            focus:border-[#1D55B8]
                            focus:ring-4
                            focus:ring-[#1D55B8]/10
                            disabled:cursor-not-allowed
                            disabled:bg-slate-50
                          "
                        />

                      </div>

                    </div>

                    {/* END */}

                    <div>

                      <label
                        htmlFor="admin-edit-end-time"
                        className="mb-2 block text-sm font-bold text-[#10275F]"
                      >
                        End Time
                      </label>

                      <div className="relative">

                        <Clock
                          size={18}
                          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#1D55B8]"
                        />

                        <input
                          id="admin-edit-end-time"
                          type="time"
                          value={
                            editForm.endTime
                          }
                          onChange={(event) =>
                            handleEditChange(
                              "endTime",
                              event.target.value
                            )
                          }
                          disabled={isEditing}
                          step="900"
                          className="
                            h-12
                            w-full
                            rounded-xl
                            border
                            border-[#D5E2F7]
                            bg-white
                            px-4
                            pl-11
                            text-sm
                            font-medium
                            text-[#10275F]
                            outline-none
                            transition
                            focus:border-[#1D55B8]
                            focus:ring-4
                            focus:ring-[#1D55B8]/10
                            disabled:cursor-not-allowed
                            disabled:bg-slate-50
                          "
                        />

                      </div>

                    </div>

                  </div>

                  {/* DESCRIPTION */}

                  <div>

                    <label
                      htmlFor="admin-edit-description"
                      className="mb-2 block text-sm font-bold text-[#10275F]"
                    >
                      Description
                    </label>

                    <textarea
                      id="admin-edit-description"
                      value={
                        editForm.description
                      }
                      onChange={(event) =>
                        handleEditChange(
                          "description",
                          event.target.value
                        )
                      }
                      disabled={isEditing}
                      maxLength={1000}
                      rows={4}
                      placeholder="Add meeting details..."
                      className="
                        w-full
                        resize-none
                        rounded-xl
                        border
                        border-[#D5E2F7]
                        bg-white
                        px-4
                        py-3
                        text-sm
                        font-medium
                        leading-6
                        text-[#10275F]
                        outline-none
                        transition
                        placeholder:text-[#94A3B8]
                        focus:border-[#1D55B8]
                        focus:ring-4
                        focus:ring-[#1D55B8]/10
                        disabled:cursor-not-allowed
                        disabled:bg-slate-50
                      "
                    />

                  </div>

                </div>

                {/* ACTIONS */}

                <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                  <button
                    type="button"
                    onClick={closeEditModal}
                    disabled={isEditing}
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
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isEditing}
                    className="
                      inline-flex
                      h-12
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      bg-[#102D72]
                      px-7
                      text-sm
                      font-bold
                      text-white
                      shadow-sm
                      transition
                      hover:bg-[#0C245C]
                      disabled:cursor-not-allowed
                      disabled:opacity-60
                    "
                  >

                    {isEditing ? (
                      <>
                        <Loader2
                          size={17}
                          className="animate-spin"
                        />

                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={17} />

                        Save Changes
                      </>
                    )}

                  </button>

                </div>

              </div>

            </form>

          </div>

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