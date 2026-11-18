import { LegalShell, H2 } from "@/app/legal/legal-shell";
import { BRAND } from "@/lib/config";

export const metadata = { title: `Terms of Service — ${BRAND.name}` };

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="June 2026">
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your use of the{" "}
        {BRAND.name} platform operated by {BRAND.parent} (&quot;we&quot;,
        &quot;us&quot;). By creating an account or using our services, you agree
        to these Terms.
      </p>

      <H2>1. Our services</H2>
      <p>
        We provide tools and assistance for identifying potentially inaccurate
        items on your credit reports and preparing dispute letters. We offer a
        DIY package (you mail the letters yourself) and a Done-For-You package
        (we prepare and mail letters on your behalf).
      </p>

      <H2>2. No guaranteed results</H2>
      <p>
        We do not and cannot guarantee any particular outcome, including any
        specific increase in your credit score or the removal of any item. Credit
        reporting agencies and creditors make their own determinations.
      </p>

      <H2>3. Your responsibilities</H2>
      <p>
        You agree to provide accurate information and to only dispute items you
        believe in good faith to be inaccurate, incomplete, or unverifiable. You
        are responsible for reviewing all letters before they are mailed.
      </p>

      <H2>4. Payments</H2>
      <p>
        Fees are displayed at checkout and processed securely through Stripe.
        Your card is charged in full at checkout, and Done-For-You rounds are
        billed per round. If you cancel your service agreement within three
        business days of signing, your payment is refunded in full. Otherwise,
        except as provided in our refund policy or where required by law, fees
        are non-refundable once work has begun.
      </p>

      <H2>5. Cancellation</H2>
      <p>
        You may stop using the service at any time. You may request deletion of
        your account and documents by contacting {BRAND.supportEmail}.
      </p>

      <H2>6. Limitation of liability</H2>
      <p>
        To the maximum extent permitted by law, {BRAND.parent} is not liable for
        any indirect, incidental, or consequential damages arising from your use
        of the service.
      </p>

      <H2>7. Contact</H2>
      <p>Questions about these Terms? Email {BRAND.supportEmail}.</p>
    </LegalShell>
  );
}
