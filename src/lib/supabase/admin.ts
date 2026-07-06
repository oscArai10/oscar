import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role Supabase client. Bypasses RLS — NEVER import into client code
// or expose the key. Used only for privileged server operations: minting a
// session for a verified wallet, and server-set role/tier changes.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
