"use client";

interface Room {
  _id: string;
  name: string;
  location: string;
  capacity: number;
  facilities: string[];
  isActive: boolean;
}

interface RoomFiltersProps {
  locations: string[];
  selectedLocation: string;
  onLocationChange: (
    location: string
  ) => void;

  rooms: Room[];
  selectedRoom: string;
  onRoomChange: (
    roomId: string
  ) => void;
}

export default function RoomFilters({
  locations,
  selectedLocation,
  onLocationChange,
  rooms,
  selectedRoom,
  onRoomChange,
}: RoomFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {/* =================================================
          LOCATION FILTER
      ================================================= */}

      <select
        value={selectedLocation}
        onChange={(event) =>
          onLocationChange(
            event.target.value
          )
        }
        className="
          rounded-xl
          border
          border-[#D5E2F7]
          bg-white
          px-4
          py-2.5
          text-sm
          font-medium
          text-[#10275F]
          outline-none
          transition
          hover:border-[#B8CCEC]
          focus:border-[#1D55B8]
          focus:ring-2
          focus:ring-[#1D55B8]/10
        "
        aria-label="Filter by location"
      >
        <option value="All Locations">
          All Locations
        </option>

        {locations
          .filter(
            (location) =>
              location !==
              "All Locations"
          )
          .map((location) => (
            <option
              key={location}
              value={location}
            >
              {location}
            </option>
          ))}
      </select>

      {/* =================================================
          ROOM FILTER
      ================================================= */}

      <select
        value={selectedRoom}
        onChange={(event) =>
          onRoomChange(
            event.target.value
          )
        }
        className="
          rounded-xl
          border
          border-[#D5E2F7]
          bg-white
          px-4
          py-2.5
          text-sm
          font-medium
          text-[#10275F]
          outline-none
          transition
          hover:border-[#B8CCEC]
          focus:border-[#1D55B8]
          focus:ring-2
          focus:ring-[#1D55B8]/10
        "
        aria-label="Filter by room"
      >
        <option value="All Rooms">
          All Rooms
        </option>

        {rooms.map((room) => (
          <option
            key={room._id}
            value={room._id}
          >
            {room.name}
          </option>
        ))}
      </select>
    </div>
  );
}