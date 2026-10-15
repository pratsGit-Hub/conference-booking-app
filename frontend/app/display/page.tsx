"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  DoorOpen,
  CalendarCheck,
  MapPin,
  UserRound,
  RefreshCw,
  Maximize2,
  Minimize2,
  AlertCircle,
} from "lucide-react";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"
).replace(/\/+$/, "");

const REFRESH_INTERVAL = 10_000;
const TIMEZONE = "Asia/Kolkata";

type Room = {
  id: string;
  name: string;
};

type Booking = {
  id: string;
  meeting: string;
  room: string;
  time: string;
  date: string;
  booker: string;
  status?: string;
  roomId?: string;
};

type ApiRoom = {
  id?: string;
  _id?: string;
  name?: string;
};

type ApiBooking = {
  id?: string;
  _id?: string;
  meeting?: string;
  title?: string;
  room?: string | { id?: string; _id?: string; name?: string };
  roomId?: string;
  time?: string;
  startTime?: string;
  endTime?: string;
  date?: string;
  booker?: string;
  user?: string | { name?: string };
  status?: string;
};

function getTodayDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return `${values.year}-${values.month}-${values.day}`;
}

function formatLongDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TIMEZONE,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatTime(date = new Date()): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })
    .format(date)
    .toLowerCase();
}

function formatDate(dateString: string): string {
  if (!dateString) return "-";

  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatus(booking: Booking): string {
  if (booking.status === "CANCELLED") return "Cancelled";

  const today = getTodayDate();

  if (booking.date && booking.date < today) return "Completed";

  const endTime = booking.time.split("-")[1]?.trim();

  if (booking.date === today && endTime) {
    const [hourText, minuteText] = endTime.split(":");
    const hour = Number(hourText);
    const minute = Number(minuteText);

    if (
      Number.isFinite(hour) &&
      Number.isFinite(minute)
    ) {
      const nowParts = new Intl.DateTimeFormat("en-GB", {
        timeZone: TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date());

      const [nowHour, nowMinute] = nowParts
        .split(":")
        .map(Number);

      if (
        nowHour * 60 + nowMinute >= hour * 60 + minute
      ) {
        return "Completed";
      }
    }
  }

  return "Upcoming";
}

function normalizeRoom(value: unknown): string {
  if (typeof value === "string") return value;

  if (value && typeof value === "object" && "name" in value) {
    const name = (value as { name?: unknown }).name;
    return typeof name === "string" ? name : "Conference Room";
  }

  return "Conference Room";
}

function normalizeBooking(raw: ApiBooking): Booking {
  const roomValue = raw.room;

  const roomId =
    raw.roomId ||
    (roomValue && typeof roomValue === "object"
      ? roomValue.id || roomValue._id
      : undefined);

  return {
    id: String(raw.id || raw._id || ""),
    meeting: raw.meeting || raw.title || "Untitled meeting",
    room: normalizeRoom(roomValue),
    roomId,
    time:
      raw.time ||
      `${raw.startTime || ""} - ${raw.endTime || ""}`.trim(),
    date: raw.date ? String(raw.date).slice(0, 10) : "",
    booker:
      raw.booker ||
      (typeof raw.user === "object" && raw.user
        ? raw.user.name || "Employee"
        : typeof raw.user === "string"
          ? raw.user
          : "Employee"),
    status: raw.status || "UPCOMING",
  };
}

function getArrayPayload<T>(payload: unknown, keys: string[]): T[] {
  if (Array.isArray(payload)) return payload as T[];

  if (!payload || typeof payload !== "object") return [];

  const object = payload as Record<string, unknown>;

  for (const key of keys) {
    if (Array.isArray(object[key])) {
      return object[key] as T[];
    }
  }

  if (
    object.data &&
    typeof object.data === "object"
  ) {
    const nested = object.data as Record<string, unknown>;

    for (const key of keys) {
      if (Array.isArray(nested[key])) {
        return nested[key] as T[];
      }
    }
  }

  return [];
}

export default function DisplayPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedRoom, setSelectedRoom] = useState("all");

  const [clock, setClock] = useState(() => new Date());
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [roomsLoading, setRoomsLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [roomsError, setRoomsError] = useState("");
  const [bookingsError, setBookingsError] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const today = getTodayDate();

  const fetchRooms = useCallback(async () => {
    setRoomsLoading(true);
    setRoomsError("");

    try {
      // IMPORTANT: use the public display endpoint, not /api/rooms.
      const response = await fetch(`${API_URL}/api/display/rooms`, {
        method: "GET",
        cache: "no-store",
      });

      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          `Unable to load rooms (${response.status}). Check GET /api/display/rooms.`
        );
      }

      const roomItems = getArrayPayload<ApiRoom>(payload, ["rooms"]);

      const normalizedRooms = roomItems
        .map((room) => ({
          id: String(room.id || room._id || ""),
          name: room.name || "Unnamed room",
        }))
        .filter((room) => room.id.length > 0);

      setRooms(normalizedRooms);
    } catch (error) {
      console.error("Display room list error:", error);
      setRoomsError(
        error instanceof Error
          ? error.message
          : "Unable to load the complete room list."
      );
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    setBookingsError("");

    try {
      const response = await fetch(`${API_URL}/api/display/today`, {
        method: "GET",
        cache: "no-store",
      });

      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          `Unable to load today's bookings (${response.status}).`
        );
      }

      const bookingItems = getArrayPayload<ApiBooking>(payload, [
        "bookings",
      ]);

      setBookings(bookingItems.map(normalizeBooking));
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Display booking fetch failed:", error);
      setBookingsError(
        error instanceof Error
          ? error.message
          : "Unable to load today's bookings."
      );
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);

    try {
      await Promise.all([fetchRooms(), fetchBookings()]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchRooms, fetchBookings]);

  useEffect(() => {
    const clockInterval = window.setInterval(() => {
      setClock(new Date());
    }, 1000);

    void fetchRooms();
    void fetchBookings();

    const refreshInterval = window.setInterval(() => {
      void fetchRooms();
      void fetchBookings();
    }, REFRESH_INTERVAL);

    return () => {
      window.clearInterval(clockInterval);
      window.clearInterval(refreshInterval);
    };
  }, [fetchRooms, fetchBookings]);

  useEffect(() => {
    const updateFullscreen = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", updateFullscreen);

    return () => {
      document.removeEventListener("fullscreenchange", updateFullscreen);
    };
  }, []);

  const visibleBookings = useMemo(() => {
    const todaysBookings = bookings.filter(
      (booking) =>
        booking.date === today &&
        booking.status !== "CANCELLED"
    );

    if (selectedRoom === "all") return todaysBookings;

    const selected = rooms.find((room) => room.id === selectedRoom);

    if (!selected) return todaysBookings;

    return todaysBookings.filter(
      (booking) =>
        booking.roomId === selectedRoom ||
        booking.room.toLowerCase() === selected.name.toLowerCase()
    );
  }, [bookings, rooms, selectedRoom, today]);

  const roomCount = useMemo(() => {
    return new Set(
      visibleBookings.map((booking) => booking.room.toLowerCase())
    ).size;
  }, [visibleBookings]);

  const upcomingCount = useMemo(() => {
    return visibleBookings.filter(
      (booking) => getStatus(booking) === "Upcoming"
    ).length;
  }, [visibleBookings]);

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error("Unable to toggle fullscreen:", error);
    }
  }

  const statusClass = (status: string) => {
    switch (status) {
      case "Completed":
        return "border-green-200 bg-green-50 text-green-700";
      case "Cancelled":
        return "border-red-200 bg-red-50 text-red-700";
      default:
        return "border-blue-200 bg-blue-50 text-blue-700";
    }
  };

  return (
    <main className="min-h-screen bg-[#edf4ff] text-[#173574]">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-5 border-b border-blue-100 bg-white px-6 py-3 md:px-10">
        <div className="flex min-w-0 items-center gap-5">
          <div className="flex h-14 w-16 shrink-0 items-center justify-center bg-[#142866] px-2 text-center text-[10px] font-extrabold tracking-wide text-white">
            DANGOTE
          </div>

          <div className="h-12 w-px shrink-0 bg-blue-100" />

          <div className="min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl lg:text-3xl">
              Conference Room Bookings
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Today&apos;s meetings at a glance
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-stretch gap-2">
          <div className="flex items-center gap-3 rounded-3xl border border-blue-100 bg-[#f5f8ff] px-4 py-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <Clock3 size={24} />
            </div>

            <div>
              <p className="whitespace-nowrap text-xl font-bold leading-tight sm:text-2xl">
                {formatTime(clock)}
              </p>
              <p className="mt-1 whitespace-nowrap text-sm text-slate-500">
                India Standard Time
              </p>
              <p className="mt-1 whitespace-nowrap text-xs text-slate-500">
                {formatLongDate(clock)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex min-w-[135px] items-center justify-center gap-2 rounded-3xl border border-blue-100 bg-[#edf4ff] px-4 py-3 text-sm font-bold text-[#173574] transition hover:bg-blue-100 sm:min-w-[150px]"
          >
            {isFullscreen ? (
              <Minimize2 size={19} />
            ) : (
              <Maximize2 size={19} />
            )}
            {isFullscreen ? "Exit full screen" : "Full screen"}
          </button>
        </div>
      </header>

      <section className="space-y-7 px-5 py-7 md:px-10">
        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <SummaryCard
            icon={<CalendarDays size={27} />}
            label="Today's Meetings"
            value={visibleBookings.length}
            iconClass="bg-blue-50 text-blue-600"
          />
          <SummaryCard
            icon={<DoorOpen size={27} />}
            label="Rooms Booked"
            value={roomCount}
            iconClass="bg-emerald-50 text-emerald-600"
          />
          <SummaryCard
            icon={<CalendarCheck size={27} />}
            label="Upcoming Meetings"
            value={upcomingCount}
            iconClass="bg-violet-50 text-violet-600"
          />
        </div>

        {/* Schedule */}
        <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-blue-100 px-5 py-5 md:px-7">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#193d7e] text-white shadow-sm">
                <CalendarDays size={27} />
              </div>

              <div>
                <h2 className="text-xl font-bold sm:text-2xl">
                  Today&apos;s Schedule
                </h2>
                <p className="mt-1 text-sm text-slate-500 sm:text-base">
                  {formatLongDate(clock)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                Live Schedule
              </span>

              <span className="inline-flex items-center gap-2 text-sm text-slate-500">
                <RefreshCw size={16} />
                Auto-refreshes every 10 seconds
              </span>

              <label
                htmlFor="room-filter"
                className="text-sm text-slate-600"
              >
                Room:
              </label>

              <select
                id="room-filter"
                value={selectedRoom}
                onChange={(event) => setSelectedRoom(event.target.value)}
                className="min-w-[145px] rounded-lg border border-blue-200 bg-white px-3 py-2.5 text-sm font-semibold text-[#173574] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All rooms</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => void refreshAll()}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-[#f5f8ff] px-3 py-2.5 text-sm font-semibold text-[#173574] transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>

          <div className="space-y-4 p-4 md:p-6">
            {roomsError && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                <AlertCircle size={19} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">
                    Unable to load the complete room list.
                  </p>
                  <p className="mt-1">{roomsError}</p>
                  <p className="mt-1">
                    Confirm that GET /api/display/rooms is registered as a
                    public route in the backend.
                  </p>
                </div>
              </div>
            )}

            {bookingsError && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                <AlertCircle size={19} className="mt-0.5 shrink-0" />
                <p>{bookingsError}</p>
              </div>
            )}

            {roomsLoading && (
              <p className="text-sm text-slate-500">
                Loading conference rooms…
              </p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="bg-[#eaf1ff] text-xs uppercase tracking-wide text-slate-600">
                    <th className="rounded-l-xl px-4 py-4 font-bold">Time</th>
                    <th className="px-4 py-4 font-bold">Meeting</th>
                    <th className="px-4 py-4 font-bold">Room</th>
                    <th className="px-4 py-4 font-bold">Booker</th>
                    <th className="px-4 py-4 font-bold">Date</th>
                    <th className="rounded-r-xl px-4 py-4 font-bold">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {bookingsLoading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-12 text-center text-sm text-slate-500"
                      >
                        Loading today&apos;s meetings…
                      </td>
                    </tr>
                  ) : visibleBookings.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-14 text-center text-slate-500"
                      >
                        <CalendarDays
                          size={34}
                          className="mx-auto mb-3 text-slate-300"
                        />
                        <p className="font-semibold text-slate-700">
                          No meetings scheduled
                        </p>
                        <p className="mt-1 text-sm">
                          {selectedRoom === "all"
                            ? "There are no bookings for today."
                            : `There are no bookings for ${rooms.find((room) => room.id === selectedRoom)?.name || "this room"} today.`}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    visibleBookings.map((booking) => {
                      const status = getStatus(booking);

                      return (
                        <tr
                          key={booking.id || `${booking.meeting}-${booking.time}`}
                          className="border-b border-blue-100 last:border-b-0 hover:bg-blue-50/40"
                        >
                          <td className="px-4 py-5">
                            <div className="flex items-center gap-3 whitespace-nowrap font-semibold">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <Clock3 size={21} />
                              </span>
                              {booking.time || "-"}
                            </div>
                          </td>

                          <td className="px-4 py-5 font-semibold">
                            {booking.meeting}
                          </td>

                          <td className="px-4 py-5">
                            <div className="flex items-center gap-3">
                              <MapPin
                                size={19}
                                className="shrink-0 text-blue-600"
                              />
                              <span className="font-semibold">
                                {booking.room}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-5">
                            <div className="flex items-center gap-3 whitespace-nowrap">
                              <UserRound
                                size={19}
                                className="shrink-0 text-blue-600"
                              />
                              <span className="font-semibold">
                                {booking.booker}
                              </span>
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-4 py-5 text-slate-600">
                            {formatDate(booking.date)}
                          </td>

                          <td className="px-4 py-5">
                            <span
                              className={`inline-flex whitespace-nowrap items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${statusClass(status)}`}
                            >
                              <span className="h-2 w-2 rounded-full bg-current" />
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-blue-100 pt-4 text-xs text-slate-500">
              <span>
                {visibleBookings.length} meeting
                {visibleBookings.length === 1 ? "" : "s"} displayed
              </span>

              <span>
                {lastUpdated
                  ? `Last updated at ${formatTime(lastUpdated)} IST`
                  : "Waiting for first refresh…"}
              </span>
            </div>
          </div>
        </section>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-blue-100 bg-white/80 px-6 py-5 text-sm text-slate-500 md:px-10">
        <span>Conference Room Booking System · Dangote</span>
        <span>All times shown in India Standard Time (IST)</span>
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
  value: number;
  iconClass: string;
}) {
  return (
    <div className="flex min-h-[145px] items-center gap-5 rounded-2xl border border-blue-100 bg-white px-6 py-6 shadow-sm">
      <div
        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}
      >
        {icon}
      </div>

      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-1 text-4xl font-extrabold leading-none text-[#173574]">
          {value}
        </p>
      </div>
    </div>
  );
}
