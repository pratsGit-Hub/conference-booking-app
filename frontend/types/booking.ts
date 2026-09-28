export interface Booking {
  id: string;
  roomName: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description?: string;
  location: string;
  status: "UPCOMING" | "COMPLETED" | "CANCELLED";
}