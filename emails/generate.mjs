// Writes two sets of files from render.mjs:
//   emails/supabase/*.html  -> paste-ready Auth templates (with Supabase vars)
//   emails/preview/*.html    -> open-in-browser previews (real-looking links)
// Run: node emails/generate.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { EMAILS, PREVIEW_AUTH_LINK, BRAND } from "./render.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const supaDir = join(here, "supabase");
const previewDir = join(here, "preview");
mkdirSync(supaDir, { recursive: true });
mkdirSync(previewDir, { recursive: true });

const D = BRAND.appUrl + "/dashboard";

for (const e of EMAILS) {
  // Preview: use a real-looking link so the design renders as customers see it.
  const previewLink = e.kind === "auth" ? PREVIEW_AUTH_LINK : e.previewLink ?? D;
  const previewArg = e.key === "reauthentication" ? "417294" : previewLink;
  writeFileSync(join(previewDir, `${e.key}.html`), e.render(previewArg));

  // Supabase template: only auth emails live in the Supabase dashboard.
  if (e.kind === "auth") {
    const varArg = e.key === "reauthentication" ? "{{ .Token }}" : e.supabaseVar;
    writeFileSync(join(supaDir, `${e.key}.html`), e.render(varArg));
  }
}

console.log(`Wrote ${EMAILS.length} previews -> emails/preview/`);
console.log(`Wrote ${EMAILS.filter((e) => e.kind === "auth").length} Supabase templates -> emails/supabase/`);
