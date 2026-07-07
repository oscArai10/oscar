import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { LoginClient } from "@/components/auth/LoginClient";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  const redirectTo = searchParams.redirect || "/dashboard";

  // Before Supabase keys are pasted, just show the form.
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect(redirectTo);
  }

  return <LoginClient redirectTo={redirectTo} />;
}
