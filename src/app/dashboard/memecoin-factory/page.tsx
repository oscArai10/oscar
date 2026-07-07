import { MemecoinFactoryClient } from "@/components/memecoin-factory/MemecoinFactoryClient";
import { getCurrentUserProfile } from "@/lib/supabase/profile";
import { getMainnetDeployLimitStatus } from "@/lib/billing/limits";

export default async function MemecoinFactoryPage() {
  const profile = await getCurrentUserProfile();
  const mainnetLimitStatus = profile ? await getMainnetDeployLimitStatus(profile.tier) : null;

  return <MemecoinFactoryClient mainnetLimitStatus={mainnetLimitStatus} />;
}
