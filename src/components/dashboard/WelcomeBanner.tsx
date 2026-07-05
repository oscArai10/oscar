import { Calendar, Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface WelcomeBannerProps {
  userName: string;
  dateLabel: string;
  dayLabel: string;
  timeLabel: string;
  timezoneLabel: string;
}

export function WelcomeBanner({
  userName,
  dateLabel,
  dayLabel,
  timeLabel,
  timezoneLabel,
}: WelcomeBannerProps) {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="font-heading text-xl font-bold text-text-primary">
          Welcome back, <span className="text-accent-blue-glow">{userName}</span>{" "}
          👋
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Here&apos;s what&apos;s happening with your oscAr factory today.
        </p>
      </div>
      <div className="flex gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-neon bg-bg-card px-3 py-2">
          <Calendar size={16} className="text-accent-cyan" />
          <div className="leading-tight">
            <p className="text-xs font-semibold text-text-primary">{dateLabel}</p>
            <p className="text-[11px] text-text-muted">{dayLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-neon bg-bg-card px-3 py-2">
          <Clock size={16} className="text-accent-purple-bright" />
          <div className="leading-tight">
            <p className="font-mono text-xs font-semibold text-text-primary">
              {timeLabel}
            </p>
            <p className="text-[11px] text-text-muted">{timezoneLabel}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
