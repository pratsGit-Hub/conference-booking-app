"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Search,
  RefreshCw,
  Plus,
  Pencil,
  Power,
  MapPin,
  Users,
  X,
  Save,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CalendarPlus,
} from "lucide-react";

import BookingModal from "@/components/bookings/BookingModal";

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
  createdAt: string;
  updatedAt: string;
}

interface RoomsResponse {
  success: boolean;
  rooms: Room[];
  message?: string;
}

interface RoomResponse {
  success: boolean;
  room?: Room;
  message?: string;
}

interface RoomFormData {
  name: string;
  capacity: string;
  location: string;
  description: string;
  facilities: string[];
}

interface StatusConfirmation {
  room: Room;
  action: "activate" | "deactivate";
}

const emptyForm: RoomFormData = {
  name: "",
  capacity: "",
  location: "",
  description: "",
  facilities: [],
};

/* =====================================================
   COMPONENT
===================================================== */

export default function AdminRoomsContent() {
  /* ===================================================
     STATE
  =================================================== */

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  /* ===================================================
     CREATE / EDIT
  =================================================== */

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [editingRoom, setEditingRoom] =
    useState<Room | null>(null);

  const [formData, setFormData] =
    useState<RoomFormData>(emptyForm);

  const [facilityInput, setFacilityInput] =
    useState("");

  const [saving, setSaving] = useState(false);

  /* ===================================================
     STATUS
  =================================================== */

  const [updatingRoomId, setUpdatingRoomId] =
    useState<string | null>(null);

  const [statusConfirmation, setStatusConfirmation] =
    useState<StatusConfirmation | null>(null);

  /* ===================================================
     ADMIN BOOKING
  =================================================== */

  const [bookingRoom, setBookingRoom] =
    useState<Room | null>(null);

  /* ===================================================
     FETCH ROOMS
  =================================================== */

  async function fetchRooms(showRefresh = false) {
    try {
      setError("");
      setSuccessMessage("");

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(
        `${API_URL}/api/rooms/admin`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const result: RoomsResponse =
        await response.json();

      if (!response.ok) {
        setError(
          result.message ||
            "Failed to load rooms"
        );
        return;
      }

      setRooms(result.rooms || []);
    } catch (error) {
      console.error(
        "Fetch rooms error:",
        error
      );

      setError(
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  /* ===================================================
     INITIAL LOAD
  =================================================== */

  useEffect(() => {
    fetchRooms();
  }, []);

  /* ===================================================
     CREATE ROOM
  =================================================== */

  function openCreateModal() {
    setEditingRoom(null);

    setFormData({
      ...emptyForm,
    });

    setFacilityInput("");
    setError("");
    setSuccessMessage("");
    setIsModalOpen(true);
  }

  /* ===================================================
     EDIT ROOM
  =================================================== */

  function openEditModal(room: Room) {
    setEditingRoom(room);

    setFormData({
      name: room.name,
      capacity: String(room.capacity),
      location: room.location,
      description: room.description || "",
      facilities: room.facilities || [],
    });

    setFacilityInput("");
    setError("");
    setSuccessMessage("");
    setIsModalOpen(true);
  }

  /* ===================================================
     CLOSE CREATE / EDIT MODAL
  =================================================== */

  function closeModal() {
    if (saving) {
      return;
    }

    setIsModalOpen(false);
    setEditingRoom(null);

    setFormData({
      ...emptyForm,
    });

    setFacilityInput("");
  }

  /* ===================================================
     FORM CHANGE
  =================================================== */

  function updateFormField(
    field: keyof RoomFormData,
    value: string
  ) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  /* ===================================================
     ADD FACILITY
  =================================================== */

  function addFacility() {
    const facility =
      facilityInput.trim();

    if (!facility) {
      return;
    }

    const alreadyExists =
      formData.facilities.some(
        (item) =>
          item.toLowerCase() ===
          facility.toLowerCase()
      );

    if (alreadyExists) {
      setFacilityInput("");
      return;
    }

    if (formData.facilities.length >= 30) {
      setError(
        "You can add a maximum of 30 facilities."
      );
      return;
    }

    setFormData((current) => ({
      ...current,
      facilities: [
        ...current.facilities,
        facility,
      ],
    }));

    setFacilityInput("");
    setError("");
  }

  /* ===================================================
     REMOVE FACILITY
  =================================================== */

  function removeFacility(
    facilityToRemove: string
  ) {
    setFormData((current) => ({
      ...current,
      facilities:
        current.facilities.filter(
          (facility) =>
            facility !==
            facilityToRemove
        ),
    }));
  }

  /* ===================================================
     FACILITY ENTER KEY
  =================================================== */

  function handleFacilityKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      addFacility();
    }
  }

  /* ===================================================
     VALIDATE FORM
  =================================================== */

  function validateForm(): string | null {
    const name =
      formData.name.trim();

    const location =
      formData.location.trim();

    const capacity =
      Number(formData.capacity);

    if (name.length < 2) {
      return "Room name must be at least 2 characters.";
    }

    if (name.length > 100) {
      return "Room name is too long.";
    }

    if (
      !formData.capacity.trim() ||
      !Number.isInteger(capacity) ||
      capacity < 1
    ) {
      return "Capacity must be a whole number greater than 0.";
    }

    if (capacity > 1000) {
      return "Capacity cannot exceed 1000.";
    }

    if (location.length < 2) {
      return "Location is required.";
    }

    if (location.length > 200) {
      return "Location is too long.";
    }

    if (
      formData.description.length >
      1000
    ) {
      return "Description is too long.";
    }

    return null;
  }

  /* ===================================================
     SAVE ROOM
  =================================================== */

  async function saveRoom(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    const validationError =
      validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const facilities = [
      ...formData.facilities,
    ];

    const pendingFacility =
      facilityInput.trim();

    if (
      pendingFacility &&
      !facilities.some(
        (item) =>
          item.toLowerCase() ===
          pendingFacility.toLowerCase()
      )
    ) {
      facilities.push(pendingFacility);
    }

    if (facilities.length > 30) {
      setError(
        "You can add a maximum of 30 facilities."
      );
      return;
    }

    const payload = {
      name: formData.name.trim(),
      capacity: Number(
        formData.capacity
      ),
      location:
        formData.location.trim(),
      description:
        formData.description.trim() ||
        undefined,
      facilities,
    };

    try {
      setSaving(true);

      const isEditing =
        Boolean(editingRoom);

      const url = isEditing
        ? `${API_URL}/api/rooms/${editingRoom?._id}`
        : `${API_URL}/api/rooms`;

      const response = await fetch(
        url,
        {
          method: isEditing
            ? "PATCH"
            : "POST",

          credentials: "include",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            payload
          ),
        }
      );

      const result: RoomResponse =
        await response.json();

      if (!response.ok) {
        setError(
          result.message ||
            "Failed to save room"
        );
        return;
      }

      if (result.room) {
        if (isEditing) {
          setRooms((currentRooms) =>
            currentRooms.map(
              (room) =>
                room._id ===
                result.room?._id
                  ? result.room!
                  : room
            )
          );
        } else {
          setRooms((currentRooms) => [
            result.room!,
            ...currentRooms,
          ]);
        }
      }

      setSuccessMessage(
        isEditing
          ? "Room updated successfully."
          : "Room created successfully."
      );

      closeModal();
    } catch (error) {
      console.error(
        "Save room error:",
        error
      );

      setError(
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  /* ===================================================
     ACTIVATE / DEACTIVATE
  =================================================== */

  function toggleRoomStatus(room: Room) {
    setError("");
    setSuccessMessage("");

    setStatusConfirmation({
      room,
      action: room.isActive
        ? "deactivate"
        : "activate",
    });
  }

  function closeStatusConfirmation() {
    if (updatingRoomId) {
      return;
    }

    setStatusConfirmation(null);
  }

  async function confirmStatusUpdate() {
    if (!statusConfirmation) {
      return;
    }

    const {
      room,
      action,
    } = statusConfirmation;

    const newStatus =
      action === "activate";

    try {
      setUpdatingRoomId(room._id);
      setError("");
      setSuccessMessage("");

      const response = await fetch(
        `${API_URL}/api/rooms/${room._id}/status`,
        {
          method: "PATCH",

          credentials: "include",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            isActive: newStatus,
          }),
        }
      );

      const result: RoomResponse =
        await response.json();

      if (!response.ok) {
        setError(
          result.message ||
            `Failed to ${action} room`
        );
        return;
      }

      setRooms((currentRooms) =>
        currentRooms.map(
          (currentRoom) =>
            currentRoom._id ===
            room._id
              ? {
                  ...currentRoom,
                  isActive:
                    newStatus,
                }
              : currentRoom
        )
      );

      setSuccessMessage(
        newStatus
          ? "Room activated successfully."
          : "Room deactivated successfully."
      );

      setStatusConfirmation(null);
    } catch (error) {
      console.error(
        "Update room status error:",
        error
      );

      setError(
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setUpdatingRoomId(null);
    }
  }

  /* ===================================================
     ADMIN BOOK ROOM
  =================================================== */

  function openBookingModal(room: Room) {
    if (!room.isActive) {
      setError(
        "Inactive rooms cannot be booked."
      );
      return;
    }

    setError("");
    setSuccessMessage("");
    setBookingRoom(room);
  }

  function closeBookingModal() {
    setBookingRoom(null);
  }

  /* ===================================================
     FILTER ROOMS
  =================================================== */

  const filteredRooms = useMemo(() => {
    const searchValue =
      search.trim().toLowerCase();

    return rooms.filter((room) => {
      const matchesSearch =
        !searchValue ||
        room.name
          .toLowerCase()
          .includes(searchValue) ||
        room.location
          .toLowerCase()
          .includes(searchValue) ||
        room.description
          ?.toLowerCase()
          .includes(searchValue) ||
        room.facilities.some(
          (facility) =>
            facility
              .toLowerCase()
              .includes(searchValue)
        );

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" &&
          room.isActive) ||
        (statusFilter === "INACTIVE" &&
          !room.isActive);

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    rooms,
    search,
    statusFilter,
  ]);

  /* ===================================================
     STATISTICS
  =================================================== */

  const totalRooms =
    rooms.length;

  const activeRooms =
    rooms.filter(
      (room) => room.isActive
    ).length;

  const inactiveRooms =
    rooms.filter(
      (room) => !room.isActive
    ).length;

  /* ===================================================
     LOADING
  =================================================== */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#EEF4FF] p-5 md:p-8 lg:p-10">

        <div className="mb-8">

          <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-[#E83B32]">
            Administration
          </p>

          <h1 className="text-3xl font-bold text-[#10275F] md:text-4xl">
            Rooms
          </h1>

          <p className="mt-2 text-sm text-[#64748B]">
            Manage conference rooms and
            their availability.
          </p>

        </div>

        <div className="flex min-h-[55vh] items-center justify-center rounded-2xl border border-[#D5E2F7] bg-white shadow-sm">

          <div className="text-center">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF4FF]">
              <RefreshCw
                size={27}
                className="animate-spin text-[#1D55B8]"
              />
            </div>

            <p className="mt-4 text-sm font-semibold text-[#64748B]">
              Loading rooms...
            </p>

          </div>

        </div>

      </main>
    );
  }

  /* ===================================================
     UI
  =================================================== */

  return (
    <main className="min-h-screen w-full bg-[#EEF4FF] p-5 md:p-8 lg:p-10">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

        <div>

          <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-[#E83B32]">
            Administration
          </p>

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#102D72] text-white">
              <Building2 size={22} />
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-[#10275F] md:text-4xl">
              Rooms
            </h1>

          </div>

          <p className="mt-2 text-sm text-[#64748B]">
            Manage conference rooms and
            their availability.
          </p>

        </div>

        <div className="flex flex-col gap-3 sm:flex-row">

          <button
            type="button"
            onClick={() =>
              fetchRooms(true)
            }
            disabled={refreshing}
            className="
              inline-flex
              h-11
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-[#D5E2F7]
              bg-white
              px-5
              text-sm
              font-bold
              text-[#10275F]
              shadow-sm
              transition
              hover:border-[#B8CCEC]
              hover:bg-[#F6F9FF]
              hover:text-[#1D55B8]
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            <RefreshCw
              size={17}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>

          <button
            type="button"
            onClick={
              openCreateModal
            }
            className="
              inline-flex
              h-11
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-[#102D72]
              px-5
              text-sm
              font-bold
              text-white
              shadow-sm
              transition
              hover:bg-[#0C245C]
            "
          >
            <Plus size={18} />
            Add Room
          </button>

        </div>

      </div>

      {/* =================================================
          STATISTICS
      ================================================= */}

      <div className="mb-6 grid gap-5 sm:grid-cols-3">

        {/* Total */}

        <StatCard
          title="Total Rooms"
          value={totalRooms}
          icon={
            <Building2 size={21} />
          }
          iconClass="bg-[#EEF4FF] text-[#1D55B8]"
        />

        {/* Active */}

        <StatCard
          title="Active Rooms"
          value={activeRooms}
          icon={
            <CheckCircle2
              size={21}
            />
          }
          iconClass="bg-[#EEF4FF] text-[#1D55B8]"
        />

        {/* Inactive */}

        <StatCard
          title="Inactive Rooms"
          value={inactiveRooms}
          icon={
            <XCircle size={21} />
          }
          iconClass="bg-slate-100 text-slate-500"
        />

      </div>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-white px-4 py-3 shadow-sm">

          <div className="flex items-center gap-3">

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50">
              <AlertTriangle
                size={16}
                className="text-[#E83B32]"
              />
            </div>

            <span className="text-sm font-medium text-[#E83B32]">
              {error}
            </span>

          </div>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-[#E83B32]"
          >
            <X size={17} />
          </button>

        </div>
      )}

      {/* =================================================
          SUCCESS
      ================================================= */}

      {successMessage && (
        <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-blue-200 bg-white px-4 py-3 shadow-sm">

          <div className="flex items-center gap-3">

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EEF4FF]">
              <CheckCircle2
                size={17}
                className="text-[#1D55B8]"
              />
            </div>

            <span className="text-sm font-semibold text-[#1D55B8]">
              {successMessage}
            </span>

          </div>

          <button
            type="button"
            onClick={() =>
              setSuccessMessage("")
            }
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-[#EEF4FF] hover:text-[#1D55B8]"
          >
            <X size={17} />
          </button>

        </div>
      )}

      {/* =================================================
          FILTERS
      ================================================= */}

      <div className="mb-6 rounded-2xl border border-[#D5E2F7] bg-white p-4 shadow-sm">

        <div className="flex flex-col gap-3 md:flex-row">

          <div className="relative flex-1">

            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search rooms by name, location or facility..."
              className="
                w-full
                rounded-xl
                border
                border-[#D5E2F7]
                bg-[#F6F9FF]
                py-2.5
                pl-10
                pr-4
                text-sm
                text-[#10275F]
                outline-none
                transition
                placeholder:text-[#94A3B8]
                focus:border-[#1D55B8]
                focus:bg-white
                focus:ring-2
                focus:ring-[#1D55B8]/10
              "
            />

          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target
                  .value as
                  | "ALL"
                  | "ACTIVE"
                  | "INACTIVE"
              )
            }
            className="
              rounded-xl
              border
              border-[#D5E2F7]
              bg-[#F6F9FF]
              px-4
              py-2.5
              text-sm
              font-semibold
              text-[#10275F]
              outline-none
              transition
              focus:border-[#1D55B8]
              focus:ring-2
              focus:ring-[#1D55B8]/10
            "
          >
            <option value="ALL">
              All Status
            </option>

            <option value="ACTIVE">
              Active
            </option>

            <option value="INACTIVE">
              Inactive
            </option>
          </select>

        </div>

      </div>

      {/* =================================================
          ROOM LIST
      ================================================= */}

      {filteredRooms.length === 0 ? (

        <div className="rounded-2xl border border-[#D5E2F7] bg-white p-12 text-center shadow-sm">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF4FF]">
            <Building2
              size={30}
              className="text-[#1D55B8]"
            />
          </div>

          <h3 className="mt-4 text-base font-bold text-[#10275F]">
            No rooms found
          </h3>

          <p className="mt-1 text-sm text-[#64748B]">
            Try changing your search
            or status filter.
          </p>

          <button
            type="button"
            onClick={
              openCreateModal
            }
            className="
              mt-5
              inline-flex
              items-center
              gap-2
              rounded-xl
              bg-[#102D72]
              px-5
              py-2.5
              text-sm
              font-bold
              text-white
              transition
              hover:bg-[#0C245C]
            "
          >
            <Plus size={17} />
            Add Room
          </button>

        </div>

      ) : (

        <div className="grid gap-5 xl:grid-cols-2">

          {filteredRooms.map(
            (room) => {

              const isUpdating =
                updatingRoomId ===
                room._id;

              return (
                <article
                  key={room._id}
                  className="
                    overflow-hidden
                    rounded-2xl
                    border
                    border-[#D5E2F7]
                    bg-white
                    shadow-sm
                    transition
                    hover:-translate-y-0.5
                    hover:shadow-md
                  "
                >

                  {/* TOP ACCENT */}

                  <div
                    className={`h-1.5 ${
                      room.isActive
                        ? "bg-[#1D55B8]"
                        : "bg-slate-300"
                    }`}
                  />

                  <div className="p-5">

                    {/* ROOM HEADER */}

                    <div className="flex items-start justify-between gap-4">

                      <div className="flex min-w-0 items-start gap-4">

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF]">
                          <Building2
                            size={23}
                            className="text-[#1D55B8]"
                          />
                        </div>

                        <div className="min-w-0">

                          <h2 className="truncate text-lg font-bold text-[#10275F]">
                            {room.name}
                          </h2>

                          <div className="mt-1 flex items-center gap-1.5 text-sm text-[#64748B]">

                            <MapPin
                              size={15}
                              className="text-[#1D55B8]"
                            />

                            <span className="truncate">
                              {room.location}
                            </span>

                          </div>

                        </div>

                      </div>

                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                          room.isActive
                            ? "border border-blue-200 bg-[#EEF4FF] text-[#1D55B8]"
                            : "border border-slate-200 bg-slate-50 text-slate-500"
                        }`}
                      >

                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            room.isActive
                              ? "bg-[#1D55B8]"
                              : "bg-slate-400"
                          }`}
                        />

                        {room.isActive
                          ? "ACTIVE"
                          : "INACTIVE"}

                      </span>

                    </div>

                    {/* ROOM DETAILS */}

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">

                      <div className="flex items-center gap-2 rounded-xl bg-[#F6F9FF] px-3 py-2.5">

                        <Users
                          size={17}
                          className="text-[#1D55B8]"
                        />

                        <div>

                          <p className="text-[11px] font-bold uppercase tracking-wide text-[#94A3B8]">
                            Capacity
                          </p>

                          <p className="text-sm font-semibold text-[#10275F]">
                            {room.capacity}{" "}
                            {room.capacity ===
                            1
                              ? "person"
                              : "people"}
                          </p>

                        </div>

                      </div>

                      <div className="flex items-center gap-2 rounded-xl bg-[#F6F9FF] px-3 py-2.5">

                        <MapPin
                          size={17}
                          className="text-[#1D55B8]"
                        />

                        <div className="min-w-0">

                          <p className="text-[11px] font-bold uppercase tracking-wide text-[#94A3B8]">
                            Location
                          </p>

                          <p className="truncate text-sm font-semibold text-[#10275F]">
                            {room.location}
                          </p>

                        </div>

                      </div>

                    </div>

                    {/* DESCRIPTION */}

                    {room.description && (
                      <p className="mt-4 text-sm leading-6 text-[#64748B]">
                        {room.description}
                      </p>
                    )}

                    {/* FACILITIES */}

                    {room.facilities.length >
                      0 && (
                      <div className="mt-4">

                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#94A3B8]">
                          Facilities
                        </p>

                        <div className="flex flex-wrap gap-2">

                          {room.facilities.map(
                            (facility) => (
                              <span
                                key={
                                  facility
                                }
                                className="
                                  rounded-lg
                                  border
                                  border-[#D5E2F7]
                                  bg-[#F6F9FF]
                                  px-2.5
                                  py-1
                                  text-xs
                                  font-semibold
                                  text-[#475569]
                                "
                              >
                                {facility}
                              </span>
                            )
                          )}

                        </div>

                      </div>
                    )}

                    {/* ACTIONS */}

                    <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-[#E5ECF7] pt-4">

                      {/* BOOK */}

                      <button
                        type="button"
                        onClick={() =>
                          openBookingModal(
                            room
                          )
                        }
                        disabled={
                          isUpdating ||
                          !room.isActive
                        }
                        title={
                          room.isActive
                            ? "Book room"
                            : "Inactive rooms cannot be booked"
                        }
                        className="
                          inline-flex
                          items-center
                          gap-2
                          rounded-lg
                          border
                          border-[#D5E2F7]
                          bg-white
                          px-3
                          py-2
                          text-xs
                          font-bold
                          text-[#102D72]
                          transition
                          hover:border-[#1D55B8]
                          hover:bg-[#EEF4FF]
                          hover:text-[#1D55B8]
                          disabled:cursor-not-allowed
                          disabled:opacity-40
                        "
                      >
                        <CalendarPlus
                          size={14}
                        />
                        Book Room
                      </button>

                      {/* EDIT */}

                      <button
                        type="button"
                        onClick={() =>
                          openEditModal(
                            room
                          )
                        }
                        disabled={
                          isUpdating
                        }
                        className="
                          inline-flex
                          items-center
                          gap-2
                          rounded-lg
                          border
                          border-[#D5E2F7]
                          bg-white
                          px-3
                          py-2
                          text-xs
                          font-bold
                          text-[#475569]
                          transition
                          hover:bg-[#F6F9FF]
                          hover:text-[#10275F]
                          disabled:cursor-not-allowed
                          disabled:opacity-50
                        "
                      >
                        <Pencil
                          size={14}
                        />
                        Edit
                      </button>

                      {/* ACTIVATE / DEACTIVATE */}

                      <button
                        type="button"
                        onClick={() =>
                          toggleRoomStatus(
                            room
                          )
                        }
                        disabled={
                          isUpdating
                        }
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          room.isActive
                            ? "border border-red-200 bg-red-50 text-[#E83B32] hover:bg-red-100"
                            : "bg-[#102D72] text-white hover:bg-[#0C245C]"
                        }`}
                      >

                        {isUpdating ? (
                          <RefreshCw
                            size={14}
                            className="animate-spin"
                          />
                        ) : (
                          <Power
                            size={14}
                          />
                        )}

                        {room.isActive
                          ? "Deactivate"
                          : "Activate"}

                      </button>

                    </div>

                  </div>

                </article>
              );
            }
          )}

        </div>
      )}

      {/* =================================================
          ADD / EDIT ROOM MODAL
      ================================================= */}

      {isModalOpen && (
        <div
          className="
            fixed
            inset-0
            z-50
            flex
            items-center
            justify-center
            bg-[#071B45]/60
            p-4
            backdrop-blur-[2px]
          "
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#D5E2F7] bg-white shadow-2xl">

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-[#E5ECF7] px-6 py-5">

              <div>

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF4FF]">
                    <Building2
                      size={19}
                      className="text-[#1D55B8]"
                    />
                  </div>

                  <h2 className="text-xl font-bold text-[#10275F]">
                    {editingRoom
                      ? "Edit Room"
                      : "Add New Room"}
                  </h2>

                </div>

                <p className="mt-2 text-sm text-[#64748B]">
                  {editingRoom
                    ? "Update the room details below."
                    : "Create a new conference room."}
                </p>

              </div>

              <button
                type="button"
                onClick={
                  closeModal
                }
                disabled={saving}
                className="
                  rounded-lg
                  p-2
                  text-[#94A3B8]
                  transition
                  hover:bg-[#EEF4FF]
                  hover:text-[#10275F]
                  disabled:cursor-not-allowed
                "
              >
                <X size={20} />
              </button>

            </div>

            <form
              onSubmit={saveRoom}
              className="p-6"
            >

              <div className="grid gap-5 sm:grid-cols-2">

                {/* ROOM NAME */}

                <div className="sm:col-span-2">

                  <label className="mb-2 block text-sm font-bold text-[#10275F]">
                    Room Name
                  </label>

                  <input
                    type="text"
                    value={
                      formData.name
                    }
                    onChange={(event) =>
                      updateFormField(
                        "name",
                        event.target
                          .value
                      )
                    }
                    placeholder="e.g. Board Room"
                    maxLength={100}
                    disabled={saving}
                    className="
                      w-full
                      rounded-xl
                      border
                      border-[#D5E2F7]
                      bg-[#F6F9FF]
                      px-4
                      py-3
                      text-sm
                      text-[#10275F]
                      outline-none
                      transition
                      placeholder:text-[#94A3B8]
                      focus:border-[#1D55B8]
                      focus:bg-white
                      focus:ring-2
                      focus:ring-[#1D55B8]/10
                      disabled:bg-slate-50
                    "
                  />

                </div>

                {/* CAPACITY */}

                <div>

                  <label className="mb-2 block text-sm font-bold text-[#10275F]">
                    Capacity
                  </label>

                  <input
                    type="number"
                    min="1"
                    max="1000"
                    step="1"
                    value={
                      formData.capacity
                    }
                    onChange={(event) =>
                      updateFormField(
                        "capacity",
                        event.target
                          .value
                      )
                    }
                    placeholder="e.g. 12"
                    disabled={saving}
                    className="
                      w-full
                      rounded-xl
                      border
                      border-[#D5E2F7]
                      bg-[#F6F9FF]
                      px-4
                      py-3
                      text-sm
                      text-[#10275F]
                      outline-none
                      transition
                      placeholder:text-[#94A3B8]
                      focus:border-[#1D55B8]
                      focus:bg-white
                      focus:ring-2
                      focus:ring-[#1D55B8]/10
                    "
                  />

                </div>

                {/* LOCATION */}

                <div>

                  <label className="mb-2 block text-sm font-bold text-[#10275F]">
                    Location
                  </label>

                  <input
                    type="text"
                    value={
                      formData.location
                    }
                    onChange={(event) =>
                      updateFormField(
                        "location",
                        event.target
                          .value
                      )
                    }
                    placeholder="e.g. 2nd Floor"
                    maxLength={200}
                    disabled={saving}
                    className="
                      w-full
                      rounded-xl
                      border
                      border-[#D5E2F7]
                      bg-[#F6F9FF]
                      px-4
                      py-3
                      text-sm
                      text-[#10275F]
                      outline-none
                      transition
                      placeholder:text-[#94A3B8]
                      focus:border-[#1D55B8]
                      focus:bg-white
                      focus:ring-2
                      focus:ring-[#1D55B8]/10
                    "
                  />

                </div>

                {/* DESCRIPTION */}

                <div className="sm:col-span-2">

                  <label className="mb-2 block text-sm font-bold text-[#10275F]">
                    Description
                  </label>

                  <textarea
                    value={
                      formData.description
                    }
                    onChange={(event) =>
                      updateFormField(
                        "description",
                        event.target
                          .value
                      )
                    }
                    placeholder="Describe the room..."
                    maxLength={1000}
                    rows={4}
                    disabled={saving}
                    className="
                      w-full
                      resize-none
                      rounded-xl
                      border
                      border-[#D5E2F7]
                      bg-[#F6F9FF]
                      px-4
                      py-3
                      text-sm
                      text-[#10275F]
                      outline-none
                      transition
                      placeholder:text-[#94A3B8]
                      focus:border-[#1D55B8]
                      focus:bg-white
                      focus:ring-2
                      focus:ring-[#1D55B8]/10
                    "
                  />

                  <p className="mt-1 text-right text-xs text-[#94A3B8]">
                    {
                      formData
                        .description
                        .length
                    }
                    /1000
                  </p>

                </div>

                {/* FACILITIES */}

                <div className="sm:col-span-2">

                  <label className="mb-2 block text-sm font-bold text-[#10275F]">
                    Facilities
                  </label>

                  <div className="flex gap-2">

                    <input
                      type="text"
                      value={
                        facilityInput
                      }
                      onChange={(event) =>
                        setFacilityInput(
                          event.target
                            .value
                        )
                      }
                      onKeyDown={
                        handleFacilityKeyDown
                      }
                      placeholder="e.g. Projector"
                      disabled={saving}
                      className="
                        min-w-0
                        flex-1
                        rounded-xl
                        border
                        border-[#D5E2F7]
                        bg-[#F6F9FF]
                        px-4
                        py-3
                        text-sm
                        text-[#10275F]
                        outline-none
                        transition
                        placeholder:text-[#94A3B8]
                        focus:border-[#1D55B8]
                        focus:bg-white
                        focus:ring-2
                        focus:ring-[#1D55B8]/10
                      "
                    />

                    <button
                      type="button"
                      onClick={
                        addFacility
                      }
                      disabled={
                        saving ||
                        !facilityInput.trim()
                      }
                      className="
                        rounded-xl
                        border
                        border-[#D5E2F7]
                        bg-[#EEF4FF]
                        px-4
                        text-sm
                        font-bold
                        text-[#1D55B8]
                        transition
                        hover:bg-[#DCE9FF]
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                      "
                    >
                      Add
                    </button>

                  </div>

                  <p className="mt-2 text-xs text-[#94A3B8]">
                    Type a facility and
                    press Enter or click
                    Add.
                  </p>

                  {formData.facilities
                    .length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">

                      {formData.facilities.map(
                        (facility) => (
                          <span
                            key={
                              facility
                            }
                            className="
                              inline-flex
                              items-center
                              gap-1.5
                              rounded-lg
                              border
                              border-[#D5E2F7]
                              bg-[#EEF4FF]
                              px-3
                              py-1.5
                              text-xs
                              font-bold
                              text-[#1D55B8]
                            "
                          >

                            {
                              facility
                            }

                            <button
                              type="button"
                              onClick={() =>
                                removeFacility(
                                  facility
                                )
                              }
                              disabled={
                                saving
                              }
                              className="
                                rounded-full
                                text-[#7C94B8]
                                transition
                                hover:text-[#E83B32]
                              "
                            >
                              <X
                                size={
                                  13
                                }
                              />
                            </button>

                          </span>
                        )
                      )}

                    </div>
                  )}

                </div>

              </div>

              {/* FORM ERROR */}

              {error && (
                <div className="mt-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-[#E83B32]">

                  <AlertTriangle
                    size={17}
                    className="shrink-0"
                  />

                  <span>
                    {error}
                  </span>

                </div>
              )}

              {/* BUTTONS */}

              <div className="mt-6 flex justify-end gap-3 border-t border-[#E5ECF7] pt-5">

                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  disabled={saving}
                  className="
                    rounded-xl
                    border
                    border-[#D5E2F7]
                    bg-white
                    px-5
                    py-2.5
                    text-sm
                    font-bold
                    text-[#475569]
                    transition
                    hover:bg-[#F6F9FF]
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="
                    inline-flex
                    items-center
                    gap-2
                    rounded-xl
                    bg-[#102D72]
                    px-5
                    py-2.5
                    text-sm
                    font-bold
                    text-white
                    transition
                    hover:bg-[#0C245C]
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >

                  {saving ? (
                    <RefreshCw
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Save size={16} />
                  )}

                  {saving
                    ? "Saving..."
                    : editingRoom
                      ? "Save Changes"
                      : "Create Room"}

                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* =================================================
          ACTIVATE / DEACTIVATE CONFIRMATION
      ================================================= */}

      {statusConfirmation && (
        <div
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-center
            justify-center
            bg-[#071B45]/60
            px-4
            backdrop-blur-[2px]
          "
          onClick={
            closeStatusConfirmation
          }
        >

          <div
            className="w-full max-w-md rounded-2xl border border-[#D5E2F7] bg-white p-6 shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
                statusConfirmation.action ===
                "deactivate"
                  ? "bg-red-50"
                  : "bg-[#EEF4FF]"
              }`}
            >

              {statusConfirmation.action ===
              "deactivate" ? (
                <AlertTriangle
                  size={27}
                  className="text-[#E83B32]"
                />
              ) : (
                <Power
                  size={27}
                  className="text-[#1D55B8]"
                />
              )}

            </div>

            <div className="mt-5 text-center">

              <h3 className="text-xl font-bold text-[#10275F]">
                {statusConfirmation.action ===
                "deactivate"
                  ? "Deactivate Room?"
                  : "Activate Room?"}
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#64748B]">

                Are you sure you want to{" "}

                <span className="font-bold text-[#10275F]">
                  {statusConfirmation.action ===
                  "deactivate"
                    ? "deactivate"
                    : "activate"}
                </span>{" "}

                <span className="font-bold text-[#10275F]">
                  "{statusConfirmation.room.name}"
                </span>
                ?

              </p>

              {statusConfirmation.action ===
                "deactivate" && (
                <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-left">

                  <div className="flex gap-3">

                    <AlertTriangle
                      size={17}
                      className="mt-0.5 shrink-0 text-[#E83B32]"
                    />

                    <p className="text-xs leading-5 text-[#E83B32]">
                      Employees will no
                      longer be able to
                      book this room while
                      it is inactive.
                    </p>

                  </div>

                </div>
              )}

              {statusConfirmation.action ===
                "activate" && (
                <div className="mt-4 rounded-xl border border-blue-100 bg-[#EEF4FF] px-4 py-3 text-left">

                  <div className="flex gap-3">

                    <Power
                      size={17}
                      className="mt-0.5 shrink-0 text-[#1D55B8]"
                    />

                    <p className="text-xs leading-5 text-[#1D55B8]">
                      This room will become
                      available for employees
                      to book again.
                    </p>

                  </div>

                </div>
              )}

            </div>

            <div className="mt-6 flex gap-3">

              <button
                type="button"
                onClick={
                  closeStatusConfirmation
                }
                disabled={
                  Boolean(
                    updatingRoomId
                  )
                }
                className="
                  flex-1
                  rounded-xl
                  border
                  border-[#D5E2F7]
                  bg-white
                  px-4
                  py-3
                  text-sm
                  font-bold
                  text-[#475569]
                  transition
                  hover:bg-[#F6F9FF]
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  confirmStatusUpdate
                }
                disabled={
                  Boolean(
                    updatingRoomId
                  )
                }
                className="
                  flex-1
                  rounded-xl
                  bg-[#102D72]
                  px-4
                  py-3
                  text-sm
                  font-bold
                  text-white
                  transition
                  hover:bg-[#0C245C]
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >

                {updatingRoomId ? (
                  <span className="flex items-center justify-center gap-2">

                    <RefreshCw
                      size={16}
                      className="animate-spin"
                    />

                    Please wait...

                  </span>
                ) : (
                  statusConfirmation.action ===
                  "deactivate"
                    ? "Deactivate"
                    : "Activate"
                )}

              </button>

            </div>

          </div>

        </div>
      )}

      {/* =================================================
          ADMIN BOOKING MODAL
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
            new Date()
              .toISOString()
              .split("T")[0]
          }
          onClose={
            closeBookingModal
          }
        />
      )}

    </main>
  );
}

/* =====================================================
   STAT CARD
===================================================== */

function StatCard({
  title,
  value,
  icon,
  iconClass,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-[#D5E2F7] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

      <div className="flex items-center gap-3">

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>

        <div>

          <p className="text-sm font-semibold text-[#64748B]">
            {title}
          </p>

          <p className="mt-1 text-2xl font-bold text-[#10275F]">
            {value}
          </p>

        </div>

      </div>

    </div>
  );
}