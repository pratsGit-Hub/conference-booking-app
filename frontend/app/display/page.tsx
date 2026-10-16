"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import {
  CalendarDays,
  CalendarCheck,
  Clock3,
  DoorOpen,
  Expand,
  RefreshCw,
  MapPin,
  UserRound,
  AlertCircle,
} from "lucide-react";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"
).replace(/\/$/, "");

const REFRESH_INTERVAL = 10_000;
const IST_TIMEZONE = "Asia/Kolkata";

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
};

type RoomsResponse = {
  success?: boolean;
  rooms?: Array<{
    id?: string;
    _id?: string;
    name?: string;
  }>;
  message?: string;
};

type BookingItem = {
  id?: string;
  _id?: string;
  meeting?: string;
  title?: string;
  room?: string | { name?: string };
  time?: string;
  startTime?: string;
  endTime?: string;
  date?: string;
  booker?: string;
  status?: string;
};

type BookingsResponse = {
  success?: boolean;
  date?: string;
  count?: number;
  bookings?: BookingItem[];
  message?: string;
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatShortDate(value: string): string {
  if (!value) return "—";

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (match) {
    const [, year, month, day] = match;

    const monthName = new Intl.DateTimeFormat("en-IN", {
      month: "short",
      timeZone: IST_TIMEZONE,
    }).format(new Date(Number(year), Number(month) - 1, Number(day)));

    return `${day} ${monthName} ${year}`;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: IST_TIMEZONE,
  }).format(parsed);
}

function getRoomName(room: BookingItem["room"]): string {
  if (typeof room === "string") return room;
  return room?.name || "Conference Room";
}

function getBookingTime(booking: BookingItem): string {
  if (booking.time) return booking.time;

  const start = booking.startTime || "";
  const end = booking.endTime || "";

  return start || end ? `${start} - ${end}` : "Time not specified";
}

function formatClock(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

function getISTMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value || 0
  );

  return hour * 60 + minute;
}

function getISTDateString(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = part.value;
  }

  return `${values.year}-${values.month}-${values.day}`;
}

function getStatus(booking: Booking, now: Date): string {
  const storedStatus = (booking.status || "").toUpperCase();

  if (storedStatus === "CANCELLED") return "Cancelled";

  const timeMatch = booking.time.match(
    /^\s*(\d{1,2}):(\d{2})\s*(AM|PM)?\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)?\s*$/i
  );

  if (timeMatch && booking.date === getISTDateString(now)) {
    const [, startHour, startMinute, startPeriod, endHour, endMinute, endPeriod] =
      timeMatch;

    const toMinutes = (hourText: string, minuteText: string, period?: string) => {
      let hour = Number(hourText);

      if (period) {
        hour %= 12;
        if (period.toUpperCase() === "PM") hour += 12;
      }

      return hour * 60 + Number(minuteText);
    };

    const start = toMinutes(startHour, startMinute, startPeriod);
    const end = toMinutes(endHour, endMinute, endPeriod);
    const current = getISTMinutes(now);

    if (current >= end) return "Completed";
    if (current >= start && current < end) return "In progress";
  }

  if (storedStatus === "COMPLETED") return "Completed";

  return "Upcoming";
}

function getStatusClass(status: string): string {
  switch (status) {
    case "Completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "In progress":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Cancelled":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-blue-200 bg-blue-50 text-blue-700";
  }
}

export default function DisplayPage() {
  const [now, setNow] = useState<Date | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedRoom, setSelectedRoom] = useState("all");
  const [roomsError, setRoomsError] = useState("");
  const [bookingsError, setBookingsError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const roomFetchStarted = useRef(false);
  const bookingsFetchRunning = useRef(false);
  const bookingsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roomRetryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bookingsRetryDelay = useRef(REFRESH_INTERVAL);

  // Start the live clock only on the client to avoid hydration mismatches.
  useEffect(() => {
    setNow(new Date());

    const timer = setInterval(() => setNow(new Date()), 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchRooms = useCallback(async () => {
    try {
      setRoomsError("");

      const response = await fetch(`${API_URL}/api/display/rooms`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("The room service is busy. Retrying shortly.");
        }

        throw new Error(`Unable to load rooms (${response.status}).`);
      }

      const result = (await response.json()) as RoomsResponse;

      if (!result.success || !Array.isArray(result.rooms)) {
        throw new Error(result.message || "Invalid rooms response.");
      }

      const normalizedRooms = result.rooms
        .map((room) => ({
          id: String(room.id || room._id || ""),
          name: String(room.name || "Unnamed room"),
        }))
        .filter((room) => room.id && room.name)
        .sort((a, b) => a.name.localeCompare(b.name));

      setRooms(normalizedRooms);
      roomFetchStarted.current = true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load rooms.";

      setRoomsError(message);

      if (roomRetryTimer.current) clearTimeout(roomRetryTimer.current);

      roomRetryTimer.current = setTimeout(() => {
        roomFetchStarted.current = false;
        void loadRoomsOnce();
      }, message.includes("busy") ? 30_000 : 15_000);
    }
  }, []);

  const loadRoomsOnce = useCallback(async () => {
    if (roomFetchStarted.current) return;

    roomFetchStarted.current = true;
    await fetchRooms();

    // A failed request may be retried; successful rooms are retained.
    if (rooms.length === 0 && !roomRetryTimer.current) {
      roomFetchStarted.current = false;
    }
  }, [fetchRooms, rooms.length]);

  const fetchBookings = useCallback(async () => {
    if (bookingsFetchRunning.current) return;

    bookingsFetchRunning.current = true;

    try {
      setBookingsError("");

      const response = await fetch(`${API_URL}/api/display/today`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        if (response.status === 429) {
          bookingsRetryDelay.current = Math.min(
            Math.max(bookingsRetryDelay.current * 2, 20_000),
            120_000
          );

          throw new Error(
            `The server is busy. Retrying in ${Math.round(
              bookingsRetryDelay.current / 1000
            )} seconds.`
          );
        }

        throw new Error(
          `Unable to load today's bookings (${response.status}).`
        );
      }

      const result = (await response.json()) as BookingsResponse;

      if (!result.success || !Array.isArray(result.bookings)) {
        throw new Error(result.message || "Invalid bookings response.");
      }

      const normalizedBookings: Booking[] = result.bookings.map((item) => ({
        id: String(item.id || item._id || ""),
        meeting: String(item.meeting || item.title || "Untitled meeting"),
        room: getRoomName(item.room),
        time: getBookingTime(item),
        date: String(item.date || result.date || ""),
        booker: String(item.booker || "Employee"),
        status: String(item.status || "UPCOMING"),
      }));

      setBookings(normalizedBookings);
      setLastUpdated(new Date());
      bookingsRetryDelay.current = REFRESH_INTERVAL;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to load today's bookings.";

      setBookingsError(message);
    } finally {
      bookingsFetchRunning.current = false;
      setLoading(false);
    }
  }, []);

  // Fetch room names once, with delayed retries on failure.
  useEffect(() => {
    void loadRoomsOnce();

    return () => {
      if (roomRetryTimer.current) clearTimeout(roomRetryTimer.current);
    };
  }, [loadRoomsOnce]);

  // Refresh today's bookings with backoff if the API is rate-limiting.
  useEffect(() => {
    let cancelled = false;

    const refreshLoop = async () => {
      if (cancelled) return;

      await fetchBookings();

      if (cancelled) return;

      bookingsTimer.current = setTimeout(
        refreshLoop,
        bookingsRetryDelay.current
      );
    };

    void refreshLoop();

    return () => {
      cancelled = true;
      if (bookingsTimer.current) clearTimeout(bookingsTimer.current);
    };
  }, [fetchBookings]);

  const visibleBookings = useMemo(() => {
    if (selectedRoom === "all") return bookings;

    const selected = rooms.find((room) => room.id === selectedRoom);

    return bookings.filter((booking) => booking.room === selected?.name);
  }, [bookings, selectedRoom, rooms]);

  const roomsBooked = useMemo(
    () => new Set(bookings.map((booking) => booking.room)).size,
    [bookings]
  );

  const upcomingMeetings = useMemo(() => {
    if (!now) {
      return bookings.filter(
        (booking) => (booking.status || "").toUpperCase() !== "CANCELLED"
      ).length;
    }

    return bookings.filter((booking) => {
      const status = getStatus(booking, now);
      return status === "Upcoming" || status === "In progress";
    }).length;
  }, [bookings, now]);

  const refreshNow = useCallback(async () => {
    setLoading(true);
    await fetchBookings();
  }, [fetchBookings]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen mode is unavailable:", error);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const displayDate = now ? formatDate(now) : "Loading date...";
  const displayTime = now ? formatClock(now) : "--:--:-- --";

  return (
    <div className="flex min-h-screen flex-col bg-[#edf4ff] text-[#173875]">
      {/* Header */}
      <header className="shrink-0 border-b border-white/15 bg-[#193a7b] text-white shadow-sm">
        <div className="mx-auto flex min-h-[112px] w-full max-w-[1920px] flex-col justify-between gap-4 px-4 py-4 sm:flex-row sm:items-center sm:px-8 lg:px-12">
          <div className="flex min-w-0 items-center gap-5">
            <div className="relative flex h-[76px] w-[145px] shrink-0 items-center justify-center sm:h-[90px] sm:w-[170px]">
              <Image
                src="/dangote-logo-white.png"
                alt="Dangote"
                fill
                priority
                sizes="170px"
                className="object-contain"
              />
            </div>

            <div className="hidden h-[60px] w-px bg-white/35 sm:block" />

            <div className="min-w-0">
              <h1 className="text-xl font-extrabold leading-tight tracking-tight text-white sm:text-2xl lg:text-3xl">
                Conference Room Bookings
              </h1>
              <p className="mt-1 text-sm text-blue-100 sm:text-base">
                Today&apos;s meetings at a glance
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 self-end sm:self-auto">
            <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-3 py-2 sm:px-4 sm:py-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <Clock3 className="h-7 w-7" />
              </div>

              <div>
                <p className="whitespace-nowrap text-lg font-bold leading-tight sm:text-2xl">
                  {displayTime}
                </p>
                <p className="mt-1 text-xs text-blue-100 sm:text-sm">
                  India Standard Time
                </p>
                <p className="text-xs text-blue-100">{displayDate}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex min-h-[68px] items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 font-semibold transition hover:bg-white/20 sm:px-6"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              <Expand className="h-5 w-5" />
              <span className="hidden sm:inline">
                {isFullscreen ? "Exit screen" : "Full screen"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto flex w-full max-w-[1920px] flex-1 flex-col px-4 py-5 sm:px-6 sm:py-6 lg:px-10">
        {/* Summary cards */}
        <section className="mb-6 grid shrink-0 grid-cols-1 gap-4 md:grid-cols-3">
          <SummaryCard
            icon={<CalendarDays className="h-7 w-7" />}
            label="Today's Meetings"
            value={bookings.length}
            iconClass="bg-blue-50 text-blue-600"
          />

          <SummaryCard
            icon={<DoorOpen className="h-7 w-7" />}
            label="Rooms Booked"
            value={roomsBooked}
            iconClass="bg-emerald-50 text-emerald-600"
          />

          <SummaryCard
            icon={<CalendarCheck className="h-7 w-7" />}
            label="Upcoming Meetings"
            value={upcomingMeetings}
            iconClass="bg-violet-50 text-violet-600"
          />
        </section>

        {/* Schedule panel */}
        <section className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
          <div className="flex shrink-0 flex-col justify-between gap-4 border-b border-blue-100 px-5 py-5 lg:flex-row lg:items-center lg:px-7">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#193a7b] text-white shadow-sm">
                <CalendarDays className="h-7 w-7" />
              </div>

              <div>
                <h2 className="text-xl font-bold sm:text-2xl">
                  Today&apos;s Schedule
                </h2>
                <p className="mt-1 text-sm text-slate-500 sm:text-base">
                  {displayDate}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Live Schedule
              </span>

              <span className="inline-flex items-center gap-2 text-sm text-slate-500">
                <RefreshCw className="h-4 w-4" />
                Auto-refreshes every 10 seconds
              </span>

              <label
                htmlFor="room-filter"
                className="text-sm font-semibold text-slate-600"
              >
                Room:
              </label>

              <select
                id="room-filter"
                value={selectedRoom}
                onChange={(event) => setSelectedRoom(event.target.value)}
                className="min-w-[145px] rounded-lg border border-blue-200 bg-white px-3 py-2.5 text-sm font-semibold text-[#173875] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                onClick={() => void refreshNow()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-[#173875] transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>

          <div className="flex flex-1 flex-col px-4 py-5 sm:px-6">
            {(roomsError || bookingsError) && (
              <div
                role="status"
                className="mb-4 flex shrink-0 items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-800"
              >
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-bold">
                    {roomsError ? "Room list warning" : "Schedule warning"}
                  </p>
                  <p>{bookingsError || roomsError}</p>
                  <p className="mt-1 text-sm">
                    The display will retry automatically.
                  </p>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] border-separate border-spacing-0 text-left">
                <thead>
                  <tr className="bg-[#eaf1ff] text-base uppercase tracking-wide text-slate-700">
                    <th className="rounded-l-xl px-5 py-5 font-extrabold">
                      Time
                    </th>
                    <th className="px-5 py-5 font-extrabold">Meeting</th>
                    <th className="px-5 py-5 font-extrabold">Room</th>
                    <th className="px-5 py-5 font-extrabold">Booker</th>
                    <th className="px-5 py-5 font-extrabold">Date</th>
                    <th className="rounded-r-xl px-5 py-5 font-extrabold">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {visibleBookings.map((booking) => {
                    const status = now
                      ? getStatus(booking, now)
                      : booking.status || "Upcoming";

                    return (
                      <tr
                        key={booking.id}
                        className="text-lg xl:text-xl"
                      >
                        <td className="whitespace-nowrap border-b border-blue-100 px-5 py-7">
                          <div className="flex items-center gap-3 whitespace-nowrap font-bold text-[#173875]">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                              <Clock3 className="h-6 w-6" />
                            </span>
                            {booking.time}
                          </div>
                        </td>

                        <td className="border-b border-blue-100 px-5 py-7 text-xl font-extrabold leading-snug text-[#173875] xl:text-2xl">
                          <span className="block min-w-[220px] max-w-[420px] whitespace-normal break-words">
                            {booking.meeting}
                          </span>
                        </td>

                        <td className="whitespace-nowrap border-b border-blue-100 px-5 py-7 text-xl font-bold text-[#173875] xl:text-2xl">
                          <div className="flex items-center gap-3">
                            <MapPin className="h-6 w-6 shrink-0 text-blue-600" />
                            {booking.room}
                          </div>
                        </td>

                        <td className="border-b border-blue-100 px-5 py-7 text-xl font-bold text-[#173875] xl:text-2xl">
                          <div className="flex min-w-[190px] items-center gap-3">
                            <UserRound className="h-6 w-6 shrink-0 text-blue-600" />
                            <span className="whitespace-normal break-words">
                              {booking.booker}
                            </span>
                          </div>
                        </td>

                        <td className="whitespace-nowrap border-b border-blue-100 px-5 py-7 text-lg font-semibold text-slate-700 xl:text-xl">
                          {formatShortDate(booking.date)}
                        </td>

                        <td className="border-b border-blue-100 px-5 py-7">
                          <StatusBadge status={status} />
                        </td>
                      </tr>
                    );
                  })}

                  {visibleBookings.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-16 text-center">
                        <div className="mx-auto flex max-w-md flex-col items-center">
                          <CalendarDays className="mb-3 h-12 w-12 text-slate-300" />
                          <p className="text-xl font-bold text-slate-600">
                            {loading
                              ? "Loading today's meetings..."
                              : selectedRoom === "all"
                                ? "No meetings scheduled today"
                                : "No meetings scheduled for this room"}
                          </p>
                          <p className="mt-2 text-base text-slate-400">
                            Meetings will appear here automatically when
                            available.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-auto flex shrink-0 flex-col justify-between gap-2 border-t border-blue-100 pt-4 text-base text-slate-600 sm:flex-row sm:items-center">
              <p>
                {visibleBookings.length}{" "}
                {visibleBookings.length === 1 ? "meeting" : "meetings"} displayed
              </p>

              <p>
                {lastUpdated
                  ? `Last updated at ${formatClock(lastUpdated)} IST`
                  : "Waiting for first update..."}
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer stays at the bottom even when there are few bookings */}
      <footer className="mt-auto shrink-0 border-t border-blue-100 bg-white/80">
        <div className="mx-auto flex w-full max-w-[1920px] flex-col justify-between gap-2 px-4 py-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:px-8 lg:px-10">
          <p>© Dangote Project Office. All rights reserved</p>
          <p>All times shown in India Standard Time (IST)</p>
        </div>
      </footer>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-5 py-3 text-base font-extrabold ${getStatusClass(
        status
      )}`}
    >
      <span className="h-2.5 w-2.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  iconClass,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  iconClass: string;
}) {
  return (
    <div className="flex min-h-[130px] items-center gap-5 rounded-2xl border border-blue-100 bg-white px-6 py-5 shadow-sm">
      <div
        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}
      >
        {icon}
      </div>

      <div>
        <p className="text-base text-slate-500 sm:text-lg">{label}</p>
        <p className="mt-1 text-4xl font-extrabold leading-none text-[#173875] sm:text-5xl">
          {value}
        </p>
      </div>
    </div>
  );
}