import AppShell from "@/components/layout/AppShell";
import AdminGuard from "@/components/auth/AdminGuard";
import AdminBookingsContent from "@/components/admin/AdminBookingsContent";

export default function AdminBookingsPage() {
  return (
    <AdminGuard>
      <AppShell>
        <AdminBookingsContent />
      </AppShell>
    </AdminGuard>
  );
}