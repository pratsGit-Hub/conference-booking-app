"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";

import {
  Clock,
  Loader2,
} from "lucide-react";

import DashboardHeader from "./DashboardHeader";
import DateNavigation from "./DateNavigation";
import RoomFilters from "./RoomFilters";
import RoomCard from "./RoomCard";

import BookingModal from "../bookings/BookingModal";

/* =====================================================
   API
===================================================== */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

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

  room:
    | string
    | {
        _id: string;
        name: string;
      };

  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description?: string;

  status:
    | "UPCOMING"
    | "COMPLETED"
    | "CANCELLED";
}

interface AvailabilityResponse {
  success: boolean;
  date: string;
  startTime: string;
  endTime: string;
  bookedRoomIds: string[];
  message?: string;
}

/* =====================================================
   DANGOTE COLOUR PALETTE
===================================================== */

const COLORS = {
  navy: "#102D72",
  deepNavy: "#0C245C",
  blue: "#1D55B8",
  hoverBlue: "#17438F",
  lightBlue: "#EEF4FF",
  softBlue: "#F6F9FF",
  borderBlue: "#D5E2F7",
  text: "#10275F",
  muted: "#64748B",
  red: "#E83B32",
} as const;

/* =====================================================
   TIME SETTINGS
===================================================== */

const BUSINESS_START_MINUTES = 8 * 60;
const BUSINESS_END_MINUTES = 20 * 60;

const SLOT_DURATION_MINUTES = 60;
const SLOT_STEP_MINUTES = 15;

/* =====================================================
   TIME HELPERS
===================================================== */

function minutesToTime(
  totalMinutes: number
): string {
  const hours = Math.floor(
    totalMinutes / 60
  );

  const minutes =
    totalMinutes % 60;

  return `${String(hours).padStart(
    2,
    "0"
  )}:${String(minutes).padStart(
    2,
    "0"
  )}`;
}

function timeToMinutes(
  time: string
): number {
  const [hours, minutes] =
    time.split(":").map(Number);

  return hours * 60 + minutes;
}

/* =====================================================
   GENERATE ALL BUSINESS TIME SLOTS
===================================================== */

function generateTimeSlots() {
  const slots: {
    startTime: string;
    endTime: string;
    label: string;
  }[] = [];

  for (
    let start =
      BUSINESS_START_MINUTES;

    start +
      SLOT_DURATION_MINUTES <=
    BUSINESS_END_MINUTES;

    start += SLOT_STEP_MINUTES
  ) {
    const end =
      start +
      SLOT_DURATION_MINUTES;

    const startTime =
      minutesToTime(start);

    const endTime =
      minutesToTime(end);

    slots.push({
      startTime,
      endTime,
      label: `${startTime} - ${endTime}`,
    });
  }

  return slots;
}

const ALL_TIME_SLOTS =
  generateTimeSlots();

/* =====================================================
   COMPONENT
===================================================== */

export default function DashboardContent() {
  /* ===================================================
     STATE
  =================================================== */

  const [rooms, setRooms] =
    useState<Room[]>([]);

  const [bookings, setBookings] =
    useState<Booking[]>([]);

  const [selectedDate, setSelectedDate] =
    useState<Date>(new Date());

  const [
    selectedStartTime,
    setSelectedStartTime,
  ] = useState("10:00");

  const [
    selectedEndTime,
    setSelectedEndTime,
  ] = useState("11:00");

  const [
    bookedRoomIds,
    setBookedRoomIds,
  ] = useState<string[]>([]);

  const [
    availabilityLoading,
    setAvailabilityLoading,
  ] = useState(false);

  const [
    availabilityError,
    setAvailabilityError,
  ] = useState("");

  const [
    selectedLocation,
    setSelectedLocation,
  ] = useState(
    "All Locations"
  );

  const [
    selectedRoom,
    setSelectedRoom,
  ] = useState("All Rooms");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    bookingRoom,
    setBookingRoom,
  ] = useState<Room | null>(null);

  /* ===================================================
     FORMAT DATE
  =================================================== */

  function formatDate(date: Date) {
    const year =
      date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  /* ===================================================
     CHECK IF SELECTED DATE IS TODAY
  =================================================== */

  function isToday(date: Date) {
    const today =
      new Date();

    return (
      date.getFullYear() ===
        today.getFullYear() &&
      date.getMonth() ===
        today.getMonth() &&
      date.getDate() ===
        today.getDate()
    );
  }

  /* ===================================================
     AVAILABLE TIME SLOTS

     For TODAY:
     Hide slots that have already started.

     For FUTURE DATES:
     Show all business-hour slots.
  =================================================== */

  const availableTimeSlots =
    useMemo(() => {
      const slots =
        [...ALL_TIME_SLOTS];

      if (!isToday(selectedDate)) {
        return slots;
      }

      const now =
        new Date();

      const currentMinutes =
        now.getHours() * 60 +
        now.getMinutes();

      return slots.filter(
        (slot) => {
          const slotStart =
            timeToMinutes(
              slot.startTime
            );

          return (
            slotStart >
            currentMinutes
          );
        }
      );
    }, [selectedDate]);

  /* ===================================================
     CHECK WHETHER CURRENT TIME SLOT IS VALID
  =================================================== */

  const selectedTimeSlotIsValid =
    useMemo(() => {
      return availableTimeSlots.some(
        (slot) =>
          slot.startTime ===
            selectedStartTime &&
          slot.endTime ===
            selectedEndTime
      );
    }, [
      availableTimeSlots,
      selectedStartTime,
      selectedEndTime,
    ]);

  /* ===================================================
     AUTO-SELECT A VALID TIME SLOT
  =================================================== */

  useEffect(() => {
    if (
      availableTimeSlots.length ===
      0
    ) {
      return;
    }

    const currentSlot =
      availableTimeSlots.find(
        (slot) =>
          slot.startTime ===
            selectedStartTime &&
          slot.endTime ===
            selectedEndTime
      );

    if (currentSlot) {
      return;
    }

    const firstSlot =
      availableTimeSlots[0];

    setSelectedStartTime(
      firstSlot.startTime
    );

    setSelectedEndTime(
      firstSlot.endTime
    );
  }, [
    availableTimeSlots,
    selectedStartTime,
    selectedEndTime,
  ]);

  /* ===================================================
     FETCH ROOMS
  =================================================== */

  async function fetchRooms() {
    try {
      const response =
        await fetch(
          `${API_URL}/api/rooms`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
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

      setRooms(
        data.rooms || []
      );
    } catch (error) {
      console.error(
        "Fetch rooms error:",
        error
      );

      throw error;
    }
  }

  /* ===================================================
     FETCH MY BOOKINGS
  =================================================== */

  async function fetchBookings() {
    try {
      const response =
        await fetch(
          `${API_URL}/api/bookings/my`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load bookings"
        );
      }

      setBookings(
        data.bookings || []
      );
    } catch (error) {
      console.error(
        "Fetch bookings error:",
        error
      );

      throw error;
    }
  }

  /* ===================================================
     FETCH ROOM AVAILABILITY
  =================================================== */

  async function fetchAvailability(
    signal?: AbortSignal
  ) {
    try {
      if (
        availableTimeSlots.length ===
          0 ||
        !selectedTimeSlotIsValid
      ) {
        setBookedRoomIds([]);
        setAvailabilityError("");
        setAvailabilityLoading(false);

        return;
      }

      setAvailabilityLoading(
        true
      );

      setAvailabilityError("");

      const date =
        formatDate(selectedDate);

      const params =
        new URLSearchParams({
          date,
          startTime:
            selectedStartTime,
          endTime:
            selectedEndTime,
        });

      const response =
        await fetch(
          `${API_URL}/api/bookings/availability?${params.toString()}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            signal,
          }
        );

      const data: AvailabilityResponse =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to check room availability"
        );
      }

      setBookedRoomIds(
        data.bookedRoomIds || []
      );
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      console.error(
        "Availability error:",
        error
      );

      setBookedRoomIds([]);

      setAvailabilityError(
        error instanceof Error
          ? error.message
          : "Unable to check room availability"
      );
    } finally {
      if (!signal?.aborted) {
        setAvailabilityLoading(
          false
        );
      }
    }
  }

  /* ===================================================
     LOAD DASHBOARD
  =================================================== */

  async function loadDashboardData() {
    try {
      setLoading(true);
      setError("");

      await Promise.all([
        fetchRooms(),
        fetchBookings(),
      ]);
    } catch (error) {
      console.error(
        "Dashboard loading error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to load dashboard"
      );
    } finally {
      setLoading(false);
    }
  }

  /* ===================================================
     INITIAL LOAD
  =================================================== */

  useEffect(() => {
    loadDashboardData();
  }, []);

  /* ===================================================
     CHECK AVAILABILITY WHEN DATE/TIME CHANGES
  =================================================== */

  useEffect(() => {
    if (loading) {
      return;
    }

    if (
      availableTimeSlots.length ===
        0 ||
      !selectedTimeSlotIsValid
    ) {
      setBookedRoomIds([]);
      setAvailabilityError("");
      setAvailabilityLoading(false);

      return;
    }

    const controller =
      new AbortController();

    fetchAvailability(
      controller.signal
    );

    return () => {
      controller.abort();
    };
  }, [
    selectedDate,
    selectedStartTime,
    selectedEndTime,
    loading,
    availableTimeSlots,
    selectedTimeSlotIsValid,
  ]);

  /* ===================================================
     LOCATIONS
  =================================================== */

  const locations = useMemo(() => {
    const uniqueLocations =
      Array.from(
        new Set(
          rooms
            .filter(
              (room) =>
                room.isActive
            )
            .map(
              (room) =>
                room.location
            )
        )
      );

    return [
      "All Locations",
      ...uniqueLocations,
    ];
  }, [rooms]);

  /* ===================================================
     FILTER ROOMS
  =================================================== */

  const filteredRooms =
    useMemo(() => {
      return rooms.filter(
        (room) => {
          if (!room.isActive) {
            return false;
          }

          if (
            bookedRoomIds.includes(
              room._id
            )
          ) {
            return false;
          }

          const locationMatches =
            selectedLocation ===
              "All Locations" ||
            room.location ===
              selectedLocation;

          const roomMatches =
            selectedRoom ===
              "All Rooms" ||
            room._id ===
              selectedRoom;

          return (
            locationMatches &&
            roomMatches
          );
        }
      );
    }, [
      rooms,
      bookedRoomIds,
      selectedLocation,
      selectedRoom,
    ]);

  /* ===================================================
     GET BOOKING FOR ROOM
  =================================================== */

  function getRoomBooking(
    roomId: string
  ): Booking | undefined {
    const date =
      formatDate(selectedDate);

    return bookings.find(
      (booking) => {
        if (
          booking.date !== date
        ) {
          return false;
        }

        if (
          booking.status ===
          "CANCELLED"
        ) {
          return false;
        }

        const bookingRoomId =
          typeof booking.room ===
          "string"
            ? booking.room
            : booking.room._id;

        return (
          bookingRoomId ===
          roomId
        );
      }
    );
  }

  /* ===================================================
     BOOK ROOM
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

    loadDashboardData();
  }

  /* ===================================================
     TIME SLOT CHANGE
  =================================================== */

  function handleTimeSlotChange(
    event: ChangeEvent<HTMLSelectElement>
  ) {
    const selectedSlot =
      availableTimeSlots.find(
        (slot) =>
          slot.label ===
          event.target.value
      );

    if (!selectedSlot) {
      return;
    }

    setSelectedStartTime(
      selectedSlot.startTime
    );

    setSelectedEndTime(
      selectedSlot.endTime
    );
  }

  /* ===================================================
     DATE CHANGE
  =================================================== */

  function handleDateChange(
    date: Date
  ) {
    setSelectedDate(date);
  }

  /* ===================================================
     LOADING
  =================================================== */

  if (loading) {
    return (
      <div
        className="
          min-h-full
          space-y-6
          rounded-2xl
          bg-[#EEF4FF]
          p-1
        "
      >
        <DashboardHeader />

        <div
          className="
            rounded-2xl
            border
            border-[#D5E2F7]
            bg-white
            p-10
            text-center
            shadow-sm
          "
        >
          <div
            className="
              mx-auto
              h-8
              w-8
              animate-spin
              rounded-full
              border-4
              border-[#D5E2F7]
              border-t-[#1D55B8]
            "
          />

          <p
            className="
              mt-4
              text-sm
              font-medium
              text-[#64748B]
            "
          >
            Loading conference rooms...
          </p>
        </div>
      </div>
    );
  }

  /* ===================================================
     ERROR
  =================================================== */

  if (error) {
    return (
      <div
        className="
          min-h-full
          space-y-6
          rounded-2xl
          bg-[#EEF4FF]
          p-1
        "
      >
        <DashboardHeader />

        <div
          className="
            rounded-2xl
            border
            border-red-200
            bg-red-50
            p-6
          "
        >
          <p className="font-semibold text-red-700">
            Unable to load dashboard
          </p>

          <p className="mt-2 text-sm text-red-600">
            {error}
          </p>

          <button
            type="button"
            onClick={
              loadDashboardData
            }
            className="
              mt-4
              rounded-xl
              bg-[#102D72]
              px-4
              py-2
              text-sm
              font-semibold
              text-white
              transition
              hover:bg-[#0C245C]
            "
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  /* ===================================================
     MAIN DASHBOARD
  =================================================== */

  return (
    <>
      <div
        className="
          min-h-full
          space-y-6
          rounded-2xl
          bg-[#EEF4FF]
          p-1
        "
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <DashboardHeader />

        {/* =================================================
            DATE / TIME / FILTERS
        ================================================= */}

        <div
          className="
            flex
            flex-col
            gap-4
            rounded-2xl
            border
            border-[#D5E2F7]
            bg-white
            p-4
            shadow-sm
            lg:flex-row
            lg:items-center
            lg:justify-between
          "
        >
          <div
            className="
              flex
              flex-col
              gap-3
              sm:flex-row
              sm:items-center
            "
          >
            {/* DATE */}

            <DateNavigation
              selectedDate={
                selectedDate
              }
              onDateChange={
                handleDateChange
              }
            />

            {/* TIME */}

            <div
              className="
                flex
                h-[74px]
                min-w-[230px]
                items-center
                gap-3
                rounded-2xl
                border
                border-[#D5E2F7]
                bg-[#F6F9FF]
                px-4
                shadow-sm
              "
            >
              <div
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-[#102D72]
                "
              >
                <Clock
                  size={19}
                  className="text-white"
                />
              </div>

              <div
                className="
                  min-w-0
                  flex-1
                "
              >
                <p
                  className="
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-wider
                    text-[#64748B]
                  "
                >
                  Time Slot
                </p>

                {availableTimeSlots.length >
                0 ? (
                  <select
                    value={
                      selectedTimeSlotIsValid
                        ? `${selectedStartTime} - ${selectedEndTime}`
                        : ""
                    }
                    onChange={
                      handleTimeSlotChange
                    }
                    className="
                      mt-0.5
                      w-full
                      cursor-pointer
                      bg-transparent
                      text-sm
                      font-semibold
                      text-[#10275F]
                      outline-none
                    "
                    aria-label="Select time slot"
                  >
                    {availableTimeSlots.map(
                      (slot) => (
                        <option
                          key={
                            slot.label
                          }
                          value={
                            slot.label
                          }
                        >
                          {
                            slot.label
                          }
                        </option>
                      )
                    )}
                  </select>
                ) : (
                  <p
                    className="
                      mt-1
                      text-sm
                      font-semibold
                      text-[#E83B32]
                    "
                  >
                    No slots left today
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* FILTERS */}

          <RoomFilters
            locations={
              locations
            }
            selectedLocation={
              selectedLocation
            }
            onLocationChange={
              setSelectedLocation
            }
            rooms={rooms.filter(
              (room) =>
                room.isActive
            )}
            selectedRoom={
              selectedRoom
            }
            onRoomChange={
              setSelectedRoom
            }
          />
        </div>

        {/* =================================================
            ROOM HEADER
        ================================================= */}

        <div
          className="
            flex
            flex-col
            gap-3
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div>
            <h2
              className="
                text-xl
                font-semibold
                text-[#10275F]
              "
            >
              {selectedDate.toLocaleDateString(
                "en-US",
                {
                  month: "long",
                  day: "numeric",
                }
              )}{" "}
              Rooms
            </h2>

            <p
              className="
                mt-1
                text-sm
                text-[#64748B]
              "
            >
              Available rooms for{" "}

              {availableTimeSlots.length >
              0 ? (
                <span
                  className="
                    font-semibold
                    text-[#1D55B8]
                  "
                >
                  {selectedStartTime} -{" "}
                  {selectedEndTime}
                </span>
              ) : (
                <span
                  className="
                    font-semibold
                    text-[#E83B32]
                  "
                >
                  No available time slot
                </span>
              )}
            </p>
          </div>

          <div
            className="
              flex
              items-center
              gap-3
            "
          >
            {availabilityLoading && (
              <div
                className="
                  flex
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-[#D5E2F7]
                  bg-white
                  px-4
                  py-2
                  text-sm
                  font-medium
                  text-[#64748B]
                  shadow-sm
                "
              >
                <Loader2
                  size={15}
                  className="
                    animate-spin
                    text-[#1D55B8]
                  "
                />

                Checking
                availability...
              </div>
            )}

            {!availabilityLoading &&
              availableTimeSlots.length >
                0 && (
                <div
                  className="
                    rounded-full
                    border
                    border-[#D5E2F7]
                    bg-white
                    px-4
                    py-2
                    text-sm
                    font-semibold
                    text-[#10275F]
                    shadow-sm
                  "
                >
                  {filteredRooms.length}{" "}

                  {filteredRooms.length ===
                  1
                    ? "Room"
                    : "Rooms"}{" "}

                  Available
                </div>
              )}
          </div>
        </div>

        {/* =================================================
            AVAILABILITY ERROR
        ================================================= */}

        {availabilityError && (
          <div
            className="
              rounded-xl
              border
              border-red-200
              bg-red-50
              px-4
              py-3
            "
          >
            <p
              className="
                text-sm
                font-medium
                text-red-600
              "
            >
              {availabilityError}
            </p>
          </div>
        )}

        {/* =================================================
            NO TIME SLOTS
        ================================================= */}

        {availableTimeSlots.length ===
        0 ? (
          <div
            className="
              rounded-2xl
              border
              border-[#D5E2F7]
              bg-white
              p-10
              text-center
              shadow-sm
            "
          >
            <div
              className="
                mx-auto
                flex
                h-14
                w-14
                items-center
                justify-center
                rounded-full
                bg-[#EEF4FF]
              "
            >
              <Clock
                size={24}
                className="text-[#1D55B8]"
              />
            </div>

            <h3
              className="
                mt-4
                text-base
                font-bold
                text-[#10275F]
              "
            >
              No time slots remaining
            </h3>

            <p
              className="
                mt-1
                text-sm
                text-[#64748B]
              "
            >
              There are no one-hour
              conference room slots
              remaining today.
            </p>

            <p
              className="
                mt-2
                text-xs
                text-[#94A3B8]
              "
            >
              Try selecting another
              date.
            </p>
          </div>
        ) : availabilityLoading ? (
          /* =================================================
             LOADING ROOMS
          ================================================= */

          <div
            className="
              rounded-2xl
              border
              border-[#D5E2F7]
              bg-white
              p-12
              text-center
              shadow-sm
            "
          >
            <Loader2
              size={30}
              className="
                mx-auto
                animate-spin
                text-[#1D55B8]
              "
            />

            <p
              className="
                mt-4
                text-sm
                text-[#64748B]
              "
            >
              Checking available
              conference rooms...
            </p>
          </div>
        ) : filteredRooms.length ===
          0 ? (
          /* =================================================
             NO ROOMS
          ================================================= */

          <div
            className="
              rounded-2xl
              border
              border-[#D5E2F7]
              bg-white
              p-10
              text-center
              shadow-sm
            "
          >
            <div
              className="
                mx-auto
                flex
                h-14
                w-14
                items-center
                justify-center
                rounded-full
                bg-[#EEF4FF]
              "
            >
              <Clock
                size={24}
                className="text-[#1D55B8]"
              />
            </div>

            <h3
              className="
                mt-4
                text-base
                font-bold
                text-[#10275F]
              "
            >
              No rooms available
            </h3>

            <p
              className="
                mt-1
                text-sm
                text-[#64748B]
              "
            >
              There are no available
              rooms for{" "}

              <span
                className="
                  font-semibold
                  text-[#1D55B8]
                "
              >
                {selectedStartTime} -{" "}
                {selectedEndTime}
              </span>
              .
            </p>

            <p
              className="
                mt-2
                text-xs
                text-[#94A3B8]
              "
            >
              Try another time slot
              or date.
            </p>
          </div>
        ) : (
          /* =================================================
             ROOMS
          ================================================= */

          <div
            className="
              grid
              grid-cols-1
              gap-5
              md:grid-cols-2
              xl:grid-cols-3
            "
          >
            {filteredRooms.map(
              (room) => {
                const booking =
                  getRoomBooking(
                    room._id
                  );

                return (
                  <RoomCard
                    key={
                      room._id
                    }
                    room={room}
                    booking={
                      booking
                    }
                    onBook={
                      handleBookRoom
                    }
                  />
                );
              }
            )}
          </div>
        )}
      </div>

      {/* =================================================
          BOOKING MODAL
      ================================================= */}

      {bookingRoom && (
        <BookingModal
          isOpen={true}
          roomId={
            bookingRoom._id
          }
          roomName={
            bookingRoom.name
          }
          selectedDate={
            formatDate(selectedDate)
          }
          selectedStartTime={
            selectedStartTime
          }
          selectedEndTime={
            selectedEndTime
          }
          onClose={
            handleCloseBooking
          }
        />
      )}
    </>
  );
}