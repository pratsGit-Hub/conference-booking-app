import AppShell from "@/components/layout/AppShell";
import AdminGuard from "@/components/auth/AdminGuard";
import AdminRoomsContent from "@/components/admin/AdminRoomsContent";

export default function AdminRoomsPage() {
  return (
    <AdminGuard>
      <AppShell>
        <AdminRoomsContent />
      </AppShell>
    </AdminGuard>
  );
}