"use client";

import {
  CalendarDays,
  Check,
  Clock,
  MapPin,
} from "lucide-react";

interface BookingSuccessProps {
  roomName: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  onClose: () => void;
}

export default function BookingSuccess({
  roomName,
  title,
  date,
  startTime,
  endTime,
  onClose,
}: BookingSuccessProps) {
  const formattedDate = new Date(
    `${date}T00:00:00`
  ).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#071B45]/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-success-title"
    >
      <div className="max-h-screen w-full max-w-lg overflow-y-auto overflow-hidden rounded-3xl border border-[#D5E2F7] bg-white shadow-2xl">

        {/* =================================================
            SUCCESS HEADER
        ================================================= */}

        <div className="bg-[#102D72] px-6 py-8 text-center text-white">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
            <Check
              size={34}
              strokeWidth={3}
              className="text-[#1D55B8]"
            />
          </div>

          <h2
            id="booking-success-title"
            className="mt-5 text-2xl font-bold"
          >
            Booking Confirmed!
          </h2>

          <p className="mt-2 text-sm text-white/80">
            Your conference room has been booked
            successfully.
          </p>

        </div>

        {/* =================================================
            SUCCESS CONTENT
        ================================================= */}

        <div className="p-6">

          {/* Message */}

          <div className="mb-6 text-center">

            <p className="text-lg font-bold text-[#10275F]">
              See you there! 👋
            </p>

            <p className="mt-1 text-sm text-[#64748B]">
              Please arrive on time for your meeting.
            </p>

          </div>

          {/* =================================================
              BOOKING DETAILS
          ================================================= */}

          <div className="rounded-2xl border border-[#D5E2F7] bg-[#F6F9FF] p-5">

            {/* Conference Room */}

            <div className="mb-5">

              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#64748B]">
                Conference Room
              </p>

              <p className="mt-1 text-xl font-bold text-[#10275F]">
                {roomName}
              </p>

            </div>

            {/* Meeting */}

            <div className="mb-5">

              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#64748B]">
                Meeting
              </p>

              <p className="mt-1 font-semibold text-[#10275F]">
                {title}
              </p>

            </div>

            {/* Date */}

            <div className="mb-4 flex items-center gap-3">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-[#D5E2F7]">
                <CalendarDays
                  size={18}
                  className="text-[#1D55B8]"
                />
              </div>

              <div>

                <p className="text-xs text-[#64748B]">
                  Date
                </p>

                <p className="text-sm font-semibold text-[#10275F]">
                  {formattedDate}
                </p>

              </div>

            </div>

            {/* Time */}

            <div className="mb-4 flex items-center gap-3">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-[#D5E2F7]">
                <Clock
                  size={18}
                  className="text-[#1D55B8]"
                />
              </div>

              <div>

                <p className="text-xs text-[#64748B]">
                  Time
                </p>

                <p className="text-sm font-semibold text-[#10275F]">
                  {startTime} – {endTime}
                </p>

              </div>

            </div>

            {/* Location */}

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-[#D5E2F7]">
                <MapPin
                  size={18}
                  className="text-[#1D55B8]"
                />
              </div>

              <div>

                <p className="text-xs text-[#64748B]">
                  Location
                </p>

                <p className="text-sm font-semibold text-[#10275F]">
                  Main Office
                </p>

              </div>

            </div>

          </div>

          {/* =================================================
              REMINDER
          ================================================= */}

          <div className="mt-5 rounded-xl border border-[#D5E2F7] bg-[#EEF4FF] px-4 py-3 text-center">

            <p className="text-sm font-medium text-[#10275F]">
              Your meeting is scheduled. See you there
              on time! 😊
            </p>

          </div>

          {/* =================================================
              DONE BUTTON
          ================================================= */}

          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-xl bg-[#102D72] px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0C245C]"
          >
            Done
          </button>

        </div>

      </div>
    </div>
  );
}