"use client";

import { Search, Terminal, Bell, ChevronDown, Settings } from "lucide-react";

interface TopbarProps {
  userName: string;
  userRole: string;
  notificationCount?: number;
}

export function Topbar({ userName, userRole, notificationCount = 0 }: TopbarProps) {
  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-neon bg-bg-secondary px-6">
      <div className="relative w-full max-w-md">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          type="text"
          placeholder="Search anything..."
          className="w-full rounded-lg border border-neon bg-bg-card py-2 pl-9 pr-14 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-cyan"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
          ⌘K
        </kbd>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <button
          aria-label="Terminal"
          className="text-text-secondary transition-colors hover:text-accent-cyan"
        >
          <Terminal size={18} />
        </button>

        <button
          aria-label="Notifications"
          className="relative text-text-secondary transition-colors hover:text-accent-cyan"
        >
          <Bell size={18} />
          {notificationCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-purple px-1 font-mono text-[10px] font-bold text-white">
              {notificationCount}
            </span>
          )}
        </button>

        <button
          aria-label="Settings"
          className="text-text-secondary transition-colors hover:text-accent-cyan"
        >
          <Settings size={18} />
        </button>

        <button className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-white/5">
          <div className="h-8 w-8 overflow-hidden rounded-full bg-gradient-to-br from-accent-blue to-accent-purple" />
          <div className="text-left leading-tight">
            <p className="text-sm font-semibold text-text-primary">{userName}</p>
            <p className="text-xs text-text-muted">{userRole}</p>
          </div>
          <ChevronDown size={14} className="text-text-muted" />
        </button>
      </div>
    </header>
  );
}
