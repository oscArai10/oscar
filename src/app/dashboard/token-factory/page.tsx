import { TokenFactoryClient } from "@/components/token-factory/TokenFactoryClient";
import { getCurrentUserProfile } from "@/lib/supabase/profile";
import { getMainnetDeployLimitStatus } from "@/lib/billing/limits";

export default async function TokenFactoryPage({
  searchParams,
}: {
  searchParams: Promise<{ prompt?: string }>;
}) {
  const { prompt } = await searchParams;
  const profile = await getCurrentUserProfile();
  const mainnetLimitStatus = profile ? await getMainnetDeployLimitStatus(profile.tier) : null;

  return (
    <TokenFactoryClient
      initialPrompt={prompt}
      mainnetLimitStatus={mainnetLimitStatus}
    />
  );
}
