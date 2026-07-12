import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { LoginClient } from "@/components/auth/LoginClient";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const redirectTo = (await searchParams).redirect || "/dashboard";

  // Before Supabase keys are pasted, just show the form.
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect(redirectTo);
  }

  return <LoginClient redirectTo={redirectTo} />;
}
