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

export interface DraftedLetter {
  bureau: Bureau;
  subject: string;
  body: string;
}

export interface GenerateResult {
  model: string;
  letters: DraftedLetter[];
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

const SYSTEM_INSTRUCTIONS = `You are a senior credit-repair specialist drafting consumer dispute letters under the Fair Credit Reporting Act (FCRA), Section 611 (15 U.S.C. §1681i).

Rules you MUST follow:
- Read the attached credit report and identify items the consumer can reasonably dispute: accounts reported as late/derogatory, collections, charge-offs, accounts the consumer may not recognize, inaccurate balances, duplicate entries, outdated items, or hard inquiries.
- Dispute ONLY items that actually appear in the attached report. Never invent accounts, creditors, balances, or dates. If a detail is not legible in the report, refer to it generally rather than fabricating specifics.
- Write ONE letter addressed to EACH of the three bureaus (Equifax, Experian, TransUnion). In each letter, dispute the items relevant to that bureau's report. If you cannot tell which bureau an item came from, include it in all three.
- Each letter must: open as a formal dispute, list the specific disputed item(s) with enough detail to identify them, request a reinvestigation and that unverifiable items be corrected or deleted under FCRA §611, and ask for an updated report when complete.
- Use professional, firm, non-deceptive language. Do NOT promise outcomes or make legal threats. Do NOT include fabricated personal identifiers — where the consumer's address, account numbers, or SSN would go, leave a clearly marked placeholder like [YOUR ADDRESS] or [ACCOUNT #] for the consumer to fill in.
- These are DRAFTS for human review. Accuracy and restraint matter more than volume.`;

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
        },
        required: ["bureau", "subject", "body"],
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
  round?: number;
}

// Drafts one dispute letter per bureau from the given report file.
// Throws if OPENAI_API_KEY is missing — callers should check isAiConfigured()
// first and surface a friendly message.
export async function generateLetterDrafts({
  reportBytes,
  fileName,
  contentType,
  clientName,
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

  const instructionText =
    `This is the credit report for ${clientName?.trim() || "the consumer"}. ` +
    `Draft round ${round} dispute letters per the rules. ` +
    `Return all three bureau letters.`;

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

  const letters = (parsed.letters ?? []).filter(
    (l) => l && l.bureau && l.body,
  );
  if (letters.length === 0) {
    throw new Error("The AI did not produce any letters.");
  }

  return { model, letters };
}
