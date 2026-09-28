"use client";

import {
  Monitor,
  Presentation,
  Tv,
  Users,
  Wifi,
  MapPin,
} from "lucide-react";

/* =====================================================
   TYPES
===================================================== */

interface Room {
  _id: string;
  name: string;
  capacity: number;
  location: string;
  description?: string;
  facilities: string[];
  isActive: boolean;
}

interface Booking {
  _id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  status:
    | "UPCOMING"
    | "COMPLETED"
    | "CANCELLED";
}

interface RoomCardProps {
  room: Room;
  booking?: Booking;
  onBook: (room: Room) => void;
}

/* =====================================================
   COMPONENT
===================================================== */

export default function RoomCard({
  room,
  booking,
  onBook,
}: RoomCardProps) {
  const isBooked =
    !!booking &&
    booking.status !== "CANCELLED";

  return (
    <div
      className="
        flex
        h-full
        flex-col
        overflow-hidden
        rounded-2xl
        border
        border-[#D5E2F7]
        bg-white
        shadow-sm
        transition
        duration-200
        hover:-translate-y-0.5
        hover:border-[#B8CCEC]
        hover:shadow-lg
      "
    >
      {/* =================================================
          TOP ACCENT
      ================================================= */}

      <div className="h-1.5 bg-[#102D72]" />

      <div className="flex flex-1 flex-col p-5">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-4">

          <div className="flex items-start justify-between gap-3">

            <div className="min-w-0">

              <h2
                className="
                  truncate
                  text-xl
                  font-bold
                  text-[#10275F]
                "
              >
                {room.name}
              </h2>

              <div
                className="
                  mt-1
                  flex
                  items-center
                  gap-1
                  text-xs
                  text-[#64748B]
                "
              >
                <MapPin
                  size={13}
                  className="
                    shrink-0
                    text-[#1D55B8]
                  "
                />

                <span className="truncate">
                  {room.location}
                </span>
              </div>

            </div>

            {/* =================================================
                STATUS
            ================================================= */}

            <span
              className={`
                shrink-0
                rounded-full
                px-2.5
                py-1
                text-[9px]
                font-bold
                tracking-wide
                ${
                  isBooked
                    ? "bg-red-50 text-[#E83B32]"
                    : "bg-[#EAF7F0] text-[#159447]"
                }
              `}
            >
              {isBooked
                ? "BOOKED"
                : "AVAILABLE"}
            </span>

          </div>

        </div>

        {/* =================================================
            CAPACITY
        ================================================= */}

        <div
          className="
            mb-4
            flex
            items-center
            gap-2.5
            rounded-xl
            border
            border-[#D5E2F7]
            bg-[#F6F9FF]
            p-3
          "
        >

          <div
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-lg
              bg-[#EEF4FF]
            "
          >
            <Users
              size={16}
              className="text-[#1D55B8]"
            />
          </div>

          <div>

            <p
              className="
                text-[10px]
                font-medium
                text-[#64748B]
              "
            >
              Capacity
            </p>

            <p
              className="
                text-xs
                font-bold
                text-[#10275F]
              "
            >
              {room.capacity} People
            </p>

          </div>

        </div>

        {/* =================================================
            DESCRIPTION
        ================================================= */}

        {room.description && (
          <p
            className="
              mb-4
              line-clamp-2
              text-xs
              leading-5
              text-[#64748B]
            "
          >
            {room.description}
          </p>
        )}

        {/* =================================================
            EXISTING BOOKING
        ================================================= */}

        {isBooked && booking && (
          <div
            className="
              mb-4
              rounded-xl
              border
              border-red-100
              bg-red-50
              px-3
              py-2.5
            "
          >

            <p
              className="
                text-[10px]
                font-semibold
                text-[#E83B32]
              "
            >
              Booked
            </p>

            <p
              className="
                mt-0.5
                line-clamp-1
                text-xs
                font-bold
                text-[#10275F]
              "
            >
              {booking.title}
            </p>

            <p
              className="
                mt-0.5
                text-[10px]
                text-[#64748B]
              "
            >
              {booking.startTime} -{" "}
              {booking.endTime}
            </p>

          </div>
        )}

        {/* =================================================
            FACILITIES
        ================================================= */}

        <div className="flex-1">

          <p
            className="
              mb-2
              text-xs
              font-bold
              text-[#10275F]
            "
          >
            Facilities
          </p>

          {room.facilities.length > 0 ? (

            <div className="grid grid-cols-2 gap-1.5">

              {room.facilities.map(
                (facility) => (

                  <div
                    key={facility}
                    className="
                      flex
                      min-w-0
                      items-center
                      gap-1.5
                      rounded-lg
                      border
                      border-[#D5E2F7]
                      bg-[#F6F9FF]
                      px-2
                      py-1.5
                      text-[10px]
                      font-medium
                      text-[#64748B]
                    "
                  >

                    {facility ===
                      "Projector" && (
                      <Presentation
                        size={12}
                        className="
                          shrink-0
                          text-[#1D55B8]
                        "
                      />
                    )}

                    {facility ===
                      "Whiteboard" && (
                      <Monitor
                        size={12}
                        className="
                          shrink-0
                          text-[#1D55B8]
                        "
                      />
                    )}

                    {facility ===
                      "TV Display" && (
                      <Tv
                        size={12}
                        className="
                          shrink-0
                          text-[#1D55B8]
                        "
                      />
                    )}

                    {facility ===
                      "Wi-Fi" && (
                      <Wifi
                        size={12}
                        className="
                          shrink-0
                          text-[#1D55B8]
                        "
                      />
                    )}

                    <span className="truncate">
                      {facility}
                    </span>

                  </div>

                )
              )}

            </div>

          ) : (

            <p
              className="
                text-[10px]
                text-[#94A3B8]
              "
            >
              No facilities listed
            </p>

          )}

        </div>

        {/* =================================================
            BOOK BUTTON
        ================================================= */}

        <button
          type="button"
          onClick={() =>
            onBook(room)
          }
          disabled={isBooked}
          className={`
            mt-5
            w-full
            rounded-xl
            px-3
            py-3
            text-xs
            font-bold
            tracking-wide
            text-white
            transition
            active:scale-[0.98]
            focus:outline-none
            focus:ring-2
            focus:ring-[#1D55B8]
            focus:ring-offset-2
            ${
              isBooked
                ? "cursor-not-allowed bg-[#94A3B8]"
                : "bg-[#102D72] hover:bg-[#0C245C]"
            }
          `}
        >
          {isBooked
            ? "ROOM BOOKED"
            : "BOOK ROOM"}
        </button>

      </div>

    </div>
  );
}