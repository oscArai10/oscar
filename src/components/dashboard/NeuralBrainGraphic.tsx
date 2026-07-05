import Image from "next/image";

/**
 * oscAr's permanent AI brain/orb graphic. Per the standing project rule in
 * CLAUDE.md, this exact asset (public/oscar-brain.png) is reused everywhere
 * the app needs an AI brain/orb visual — never re-approximate it with a
 * hand-drawn SVG or CSS glow.
 */
export function NeuralBrainGraphic() {
  return (
    <Image
      src="/oscar-brain.png"
      alt="oscAr AI"
      width={187}
      height={218}
      priority
      className="h-40 w-auto mix-blend-screen sm:h-48 [mask-image:radial-gradient(closest-side,black_58%,transparent_100%)]"
    />
  );
}
