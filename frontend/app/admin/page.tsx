import AppShell from "@/components/layout/AppShell";
import AdminGuard from "@/components/auth/AdminGuard";
import AdminDashboardContent from "@/components/admin/AdminDashboardContent";

export default function AdminDashboardPage() {
  return (
    <AdminGuard>
      <AppShell>
        <AdminDashboardContent />
      </AppShell>
    </AdminGuard>
  );
}