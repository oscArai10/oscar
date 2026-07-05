"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Coins,
  Rocket,
  FileCheck2,
  ShieldCheck,
  Settings,
  Lock,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/token-factory", label: "Token Factory", icon: Coins },
  { href: "/dashboard/memecoin-factory", label: "Memecoin Factory", icon: Rocket },
  { href: "/dashboard/deployments", label: "My Deployments", icon: FileCheck2 },
  { href: "/dashboard/audits", label: "Audit Reports", icon: ShieldCheck },
];

const COMING_SOON = [
  "NFT Generator",
  "DAO Creation",
  "DeFi Suite",
  "Gaming Tools",
  "Launchpad",
  "Wallet",
  "DEX",
  "Bridges",
  "RWA",
  "Custom Chain Builder",
];

export function Sidebar() {
  const pathname = usePathname();
  const [comingSoonOpen, setComingSoonOpen] = useState(false);

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-neon bg-bg-sidebar px-4 py-5">
      <Link href="/dashboard" className="mb-6 flex items-center gap-2.5 px-1">
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
          osc<span className="text-accent-cyan">A</span>r
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-accent-cyan bg-gradient-to-r from-accent-blue/20 to-transparent text-text-primary"
                  : "text-text-secondary hover:bg-white/5 hover:text-text-primary",
              )}
            >
              <item.icon size={18} className={active ? "text-accent-cyan" : ""} />
              {item.label}
            </Link>
          );
        })}

        <button
          onClick={() => setComingSoonOpen((v) => !v)}
          className="mt-2 flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-text-muted hover:bg-white/5"
        >
          <span className="flex items-center gap-3">
            <Lock size={18} />
            Coming Soon
          </span>
          <ChevronDown
            size={16}
            className={cn("transition-transform", comingSoonOpen && "rotate-180")}
          />
        </button>
        {comingSoonOpen && (
          <div className="ml-9 flex flex-col gap-1 border-l border-white/10 pl-3">
            {COMING_SOON.map((label) => (
              <span
                key={label}
                className="cursor-not-allowed py-1.5 text-sm text-text-muted/70"
              >
                {label}
              </span>
            ))}
          </div>
        )}

        <Link
          href="/dashboard/settings"
          className={cn(
            "mt-2 flex items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2.5 text-sm font-medium transition-colors",
            pathname === "/dashboard/settings"
              ? "border-accent-cyan bg-gradient-to-r from-accent-blue/20 to-transparent text-text-primary"
              : "text-text-secondary hover:bg-white/5 hover:text-text-primary",
          )}
        >
          <Settings size={18} />
          Settings
        </Link>
      </nav>

      <div className="glass-card mt-4 rounded-xl p-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-status-green">
          <ShieldCheck size={14} />
          System Health
        </div>
        <p className="mt-1 text-xs text-text-muted">All Systems Operational</p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-full rounded-full bg-status-green" />
        </div>
      </div>
    </aside>
  );
}
