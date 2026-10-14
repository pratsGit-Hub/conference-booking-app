
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  DoorOpen,
  Maximize2,
  Minimize2,
  RefreshCw,
  MapPin,
  UserRound,
  CalendarCheck,
  Building2,
  AlertCircle,
} from "lucide-react";

type DisplayBooking = {
  id: string;
  meeting: string;
  room: string;
  time: string;
  date: string;
  booker: string;
};

type DisplayResponse = {
  success: boolean;
  date: string;
  timezone?: string;
  count: number;
  bookings: DisplayBooking[];
  message?: string;
};

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

function getBookingStatus(booking: DisplayBooking) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  if (booking.date < today) {
    return "Completed";
  }

  const [startTime, endTime] = booking.time
    .split("-")
    .map((value) => value.trim());

  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

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

  if (!startTime || !endTime) return "Upcoming";
  if (nowMinutes < toMinutes(startTime)) return "Upcoming";
  if (nowMinutes >= toMinutes(endTime)) return "Completed";

  return "In Progress";
}

export default function DisplayPage() {
  const [data, setData] = useState<DisplayResponse | null>(null);
  const [clock, setClock] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Room filter state
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

  useEffect(() => {
    const updateClock = () => setClock(getIndiaTime());

    updateClock();
    fetchBookings();

    const clockInterval = window.setInterval(updateClock, 1000);
    const bookingInterval = window.setInterval(() => {
      fetchBookings();
    }, 10000);

    return () => {
      window.clearInterval(clockInterval);
      window.clearInterval(bookingInterval);
    };
  }, [fetchBookings]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
    };
  }, []);

  const bookings = data?.bookings ?? [];

  // Generate unique room options from the live booking data.
  const roomOptions = useMemo(() => {
    return Array.from(
      new Set(
        bookings
          .map((booking) => booking.room?.trim())
          .filter((room): room is string => Boolean(room))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [bookings]);

  // Apply the selected room filter.
  const filteredBookings = useMemo(() => {
    if (selectedRoom === "ALL") {
      return bookings;
    }

    return bookings.filter(
      (booking) => booking.room.trim() === selectedRoom
    );
  }, [bookings, selectedRoom]);

  // Summary cards always show totals for all today's meetings.
  const roomsBooked = useMemo(
    () => new Set(bookings.map((booking) => booking.room)).size,
    [bookings]
  );

  const upcomingMeetings = useMemo(
    () =>
      bookings.filter(
        (booking) => getBookingStatus(booking) === "Upcoming"
      ).length,
    [bookings, clock]
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
      {/* Header */}
      <header className="border-b border-[#dce7f8] bg-white px-5 py-5 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-[1800px] flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="flex items-center gap-5 sm:gap-8">
            <div className="flex h-16 w-36 shrink-0 items-center justify-center border-r border-[#dce7f8] pr-5 sm:h-20 sm:w-44">
              {/* Place the official logo at frontend/public/dangote-logo.png */}
              <img
                src="/dangote-logo.png"
                alt="Dangote"
                className="max-h-16 max-w-full object-contain"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                  const fallback =
                    event.currentTarget.nextElementSibling as HTMLElement | null;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
              <div className="hidden flex-col items-center justify-center text-center">
                <Building2 size={30} />
                <span className="mt-1 text-sm font-black tracking-widest">
                  DANGOTE
                </span>
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-[#142f70] sm:text-3xl lg:text-4xl">
                Conference Room Bookings
              </h1>
              <p className="mt-1 text-sm text-slate-500 sm:text-base">
                Today&apos;s meetings at a glance
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 sm:justify-end">
            <div className="flex items-center gap-3 rounded-2xl border border-[#e0eaff] bg-[#f5f8ff] px-4 py-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e5efff] text-blue-700">
                <Clock3 size={25} />
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums text-[#142f70] sm:text-2xl">
                  {clock || "--:--:--"}
                </p>
                <p className="text-xs text-slate-500 sm:text-sm">
                  India Standard Time
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {data?.date ? formatDate(data.date) : "Loading date..."}
                </p>
              </div>
            </div>

            <button
              onClick={toggleFullscreen}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#d9e6ff] bg-[#edf4ff] px-4 py-3 text-sm font-semibold text-[#143477] transition hover:bg-[#dce9ff] focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 size={18} />
              ) : (
                <Maximize2 size={18} />
              )}
              {isFullscreen ? "Exit full screen" : "Full screen"}
            </button>
          </div>
        </div>
      </header>

      {/* Main dashboard */}
      <section className="mx-auto max-w-[1800px] space-y-7 px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <SummaryCard
            icon={<CalendarDays size={29} />}
            label="Today's Meetings"
            value={loading ? "—" : bookings.length}
            iconClass="bg-blue-50 text-blue-700"
          />

          <SummaryCard
            icon={<DoorOpen size={29} />}
            label="Rooms Booked"
            value={loading ? "—" : roomsBooked}
            iconClass="bg-emerald-50 text-emerald-600"
          />

          <SummaryCard
            icon={<CalendarCheck size={29} />}
            label="Upcoming Meetings"
            value={loading ? "—" : upcomingMeetings}
            iconClass="bg-violet-50 text-violet-600"
          />
        </div>

        {/* Schedule panel */}
        <section className="overflow-hidden rounded-2xl border border-[#dfe9f8] bg-white shadow-[0_4px_12px_rgba(22,54,112,0.07)]">
          <div className="flex flex-col justify-between gap-4 border-b border-[#e5edf9] px-5 py-6 sm:px-7 lg:flex-row lg:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#153778] text-white shadow-sm">
                <CalendarDays size={27} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#142f70] sm:text-2xl">
                  Today&apos;s Schedule
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

              {/* Filter by room */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="display-room-filter"
                  className="whitespace-nowrap text-sm font-medium text-slate-600"
                >
                  Room:
                </label>
                <select
                  id="display-room-filter"
                  aria-label="Filter today's meetings by room"
                  value={selectedRoom}
                  onChange={(event) => setSelectedRoom(event.target.value)}
                  className="min-w-36 rounded-lg border border-[#d8e5fa] bg-white px-3 py-2.5 text-sm font-semibold text-[#143477] outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="ALL">All rooms</option>
                  {roomOptions.map((room) => (
                    <option key={room} value={room}>
                      {room}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => fetchBookings(true)}
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

          {error && (
            <div className="mx-5 mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:mx-7">
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
              <p>{error}</p>
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
                  ? "No meetings scheduled today"
                  : `No meetings scheduled in ${selectedRoom}`}
              </h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                {selectedRoom === "ALL"
                  ? "There are no confirmed bookings for today. This schedule refreshes automatically when new bookings become available."
                  : "Try selecting another room or choose All rooms to see the full schedule."}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop/tablet schedule */}
              <div className="hidden overflow-x-auto p-6 lg:block">
                <table className="w-full min-w-[1000px] border-separate border-spacing-0 text-left">
                  <thead>
                    <tr className="bg-[#eaf2ff] text-xs font-bold uppercase tracking-wider text-slate-600">
                      {[
                        "Time",
                        "Meeting",
                        "Room",
                        "Booker",
                        "Date",
                        "Status",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="border-y border-[#d8e6ff] px-5 py-4 first:rounded-l-xl last:rounded-r-xl"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredBookings.map((booking) => {
                      const status = getBookingStatus(booking);

                      return (
                        <tr
                          key={booking.id}
                          className="group transition hover:bg-[#f8faff]"
                        >
                          <td className="border-b border-[#e5edf9] px-5 py-6">
                            <div className="flex items-center gap-3 whitespace-nowrap">
                              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf2ff] text-blue-700">
                                <Clock3 size={21} />
                              </span>
                              <span className="font-bold text-[#142f70]">
                                {booking.time}
                              </span>
                            </div>
                          </td>

                          <td className="border-b border-[#e5edf9] px-5 py-6">
                            <span className="font-bold text-[#142f70]">
                              {booking.meeting}
                            </span>
                          </td>

                          <td className="border-b border-[#e5edf9] px-5 py-6">
                            <div className="flex items-center gap-3">
                              <MapPin size={21} className="shrink-0 text-blue-600" />
                              <div>
                                <p className="font-semibold text-[#142f70]">
                                  {booking.room}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Conference room
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="border-b border-[#e5edf9] px-5 py-6">
                            <div className="flex items-center gap-3 whitespace-nowrap">
                              <UserRound size={21} className="text-blue-600" />
                              <span className="font-semibold text-[#142f70]">
                                {booking.booker}
                              </span>
                            </div>
                          </td>

                          <td className="border-b border-[#e5edf9] px-5 py-6">
                            <div className="flex items-center gap-2 whitespace-nowrap text-slate-600">
                              <CalendarDays size={19} className="text-blue-600" />
                              {booking.date}
                            </div>
                          </td>

                          <td className="border-b border-[#e5edf9] px-5 py-6">
                            <StatusBadge status={status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile schedule cards */}
              <div className="space-y-4 p-4 lg:hidden sm:p-6">
                {filteredBookings.map((booking) => {
                  const status = getBookingStatus(booking);

                  return (
                    <article
                      key={booking.id}
                      className="rounded-xl border border-[#dce8fb] bg-[#f9fbff] p-4 sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-base font-bold text-[#142f70] sm:text-lg">
                          {booking.meeting}
                        </h3>
                        <StatusBadge status={status} />
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Detail
                          icon={<Clock3 size={18} />}
                          label="TIME"
                          value={booking.time}
                        />
                        <Detail
                          icon={<MapPin size={18} />}
                          label="ROOM"
                          value={booking.room}
                        />
                        <Detail
                          icon={<UserRound size={18} />}
                          label="BOOKER"
                          value={booking.booker}
                        />
                        <Detail
                          icon={<CalendarDays size={18} />}
                          label="DATE"
                          value={booking.date}
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </section>

      {/* Footer */}
      <footer className="mt-2 border-t border-[#dce7f8] bg-white/70 px-5 py-5 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-[1800px] flex-col justify-between gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:text-sm">
          <p>Conference Room Booking System · Dangote</p>
          <p>Last updated at {lastUpdated || "--:--:--"} IST</p>
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
  value: number | string;
  iconClass: string;
}) {
  return (
    <div className="flex min-h-36 items-center gap-5 rounded-2xl border border-[#dfe9f8] bg-white p-6 shadow-[0_4px_12px_rgba(22,54,112,0.06)] transition hover:-translate-y-0.5 hover:shadow-md sm:p-8">
      <div
        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500 sm:text-base">
          {label}
        </p>
        <p className="mt-1 text-3xl font-extrabold tabular-nums text-[#142f70] sm:text-4xl">
          {value}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Upcoming: "bg-blue-50 text-blue-700 ring-blue-200",
    "In Progress": "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Completed: "bg-slate-100 text-slate-600 ring-slate-200",
  };

  const dotStyles: Record<string, string> = {
    Upcoming: "bg-blue-600",
    "In Progress": "bg-emerald-500",
    Completed: "bg-slate-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset sm:text-sm ${
        styles[status] || styles.Upcoming
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          dotStyles[status] || dotStyles.Upcoming
        }`}
      />
      {status}
    </span>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-blue-600">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold tracking-wider text-slate-400">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-semibold text-[#142f70]">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}
