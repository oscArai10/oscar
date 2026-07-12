import "server-only";
import { cache } from "react";
import { createClient, isSupabaseConfigured } from "./server";

export interface CurrentUserProfile {
  id: string;
  displayName: string;
  wallet_address: string | null;
  email: string | null;
  role: "user" | "owner";
  tier: "free" | "pro";
}

/**
 * Fetches the signed-in user's profile, deduped per request via React's
 * cache() — the dashboard layout and page both need it, and this avoids a
 * duplicate Supabase round trip for the same request. Returns null when
 * Supabase isn't configured yet or no one is signed in.
 */
export const getCurrentUserProfile = cache(
  async (): Promise<CurrentUserProfile | null> => {
    if (!isSupabaseConfigured()) return null;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, wallet_address, email, tier, role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) return null;

    const displayName =
      profile.display_name ||
      profile.email ||
      (profile.wallet_address
        ? `${profile.wallet_address.slice(0, 6)}…${profile.wallet_address.slice(-4)}`
        : "Account");

    return {
      id: user.id,
      displayName,
      wallet_address: profile.wallet_address,
      email: profile.email,
      role: profile.role,
      tier: profile.tier,
    };
  },
);
