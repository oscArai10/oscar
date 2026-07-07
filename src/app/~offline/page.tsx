import Image from "next/image";
import { WifiOff } from "lucide-react";

// Precached by next-pwa as the offline fallback for any page navigation
// that fails while the service worker has no cached copy — see
// next.config.mjs. Never fetches anything, so it always renders offline.
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="glass-card flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl">
        <Image
          src="/oscar-logo.webp"
          alt="oscAr"
          width={80}
          height={80}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex items-center gap-2 text-status-gold">
        <WifiOff size={20} />
        <h1 className="font-heading text-xl font-bold text-text-primary">
          You&apos;re offline
        </h1>
      </div>
      <p className="max-w-sm text-sm text-text-secondary">
        oscAr needs a connection to reach oscAr AI and the blockchain.
        Reconnect and try again — anything you had open will pick back up.
      </p>
    </main>
  );
}
