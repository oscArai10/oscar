import { Lock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";
import type { BadgeDefinition } from "@/lib/dashboard/badges";

export function BadgesCard({ badges }: { badges: BadgeDefinition[] }) {
  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <Card title={`Achievements (${earnedCount}/${badges.length})`}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {badges.map((badge) => (
          <div
            key={badge.id}
            title={badge.description}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors",
              badge.earned
                ? "border-accent-cyan/40 bg-accent-blue/10"
                : "border-neon bg-bg-card opacity-50",
            )}
          >
            <div
              className={cn(
                "relative flex h-11 w-11 items-center justify-center rounded-full",
                badge.earned ? "bg-accent-blue/20 text-accent-cyan" : "bg-white/5 text-text-muted",
              )}
            >
              <badge.icon size={20} />
              {!badge.earned && (
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-bg-primary text-text-muted">
                  <Lock size={11} />
                </span>
              )}
            </div>
            <span
              className={cn(
                "text-xs font-semibold",
                badge.earned ? "text-text-primary" : "text-text-muted",
              )}
            >
              {badge.label}
            </span>
            <span className="text-[11px] leading-snug text-text-muted">
              {badge.description}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
