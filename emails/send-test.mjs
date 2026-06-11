// Sends every email design as a preview to a test inbox via Resend.
// Reads RESEND_API_KEY + RESEND_FROM from .env.local (never printed).
// Run: node emails/send-test.mjs            (defaults to davidiya3@gmail.com)
//      node emails/send-test.mjs you@x.com  (override recipient)

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { EMAILS, PREVIEW_AUTH_LINK, BRAND } from "./render.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const TO = process.argv[2] || "davidiya3@gmail.com";

// Minimal .env.local loader (no dependency on dotenv).
function loadEnv() {
  try {
    const raw = readFileSync(join(here, "..", ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!(m[1] in process.env) || !process.env[m[1]]) process.env[m[1]] = v;
    }
  } catch {
    /* no .env.local — rely on real process env */
  }
}
loadEnv();

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM || `${BRAND.name} <onboarding@resend.dev>`;

if (!apiKey) {
  console.error(
    "\n  RESEND_API_KEY is not set locally.\n" +
      "  Add these two lines to app/.env.local (gitignored, stays on your machine):\n" +
      "    RESEND_API_KEY=your_resend_key\n" +
      "    RESEND_FROM=Score Logic Pro <noreply@your-verified-domain>\n" +
      "  then re-run:  node emails/send-test.mjs\n",
  );
  process.exit(1);
}

const D = BRAND.appUrl + "/dashboard";

async function main() {
  console.log(`Sending ${EMAILS.length} test emails to ${TO} from "${from}"\n`);
  for (const e of EMAILS) {
    const link = e.kind === "auth" ? PREVIEW_AUTH_LINK : e.previewLink ?? D;
    const arg = e.key === "reauthentication" ? "417294" : link;
    const html = e.render(arg);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: TO, subject: `[TEST] ${e.subject}`, html }),
    });
    if (res.ok) {
      console.log(`  ok   ${e.key}`);
    } else {
      console.log(`  FAIL ${e.key} (${res.status}): ${await res.text()}`);
    }
    await new Promise((r) => setTimeout(r, 300)); // stay under Resend's 5 req/s
  }
  console.log("\nDone. Check the inbox.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
