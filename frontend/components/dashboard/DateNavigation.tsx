"use client";

import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import {
  addDays,
  format,
  isToday,
} from "date-fns";

interface DateNavigationProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export default function DateNavigation({
  selectedDate,
  onDateChange,
}: DateNavigationProps) {
  const goToPreviousDay = () => {
    onDateChange(
      addDays(selectedDate, -1)
    );
  };

  const goToNextDay = () => {
    onDateChange(
      addDays(selectedDate, 1)
    );
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  return (
    <div
      className="
        flex
        items-center
        justify-between
        rounded-2xl
        border
        border-[#D5E2F7]
        bg-white
        p-4
        shadow-sm
      "
    >
      {/* =================================================
          PREVIOUS DAY
      ================================================= */}

      <button
        type="button"
        onClick={goToPreviousDay}
        className="
          flex
          h-11
          w-11
          items-center
          justify-center
          rounded-xl
          border
          border-[#D5E2F7]
          text-[#10275F]
          transition
          hover:bg-[#EEF4FF]
          hover:text-[#1D55B8]
        "
        aria-label="Previous day"
      >
        <ChevronLeft size={20} />
      </button>

      {/* =================================================
          SELECTED DATE
      ================================================= */}

      <div className="px-4 text-center">
        <p
          className="
            text-xs
            font-semibold
            uppercase
            tracking-widest
            text-[#64748B]
          "
        >
          {isToday(selectedDate)
            ? "Today"
            : "Selected Date"}
        </p>

        <p
          className="
            mt-1
            text-lg
            font-bold
            text-[#10275F]
          "
        >
          {format(
            selectedDate,
            "MMMM d, yyyy"
          )}
        </p>

        <p
          className="
            mt-1
            text-sm
            text-[#64748B]
          "
        >
          {format(
            selectedDate,
            "EEEE"
          )}
        </p>

        {!isToday(selectedDate) && (
          <button
            type="button"
            onClick={goToToday}
            className="
              mt-2
              text-xs
              font-semibold
              text-[#1D55B8]
              transition
              hover:text-[#102D72]
              hover:underline
            "
          >
            Back to Today
          </button>
        )}
      </div>

      {/* =================================================
          NEXT DAY
      ================================================= */}

      <button
        type="button"
        onClick={goToNextDay}
        className="
          flex
          h-11
          w-11
          items-center
          justify-center
          rounded-xl
          border
          border-[#D5E2F7]
          text-[#10275F]
          transition
          hover:bg-[#EEF4FF]
          hover:text-[#1D55B8]
        "
        aria-label="Next day"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}