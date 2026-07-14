// AI dispute-letter generation (OpenAI Responses API).
//
// This reads an uploaded credit report and drafts an FCRA §611 reinvestigation
// letter per credit bureau. It is GUARDED by OPENAI_API_KEY — with no key it is
// a clean no-op (like the Stripe/Resend layers), so the app builds and runs
// before David swaps in a real key.
//
// IMPORTANT: nothing produced here is ever sent anywhere. Output is stored as a
// 'draft' that a human admin must review, edit, and explicitly approve before a
// client can see it. The model is instructed to dispute ONLY items actually
// present in the report and never to invent accounts or facts.

import OpenAI from "openai";

const DEFAULT_MODEL = "gpt-4o";

export type Bureau = "Equifax" | "Experian" | "TransUnion";

// A structured, trackable representation of a single disputed item. Emitted
// alongside the letter text so the app can track each tradeline through its
// dispute lifecycle (sent → 35-day clock → deleted/verified) instead of just
// storing an opaque blob of letter text.
export interface DisputeItemSeed {
  creditor: string;
  account_mask: string | null;
  item_type: string; // collection | charge_off | late_payment | inquiry | balance | duplicate | other
  reason: string;
}

export interface DraftedLetter {
  bureau: Bureau;
  subject: string;
  body: string;
  items: DisputeItemSeed[];
}

export interface GenerateResult {
  model: string;
  letters: DraftedLetter[];
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

// Defensive cleanup: the model is told to emit plain text, but it still
// occasionally wraps creditor names in markdown bold. These letters are
// printed and mailed, so any stray markup looks unprofessional. The model is
// also told to render masked account digits as "x" (never "*"), which makes it
// safe to strip every remaining asterisk here without corrupting an account
// number. Hyphen "- " bullets are valid plain text and are left intact.
function stripMarkdown(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "$1") // **bold** → bold
    .replace(/__([^_]+)__/g, "$1") // __bold__ → bold (underscores in emails kept)
    .replace(/`+/g, "") // remove code-span backticks
    .replace(/^\s{0,3}#{1,6}\s+/gm, "") // strip ATX heading markers
    .replace(/\*/g, "") // any leftover asterisk (masks use "x", so this is safe)
    .replace(/[ \t]+$/gm, ""); // trim trailing whitespace per line
}

const SYSTEM_INSTRUCTIONS = `You are a senior credit-repair specialist drafting consumer dispute letters under the Fair Credit Reporting Act (FCRA). You write letters that are accurate, legally grounded, individualized, and ready to print and mail with no further editing.

LEGAL GROUNDING — cite these correctly and only where they fit:
- FCRA §611, 15 U.S.C. §1681i — the consumer's right to a reinvestigation. The bureau must investigate disputed items, generally within 30 days, and must delete or correct any item that cannot be verified as accurate and complete.
- FCRA §611(a)(7) — the consumer may request a description of the method of verification: the procedure used AND the name, address, and telephone number of any furnisher contacted, to be provided within 15 days. Request this explicitly so a bald "verified" response can be challenged.
- FCRA §623, 15 U.S.C. §1681s-2 — furnishers of information must report accurate, complete data and investigate disputes forwarded by the bureau.
- FCRA §609, 15 U.S.C. §1681g — the consumer's right to disclosure of file contents. Reference only if relevant.

WHAT TO DISPUTE:
- Read the attached credit report and identify genuinely disputable items: accounts reported late/derogatory, collections, charge-offs, accounts the consumer may not recognize, inaccurate balances or statuses, duplicate tradelines, items past the reporting window, or unrecognized hard inquiries.
- Dispute ONLY items that actually appear in the attached report. NEVER invent accounts, creditors, balances, dates, or account numbers. Use the exact creditor names and the partial/last digits of the account numbers as they appear in the report. If a detail is illegible, identify the item by creditor name and account type rather than guessing.
- Account numbers in the report are masked. When you reference a masked account number, write the hidden digits using lowercase "x" — for example "226071xxxx". NEVER use the asterisk character (*) anywhere in your output for any reason.
- Write ONE letter to EACH of the three bureaus (Equifax, Experian, TransUnion). Dispute the items relevant to that bureau. If you cannot tell which bureau reported an item, include it in all three.

INDIVIDUALIZATION & FIELD-LEVEL SPECIFICITY (this is what makes a dispute work):
- Do NOT use identical, generic, template language across items. The CFPB and the bureaus flag mass-produced, identical "credit-repair-mill" letters as frivolous under §611(a)(3), which lets them refuse the investigation. Vary the wording naturally per item.
- Challenge the SPECIFIC DATA FIELD that is wrong — not the whole account in the abstract. Bureaus run disputes through automated screening (e-OSCAR); naming the exact reporting point is what prevents an automatic "verified" rubber-stamp. For each item state three things plainly: (a) the precise field/fact that is inaccurate (e.g., the payment status, the balance, the date opened, the "not mine" ownership), (b) why it is wrong in one factual sentence, and (c) the EXACT correction requested — either "delete this item" or "update [field] to [correct value]".

LETTER REQUIREMENTS:
- Each letter must: (1) open as a formal dispute, (2) identify each disputed item with a separate number — creditor name and the masked account number exactly as shown — then state the inaccurate field, the one-sentence reason, and the exact correction requested, (3) demand a reasonable reinvestigation under FCRA §611 and deletion or correction within 30 days of any item that cannot be verified as accurate and complete, (4) explicitly request, under §611(a)(7), the method of verification including the name, address, and phone number of any furnisher contacted, within 15 days, and (5) request an updated, corrected copy of the report when the investigation is complete.
- Tone: professional, firm, factual. Do NOT promise or predict outcomes, do NOT guarantee deletions or score changes (the Credit Repair Organizations Act prohibits outcome guarantees), and do NOT make legal threats.

OUTPUT FORMAT — read carefully:
- PLAIN TEXT ONLY. Absolutely NO markdown: no asterisks, no "**", no "#", no backticks, no markdown bullets. If you want a list, use a hanging "- " line or a numbered "1." line in plain text only.
- ZERO bracketed placeholders. The letter must be fully filled in and mailable as-is. Never output "[", "]", "[YOUR ADDRESS]", "[DATE]", "[ACCOUNT #]", "XXXX", or any fill-in token. Use the consumer details and date provided to you in the user message.
- If a specific consumer detail (e.g., phone) was NOT provided to you, simply OMIT that line — do not insert a placeholder and do not invent it.
- Structure each letter as a real business letter: the consumer's name and mailing address block, the date, the bureau's name and official dispute-department mailing address, a "Re:" subject line, the body, and a closing with the consumer's typed name on the signature line.
- These are DRAFTS for human admin review and approval. Accuracy, restraint, and individualization matter more than volume.

STRUCTURED ITEMS — in addition to the letter body, return an "items" array for each letter containing one entry per item you disputed in that letter's body — exactly the same items, no more and no fewer. For each: the creditor name as written, the masked account number (lowercase x for hidden digits, or null if none is shown), the item_type, and a one-sentence factual reason. These must correspond exactly to the numbered items in the body; do not list an item in "items" that is not disputed in the body, and do not dispute an item in the body that is missing from "items".`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    letters: {
      type: "array",
      description: "One dispute letter per credit bureau.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          bureau: {
            type: "string",
            enum: ["Equifax", "Experian", "TransUnion"],
          },
          subject: {
            type: "string",
            description: "Short subject line for the letter.",
          },
          body: {
            type: "string",
            description:
              "The full letter text, ready to print. Plain text with line breaks; no markdown.",
          },
          items: {
            type: "array",
            description:
              "One structured entry per item disputed in THIS letter — exactly the items named in the body, no more and no fewer. Used to track each tradeline through its dispute lifecycle.",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                creditor: {
                  type: "string",
                  description:
                    "Creditor/furnisher name exactly as written in the report.",
                },
                account_mask: {
                  type: ["string", "null"],
                  description:
                    "The masked/partial account number as shown (digits hidden with lowercase x, e.g. 226071xxxx), or null if the report shows none.",
                },
                item_type: {
                  type: "string",
                  enum: [
                    "collection",
                    "charge_off",
                    "late_payment",
                    "inquiry",
                    "balance",
                    "duplicate",
                    "other",
                  ],
                },
                reason: {
                  type: "string",
                  description:
                    "One-sentence factual reason this item is being disputed (the specific inaccurate field).",
                },
              },
              required: ["creditor", "account_mask", "item_type", "reason"],
            },
          },
        },
        required: ["bureau", "subject", "body", "items"],
      },
    },
  },
  required: ["letters"],
} as const;

interface GenerateArgs {
  reportBytes: Buffer;
  fileName: string;
  contentType: string; // e.g. application/pdf, image/png
  clientName?: string | null;
  clientAddress?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  round?: number;
}

// Builds the plain-text consumer block the model uses for the letter header.
// Lines with no value are omitted entirely so the letter never shows a blank
// or a placeholder. The model is told to OMIT (not bracket) anything missing.
function consumerDetails({
  clientName,
  clientAddress,
  clientPhone,
  clientEmail,
}: Pick<
  GenerateArgs,
  "clientName" | "clientAddress" | "clientPhone" | "clientEmail"
>): string {
  const lines: string[] = [];
  if (clientName?.trim()) lines.push(`Full name: ${clientName.trim()}`);
  if (clientAddress?.trim()) {
    lines.push(`Mailing address (use exactly as written):\n${clientAddress.trim()}`);
  }
  if (clientPhone?.trim()) lines.push(`Phone: ${clientPhone.trim()}`);
  if (clientEmail?.trim()) lines.push(`Email: ${clientEmail.trim()}`);
  return lines.length
    ? lines.join("\n")
    : "No consumer contact details were provided.";
}

// Drafts one dispute letter per bureau from the given report file.
// Throws if OPENAI_API_KEY is missing — callers should check isAiConfigured()
// first and surface a friendly message.
export async function generateLetterDrafts({
  reportBytes,
  fileName,
  contentType,
  clientName,
  clientAddress,
  clientPhone,
  clientEmail,
  round = 1,
}: GenerateArgs): Promise<GenerateResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set — AI generation is disabled.");
  }
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const client = new OpenAI({ apiKey });

  const b64 = reportBytes.toString("base64");
  const isPdf =
    contentType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");

  const fileContent = isPdf
    ? {
        type: "input_file" as const,
        filename: fileName,
        file_data: `data:application/pdf;base64,${b64}`,
      }
    : {
        type: "input_image" as const,
        detail: "high" as const,
        image_url: `data:${contentType || "image/png"};base64,${b64}`,
      };

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const details = consumerDetails({
    clientName,
    clientAddress,
    clientPhone,
    clientEmail,
  });

  const instructionText =
    `This is the credit report for ${clientName?.trim() || "the consumer"}.\n\n` +
    `Today's date is ${today} — use this exact date in every letter.\n\n` +
    `Consumer details to use in the letter header and signature (use these ` +
    `verbatim; OMIT any line that is not provided — never leave a placeholder):\n` +
    `${details}\n\n` +
    `Draft round ${round} dispute letters per the rules. Every letter must be ` +
    `fully filled in with the details above and today's date, contain NO ` +
    `bracketed placeholders, and use PLAIN TEXT with no markdown. Return all ` +
    `three bureau letters.`;

  const response = await client.responses.create({
    model,
    instructions: SYSTEM_INSTRUCTIONS,
    input: [
      {
        role: "user",
        content: [
          fileContent,
          { type: "input_text" as const, text: instructionText },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "dispute_letters",
        strict: true,
        schema: SCHEMA as unknown as Record<string, unknown>,
      },
    },
  });

  const raw = response.output_text;
  if (!raw) {
    throw new Error("The AI returned an empty response.");
  }

  let parsed: { letters?: DraftedLetter[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("The AI response could not be parsed.");
  }

  const letters = (parsed.letters ?? [])
    .filter((l) => l && l.bureau && l.body)
    .map((l) => ({
      ...l,
      subject: stripMarkdown(l.subject ?? "").trim(),
      body: stripMarkdown(l.body).trim(),
      items: (l.items ?? [])
        .filter((it) => it && it.creditor)
        .map((it) => ({
          creditor: stripMarkdown(it.creditor).trim(),
          account_mask: it.account_mask
            ? stripMarkdown(it.account_mask).trim()
            : null,
          item_type: (it.item_type || "other").trim(),
          reason: stripMarkdown(it.reason ?? "").trim(),
        })),
    }));
  if (letters.length === 0) {
    throw new Error("The AI did not produce any letters.");
  }

  return { model, letters };
}
