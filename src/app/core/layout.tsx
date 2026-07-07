import { CoreSidebar } from "@/components/core/CoreSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { getCurrentUserProfile } from "@/lib/supabase/profile";

export default async function CoreLayout({ children }: { children: React.ReactNode }) {
  // Middleware already gates /core to role=owner; this just fetches display data.
  const profile = await getCurrentUserProfile();

  return (
    <div className="flex min-h-screen bg-bg-primary">
      <CoreSidebar />
      <div className="flex flex-1 flex-col">
        <Topbar userName={profile?.displayName ?? "Owner"} userRole="Owner" notificationCount={0} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
