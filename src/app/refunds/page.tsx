import type { Metadata } from "next";
import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Refund Policy — oscAr",
  description: "oscAr's refund policy for Pro subscriptions.",
};

export default function RefundsPage() {
  return (
    <LegalPageShell title="Refund Policy" lastUpdated="July 17, 2026">
      <p>
        This Refund Policy applies to paid {LEGAL.serviceName} subscriptions. It
        forms part of our{" "}
        <a href="/terms" className="text-accent-cyan hover:underline">
          Terms of Service
        </a>
        . Payments are processed by {LEGAL.merchantOfRecord}{" "}
        (&quot;Paddle&quot;) as our merchant of record.
      </p>

      <LegalSection heading={`1. ${LEGAL.refundWindowDays}-day refund window`}>
        <p>
          If you are not satisfied with a Pro subscription, you may request a
          full refund within {LEGAL.refundWindowDays} days of your initial
          purchase or of a renewal charge. Approved refunds are issued to your
          original payment method.
        </p>
      </LegalSection>

      <LegalSection heading="2. How to request a refund">
        <p>
          Email{" "}
          <a href={`mailto:${LEGAL.contactEmail}`} className="text-accent-cyan hover:underline">
            {LEGAL.contactEmail}
          </a>{" "}
          from the address on your account (or include your wallet address and
          the email used for billing) with the word &quot;Refund&quot; and the
          date of the charge. Because Paddle is the merchant of record, you may
          also request a refund directly through Paddle using the receipt they
          emailed you. We aim to process eligible requests within a few business
          days.
        </p>
      </LegalSection>

      <LegalSection heading="3. What is not refundable">
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            requests made more than {LEGAL.refundWindowDays} days after the
            charge;
          </li>
          <li>
            blockchain network (gas) fees and any on-chain costs — these are paid
            by you directly from your own wallet to the network, never to us, and
            are irreversible; and
          </li>
          <li>
            charges associated with clear abuse of the Service or violations of
            our Terms.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="4. Cancellation">
        <p>
          You can cancel your Pro subscription at any time from your account
          settings. Cancellation stops future renewals; you keep Pro access
          through the end of the billing period you have already paid for.
          Cancelling on its own does not trigger a refund of the current period —
          request one under the {LEGAL.refundWindowDays}-day window above if you
          are within it.
        </p>
      </LegalSection>

      <LegalSection heading="5. Contact">
        <p>
          Questions about refunds? Contact us at{" "}
          <a href={`mailto:${LEGAL.contactEmail}`} className="text-accent-cyan hover:underline">
            {LEGAL.contactEmail}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
