"use client";

import { zodResolver } from "@hookform/resolvers/zod";

import {
  CalendarDays,
  Clock,
  Loader2,
  X,
} from "lucide-react";

import { useEffect, useState } from "react";

import {
  useForm,
} from "react-hook-form";

import { z } from "zod";

import BookingSuccess from "./BookingSuccess";

/* =====================================================
   API
===================================================== */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

/* =====================================================
   PROPS
===================================================== */

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;

  /*
   * Real MongoDB Room ID
   */
  roomId: string;

  /*
   * Room name displayed in the modal
   */
  roomName: string;

  /*
   * Date selected from dashboard
   * Format: YYYY-MM-DD
   */
  selectedDate: string;

  /*
   * Time slot selected from dashboard
   */
  selectedStartTime?: string;

  selectedEndTime?: string;
}

/* =====================================================
   VALIDATION
===================================================== */

const bookingSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(
        3,
        "Meeting title must be at least 3 characters"
      )
      .max(
        100,
        "Meeting title cannot exceed 100 characters"
      ),

    date: z
      .string()
      .min(
        1,
        "Please select a date"
      ),

    startTime: z
      .string()
      .min(
        1,
        "Please select a start time"
      ),

    endTime: z
      .string()
      .min(
        1,
        "Please select an end time"
      ),

    description: z
      .string()
      .trim()
      .max(
        500,
        "Description cannot exceed 500 characters"
      )
      .optional(),
  })
  .refine(
    (data) =>
      data.endTime > data.startTime,
    {
      message:
        "End time must be after start time",
      path: ["endTime"],
    }
  );

type BookingFormData =
  z.infer<typeof bookingSchema>;

/* =====================================================
   COMPONENT
===================================================== */

export default function BookingModal({
  isOpen,
  onClose,
  roomId,
  roomName,
  selectedDate,
  selectedStartTime = "10:00",
  selectedEndTime = "11:00",
}: BookingModalProps) {

  /* ===================================================
     SUCCESS STATE
  =================================================== */

  const [
    bookingCompleted,
    setBookingCompleted,
  ] = useState(false);

  const [
    completedBooking,
    setCompletedBooking,
  ] = useState<BookingFormData | null>(
    null
  );

  /* ===================================================
     FORM
  =================================================== */

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<BookingFormData>({
    resolver:
      zodResolver(bookingSchema),

    defaultValues: {
      title: "",
      date: selectedDate,
      startTime:
        selectedStartTime,
      endTime:
        selectedEndTime,
      description: "",
    },
  });

  /* ===================================================
     KEEP DASHBOARD DATE + TIME SYNCHRONIZED
  =================================================== */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setValue(
      "date",
      selectedDate
    );

    setValue(
      "startTime",
      selectedStartTime
    );

    setValue(
      "endTime",
      selectedEndTime
    );
  }, [
    isOpen,
    selectedDate,
    selectedStartTime,
    selectedEndTime,
    setValue,
  ]);

  /* ===================================================
     RESET FORM WHEN MODAL OPENS
  =================================================== */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setBookingCompleted(false);
    setCompletedBooking(null);

    reset({
      title: "",
      date: selectedDate,
      startTime:
        selectedStartTime,
      endTime:
        selectedEndTime,
      description: "",
    });
  }, [
    isOpen,
    selectedDate,
    selectedStartTime,
    selectedEndTime,
    reset,
  ]);

  /* ===================================================
     DO NOT RENDER WHEN CLOSED
  =================================================== */

  if (!isOpen) {
    return null;
  }

  /* ===================================================
     SUBMIT BOOKING
  =================================================== */

  async function onSubmit(
    data: BookingFormData
  ) {
    try {

      /* -----------------------------------------------
         CHECK ROOM ID
      ----------------------------------------------- */

      if (!roomId) {
        setError(
          "root.serverError",
          {
            type: "manual",
            message:
              "Unable to identify the selected room.",
          }
        );

        return;
      }

      /* -----------------------------------------------
         CREATE REAL BOOKING
      ----------------------------------------------- */

      const response =
        await fetch(
          `${API_URL}/api/bookings`,
          {
            method: "POST",

            credentials: "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              roomId,

              title:
                data.title.trim(),

              date:
                data.date,

              startTime:
                data.startTime,

              endTime:
                data.endTime,

              description:
                data.description?.trim() ||
                undefined,
            }),
          }
        );

      /* -----------------------------------------------
         PARSE SERVER RESPONSE
      ----------------------------------------------- */

      const result =
        await response.json();

      /* -----------------------------------------------
         SERVER ERROR
      ----------------------------------------------- */

      if (!response.ok) {
        setError(
          "root.serverError",
          {
            type: "server",
            message:
              result.message ||
              "Unable to create booking.",
          }
        );

        return;
      }

      /* -----------------------------------------------
         SUCCESS
      ----------------------------------------------- */

      setCompletedBooking(data);

      setBookingCompleted(true);

      reset({
        title: "",
        date: selectedDate,
        startTime:
          selectedStartTime,
        endTime:
          selectedEndTime,
        description: "",
      });

    } catch (error) {

      console.error(
        "Booking request failed:",
        error
      );

      setError(
        "root.serverError",
        {
          type: "server",
          message:
            "Unable to connect to the booking server. Please try again.",
        }
      );
    }
  }

  /* ===================================================
     CLOSE MODAL
  =================================================== */

  function handleClose() {
    if (isSubmitting) {
      return;
    }

    reset({
      title: "",
      date: selectedDate,
      startTime:
        selectedStartTime,
      endTime:
        selectedEndTime,
      description: "",
    });

    setBookingCompleted(false);

    setCompletedBooking(null);

    onClose();
  }

  /* ===================================================
     BOOKING SUCCESS
  =================================================== */

  if (
    bookingCompleted &&
    completedBooking
  ) {
    return (
      <BookingSuccess
        roomName={roomName}
        title={
          completedBooking.title
        }
        date={
          completedBooking.date
        }
        startTime={
          completedBooking.startTime
        }
        endTime={
          completedBooking.endTime
        }
        onClose={handleClose}
      />
    );
  }

  /* ===================================================
     BOOKING FORM
  =================================================== */

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#071B45]/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
    >

      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto overflow-hidden rounded-2xl border border-[#D5E2F7] bg-white shadow-2xl">

        {/* =================================================
            TOP ACCENT
        ================================================= */}

        <div className="h-1 bg-[#102D72]" />

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex items-center justify-between border-b border-[#D5E2F7] px-6 py-5">

          <div>

            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E83B32]">
              New Booking
            </p>

            <h2
              id="booking-modal-title"
              className="mt-1 text-2xl font-bold text-[#10275F]"
            >
              Book Conference Room
            </h2>

          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close booking modal"
            className="rounded-full p-2 text-[#64748B] transition hover:bg-[#EEF4FF] hover:text-[#10275F] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={22} />
          </button>

        </div>

        {/* =================================================
            FORM
        ================================================= */}

        <form
          onSubmit={handleSubmit(
            onSubmit
          )}
          className="space-y-5 p-6"
        >

          {/* =================================================
              SERVER ERROR
          ================================================= */}

          {errors.root?.serverError
            ?.message && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">

              <p className="text-sm font-medium text-red-700">
                {
                  errors.root
                    .serverError
                    .message
                }
              </p>

            </div>
          )}

          {/* =================================================
              ROOM
          ================================================= */}

          <div>

            <label className="mb-2 block text-sm font-semibold text-[#10275F]">
              Conference Room
            </label>

            <div className="flex items-center gap-3 rounded-xl border border-[#D5E2F7] bg-[#EEF4FF] px-4 py-3 font-semibold text-[#102D72]">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
                <CalendarDays
                  size={17}
                  className="text-[#1D55B8]"
                />
              </div>

              {roomName}
            </div>

          </div>

          {/* =================================================
              MEETING TITLE
          ================================================= */}

          <div>

            <label
              htmlFor="meeting-title"
              className="mb-2 block text-sm font-semibold text-[#10275F]"
            >
              Meeting Title
            </label>

            <input
              id="meeting-title"
              type="text"
              placeholder="e.g. Project Discussion"
              {...register("title")}
              className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-[#10275F] placeholder:text-[#94A3B8] transition focus:outline-none focus:ring-2 ${
                errors.title
                  ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                  : "border-[#D5E2F7] focus:border-[#1D55B8] focus:ring-[#1D55B8]/10"
              }`}
            />

            {errors.title && (
              <p className="mt-1.5 text-xs font-medium text-red-600">
                {
                  errors.title
                    .message
                }
              </p>
            )}

          </div>

          {/* =================================================
              DATE
          ================================================= */}

          <div>

            <label
              htmlFor="booking-date"
              className="mb-2 block text-sm font-semibold text-[#10275F]"
            >
              Date
            </label>

            <div className="relative">

              <CalendarDays
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1D55B8]"
              />

              <input
                id="booking-date"
                type="date"
                {...register("date")}
                className={`w-full rounded-xl border bg-white py-3 pl-11 pr-4 text-sm text-[#10275F] transition focus:outline-none focus:ring-2 ${
                  errors.date
                    ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                    : "border-[#D5E2F7] focus:border-[#1D55B8] focus:ring-[#1D55B8]/10"
                }`}
              />

            </div>

            {errors.date && (
              <p className="mt-1.5 text-xs font-medium text-red-600">
                {
                  errors.date
                    .message
                }
              </p>
            )}

          </div>

          {/* =================================================
              TIME
          ================================================= */}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            {/* START TIME */}

            <div>

              <label
                htmlFor="start-time"
                className="mb-2 block text-sm font-semibold text-[#10275F]"
              >
                Start Time
              </label>

              <div className="relative">

                <Clock
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1D55B8]"
                />

                <input
                  id="start-time"
                  type="time"
                  {...register(
                    "startTime"
                  )}
                  className={`w-full rounded-xl border bg-white py-3 pl-11 pr-3 text-sm text-[#10275F] transition focus:outline-none focus:ring-2 ${
                    errors.startTime
                      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                      : "border-[#D5E2F7] focus:border-[#1D55B8] focus:ring-[#1D55B8]/10"
                  }`}
                />

              </div>

              {errors.startTime && (
                <p className="mt-1.5 text-xs font-medium text-red-600">
                  {
                    errors.startTime
                      .message
                  }
                </p>
              )}

            </div>

            {/* END TIME */}

            <div>

              <label
                htmlFor="end-time"
                className="mb-2 block text-sm font-semibold text-[#10275F]"
              >
                End Time
              </label>

              <div className="relative">

                <Clock
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1D55B8]"
                />

                <input
                  id="end-time"
                  type="time"
                  {...register(
                    "endTime"
                  )}
                  className={`w-full rounded-xl border bg-white py-3 pl-11 pr-3 text-sm text-[#10275F] transition focus:outline-none focus:ring-2 ${
                    errors.endTime
                      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                      : "border-[#D5E2F7] focus:border-[#1D55B8] focus:ring-[#1D55B8]/10"
                  }`}
                />

              </div>

              {errors.endTime && (
                <p className="mt-1.5 text-xs font-medium text-red-600">
                  {
                    errors.endTime
                      .message
                  }
                </p>
              )}

            </div>

          </div>

          {/* =================================================
              DESCRIPTION
          ================================================= */}

          <div>

            <label
              htmlFor="booking-description"
              className="mb-2 block text-sm font-semibold text-[#10275F]"
            >
              Description
            </label>

            <textarea
              id="booking-description"
              rows={3}
              placeholder="Add meeting details..."
              {...register(
                "description"
              )}
              className={`w-full resize-none rounded-xl border bg-white px-4 py-3 text-sm text-[#10275F] placeholder:text-[#94A3B8] transition focus:outline-none focus:ring-2 ${
                errors.description
                  ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                  : "border-[#D5E2F7] focus:border-[#1D55B8] focus:ring-[#1D55B8]/10"
              }`}
            />

            {errors.description && (
              <p className="mt-1.5 text-xs font-medium text-red-600">
                {
                  errors.description
                    .message
                }
              </p>
            )}

          </div>

          {/* =================================================
              SELECTED SLOT SUMMARY
          ================================================= */}

          <div className="rounded-xl border border-[#D5E2F7] bg-[#F6F9FF] px-4 py-3">

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EEF4FF]">
                <Clock
                  size={17}
                  className="text-[#1D55B8]"
                />
              </div>

              <div>

                <p className="text-xs font-medium text-[#64748B]">
                  Selected booking slot
                </p>

                <p className="text-sm font-bold text-[#10275F]">
                  {selectedDate}{" "}
                  •{" "}
                  {selectedStartTime}{" "}
                  -{" "}
                  {selectedEndTime}
                </p>

              </div>

            </div>

          </div>

          {/* =================================================
              BUTTONS
          ================================================= */}

          <div className="flex flex-col-reverse gap-3 border-t border-[#D5E2F7] pt-5 sm:flex-row sm:justify-end">

            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-xl border border-[#D5E2F7] bg-white px-5 py-3 text-sm font-bold text-[#10275F] transition hover:bg-[#EEF4FF] hover:border-[#B8CCEC] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex min-w-32 items-center justify-center gap-2 rounded-xl bg-[#102D72] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#0C245C] disabled:cursor-not-allowed disabled:opacity-70"
            >

              {isSubmitting ? (
                <>
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />

                  Booking...
                </>
              ) : (
                "Book Room"
              )}

            </button>

          </div>

        </form>

      </div>

    </div>
  );
}