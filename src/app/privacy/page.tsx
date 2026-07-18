import type { Metadata } from "next";
import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy — oscAr",
  description: "How oscAr collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" lastUpdated="July 17, 2026">
      <p>
        This Privacy Policy explains what information {LEGAL.serviceName}{" "}
        collects, how it is used, and the choices you have. {LEGAL.serviceName}{" "}
        is operated by {LEGAL.operator}, based in {LEGAL.jurisdiction}. By using
        the Service you agree to this Policy.
      </p>

      <LegalSection heading="1. Information we collect">
        <p>We collect only what we need to run the Service:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <span className="text-text-primary">Account information</span> — your
            email address if you sign up with email, or your public wallet
            address if you sign in with a wallet.
          </li>
          <li>
            <span className="text-text-primary">Usage data</span> — the prompts
            you submit, the contracts generated, audit results, and records of
            the deployments you make through the Service.
          </li>
          <li>
            <span className="text-text-primary">Billing data</span> — if you
            subscribe, our payment processor collects your payment details. We
            receive only a subscription status and identifiers, never your full
            card number.
          </li>
          <li>
            <span className="text-text-primary">Technical data</span> — basic
            request metadata such as IP address, used for security and rate
            limiting.
          </li>
        </ul>
        <p>
          We do not collect or store your private keys or seed phrase, and we
          never ask for them.
        </p>
      </LegalSection>

      <LegalSection heading="2. How we use information">
        <ul className="ml-5 list-disc space-y-1.5">
          <li>to provide, operate, and secure the Service;</li>
          <li>
            to generate and audit contracts and record your deployments so you
            can see your history;
          </li>
          <li>to process subscriptions and prevent abuse and fraud;</li>
          <li>to respond to your support requests; and</li>
          <li>to comply with legal obligations.</li>
        </ul>
        <p>We do not sell your personal information.</p>
      </LegalSection>

      <LegalSection heading="3. Service providers we share with">
        <p>
          We share limited information with vendors who process it on our behalf,
          only as needed to run the Service:
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <span className="text-text-primary">Supabase</span> — authentication
            and database hosting.
          </li>
          <li>
            <span className="text-text-primary">Vercel</span> — application
            hosting.
          </li>
          <li>
            <span className="text-text-primary">AI providers</span> (such as
            Anthropic and OpenAI) — to generate and review contracts from your
            prompts.
          </li>
          <li>
            <span className="text-text-primary">Blockchain data providers</span>{" "}
            (such as Alchemy) — to read chain data and broadcast transactions.
          </li>
          <li>
            <span className="text-text-primary">{LEGAL.merchantOfRecord}</span>{" "}
            (Paddle) — payment processing as merchant of record.
          </li>
        </ul>
        <p>
          Each provider handles data under its own privacy policy. We may also
          disclose information if required by law or to protect our rights and
          users.
        </p>
      </LegalSection>

      <LegalSection heading="4. Blockchain data is public">
        <p>
          When you deploy a contract, the transaction, contract address, and
          related on-chain data are recorded on a public blockchain. This
          information is public and permanent by nature, is not controlled by us,
          and cannot be deleted or changed by us.
        </p>
      </LegalSection>

      <LegalSection heading="5. Data retention">
        <p>
          We keep account and usage data for as long as your account is active
          and as needed to provide the Service, meet legal and accounting
          obligations, and resolve disputes. You can ask us to delete your
          account data as described below; on-chain data cannot be deleted.
        </p>
      </LegalSection>

      <LegalSection heading="6. Security">
        <p>
          We use reasonable technical and organizational measures to protect your
          information, including access controls and row-level security on our
          database. No method of transmission or storage is completely secure,
          and we cannot guarantee absolute security.
        </p>
      </LegalSection>

      <LegalSection heading="7. Your rights">
        <p>
          Depending on where you live, you may have the right to access,
          correct, export, or delete your personal information, or to object to
          or restrict certain processing. To exercise these rights, email us at{" "}
          <a href={`mailto:${LEGAL.contactEmail}`} className="text-accent-cyan hover:underline">
            {LEGAL.contactEmail}
          </a>
          . We will respond within the time required by applicable law.
        </p>
      </LegalSection>

      <LegalSection heading="8. International users">
        <p>
          We operate from {LEGAL.jurisdiction} and use service providers that may
          process data in other countries. By using the Service, you understand
          your information may be processed outside your country of residence.
        </p>
      </LegalSection>

      <LegalSection heading="9. Children">
        <p>
          The Service is not intended for anyone under 18, and we do not
          knowingly collect information from children.
        </p>
      </LegalSection>

      <LegalSection heading="10. Changes to this Policy">
        <p>
          We may update this Policy from time to time. Material changes will be
          reflected by updating the &quot;Last updated&quot; date above.
        </p>
      </LegalSection>

      <LegalSection heading="11. Contact">
        <p>
          Questions about privacy? Contact us at{" "}
          <a href={`mailto:${LEGAL.contactEmail}`} className="text-accent-cyan hover:underline">
            {LEGAL.contactEmail}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
