import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-bg-primary">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        {/* userName/role come from the auth session once wired in build step 4 */}
        <Topbar userName="Guest" userRole="Free Tier" notificationCount={0} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
