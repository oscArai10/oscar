import { Crown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { getCoreUsers } from "@/lib/core/data";

export default async function CoreUsersPage() {
  const users = await getCoreUsers();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-lg font-bold text-text-primary">
          oscAr CORE — Users
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Every signed-up user, most recent first.
        </p>
      </div>

      <Card>
        <DataTable
          keyFor={(row) => row.id}
          rows={users}
          emptyMessage="No users yet."
          columns={[
            {
              header: "User",
              render: (r) => (
                <span className="flex items-center gap-2 font-medium text-text-primary">
                  {r.role === "owner" && <Crown size={14} className="text-accent-purple-bright" />}
                  {r.displayName}
                </span>
              ),
            },
            {
              header: "Tier",
              render: (r) => (
                <span className={r.tier === "pro" ? "text-accent-cyan" : "text-text-muted"}>
                  {r.tier === "pro" ? "Pro" : "Free"}
                </span>
              ),
            },
            { header: "Role", render: (r) => (r.role === "owner" ? "Owner" : "User") },
            { header: "Deployments", align: "right", render: (r) => r.deploymentCount },
            {
              header: "Last Active",
              align: "right",
              render: (r) => r.lastActiveTimeAgo ?? "No deploys yet",
            },
          ]}
        />
      </Card>
    </div>
  );
}
