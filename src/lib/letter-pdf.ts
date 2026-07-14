// Server-side PDF assembly for dispute-letter "packets".
//
// A packet = the dispute letter itself + the client's identity-verification
// documents (photo ID, proof of address, proof of SSN) appended as the final
// page(s), so the whole thing prints/mails as one file with the enclosures on
// the last pages. Bureaus require these enclosures with a mailed dispute, and
// Joseph's clients asked for them to be attached automatically.
//
// Handles both letter sources:
//   - AI-generated letters, which are plain TEXT (subject + body) → rendered
//     into typeset PDF pages here.
//   - Admin-uploaded letters, which are already a FILE (PDF or image) → copied
//     in as-is.
// Enclosures are PNG/JPG (embedded onto a labelled page) or PDF (pages copied).

import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

export interface Enclosure {
  bytes: Uint8Array;
  contentType: string | null;
  label: string;
}

export type LetterSource =
  | { kind: "text"; subject?: string | null; body: string }
  | { kind: "file"; bytes: Uint8Array; contentType: string | null };

// US Letter, 1-inch margins.
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 72;
const BODY_SIZE = 11;
const BODY_LEADING = 15.5;
const SUBJECT_SIZE = 14;

type DetectedType = "pdf" | "png" | "jpg" | "unknown";

// Prefer the file's magic bytes over a (sometimes wrong/generic) content type.
function detectType(bytes: Uint8Array, contentType: string | null): DetectedType {
  if (bytes.length >= 4) {
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)
      return "pdf"; // %PDF
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
      return "png";
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpg";
  }
  const ct = (contentType ?? "").toLowerCase();
  if (ct.includes("pdf")) return "pdf";
  if (ct.includes("png")) return "png";
  if (ct.includes("jpg") || ct.includes("jpeg")) return "jpg";
  return "unknown";
}

// Greedy word-wrap that also preserves the letter's own line breaks (each "\n"
// starts a new line; blank lines are kept as vertical spacing).
function wrapLines(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const out: string[] = [];
  for (const rawLine of text.replace(/\r\n/g, "\n").split("\n")) {
    if (rawLine.trim() === "") {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of rawLine.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
      } else {
        if (line) out.push(line);
        // Break a single word that is itself wider than the line.
        if (font.widthOfTextAtSize(word, size) > maxWidth) {
          let chunk = "";
          for (const ch of word) {
            if (font.widthOfTextAtSize(chunk + ch, size) <= maxWidth) {
              chunk += ch;
            } else {
              if (chunk) out.push(chunk);
              chunk = ch;
            }
          }
          line = chunk;
        } else {
          line = word;
        }
      }
    }
    out.push(line);
  }
  return out;
}

// Typeset the AI letter text into as many pages as it needs.
async function renderTextLetter(
  doc: PDFDocument,
  subject: string | null | undefined,
  body: string,
): Promise<void> {
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const maxWidth = PAGE_W - MARGIN * 2;

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const newPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };

  const cleanSubject = subject?.trim();
  if (cleanSubject) {
    for (const line of wrapLines(cleanSubject, bold, SUBJECT_SIZE, maxWidth)) {
      if (y < MARGIN) newPage();
      page.drawText(line, { x: MARGIN, y, size: SUBJECT_SIZE, font: bold, color: rgb(0, 0, 0) });
      y -= SUBJECT_SIZE + 6;
    }
    y -= BODY_LEADING; // gap under the subject
  }

  for (const line of wrapLines(body, font, BODY_SIZE, maxWidth)) {
    if (y < MARGIN) newPage();
    if (line) {
      page.drawText(line, { x: MARGIN, y, size: BODY_SIZE, font, color: rgb(0, 0, 0) });
    }
    y -= BODY_LEADING;
  }
}

// Copy every page of an already-PDF source into the output doc.
async function appendPdfBytes(doc: PDFDocument, bytes: Uint8Array): Promise<void> {
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages = await doc.copyPages(src, src.getPageIndices());
  for (const p of pages) doc.addPage(p);
}

// Put one image on its own labelled page, scaled to fit within the margins.
async function appendImagePage(
  doc: PDFDocument,
  bytes: Uint8Array,
  type: "png" | "jpg",
  label: string | null,
  labelFont: PDFFont,
): Promise<void> {
  const img = type === "png" ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  const page = doc.addPage([PAGE_W, PAGE_H]);

  let topY = PAGE_H - MARGIN;
  if (label) {
    page.drawText(label, {
      x: MARGIN,
      y: topY,
      size: 10,
      font: labelFont,
      color: rgb(0.35, 0.35, 0.35),
    });
    topY -= 18;
  }

  const availW = PAGE_W - MARGIN * 2;
  const availH = topY - MARGIN;
  const scale = Math.min(availW / img.width, availH / img.height, 1);
  const w = img.width * scale;
  const h = img.height * scale;
  page.drawImage(img, {
    x: MARGIN + (availW - w) / 2,
    y: MARGIN + (availH - h) / 2,
    width: w,
    height: h,
  });
}

// Build the full packet: letter first, then each enclosure appended after it.
// Unknown/undecodable enclosures are skipped rather than failing the whole
// download (the letter must still come through).
export async function buildLetterPacket(
  letter: LetterSource,
  enclosures: Enclosure[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle("Dispute letter with enclosures");

  if (letter.kind === "text") {
    await renderTextLetter(doc, letter.subject, letter.body);
  } else {
    const t = detectType(letter.bytes, letter.contentType);
    if (t === "pdf") {
      await appendPdfBytes(doc, letter.bytes);
    } else if (t === "png" || t === "jpg") {
      const labelFont = await doc.embedFont(StandardFonts.Helvetica);
      await appendImagePage(doc, letter.bytes, t, null, labelFont);
    } else {
      throw new Error("Unsupported letter file type.");
    }
  }

  const labelFont = await doc.embedFont(StandardFonts.Helvetica);
  for (const enc of enclosures) {
    const t = detectType(enc.bytes, enc.contentType);
    try {
      if (t === "pdf") {
        await appendPdfBytes(doc, enc.bytes);
      } else if (t === "png" || t === "jpg") {
        await appendImagePage(doc, enc.bytes, t, `Enclosure — ${enc.label}`, labelFont);
      }
      // unknown types are skipped
    } catch {
      // A single corrupt enclosure shouldn't sink the whole packet.
    }
  }

  return doc.save();
}
