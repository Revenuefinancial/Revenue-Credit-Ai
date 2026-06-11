import { LegalShell, H2 } from "@/app/legal/legal-shell";
import { BRAND } from "@/lib/config";

export const metadata = { title: `Privacy Policy — ${BRAND.name}` };

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="June 2026">
      <p>
        {BRAND.parent} (&quot;we&quot;) respects your privacy. This policy
        explains what we collect, how we use it, and how we protect it.
      </p>

      <H2>Information we collect</H2>
      <p>
        Account details (name, email, phone), the credit reports and documents
        you upload, and payment records processed by our payment provider. We do
        not store your full card details — those are handled by Stripe.
      </p>

      <H2>How we use your information</H2>
      <p>
        To provide the service: reviewing your reports, preparing dispute
        letters, processing payments, and sending you status notifications by
        email and SMS. We do not sell your personal information.
      </p>

      <H2>Document storage &amp; security</H2>
      <p>
        Your credit reports and dispute letters are stored in private,
        access-controlled storage. Files are only accessible to you and our
        authorized team, and are served through short-lived, signed links.
      </p>

      <H2>Data sharing</H2>
      <p>
        We share data only with service providers needed to operate the platform
        (e.g. hosting, payment processing, and notification delivery), and where
        required by law.
      </p>

      <H2>Your rights</H2>
      <p>
        You may request access to, correction of, or deletion of your personal
        data at any time by emailing {BRAND.supportEmail}.
      </p>

      <H2>Contact</H2>
      <p>Privacy questions? Email {BRAND.supportEmail}.</p>
    </LegalShell>
  );
}
