"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Radar, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/core", label: "Overview", icon: LayoutDashboard },
  { href: "/core/users", label: "Users", icon: Users },
  { href: "/core/sentinel", label: "SENTINEL", icon: Radar },
];

export function CoreSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-neon bg-bg-sidebar px-4 py-5">
      <Link href="/core" className="mb-6 flex items-center gap-2.5 px-1">
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg">
          <Image
            src="/oscar-logo.webp"
            alt="oscAr"
            width={36}
            height={36}
            className="h-full w-full object-cover"
          />
        </div>
        <span className="font-heading text-lg font-bold text-text-primary">
          osc<span className="text-accent-purple-bright">A</span>r{" "}
          <span className="text-accent-purple-bright">CORE</span>
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-accent-purple-bright bg-gradient-to-r from-accent-purple/20 to-transparent text-text-primary"
                  : "text-text-secondary hover:bg-white/5 hover:text-text-primary",
              )}
            >
              <item.icon size={18} className={active ? "text-accent-purple-bright" : ""} />
              {item.label}
            </Link>
          );
        })}

        <Link
          href="/dashboard"
          className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-muted transition-colors hover:bg-white/5 hover:text-text-primary"
        >
          <ArrowLeftRight size={18} />
          Back to PULSE
        </Link>
      </nav>

      <div className="glass-card rounded-xl p-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-accent-purple-bright">
          Owner Access
        </div>
        <p className="mt-1 text-xs text-text-muted">
          You can see every user&apos;s data on this surface.
        </p>
      </div>
    </aside>
  );
}
