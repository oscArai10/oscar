import type { LucideIcon } from "lucide-react";

export interface ActivityItem {
  id: string;
  icon: LucideIcon;
  iconColor: string;
  text: string;
  timeAgo: string;
}

interface ActivityFeedProps {
  items: ActivityItem[];
  emptyMessage?: string;
}

export function ActivityFeed({ items, emptyMessage = "No activity yet." }: ActivityFeedProps) {
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-text-muted">{emptyMessage}</p>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: `${item.iconColor}1A` }}
          >
            <item.icon size={15} color={item.iconColor} />
          </div>
          <div className="flex flex-1 items-center justify-between gap-2">
            <span className="text-sm text-text-secondary">{item.text}</span>
            <span className="whitespace-nowrap font-mono text-xs text-text-muted">
              {item.timeAgo}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
