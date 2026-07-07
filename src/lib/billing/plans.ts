/**
 * Placeholder pricing — a reasonable default to unblock building the
 * checkout/webhook/tier-sync plumbing before real business numbers are
 * final. Change freely; nothing else in the codebase hardcodes these
 * values except by importing from here.
 */
export const FREE_MAINNET_DEPLOYS_PER_MONTH = 1;
export const PRO_PRICE_USD_PER_MONTH = 19;

export interface PlanFeature {
  text: string;
  included: boolean;
}

export const FREE_PLAN_FEATURES: PlanFeature[] = [
  { text: "Unlimited testnet deploys", included: true },
  { text: "AI generation + security audit", included: true },
  { text: `${FREE_MAINNET_DEPLOYS_PER_MONTH} mainnet deploy / month`, included: true },
  { text: "Priority AI queue", included: false },
  { text: "Priority audit turnaround", included: false },
];

export const PRO_PLAN_FEATURES: PlanFeature[] = [
  { text: "Everything in Free", included: true },
  { text: "Unlimited mainnet deploys", included: true },
  { text: "Priority AI queue", included: true },
  { text: "Priority audit turnaround", included: true },
];
