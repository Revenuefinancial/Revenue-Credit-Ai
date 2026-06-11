// Diagnostic: which Resend account is the local RESEND_API_KEY on, and what
// domains can it send from? Prints NO secret — only the account's domains.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
try {
  const raw = readFileSync(join(here, "..", ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {}

const key = process.env.RESEND_API_KEY;
if (!key) {
  console.log("No RESEND_API_KEY found in env/.env.local.");
  process.exit(0);
}
// Safe fingerprint: prefix + length only, never the secret body.
console.log(`Key in use: ${key.slice(0, 6)}…${key.slice(-3)}  (length ${key.length})`);
console.log(`RESEND_FROM: ${process.env.RESEND_FROM || "(blank)"}\n`);

const res = await fetch("https://api.resend.com/domains", {
  headers: { Authorization: `Bearer ${key}` },
});
const text = await res.text();
if (!res.ok) {
  console.log(`/domains -> ${res.status}: ${text}`);
  process.exit(0);
}
const data = JSON.parse(text);
const domains = data.data ?? [];
if (!domains.length) {
  console.log("This account has ZERO verified domains (sandbox).");
} else {
  console.log("Domains on this account:");
  for (const d of domains) console.log(`  - ${d.name}  [${d.status}]  ${d.region ?? ""}`);
}
