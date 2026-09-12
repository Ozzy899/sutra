import { inflateRawSync } from "zlib";

export const MAX_SOURCE_BYTES = 6 * 1024 * 1024;

export type SourceKind = "pdf" | "text" | "docx";

export class SourceParseError extends Error {
  constructor(
    message: string,
    readonly code: "empty" | "pdf" | "docx" | "type" | "size",
  ) {
    super(message);
    this.name = "SourceParseError";
  }
}

function extOf(name: string): string {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m?.[1] ?? "";
}

export function classifySource(name: string, mime: string, buf: Uint8Array): SourceKind | null {
  const ext = extOf(name);
  const head = Buffer.from(buf.subarray(0, 5)).toString("latin1");
  if (head.startsWith("%PDF") || ext === "pdf" || mime === "application/pdf") return "pdf";
  if (
    ext === "docx" ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  if (
    ext === "txt" ||
    ext === "md" ||
    mime === "text/plain" ||
    mime === "text/markdown" ||
    mime === "text/x-markdown"
  ) {
    return "text";
  }
  // Treat unlabeled UTF-8 as text if it is not binary.
  if (!mime && !ext && buf.length && !buf.includes(0)) return "text";
  return null;
}

export async function textFromSource(
  buf: Uint8Array,
  filename: string,
  mime: string,
): Promise<string> {
  if (buf.byteLength > MAX_SOURCE_BYTES) {
    throw new SourceParseError("That file is too large. Try a smaller PDF or a text export.", "size");
  }
  const kind = classifySource(filename, mime, buf);
  if (!kind) {
    throw new SourceParseError(
      "Use a PDF or a .txt/.md file. Word .docx is ok too if it is a real .docx export.",
      "type",
    );
  }
  let text = "";
  try {
    if (kind === "pdf") text = await pdfToText(buf);
    else if (kind === "docx") text = docxToText(Buffer.from(buf));
    else text = Buffer.from(buf).toString("utf8").replace(/^\uFEFF/, "");
  } catch (error) {
    if (error instanceof SourceParseError) throw error;
    if (kind === "pdf") {
      throw new SourceParseError(
        "Could not read that PDF. Try exporting as text, or paste into bio.",
        "pdf",
      );
    }
    if (kind === "docx") {
      throw new SourceParseError(
        "Could not read that Word file. Export PDF or paste text into bio.",
        "docx",
      );
    }
    throw error;
  }
  const cleaned = text.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").trim();
  if (cleaned.length < 24) {
    throw new SourceParseError(
      "That file had no readable text. Paste a few lines into bio instead.",
      "empty",
    );
  }
  return cleaned.slice(0, 40_000);
}

async function pdfToText(buf: Uint8Array): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: Buffer.from(buf) });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

function docxToText(buf: Buffer): string {
  const xml = zipInflateNamed(buf, "word/document.xml");
  if (!xml) {
    throw new SourceParseError(
      "Could not read that Word file. Export PDF or paste text into bio.",
      "docx",
    );
  }
  return xml
    .replace(/<w:tab\b[^/]*\/>/g, "\t")
    .replace(/<w:br\b[^/]*\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)));
}

function zipInflateNamed(buf: Buffer, want: string): string | null {
  let offset = 0;
  while (offset + 30 <= buf.length) {
    const sig = buf.readUInt32LE(offset);
    if (sig === 0x02014b50 || sig === 0x06054b50) break;
    if (sig !== 0x04034b50) {
      const next = buf.indexOf("PK", offset + 1);
      if (next < 0) break;
      offset = next;
      continue;
    }
    const flags = buf.readUInt16LE(offset + 6);
    const method = buf.readUInt16LE(offset + 8);
    const compSize = buf.readUInt32LE(offset + 18);
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const name = buf.subarray(offset + 30, offset + 30 + nameLen).toString("utf8");
    const dataStart = offset + 30 + nameLen + extraLen;
    if (flags & 0x8) {
      // Data descriptor: sizes not in local header. Skip this entry.
      offset = dataStart;
      continue;
    }
    if (dataStart + compSize > buf.length) break;
    if (name === want) {
      const data = buf.subarray(dataStart, dataStart + compSize);
      const raw = method === 0 ? data : inflateRawSync(data);
      return raw.toString("utf8");
    }
    offset = dataStart + compSize;
  }
  return null;
}
