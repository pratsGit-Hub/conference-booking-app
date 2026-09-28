import AdminGuard from "@/components/auth/AdminGuard";
import AppShell from "@/components/layout/AppShell";
import AdminReportsContent from "@/components/admin/AdminReportsContent";

export default function AdminReportsPage() {
  return (
    <AdminGuard>
      <AppShell>
        <AdminReportsContent />
      </AppShell>
    </AdminGuard>
  );
}