import { cn } from "@/lib/utils/cn";

const STATUS_STYLES = {
  active: { dot: "bg-status-green", text: "text-status-green", label: "Active" },
  online: { dot: "bg-status-green", text: "text-status-green", label: "Online" },
  live: { dot: "bg-status-green", text: "text-status-green", label: "Live" },
  failed: { dot: "bg-status-red", text: "text-status-red", label: "Failed" },
  pending: { dot: "bg-status-gold", text: "text-status-gold", label: "Pending" },
  healthy: { dot: "bg-status-green", text: "text-status-green", label: "Healthy" },
  degraded: { dot: "bg-status-gold", text: "text-status-gold", label: "Degraded" },
  unreachable: { dot: "bg-status-red", text: "text-status-red", label: "Unreachable" },
  not_configured: { dot: "bg-text-muted", text: "text-text-muted", label: "Not Configured" },
} as const;

interface StatusDotProps {
  status: keyof typeof STATUS_STYLES;
  label?: string;
  className?: string;
}

export function StatusDot({ status, label, className }: StatusDotProps) {
  const style = STATUS_STYLES[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", style.text, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      {label ?? style.label}
    </span>
  );
}
