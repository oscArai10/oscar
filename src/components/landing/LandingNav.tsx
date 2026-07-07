import Image from "next/image";
import Link from "next/link";
import { LayoutDashboard, LogIn } from "lucide-react";

export function LandingNav({ isAuthed }: { isAuthed: boolean }) {
  return (
    <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
      <Link href="/" className="flex items-center gap-2.5">
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg">
          <Image
            src="/oscar-logo.webp"
            alt="oscAr"
            width={36}
            height={36}
            priority
            className="h-full w-full object-cover"
          />
        </div>
        <span className="font-heading text-lg font-bold text-text-primary">
          osc<span className="text-accent-cyan">A</span>r
        </span>
      </Link>

      <Link
        href={isAuthed ? "/dashboard" : "/login"}
        className="flex items-center gap-2 rounded-lg border border-neon bg-white/5 px-4 py-2 text-sm font-semibold text-text-secondary transition-colors hover:border-accent-cyan hover:text-accent-cyan"
      >
        {isAuthed ? <LayoutDashboard size={15} /> : <LogIn size={15} />}
        {isAuthed ? "Open Dashboard" : "Log In"}
      </Link>
    </nav>
  );
}
