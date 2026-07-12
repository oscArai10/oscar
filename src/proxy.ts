import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  CORE_VERIFIED_COOKIE_NAME,
  computeCoreVerificationToken,
  getClientIp,
  isIpAllowed,
  timingSafeEqualStr,
} from "@/lib/core/security";

// Next 16 renamed the "middleware" convention to "proxy" — same behavior,
// runs before matched routes. (This file was src/middleware.ts pre-upgrade.)
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase not configured yet (pre-keys). Don't gate — let the app run.
  if (!url || !anon) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refreshes the session and gives us the authenticated user.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/core");

  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  // oscAr CORE (admin) is gated on top of auth — role=owner only. Enforced
  // here AND by RLS (is_owner()) on every table CORE reads from, so a bypass
  // of this check alone still can't read another user's data.
  if (user && request.nextUrl.pathname.startsWith("/core")) {
    const toDashboard = () => {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      return NextResponse.redirect(redirectUrl);
    };

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role !== "owner") {
      return toDashboard();
    }

    // Optional defense-in-depth layers on top of role=owner — each only
    // active when its OSCAR_CORE_* env var is set (see .env.example).

    // IP allowlist. Fails closed when configured but the client IP is
    // unknown (proxy headers absent — e.g. bare `next dev`).
    const allowedIps = process.env.OSCAR_CORE_ALLOWED_IPS;
    if (allowedIps && !isIpAllowed(getClientIp(request), allowedIps)) {
      return toDashboard();
    }

    // Pin CORE to one exact account, so even a second role=owner row
    // (e.g. created by a compromised service key) can't reach it.
    const ownerEmail = process.env.OSCAR_CORE_OWNER_EMAIL;
    if (ownerEmail && user.email?.toLowerCase() !== ownerEmail.trim().toLowerCase()) {
      return toDashboard();
    }

    // Secret-key step-up: a valid HMAC cookie (set by /api/core/verify
    // after the owner re-enters the CORE key) is required for everything
    // under /core except the verify page itself.
    const secret = process.env.OSCAR_CORE_SECRET_KEY;
    if (secret && !request.nextUrl.pathname.startsWith("/core/verify")) {
      const cookie = request.cookies.get(CORE_VERIFIED_COOKIE_NAME)?.value ?? "";
      const expected = await computeCoreVerificationToken(secret, user.id);
      if (!timingSafeEqualStr(cookie, expected)) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/core/verify";
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/core/:path*"],
};
