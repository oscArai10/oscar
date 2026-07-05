import Image from "next/image";

export default function Home() {
  // Temporary shell — replaced by the full landing page in build step 3.
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="glass-card neon-glow flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl">
        <Image
          src="/oscar-logo.webp"
          alt="oscAr"
          width={128}
          height={128}
          priority
          className="h-full w-full object-cover"
        />
      </div>
      <h1 className="font-heading text-5xl font-bold">
        osc<span className="text-accent-cyan">A</span>r
      </h1>
      <p className="max-w-md text-lg text-text-secondary">
        One Prompt. Deploy on 10+ Blockchains.
      </p>
      <p className="font-mono text-sm text-text-muted">
        10 Chains · AI-Audited · Non-Custodial
      </p>
    </main>
  );
}
