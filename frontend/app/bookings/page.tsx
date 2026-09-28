import AuthGuard from "@/components/auth/AuthGuard";
import AppShell from "@/components/layout/AppShell";
import BookingList from "@/components/bookings/BookingList";

export default function BookingsPage() {
  return (
    <AuthGuard>
      <AppShell>
        <BookingList />
      </AppShell>
    </AuthGuard>
  );
}