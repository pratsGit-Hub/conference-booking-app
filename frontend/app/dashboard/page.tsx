import AppShell from "@/components/layout/AppShell";
import DashboardContent from "@/components/dashboard/DashboardContent";
import AuthGuard from "@/components/auth/AuthGuard";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <AppShell>
        <DashboardContent />
      </AppShell>
    </AuthGuard>
  );
}