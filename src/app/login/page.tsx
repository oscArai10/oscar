import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { LoginClient } from "@/components/auth/LoginClient";

export default async function LoginPage() {
  // Before Supabase keys are pasted, just show the form.
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/dashboard");
  }

  return <LoginClient />;
}
