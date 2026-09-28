"use client";

import {
  Monitor,
  Presentation,
  Tv,
  Users,
  Wifi,
  Search,
  Loader2,
  AlertCircle,
  MapPin,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { format } from "date-fns";

import BookingModal from "@/components/bookings/BookingModal";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

/* =====================================================
   ROOM TYPE
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

/* =====================================================
   COMPONENT
===================================================== */

export default function RoomsContent() {
  /* ===================================================
     STATE
  =================================================== */

  const [rooms, setRooms] =
    useState<Room[]>([]);

  const [bookingRoom, setBookingRoom] =
    useState<Room | null>(null);

  const [search, setSearch] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /* ===================================================
     TODAY
  =================================================== */

  const today = format(
    new Date(),
    "yyyy-MM-dd"
  );

  /* ===================================================
     FETCH ROOMS
  =================================================== */

  async function fetchRooms() {
    try {
      setIsLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/rooms`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load rooms"
        );
      }

      if (!data.success) {
        throw new Error(
          data.message ||
            "Failed to load rooms"
        );
      }

      setRooms(
        data.rooms || []
      );
    } catch (error) {
      console.error(
        "Fetch rooms error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load conference rooms"
      );
    } finally {
      setIsLoading(false);
    }
  }

  /* ===================================================
     LOAD ROOMS
  =================================================== */

  useEffect(() => {
    fetchRooms();
  }, []);

  /* ===================================================
     SEARCH
  =================================================== */

  const filteredRooms =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return rooms;
      }

      return rooms.filter(
        (room) => {
          return (
            room.name
              .toLowerCase()
              .includes(query) ||

            room.location
              .toLowerCase()
              .includes(query) ||

            room.description
              ?.toLowerCase()
              .includes(query) ||

            room.facilities.some(
              (facility) =>
                facility
                  .toLowerCase()
                  .includes(query)
            )
          );
        }
      );
    }, [rooms, search]);

  /* ===================================================
     OPEN BOOKING MODAL
  =================================================== */

  function handleBookRoom(
    room: Room
  ) {
    setBookingRoom(room);
  }

  /* ===================================================
     CLOSE BOOKING MODAL
  =================================================== */

  function handleCloseBooking() {
    setBookingRoom(null);
  }

  /* ===================================================
     LOADING STATE
  =================================================== */

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#EEF4FF] p-5 md:p-8 lg:p-10">

        <div className="flex min-h-[500px] items-center justify-center">

          <div className="flex flex-col items-center gap-3 text-sm font-medium text-[#64748B]">

            <Loader2
              size={28}
              className="animate-spin text-[#1D55B8]"
            />

            <p>
              Loading conference rooms...
            </p>

          </div>

        </div>

      </div>
    );
  }

  /* ===================================================
     ERROR STATE
  =================================================== */

  if (error) {
    return (
      <div className="min-h-screen bg-[#EEF4FF] p-5 md:p-8 lg:p-10">

        <div className="mb-8">

          <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-[#E83B32]">
            Conference Rooms
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-[#10275F] md:text-4xl">
            Rooms
          </h1>

        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">

          <div className="flex items-start gap-3 text-red-700">

            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div>

              <h2 className="font-bold">
                Unable to load rooms
              </h2>

              <p className="mt-1 text-sm">
                {error}
              </p>

              <button
                type="button"
                onClick={fetchRooms}
                className="mt-4 rounded-xl bg-[#E83B32] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#CF3028]"
              >
                Try Again
              </button>

            </div>

          </div>

        </div>

      </div>
    );
  }

  /* ===================================================
     MAIN UI
  =================================================== */

  return (
    <div className="min-h-screen bg-[#EEF4FF] p-5 md:p-8 lg:p-10">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="mb-7">

        <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-[#E83B32]">
          Conference Rooms
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-[#10275F] md:text-4xl">
          Rooms
        </h1>

        <p className="mt-2 text-[#64748B]">
          Find the perfect conference room for your
          next meeting.
        </p>

      </div>

      {/* =================================================
          SEARCH
      ================================================= */}

      <div className="mb-6">

        <div className="relative max-w-md">

          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1D55B8]"
          />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search rooms, location or facilities..."
            className="h-11 w-full rounded-xl border border-[#D5E2F7] bg-white pl-10 pr-4 text-sm text-[#10275F] placeholder:text-[#94A3B8] outline-none transition hover:border-[#B8CCEC] focus:border-[#1D55B8] focus:ring-2 focus:ring-[#1D55B8]/10"
          />

        </div>

      </div>

      {/* =================================================
          EMPTY STATE
      ================================================= */}

      {filteredRooms.length === 0 ? (

        <div className="rounded-2xl border border-[#D5E2F7] bg-white p-12 text-center shadow-sm">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF4FF]">

            <Search
              size={24}
              className="text-[#1D55B8]"
            />

          </div>

          <h2 className="mt-4 text-lg font-bold text-[#10275F]">
            No rooms found
          </h2>

          <p className="mt-2 text-sm text-[#64748B]">
            {rooms.length === 0
              ? "There are currently no active conference rooms."
              : "Try changing your search."}
          </p>

        </div>

      ) : (

        /* =================================================
           ROOM GRID
        ================================================= */

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">

          {filteredRooms.map(
            (room) => (

              <div
                key={room._id}
                className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#D5E2F7] bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#B8CCEC] hover:shadow-md"
              >

                {/* =====================================
                    ROOM COLOR
                ===================================== */}

                <div className="h-1.5 bg-[#102D72]" />

                <div className="flex flex-1 flex-col p-5">

                  {/* ===================================
                      ROOM HEADER
                  =================================== */}

                  <div className="mb-4">

                    <div className="flex items-start justify-between gap-3">

                      <div className="min-w-0">

                        <h2 className="truncate text-xl font-bold text-[#10275F]">
                          {room.name}
                        </h2>

                        <div className="mt-1 flex items-center gap-1.5 text-sm text-[#64748B]">

                          <MapPin
                            size={13}
                            className="shrink-0 text-[#1D55B8]"
                          />

                          <span className="truncate">
                            {room.location}
                          </span>

                        </div>

                      </div>

                      {/* STATUS */}

                      <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-700">
                        Available
                      </span>

                    </div>

                  </div>

                  {/* ===================================
                      CAPACITY
                  =================================== */}

                  <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#D5E2F7] bg-[#F6F9FF] p-3">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-[#D5E2F7]">

                      <Users
                        size={18}
                        className="text-[#1D55B8]"
                      />

                    </div>

                    <div>

                      <p className="text-[11px] text-[#64748B]">
                        Capacity
                      </p>

                      <p className="text-sm font-bold text-[#10275F]">
                        {room.capacity}{" "}
                        People
                      </p>

                    </div>

                  </div>

                  {/* ===================================
                      DESCRIPTION
                  =================================== */}

                  {room.description && (

                    <p className="mb-4 line-clamp-2 text-sm leading-5 text-[#64748B]">
                      {room.description}
                    </p>

                  )}

                  {/* ===================================
                      FACILITIES
                  =================================== */}

                  <div className="flex-1">

                    <p className="mb-2.5 text-sm font-bold text-[#10275F]">
                      Facilities
                    </p>

                    {room.facilities.length > 0 ? (

                      <div className="grid grid-cols-2 gap-2">

                        {room.facilities.map(
                          (facility) => (

                            <div
                              key={facility}
                              className="flex min-w-0 items-center gap-2 rounded-lg border border-[#D5E2F7] bg-[#F6F9FF] px-2.5 py-2 text-xs font-medium text-[#64748B]"
                            >

                              {/* PROJECTOR */}

                              {facility ===
                                "Projector" && (

                                <Presentation
                                  size={13}
                                  className="shrink-0 text-[#1D55B8]"
                                />

                              )}

                              {/* WHITEBOARD */}

                              {facility ===
                                "Whiteboard" && (

                                <Monitor
                                  size={13}
                                  className="shrink-0 text-[#1D55B8]"
                                />

                              )}

                              {/* TV */}

                              {facility ===
                                "TV Display" && (

                                <Tv
                                  size={13}
                                  className="shrink-0 text-[#1D55B8]"
                                />

                              )}

                              {/* WIFI */}

                              {facility ===
                                "Wi-Fi" && (

                                <Wifi
                                  size={13}
                                  className="shrink-0 text-[#1D55B8]"
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

                      <p className="text-xs text-[#94A3B8]">
                        No facilities listed
                      </p>

                    )}

                  </div>

                  {/* ===================================
                      BOOK ROOM BUTTON
                  =================================== */}

                  <button
                    type="button"
                    onClick={() =>
                      handleBookRoom(
                        room
                      )
                    }
                    className="mt-5 w-full rounded-xl bg-[#102D72] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0C245C] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#1D55B8] focus:ring-offset-2"
                  >
                    BOOK ROOM
                  </button>

                </div>

              </div>

            )
          )}

        </div>

      )}

      {/* =================================================
          BOOKING MODAL
      ================================================= */}

      {bookingRoom && (

        <BookingModal
          isOpen={true}
          roomId={bookingRoom._id}
          roomName={bookingRoom.name}
          selectedDate={today}
          onClose={
            handleCloseBooking
          }
        />

      )}

    </div>
  );
}