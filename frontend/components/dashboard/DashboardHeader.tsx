"use client";

export default function DashboardHeader() {
  return (
    <section className="mb-8">
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        {/* =================================================
            HEADER TEXT
        ================================================= */}

        <div>
          <p
            className="
              mb-2
              text-sm
              font-bold
              uppercase
              tracking-[0.2em]
              text-[#E83B32]
            "
          >
            Conference Rooms
          </p>

          <h1
            className="
              text-3xl
              font-bold
              tracking-tight
              text-[#10275F]
              md:text-4xl
            "
          >
            Room Availability
          </h1>

          <p
            className="
              mt-2
              text-[#64748B]
            "
          >
            Find and book a conference room
            for your meeting.
          </p>
        </div>

        {/* =================================================
            VIEW SWITCHER
        ================================================= */}

        <div
          className="
            flex
            w-fit
            rounded-xl
            border
            border-[#D5E2F7]
            bg-white
            p-1
            shadow-sm
          "
        >
          {/* DAY */}

          <button
            type="button"
            className="
              rounded-lg
              bg-[#102D72]
              px-5
              py-2
              text-sm
              font-bold
              text-white
              shadow-sm
              transition
              hover:bg-[#0C245C]
            "
          >
            Day
          </button>

          {/* WEEK */}

          <button
            type="button"
            className="
              rounded-lg
              px-5
              py-2
              text-sm
              font-medium
              text-[#10275F]
              transition
              hover:bg-[#EEF4FF]
              hover:text-[#1D55B8]
            "
          >
            Week
          </button>

          {/* MONTH */}

          <button
            type="button"
            className="
              rounded-lg
              px-5
              py-2
              text-sm
              font-medium
              text-[#10275F]
              transition
              hover:bg-[#EEF4FF]
              hover:text-[#1D55B8]
            "
          >
            Month
          </button>
        </div>
      </div>
    </section>
  );
}