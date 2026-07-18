import Image from "next/image";
import Link from "next/link";

export function LandingFooter({ isAuthed }: { isAuthed: boolean }) {
  return (
    <footer className="border-t border-neon">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 sm:flex-row sm:justify-between">
        <div className="max-w-xs">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 shrink-0 overflow-hidden rounded-md">
              <Image
                src="/oscar-logo.webp"
                alt="oscAr"
                width={28}
                height={28}
                className="h-full w-full object-cover"
              />
            </div>
            <span className="font-heading text-base font-bold text-text-primary">
              osc<span className="text-accent-cyan">A</span>r
            </span>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            One Prompt. Deploy on 10+ Blockchains. Non-custodial, always.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-16">
          <div>
            <h3 className="font-heading text-xs font-bold uppercase tracking-wide text-accent-cyan-blue">
              Product
            </h3>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-text-secondary">
              <li>
                <Link href="/dashboard/token-factory" className="hover:text-accent-cyan">
                  Token Factory
                </Link>
              </li>
              <li>
                <Link href="/dashboard/memecoin-factory" className="hover:text-accent-cyan">
                  Memecoin Factory
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-accent-cyan">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-accent-cyan">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-heading text-xs font-bold uppercase tracking-wide text-accent-cyan-blue">
              Legal
            </h3>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-text-secondary">
              <li>
                <Link href="/terms" className="hover:text-accent-cyan">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-accent-cyan">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/refunds" className="hover:text-accent-cyan">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-heading text-xs font-bold uppercase tracking-wide text-accent-cyan-blue">
              Account
            </h3>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-text-secondary">
              <li>
                <Link href={isAuthed ? "/dashboard" : "/login"} className="hover:text-accent-cyan">
                  {isAuthed ? "Dashboard" : "Log In"}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 pb-8">
        <p className="text-xs text-text-muted">
          © {new Date().getFullYear()} oscAr. Non-custodial software — you
          control your keys and your funds at all times.
        </p>
      </div>
    </footer>
  );
}
