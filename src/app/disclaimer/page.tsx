import { LegalShell, H2 } from "@/app/legal/legal-shell";
import { BRAND } from "@/lib/config";

export const metadata = { title: `Disclaimer — ${BRAND.name}` };

export default function DisclaimerPage() {
  return (
    <LegalShell title="Disclaimer" updated="June 2026">
      <p>
        Please read this disclaimer carefully before using {BRAND.name}.
      </p>

      <H2>Not legal or financial advice</H2>
      <p>
        {BRAND.name} provides self-help tools and document preparation
        assistance. We are not a law firm and do not provide legal, financial, or
        tax advice. For legal advice, consult a licensed attorney.
      </p>

      <H2>You can dispute on your own for free</H2>
      <p>
        You have the right to dispute inaccurate information on your credit
        reports directly with the credit bureaus and creditors yourself, for
        free, under the Fair Credit Reporting Act (FCRA). Our service is a
        convenience and is optional.
      </p>

      <H2>Results vary</H2>
      <p>
        Credit repair results depend on your individual circumstances. We make no
        representation or guarantee regarding any specific increase to your credit
        score or the deletion of any item. Outcomes are determined by the credit
        bureaus and your creditors.
      </p>

      <H2>Honest disputes only</H2>
      <p>
        You should only dispute information you believe in good faith to be
        inaccurate, incomplete, or unverifiable. Knowingly submitting false
        information may be unlawful.
      </p>

      <H2>Questions</H2>
      <p>Contact us at {BRAND.supportEmail}.</p>
    </LegalShell>
  );
}
