import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** True when the Supabase env vars are present (keys pasted). */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

// Server-side Supabase client bound to the request's cookies. Use in Server
// Components, Route Handlers, and Server Actions. Reads the user's session
// from cookies and enforces RLS as that user. Async since Next 15 made
// cookies() a Promise.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component (read-only cookies). Session
            // refresh is handled by middleware, so this is safe to ignore.
          }
        },
      },
    },
  );
}
