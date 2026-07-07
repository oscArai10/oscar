import { Check, X, Crown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PaddleCheckoutButton } from "@/components/billing/PaddleCheckoutButton";
import { ManageSubscriptionButton } from "@/components/billing/ManageSubscriptionButton";
import { getCurrentUserProfile } from "@/lib/supabase/profile";
import { getMainnetDeployLimitStatus } from "@/lib/billing/limits";
import {
  FREE_PLAN_FEATURES,
  PRO_PLAN_FEATURES,
  PRO_PRICE_USD_PER_MONTH,
} from "@/lib/billing/plans";

export default async function SettingsPage() {
  const profile = await getCurrentUserProfile();
  const isPro = profile?.tier === "pro";
  const limitStatus = profile ? await getMainnetDeployLimitStatus(profile.tier) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-lg font-bold text-text-primary">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">Billing and subscription.</p>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {isPro && <Crown size={20} className="text-accent-purple-bright" />}
            <div>
              <h2 className="font-heading text-base font-bold text-text-primary">
                Current plan: {isPro ? "Pro" : "Free"}
              </h2>
              {limitStatus && !isPro && (
                <p className="text-xs text-text-muted">
                  {limitStatus.usedThisMonth}/{limitStatus.limit} mainnet deploys used this month
                </p>
              )}
              {isPro && profile?.email && (
                <p className="text-xs text-text-muted">Managed via Paddle for {profile.email}</p>
              )}
            </div>
          </div>
          {profile &&
            (isPro ? (
              <ManageSubscriptionButton />
            ) : (
              <PaddleCheckoutButton userId={profile.id} email={profile.email} />
            ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card title="Free">
          <p className="mb-4 font-heading text-2xl font-bold text-text-primary">$0</p>
          <ul className="flex flex-col gap-2">
            {FREE_PLAN_FEATURES.map((f) => (
              <li key={f.text} className="flex items-center gap-2 text-sm">
                {f.included ? (
                  <Check size={15} className="shrink-0 text-status-green" />
                ) : (
                  <X size={15} className="shrink-0 text-text-muted" />
                )}
                <span className={f.included ? "text-text-secondary" : "text-text-muted"}>
                  {f.text}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Pro" className="border-accent-purple-bright/30">
          <p className="mb-4 font-heading text-2xl font-bold text-text-primary">
            ${PRO_PRICE_USD_PER_MONTH}
            <span className="text-sm font-normal text-text-muted">/mo</span>
          </p>
          <ul className="flex flex-col gap-2">
            {PRO_PLAN_FEATURES.map((f) => (
              <li key={f.text} className="flex items-center gap-2 text-sm">
                <Check size={15} className="shrink-0 text-status-green" />
                <span className="text-text-secondary">{f.text}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
