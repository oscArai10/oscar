import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware already gates /dashboard, but fetch the profile for display.
  // Falls back to Guest when Supabase isn't configured yet (pre-keys).
  let userName = "Guest";
  let userRole = "Free Tier";

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, wallet_address, email, tier, role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        userName =
          profile.display_name ||
          profile.email ||
          (profile.wallet_address
            ? `${profile.wallet_address.slice(0, 6)}…${profile.wallet_address.slice(-4)}`
            : "Account");
        userRole =
          profile.role === "owner"
            ? "Owner"
            : profile.tier === "pro"
              ? "Pro"
              : "Free Tier";
      }
    }
  }

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
