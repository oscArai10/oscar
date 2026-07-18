/**
 * Business facts referenced across the legal pages (/terms, /privacy,
 * /refunds) and the pricing page. Single source of truth — change here.
 *
 * NOTE (owner): CONTACT_EMAIL defaults to the operator's personal email so
 * the pages are complete for Paddle domain verification. Swap it for a
 * dedicated support address (e.g. support@yourdomain) when you have one.
 */
export const LEGAL = {
  /** How oscAr refers to itself / its operator on legal pages. */
  serviceName: "oscAr",
  operator: "the individual operator of oscAr",
  jurisdiction: "India",
  contactEmail: "tronnie734@gmail.com",
  merchantOfRecord: "Paddle.com Market Ltd",
  refundWindowDays: 14,
  /** Kept in sync with NEXT_PUBLIC_APP_URL / the deployed domain. */
  siteUrl: "https://oscar-jade.vercel.app",
} as const;
