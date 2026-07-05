import type { LucideIcon } from "lucide-react";
import { Sparkline } from "./Sparkline";
import { cn } from "@/lib/utils/cn";

interface StatCardProps {
  icon: LucideIcon;
  iconColor: string;
  label: string;
  value: string | number;
  subLabel: string;
  subLabelColor?: string;
  sparklineData?: number[];
  className?: string;
}

export function StatCard({
  icon: Icon,
  iconColor,
  label,
  value,
  subLabel,
  subLabelColor,
  sparklineData,
  className,
}: StatCardProps) {
  return (
    <div className={cn("glass-card flex flex-col gap-4 rounded-2xl p-5", className)}>
      <div className="flex items-start justify-between">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${iconColor}1A`, border: `1px solid ${iconColor}33` }}
        >
          <Icon size={20} color={iconColor} />
        </div>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          {label}
        </p>
        <div className="mt-1 flex items-end justify-between gap-2">
          <p className="font-heading text-3xl font-bold text-text-primary">
            {value}
          </p>
          {sparklineData && (
            <Sparkline data={sparklineData} color={subLabelColor ?? iconColor} />
          )}
        </div>
        <p
          className="mt-1 text-xs font-semibold"
          style={{ color: subLabelColor ?? iconColor }}
        >
          {subLabel}
        </p>
      </div>
    </div>
  );
}
