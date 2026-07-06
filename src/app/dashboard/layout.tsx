import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { getCurrentUserProfile } from "@/lib/supabase/profile";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware already gates /dashboard; this just fetches display data.
  // Falls back to Guest when Supabase isn't configured yet or no session.
  const profile = await getCurrentUserProfile();
  const userName = profile?.displayName ?? "Guest";
  const userRole = profile
    ? profile.role === "owner"
      ? "Owner"
      : profile.tier === "pro"
        ? "Pro"
        : "Free Tier"
    : "Free Tier";

  return (
    <div className="flex min-h-screen bg-bg-primary">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar userName={userName} userRole={userRole} notificationCount={0} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
