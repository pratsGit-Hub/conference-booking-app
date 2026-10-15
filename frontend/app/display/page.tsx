"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  DoorOpen,
  Maximize2,
  Minimize2,
  RefreshCw,
  UserRound,
  CalendarCheck,
  Building2,
  AlertCircle,
  MapPin,
} from "lucide-react";

type DisplayBooking = {
  id: string;
  meeting: string;
  room: string;
  time: string;
  date: string;
  booker: string;
};

type Room = {
  id: string;
  name: string;
};

type DisplayResponse = {
  success: boolean;
  date: string;
  timezone?: string;
  count: number;
  bookings: DisplayBooking[];
  message?: string;
};

type MeetingStatus = "Upcoming" | "In Progress" | "Completed";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

function getIndiaTime() {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date());
}

function getIndiaDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = part.value;
  }

  return `${values.year}-${values.month}-${values.day}`;
}

function formatDate(dateString: string) {
  if (!dateString) return "Date unavailable";

  const [year, month, day] = dateString.split("-").map(Number);

  if (!year || !month || !day) return dateString;

  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function timeToMinutes(time: string): number | null {
  const match = time.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);

  if (!match) return null;

  return Number(match[1]) * 60 + Number(match[2]);
}

function getBookingStatus(booking: DisplayBooking): MeetingStatus {
  const today = getIndiaDate();

  if (booking.date < today) return "Completed";
  if (booking.date > today) return "Upcoming";

  const [startTime, endTime] = booking.time
    .split("-")
    .map((value) => value.trim());

  const start = timeToMinutes(startTime || "");
  const end = timeToMinutes(endTime || "");

  if (start === null || end === null) return "Upcoming";

  const nowParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(new Date())
    .split(":")
    .map(Number);

  const nowMinutes = nowParts[0] * 60 + nowParts[1];

  if (nowMinutes < start) return "Upcoming";
  if (nowMinutes >= end) return "Completed";

  return "In Progress";
}

/**
 * Supports common room API responses:
 * { rooms: [...] }
 * { data: [...] }
 * { data: { rooms: [...] } }
 * [...]
 */
function normalizeRooms(payload: unknown): Room[] {
  let rawRooms: unknown[] = [];

  if (Array.isArray(payload)) {
    rawRooms = payload;
  } else if (payload && typeof payload === "object") {
    const response = payload as Record<string, unknown>;

    if (Array.isArray(response.rooms)) {
      rawRooms = response.rooms;
    } else if (Array.isArray(response.data)) {
      rawRooms = response.data;
    } else if (
      response.data &&
      typeof response.data === "object" &&
      Array.isArray((response.data as Record<string, unknown>).rooms)
    ) {
      rawRooms = (response.data as Record<string, unknown>).rooms as unknown[];
    }
  }

  const uniqueRooms = new Map<string, Room>();

  for (const item of rawRooms) {
    if (!item || typeof item !== "object") continue;

    const room = item as Record<string, unknown>;
    const name =
      typeof room.name === "string"
        ? room.name.trim()
        : typeof room.roomName === "string"
          ? room.roomName.trim()
          : "";

    const id = String(room._id ?? room.id ?? name).trim();

    // Ignore inactive rooms if the API provides an active flag.
    if (
      room.isActive === false ||
      room.active === false ||
      room.status === "INACTIVE" ||
      room.status === "Inactive"
    ) {
      continue;
    }

    if (name) {
      uniqueRooms.set(name.toLowerCase(), { id, name });
    }
  }

  return Array.from(uniqueRooms.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

export default function DisplayPage() {
  const [data, setData] = useState<DisplayResponse | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [clock, setClock] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [roomsError, setRoomsError] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState("ALL");

  const fetchBookings = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);

    try {
      const response = await fetch(`${API_URL}/api/display/today`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Unable to load bookings (${response.status}).`);
      }

      const result: DisplayResponse = await response.json();

      if (!result.success || !Array.isArray(result.bookings)) {
        throw new Error(result.message || "Invalid booking response.");
      }

      setData(result);
      setError("");
      setLastUpdated(getIndiaTime());
    } catch (err) {
      console.error("Display booking fetch failed:", err);
      setError(
        "Unable to connect to the booking server. Retrying automatically."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load every active room independently of today's bookings.
  const fetchRooms = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/rooms`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Unable to load rooms (${response.status}).`);
      }

      const result: unknown = await response.json();
      const roomList = normalizeRooms(result);

      setRooms(roomList);
      setRoomsError("");

      // If the selected room was removed or deactivated, reset the filter.
      setSelectedRoom((current) => {
        if (current === "ALL") return current;

        return roomList.some((room) => room.name === current)
          ? current
          : "ALL";
      });
    } catch (err) {
      console.error("Room list fetch failed:", err);
      setRoomsError(
        "Unable to load the complete room list. Please check the rooms API."
      );
    }
  }, []);

  useEffect(() => {
    const updateClock = () => setClock(getIndiaTime());

    updateClock();
    void fetchBookings();
    void fetchRooms();

    const clockInterval = window.setInterval(updateClock, 1000);
    const bookingInterval = window.setInterval(() => {
      void fetchBookings();
      void fetchRooms();
    }, 10000);

    return () => {
      window.clearInterval(clockInterval);
      window.clearInterval(bookingInterval);
    };
  }, [fetchBookings, fetchRooms]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const bookings = data?.bookings ?? [];

  const selectedRoomBookings = useMemo(
    () =>
      selectedRoom === "ALL"
        ? bookings
        : bookings.filter(
            (booking) =>
              booking.room.trim().toLowerCase() ===
              selectedRoom.trim().toLowerCase()
          ),
    [bookings, selectedRoom]
  );

  // Only upcoming and in-progress meetings appear in the table.
  const filteredBookings = useMemo(
    () =>
      selectedRoomBookings
        .filter((booking) => {
          const status = getBookingStatus(booking);
          return status === "Upcoming" || status === "In Progress";
        })
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);

          const aStart = a.time.split("-")[0]?.trim() ?? "";
          const bStart = b.time.split("-")[0]?.trim() ?? "";

          return aStart.localeCompare(bStart);
        }),
    [selectedRoomBookings, clock]
  );

  const roomsBooked = useMemo(
    () =>
      new Set(
        bookings
          .filter((booking) => {
            const status = getBookingStatus(booking);
            return status === "Upcoming" || status === "In Progress";
          })
          .map((booking) => booking.room.trim().toLowerCase())
          .filter(Boolean)
      ).size,
    [bookings, clock]
  );

  const upcomingMeetings = useMemo(
    () =>
      bookings.filter(
        (booking) => getBookingStatus(booking) === "Upcoming"
      ).length,
    [bookings, clock]
  );

  const selectedRoomUpcoming = useMemo(
    () =>
      selectedRoomBookings.filter(
        (booking) => getBookingStatus(booking) === "Upcoming"
      ).length,
    [selectedRoomBookings, clock]
  );

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen could not be toggled:", err);
    }
  };

  return (
    <main className="min-h-screen bg-[#edf4ff] text-[#132f70]">
      <header className="border-b border-[#dce7f8] bg-white px-5 py-3 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-[1800px] flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex h-12 w-24 shrink-0 items-center justify-center border-r border-[#dce7f8] pr-3 sm:h-14 sm:w-32">
              <img
                src="/dangote-logo.png"
                alt="Dangote"
                className="max-h-12 max-w-full object-contain"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                  const fallback =
                    event.currentTarget.nextElementSibling as HTMLElement | null;
                  if (fallback) fallback.style.display = "flex";
                }}
              />

              <div className="hidden flex-col items-center justify-center text-center">
                <Building2 size={22} />
                <span className="mt-1 text-[10px] font-black tracking-widest">
                  DANGOTE
                </span>
              </div>
            </div>

            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-[#142f70] sm:text-2xl lg:text-3xl">
                Conference Room Bookings
              </h1>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Today&apos;s meetings at a glance
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-stretch gap-2.5">
            <div className="flex h-[88px] items-center gap-3 rounded-[20px] border border-[#e0eaff] bg-[#f5f8ff] px-4 sm:h-[96px] sm:gap-3.5 sm:px-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e5efff] text-blue-700 sm:h-12 sm:w-12">
                <Clock3 size={25} />
              </div>

              <div>
                <p className="whitespace-nowrap text-xl font-bold tabular-nums text-[#142f70] sm:text-2xl">
                  {clock || "--:--:--"}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                  India Standard Time
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500 sm:text-xs">
                  {data?.date ? formatDate(data.date) : "Loading date..."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              className="flex h-[88px] items-center justify-center gap-2 rounded-[20px] border border-[#d9e6ff] bg-[#edf4ff] px-4 text-sm font-bold text-[#143477] transition hover:bg-[#dce9ff] focus:outline-none focus:ring-2 focus:ring-blue-400 sm:h-[96px] sm:px-5 sm:text-base"
            >
              {isFullscreen ? (
                <Minimize2 size={20} className="shrink-0" />
              ) : (
                <Maximize2 size={20} className="shrink-0" />
              )}
              <span className="whitespace-nowrap">
                {isFullscreen ? "Exit full screen" : "Full screen"}
              </span>
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1800px] space-y-7 px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
        <div
          className={`grid grid-cols-1 gap-5 ${
            selectedRoom !== "ALL" ? "md:grid-cols-2" : "md:grid-cols-3"
          }`}
        >
          <SummaryCard
            icon={<CalendarDays size={29} />}
            label={selectedRoom === "ALL" ? "Today's Meetings" : "Room Meetings"}
            value={loading ? "—" : selectedRoomBookings.length}
            iconClass="bg-blue-50 text-blue-700"
          />

          {selectedRoom === "ALL" && (
            <SummaryCard
              icon={<DoorOpen size={29} />}
              label="Rooms Booked"
              value={loading ? "—" : roomsBooked}
              iconClass="bg-emerald-50 text-emerald-600"
            />
          )}

          <SummaryCard
            icon={<CalendarCheck size={29} />}
            label={selectedRoom === "ALL" ? "Upcoming Meetings" : "Upcoming Bookings"}
            value={
              loading
                ? "—"
                : selectedRoom === "ALL"
                  ? upcomingMeetings
                  : selectedRoomUpcoming
            }
            iconClass="bg-violet-50 text-violet-600"
          />
        </div>

        <section className="overflow-hidden rounded-2xl border border-[#dfe9f8] bg-white shadow-[0_4px_12px_rgba(22,54,112,0.07)]">
          <div className="flex flex-col justify-between gap-4 border-b border-[#e5edf9] px-5 py-6 sm:px-7 lg:flex-row lg:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#153778] text-white shadow-sm">
                <CalendarDays size={27} />
              </div>

              <div>
                <h2 className="text-xl font-bold text-[#142f70] sm:text-2xl">
                  {selectedRoom === "ALL"
                    ? "Today's Schedule"
                    : `${selectedRoom} Schedule`}
                </h2>
                <p className="mt-1 text-sm text-slate-500 sm:text-base">
                  {data?.date ? formatDate(data.date) : "Loading schedule..."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
                Live Schedule
              </span>

              <span className="flex items-center gap-2 text-sm text-slate-500">
                <RefreshCw
                  size={18}
                  className={refreshing ? "animate-spin" : ""}
                />
                Auto-refreshes every 10 seconds
              </span>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="display-room-filter"
                  className="whitespace-nowrap text-sm font-medium text-slate-600"
                >
                  Room:
                </label>

                <select
                  id="display-room-filter"
                  value={selectedRoom}
                  onChange={(event) => setSelectedRoom(event.target.value)}
                  className="min-w-36 rounded-lg border border-[#d8e5fa] bg-white px-3 py-2.5 text-sm font-semibold text-[#143477] outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="ALL">All rooms</option>

                  {rooms.map((room) => (
                    <option key={room.id || room.name} value={room.name}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  void fetchBookings(true);
                  void fetchRooms();
                }}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-lg border border-[#d8e5fa] px-3 py-2 text-sm font-semibold text-[#143477] transition hover:bg-[#f2f6ff] disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>

          {(error || roomsError) && (
            <div className="mx-5 mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:mx-7">
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
              <div>
                {error && <p>{error}</p>}
                {roomsError && <p>{roomsError}</p>}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-5 py-12">
              <RefreshCw size={30} className="animate-spin text-blue-600" />
              <p className="text-sm text-slate-500">
                Loading today&apos;s bookings...
              </p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-5 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#edf4ff] text-blue-600">
                <CalendarCheck size={32} />
              </div>

              <h3 className="mt-5 text-lg font-bold text-[#142f70]">
                {selectedRoom === "ALL"
                  ? "No upcoming or in-progress meetings"
                  : `No active meetings in ${selectedRoom}`}
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                {selectedRoom === "ALL"
                  ? "There are no upcoming or in-progress meetings scheduled for today."
                  : "This room has no upcoming or in-progress meetings today. Select another room to view its schedule."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto p-4 sm:p-6">
              <table className="w-full min-w-[1000px] border-separate border-spacing-0 text-left">
                <thead>
                  <tr className="bg-[#eaf2ff] text-xs font-bold uppercase tracking-wider text-slate-600">
                    {["Time", "Meeting", "Room", "Booker", "Date", "Status"].map(
                      (heading) => (
                        <th
                          key={heading}
                          className="border-y border-[#dce8ff] px-4 py-4 first:rounded-l-xl first:border-l last:rounded-r-xl last:border-r"
                        >
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  {filteredBookings.map((booking) => {
                    const status = getBookingStatus(booking);

                    return (
                      <tr
                        key={booking.id}
                        className="transition hover:bg-[#f7faff]"
                      >
                        <td className="border-b border-[#e5edf9] px-4 py-6">
                          <div className="flex items-center gap-3 whitespace-nowrap font-semibold">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf2ff] text-blue-600">
                              <Clock3 size={21} />
                            </span>
                            {booking.time}
                          </div>
                        </td>

                        <td className="max-w-[360px] border-b border-[#e5edf9] px-4 py-6 font-semibold">
                          {booking.meeting || "Untitled meeting"}
                        </td>

                        <td className="border-b border-[#e5edf9] px-4 py-6">
                          <div className="flex items-center gap-3">
                            <MapPin size={20} className="shrink-0 text-blue-600" />
                            <div>
                              <p className="font-bold uppercase">
                                {booking.room}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                Conference room
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="border-b border-[#e5edf9] px-4 py-6">
                          <div className="flex items-center gap-3 whitespace-nowrap font-semibold">
                            <UserRound
                              size={20}
                              className="shrink-0 text-blue-600"
                            />
                            {booking.booker || "Employee"}
                          </div>
                        </td>

                        <td className="border-b border-[#e5edf9] px-4 py-6 whitespace-nowrap text-slate-600">
                          <span className="flex items-center gap-2">
                            <CalendarDays size={19} className="text-blue-600" />
                            {booking.date}
                          </span>
                        </td>

                        <td className="border-b border-[#e5edf9] px-4 py-6">
                          <StatusBadge status={status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>

      <footer className="border-t border-[#dce7f8] bg-white/70 px-5 py-5 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-[1800px] flex-col justify-between gap-2 text-sm text-slate-500 sm:flex-row">
          <p>Conference Room Booking System · Dangote</p>
          <p>Last updated at {lastUpdated || "—"} IST</p>
        </div>
      </footer>
    </main>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  iconClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  iconClass: string;
}) {
  return (
    <div className="flex min-h-[142px] items-center gap-5 rounded-2xl border border-[#dfe9f8] bg-white px-7 py-6 shadow-[0_4px_12px_rgba(22,54,112,0.06)]">
      <div
        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500 sm:text-base">{label}</p>
        <p className="mt-1 text-3xl font-extrabold text-[#142f70] sm:text-4xl">
          {value}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: MeetingStatus }) {
  const styles =
    status === "In Progress"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-semibold ${styles}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          status === "In Progress" ? "bg-emerald-500" : "bg-blue-600"
        }`}
      />
      {status}
    </span>
  );
}