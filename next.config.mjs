import withPWAInit, { runtimeCaching } from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  // Fallback document for offline navigation is auto-detected from
  // src/app/~offline/page.tsx — no explicit `fallbacks` needed.
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    // The package's default caching strategies (NetworkFirst for pages/
    // API calls, CacheFirst for static assets/fonts/images) — without
    // this, only Next's own JS/CSS build chunks get precached.
    runtimeCaching,
  },
});

// Content-Security-Policy: real, but deliberately not maximally strict.
// wagmi's default RPC transports hit whichever public RPC each of the 20
// chains (10 mainnet + 10 testnet) happens to use — there's no fixed,
// enumerable domain list to lock connect-src down to — and WalletConnect/
// wallet SDKs commonly need 'unsafe-eval'/'unsafe-inline'. This still
// meaningfully restricts default-src, object-src, frame-ancestors, and
// base-uri, which blocks the most common injection/clickjacking vectors,
// but it is NOT a strict CSP. Verified: no CSP console violations on the
// landing page, login page (pre-connect), dashboard, CORE, and Token/
// Memecoin Factory pages. NOT verified: an actual WalletConnect relay
// connection or a real wallet's RPC calls — no wallet extension exists in
// this environment. Watch the browser console for CSP violations the first
// time a real wallet connects.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.paddle.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https://*.paddle.com https://*.walletconnect.com https://*.walletconnect.org",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
        { key: "Content-Security-Policy", value: CSP },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ],
    },
  ],
};

export default withPWA(nextConfig);
