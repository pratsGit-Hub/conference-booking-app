import AppShell from "@/components/layout/AppShell";
import AdminGuard from "@/components/auth/AdminGuard";
import AdminUsersContent from "@/components/admin/AdminUsersContent";

export default function AdminUsersPage() {
  return (
    <AdminGuard>
      <AppShell>
        <AdminUsersContent />
      </AppShell>
    </AdminGuard>
  );
}