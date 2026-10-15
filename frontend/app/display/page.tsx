"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CalendarDays,
  CalendarCheck,
  Clock3,
  DoorOpen,
  Expand,
  MapPin,
  RefreshCw,
  UserRound,
  AlertCircle,
} from "lucide-react";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"
).replace(/\/+$/, "");

const REFRESH_INTERVAL = 10_000;
const APP_TIMEZONE = "Asia/Kolkata";

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

type BookingResponse = {
  success?: boolean;
  date?: string;
  count?: number;
  bookings?: Booking[];
  message?: string;
};

type RoomsResponse = {
  success?: boolean;
  count?: number;
  rooms?: Room[];
  message?: string;
};

function getIndiaDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
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

function formatIndiaDate(dateString?: string): string {
  const value = dateString || getIndiaDate();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) return value;

  const [, year, month, day] = match;

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  ).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDisplayDate(dateString: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);

  if (!match) return dateString;

  const [, year, month, day] = match;

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  ).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getTimeParts() {
  const now = new Date();

  return {
    time: new Intl.DateTimeFormat("en-IN", {
      timeZone: APP_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(now),
    date: new Intl.DateTimeFormat("en-IN", {
      timeZone: APP_TIMEZONE,
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(now),
  };
}

function getBookingStatus(booking: Booking): string {
  if (booking.status) {
    return booking.status.toUpperCase();
  }

  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)?\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(
    booking.time.trim()
  );

  if (!match) return "UPCOMING";

  const [, startHour, startMinute, startPeriod, endHour, endMinute, endPeriod] =
    match;

  const toMinutes = (
    hour: string,
    minute: string,
    period?: string
  ) => {
    let h = Number(hour);
    const m = Number(minute);

    if (period) {
      const normalizedPeriod = period.toUpperCase();

      if (normalizedPeriod === "AM" && h === 12) h = 0;
      if (normalizedPeriod === "PM" && h !== 12) h += 12;
    }

    return h * 60 + m;
  };

  const current = new Date();

  const currentParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(current);

  const currentValues: Record<string, string> = {};

  for (const part of currentParts) {
    if (part.type !== "literal") {
      currentValues[part.type] = part.value;
    }
  }

  const nowMinutes =
    Number(currentValues.hour) * 60 +
    Number(currentValues.minute);

  const start = toMinutes(startHour, startMinute, startPeriod);
  const end = toMinutes(endHour, endMinute, endPeriod);

  if (nowMinutes >= end) return "COMPLETED";
  if (nowMinutes >= start) return "IN PROGRESS";

  return "UPCOMING";
}

export default function DisplayPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedRoom, setSelectedRoom] = useState("all");

  const [clock, setClock] = useState(getTimeParts);
  const [today, setToday] = useState(getIndiaDate());
  const [lastUpdated, setLastUpdated] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [roomsError, setRoomsError] = useState("");

  const [isFullscreen, setIsFullscreen] = useState(false);

  const fetchRooms = useCallback(async () => {
    try {
      setRoomsError("");

      // This is the public display endpoint, not /api/rooms.
      // The normal room-management endpoint may require login.
      const response = await fetch(`${API_URL}/api/display/rooms`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Unable to load rooms (${response.status}).`);
      }

      const result = (await response.json()) as RoomsResponse;

      if (!result.success || !Array.isArray(result.rooms)) {
        throw new Error(result.message || "Invalid rooms response.");
      }

      const safeRooms = result.rooms
        .filter(
          (room) =>
            typeof room.id === "string" &&
            typeof room.name === "string"
        )
        .sort((a, b) => a.name.localeCompare(b.name));

      setRooms(safeRooms);
    } catch (error) {
      console.error("Display room list error:", error);

      setRoomsError(
        error instanceof Error
          ? error.message
          : "Unable to load the complete room list."
      );
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      setBookingError("");

      const response = await fetch(`${API_URL}/api/display/today`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          `Unable to load today's bookings (${response.status}).`
        );
      }

      const result = (await response.json()) as BookingResponse;

      if (!result.success || !Array.isArray(result.bookings)) {
        throw new Error(
          result.message || "Invalid bookings response."
        );
      }

      setBookings(result.bookings);
      setToday(result.date || getIndiaDate());
      setLastUpdated(
        new Intl.DateTimeFormat("en-IN", {
          timeZone: APP_TIMEZONE,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }).format(new Date())
      );
    } catch (error) {
      console.error("Display booking list error:", error);

      setBookingError(
        error instanceof Error
          ? error.message
          : "Unable to load today's bookings."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);

    await Promise.allSettled([
      fetchRooms(),
      fetchBookings(),
    ]);
  }, [fetchRooms, fetchBookings]);

  useEffect(() => {
    void refreshAll();

    const refreshTimer = window.setInterval(() => {
      void refreshAll();
    }, REFRESH_INTERVAL);

    const clockTimer = window.setInterval(() => {
      setClock(getTimeParts());
      setToday(getIndiaDate());
    }, 1000);

    return () => {
      window.clearInterval(refreshTimer);
      window.clearInterval(clockTimer);
    };
  }, [refreshAll]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
    };
  }, []);

  const filteredBookings = useMemo(() => {
    if (selectedRoom === "all") return bookings;

    const selected = rooms.find((room) => room.id === selectedRoom);

    if (!selected) return bookings;

    return bookings.filter(
      (booking) =>
        booking.room.toLowerCase() === selected.name.toLowerCase()
    );
  }, [bookings, rooms, selectedRoom]);

  const roomsBooked = useMemo(() => {
    return new Set(
      filteredBookings.map((booking) => booking.room.toLowerCase())
    ).size;
  }, [filteredBookings]);

  const upcomingCount = useMemo(() => {
    return filteredBookings.filter((booking) => {
      const status = getBookingStatus(booking);
      return status === "UPCOMING" || status === "IN PROGRESS";
    }).length;
  }, [filteredBookings]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error("Unable to toggle fullscreen:", error);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#edf4ff] text-[#173574]">
      {/* HEADER */}
      <header className="shrink-0 border-b border-[#d8e5ff] bg-white">
        <div className="flex min-h-[112px] flex-wrap items-center justify-between gap-5 px-6 py-4 sm:px-8 lg:px-10">
          <div className="flex min-w-0 items-center gap-5">
            {/* Replace this block with your company logo if needed. */}
            <div className="flex h-[58px] w-[66px] shrink-0 items-center justify-center bg-[#142b70] px-2 text-center text-[11px] font-extrabold tracking-wide text-white">
              DANGOTE
            </div>

            <div className="h-14 w-px shrink-0 bg-[#d8e5ff]" />

            <div className="min-w-0">
              <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl lg:text-[30px]">
                Conference Room Bookings
              </h1>
              <p className="mt-1 text-sm text-[#627895] sm:text-base">
                Today&apos;s meetings at a glance
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-stretch gap-2.5">
            {/* TIME CARD */}
            <div className="flex min-w-0 items-center gap-3 rounded-[22px] border border-[#d8e5ff] bg-[#f5f8ff] px-3 py-3 sm:gap-4 sm:px-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e4efff] text-blue-700 sm:h-12 sm:w-12">
                <Clock3 size={25} strokeWidth={2.2} />
              </div>

              <div className="min-w-0">
                <div className="whitespace-nowrap text-lg font-extrabold leading-tight sm:text-2xl">
                  {clock.time}
                </div>
                <p className="mt-1 whitespace-nowrap text-xs text-[#627895] sm:text-sm">
                  India Standard Time
                </p>
                <p className="mt-1 whitespace-nowrap text-[10px] text-[#627895] sm:text-xs">
                  {clock.date}
                </p>
              </div>
            </div>

            {/* FULL SCREEN CARD — same overall height as time card */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex min-h-[88px] shrink-0 items-center justify-center gap-2 rounded-[22px] border border-[#d8e5ff] bg-[#edf4ff] px-3 text-sm font-bold text-[#173574] transition hover:bg-[#e2edff] focus:outline-none focus:ring-2 focus:ring-blue-500 sm:min-w-[140px] sm:px-5 sm:text-base"
              aria-label={
                isFullscreen ? "Exit full screen" : "Enter full screen"
              }
            >
              <Expand size={19} />
              <span>{isFullscreen ? "Exit screen" : "Full screen"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT
          flex-1 makes the content area fill the available viewport height.
          This keeps the footer at the bottom when there are few bookings. */}
      <main className="flex w-full flex-1 flex-col gap-6 px-5 py-6 sm:px-7 lg:px-10 lg:py-7">
        {/* SUMMARY CARDS */}
        <section className="grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            icon={<CalendarDays size={27} />}
            label="Today's Meetings"
            value={bookings.length}
            iconClass="bg-[#eef5ff] text-blue-600"
          />

          <SummaryCard
            icon={<DoorOpen size={27} />}
            label="Rooms Booked"
            value={roomsBooked}
            iconClass="bg-[#eafbf4] text-emerald-600"
          />

          <SummaryCard
            icon={<CalendarCheck size={27} />}
            label="Upcoming Meetings"
            value={upcomingCount}
            iconClass="bg-[#f4f0ff] text-purple-600"
          />
        </section>

        {/* SCHEDULE CARD */}
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#d8e5ff] bg-white shadow-sm">
          {/* SCHEDULE HEADER */}
          <div className="flex shrink-0 flex-col justify-between gap-4 border-b border-[#e0eaff] px-5 py-5 sm:px-7 xl:flex-row xl:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#193d80] text-white shadow-sm">
                <CalendarDays size={27} />
              </div>

              <div>
                <h2 className="text-xl font-bold sm:text-2xl">
                  Today&apos;s Schedule
                </h2>
                <p className="mt-1 text-sm text-[#627895] sm:text-base">
                  {formatIndiaDate(today)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#eafbf4] px-4 py-2 text-xs font-semibold text-emerald-700 sm:text-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                Live Schedule
              </div>

              <div className="flex items-center gap-2 text-xs text-[#627895] sm:text-sm">
                <RefreshCw size={16} />
                <span>Auto-refreshes every 10 seconds</span>
              </div>

              <label
                htmlFor="room-filter"
                className="text-sm text-[#526984]"
              >
                Room:
              </label>

              <select
                id="room-filter"
                value={selectedRoom}
                onChange={(event) => setSelectedRoom(event.target.value)}
                className="min-w-[145px] rounded-lg border border-[#d4e2ff] bg-white px-3 py-2.5 text-sm font-semibold text-[#173574] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#d4e2ff] bg-[#f5f8ff] px-4 py-2.5 text-sm font-semibold text-[#173574] transition hover:bg-[#e9f1ff] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>

          {/* SCHEDULE BODY
              flex-1 allows the schedule panel to fill empty vertical space. */}
          <div className="flex flex-1 flex-col p-4 sm:p-6">
            {roomsError && (
              <div className="mb-4 flex shrink-0 items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle size={19} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">
                    Unable to load the complete room list.
                  </p>
                  <p className="mt-1">
                    {roomsError} Ensure the backend exposes the public
                    GET /api/display/rooms endpoint.
                  </p>
                </div>
              </div>
            )}

            {bookingError && (
              <div className="mb-4 flex shrink-0 items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle size={19} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">
                    Unable to load today&apos;s bookings.
                  </p>
                  <p className="mt-1">{bookingError}</p>
                </div>
              </div>
            )}

            {/* TABLE — horizontal scrolling on smaller screens */}
            <div className="w-full flex-1 overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="bg-[#eaf1ff] text-xs uppercase tracking-wide text-[#415978]">
                    <th className="rounded-l-xl px-4 py-4 font-bold">
                      Time
                    </th>
                    <th className="px-4 py-4 font-bold">Meeting</th>
                    <th className="px-4 py-4 font-bold">Room</th>
                    <th className="px-4 py-4 font-bold">Booker</th>
                    <th className="px-4 py-4 font-bold">Date</th>
                    <th className="rounded-r-xl px-4 py-4 font-bold">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-12 text-center text-sm text-[#627895]"
                      >
                        Loading today&apos;s bookings...
                      </td>
                    </tr>
                  ) : filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10">
                        <div className="flex min-h-[140px] flex-col items-center justify-center text-center">
                          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef5ff] text-blue-600">
                            <CalendarDays size={25} />
                          </div>

                          <p className="font-semibold text-[#173574]">
                            No meetings scheduled
                          </p>

                          <p className="mt-1 text-sm text-[#7185a1]">
                            {selectedRoom === "all"
                              ? "There are no bookings for today."
                              : `There are no bookings for ${
                                  rooms.find(
                                    (room) => room.id === selectedRoom
                                  )?.name || "this room"
                                } today.`}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((booking) => {
                      const status = getBookingStatus(booking);

                      return (
                        <tr
                          key={booking.id}
                          className="border-b border-[#e0eaff] last:border-b-0"
                        >
                          <td className="px-4 py-5">
                            <div className="flex items-center gap-3 whitespace-nowrap">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf4ff] text-blue-600">
                                <Clock3 size={21} />
                              </span>
                              <span className="font-semibold text-[#173574]">
                                {booking.time || "Time not specified"}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-5">
                            <span className="font-semibold text-[#173574]">
                              {booking.meeting || "Untitled meeting"}
                            </span>
                          </td>

                          <td className="px-4 py-5">
                            <div className="flex items-center gap-3">
                              <MapPin
                                size={19}
                                className="shrink-0 text-blue-600"
                              />
                              <span className="font-semibold text-[#173574]">
                                {booking.room || "Conference Room"}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-5">
                            <div className="flex items-center gap-3 whitespace-nowrap">
                              <UserRound
                                size={19}
                                className="shrink-0 text-blue-600"
                              />
                              <span className="font-semibold text-[#173574]">
                                {booking.booker || "Employee"}
                              </span>
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-4 py-5 text-sm text-[#526984]">
                            {formatDisplayDate(booking.date)}
                          </td>

                          <td className="px-4 py-5">
                            <StatusBadge status={status} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* SCHEDULE FOOTER */}
            <div className="mt-auto flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[#e0eaff] pt-4 text-xs text-[#627895]">
              <span>
                {filteredBookings.length}{" "}
                {filteredBookings.length === 1 ? "meeting" : "meetings"}{" "}
                displayed
              </span>

              <span>
                {lastUpdated
                  ? `Last updated at ${lastUpdated} IST`
                  : "Waiting for first update"}
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER — mt-auto and main flex-1 keep it at the bottom on short pages */}
      <footer className="mt-auto shrink-0 border-t border-[#d8e5ff] bg-white/80">
        <div className="flex min-h-[62px] flex-wrap items-center justify-between gap-2 px-6 py-4 text-xs text-[#627895] sm:px-8 sm:text-sm lg:px-10">
          <span>Conference Room Booking System · Dangote</span>
          <span>All times shown in India Standard Time (IST)</span>
        </div>
      </footer>
    </div>
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
    <div className="flex min-h-[145px] items-center gap-5 rounded-2xl border border-[#dce7fb] bg-white px-6 py-6 shadow-sm sm:px-7">
      <div
        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}
      >
        {icon}
      </div>

      <div>
        <p className="text-sm text-[#627895] sm:text-base">{label}</p>
        <p className="mt-1 text-4xl font-extrabold leading-none text-[#173574]">
          {value}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    UPCOMING: "border-blue-200 bg-blue-50 text-blue-700",
    "IN PROGRESS": "border-emerald-200 bg-emerald-50 text-emerald-700",
    COMPLETED: "border-slate-200 bg-slate-100 text-slate-600",
    CANCELLED: "border-red-200 bg-red-50 text-red-700",
  };

  const dotStyles: Record<string, string> = {
    UPCOMING: "bg-blue-600",
    "IN PROGRESS": "bg-emerald-500",
    COMPLETED: "bg-slate-500",
    CANCELLED: "bg-red-500",
  };

  const normalized = status.toUpperCase();
  const style =
    styles[normalized] || "border-blue-200 bg-blue-50 text-blue-700";
  const dotStyle = dotStyles[normalized] || "bg-blue-600";

  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold ${style}`}
    >
      <span className={`h-2 w-2 rounded-full ${dotStyle}`} />
      {normalized === "IN PROGRESS"
        ? "In Progress"
        : normalized.charAt(0) + normalized.slice(1).toLowerCase()}
    </span>
  );
}