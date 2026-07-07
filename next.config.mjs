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
      ],
    },
  ],
};

export default withPWA(nextConfig);
