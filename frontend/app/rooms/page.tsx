import AuthGuard from "@/components/auth/AuthGuard";
import AppShell from "@/components/layout/AppShell";
import RoomsContent from "@/components/rooms/RoomsContent";

export default function RoomsPage() {
  return (
    <AuthGuard>
      <AppShell>
        <RoomsContent />
      </AppShell>
    </AuthGuard>
  );
}