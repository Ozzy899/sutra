import { composeOnePager, type OnePagerModel, type OnePagerRequest } from "@/lib/onepager/compose";
import type { SkillGroup } from "@/lib/onepager/skills";
import * as fontkit from "@pdf-lib/fontkit";
import { readFile } from "fs/promises";
import {
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFPage,
  rgb,
  StandardFonts,
  appendBezierCurve,
  clip,
  closePath,
  endPath,
  moveTo,
  popGraphicsState,
  pushGraphicsState,
} from "pdf-lib";

/** Warm paper, near-navy ink, one dawn-gold accent. */
const paper = rgb(0.976, 0.969, 0.953);
const sand = rgb(0.957, 0.941, 0.914);
const ink = rgb(0.086, 0.078, 0.067);
const navy = rgb(0.118, 0.165, 0.275);
const muted = rgb(0.42, 0.4, 0.36);
const gold = rgb(0.722, 0.576, 0.345);
const goldSoft = rgb(0.86, 0.76, 0.58);

let cachedFonts: {
  sans: Uint8Array;
  sansBold: Uint8Array;
  sansItalic: Uint8Array;
  serif: Uint8Array;
  serifBold: Uint8Array;
} | null = null;

async function loadFontBytes() {
  if (cachedFonts) return cachedFonts;
  const [sans, sansBold, sansItalic, serif, serifBold] = await Promise.all([
    readFile(new URL("./fonts/LiberationSans-Regular.ttf", import.meta.url)),
    readFile(new URL("./fonts/LiberationSans-Bold.ttf", import.meta.url)),
    readFile(new URL("./fonts/LiberationSans-Italic.ttf", import.meta.url)),
    readFile(new URL("./fonts/LiberationSerif-Regular.ttf", import.meta.url)),
    readFile(new URL("./fonts/LiberationSerif-Bold.ttf", import.meta.url)),
  ]);
  cachedFonts = { sans, sansBold, sansItalic, serif, serifBold };
  return cachedFonts;
}

type Fonts = {
  sans: PDFFont;
  sansBold: PDFFont;
  sansItalic: PDFFont;
  serif: PDFFont;
  serifBold: PDFFont;
};

type Box = { y: number; minY: number };

export async function renderOnePagerPdf(req: OnePagerRequest): Promise<Uint8Array> {
  const model = composeOnePager(req);
  const doc = await PDFDocument.create();
  const kit = resolveFontkit(fontkit);
  if (kit) doc.registerFontkit(kit);
  doc.setTitle(`${model.applicant} — ${model.targetTitle}`);
  doc.setAuthor(model.applicant);
  doc.setSubject(model.preparedFor);
  doc.setCreator("Sutra");
  doc.setProducer("Sutra tailored CV");

  const bytes = kit ? await loadFontBytes().catch(() => null) : null;
  const fonts: Fonts = bytes
    ? {
        sans: await doc.embedFont(bytes.sans, { subset: true }),
        sansBold: await doc.embedFont(bytes.sansBold, { subset: true }),
        sansItalic: await doc.embedFont(bytes.sansItalic, { subset: true }),
        serif: await doc.embedFont(bytes.serif, { subset: true }),
        serifBold: await doc.embedFont(bytes.serifBold, { subset: true }),
      }
    : {
        sans: await doc.embedFont(StandardFonts.Helvetica),
        sansBold: await doc.embedFont(StandardFonts.HelveticaBold),
        sansItalic: await doc.embedFont(StandardFonts.HelveticaOblique),
        serif: await doc.embedFont(StandardFonts.TimesRoman),
        serifBold: await doc.embedFont(StandardFonts.TimesRomanBold),
      };

  const page = doc.addPage([612, 792]);
  const { width, height } = page.getSize();
  const mx = 52;
  const contentW = width - mx * 2;
  const footerH = 36;
  const hasLangs = model.languages.length > 0;
  const roleN = model.roles.filter((r) => r.company && r.title).length;
  const bandH = (roleN > 4 ? 56 : 70) + (hasLangs ? 16 : 0);

  page.drawRectangle({ x: 0, y: 0, width, height, color: paper });
  page.drawRectangle({ x: 0, y: height - 3.2, width, height: 3.2, color: gold });

  const photo = await embedPortrait(doc, model.portraitSrc);
  const minY = footerH + bandH + 14;
  const box: Box = { y: height - 38, minY };

  drawHeader(page, fonts, model, photo, mx, contentW, box);
  drawHairline(page, mx, contentW, box, 18);

  drawSummary(page, fonts, model, mx, contentW, box);
  drawExperience(page, fonts, model, mx, contentW, box);
  drawSkillsBand(page, fonts, model, width, mx, contentW, footerH, bandH);
  drawFooter(page, fonts, model, width, mx, contentW);

  return doc.save();
}

function drawHeader(
  page: PDFPage,
  fonts: Fonts,
  model: OnePagerModel,
  photo: PDFImage | undefined,
  mx: number,
  contentW: number,
  box: Box,
) {
  const photoSize = photo ? 76 : 0;
  const gap = photo ? 18 : 0;
  const textW = contentW - photoSize - gap;
  const nameSize = model.applicant.length > 22 ? 24 : 28;
  const nameLines = wrap(model.applicant, fonts.serifBold, nameSize, textW).slice(0, 2);
  const titleLines = wrap(model.targetTitle, fonts.sansItalic, 12, textW).slice(0, 2);
  const metaLines = wrap(model.metaLine, fonts.sans, 8.5, textW).slice(0, 2);

  const textH = nameLines.length * (nameSize + 3) + 8 + titleLines.length * 14 + 6 + metaLines.length * 12;
  const blockH = Math.max(textH, photo ? photoSize : 0);
  const top = box.y;

  if (photo) {
    const px = mx + contentW - photoSize;
    const py = top - photoSize + 8;
    clipCircle(page, px + photoSize / 2, py + photoSize / 2, photoSize / 2);
    const dims = photo.scale(1);
    const scale = Math.max(photoSize / dims.width, photoSize / dims.height);
    const dw = dims.width * scale;
    const dh = dims.height * scale;
    page.drawImage(photo, {
      x: px + (photoSize - dw) / 2,
      y: py + (photoSize - dh) / 2,
      width: dw,
      height: dh,
    });
    page.pushOperators(popGraphicsState());
    page.drawCircle({
      x: px + photoSize / 2,
      y: py + photoSize / 2,
      size: photoSize / 2,
      borderColor: goldSoft,
      borderWidth: 0.9,
    });
  }

  let y = top;
  for (const line of nameLines) {
    page.drawText(line, { x: mx, y, size: nameSize, font: fonts.serifBold, color: navy });
    y -= nameSize + 2;
  }
  y -= 4;
  for (const line of titleLines) {
    page.drawText(line, { x: mx, y, size: 12, font: fonts.sansItalic, color: ink });
    y -= 15;
  }
  y -= 4;
  for (const line of metaLines) {
    page.drawText(line, { x: mx, y, size: 8.5, font: fonts.sans, color: muted });
    y -= 12;
  }

  box.y = top - blockH - 4;
}

function drawSummary(
  page: PDFPage,
  fonts: Fonts,
  model: OnePagerModel,
  mx: number,
  contentW: number,
  box: Box,
) {
  if (box.y < box.minY + 48) return;
  sectionLabel(page, fonts, "Profile", mx, box);
  const size = 10.5;
  const leading = 14;
  const maxLines = 5;
  const lines = wrap(model.summary, fonts.sans, size, contentW).slice(0, maxLines);
  for (const line of lines) {
    if (box.y < box.minY + 20) break;
    page.drawText(line, { x: mx, y: box.y, size, font: fonts.sans, color: ink });
    box.y -= leading;
  }
  box.y -= 12;
}

function drawExperience(
  page: PDFPage,
  fonts: Fonts,
  model: OnePagerModel,
  mx: number,
  contentW: number,
  box: Box,
) {
  if (box.y < box.minY + 48) return;
  sectionLabel(page, fonts, "Experience", mx, box);

  const roles = model.roles.filter((r) => r.company && r.title);
  const many = roles.length > 3;
  const titleSize = many ? 10 : 11.2;
  const bodySize = many ? 8.8 : 10;
  const leading = many ? 11.6 : 13.5;
  const indent = 11;

  for (let r = 0; r < roles.length; r++) {
    const role = roles[r];
    const later = roles.length - r - 1;
    const floor = box.minY + later * 22;
    const dates = role.dates;
    const dw = dates ? fonts.sans.widthOfTextAtSize(dates, 8.2) : 0;
    page.drawText(fit(role.title, fonts.sansBold, titleSize, contentW - dw - 12), {
      x: mx,
      y: box.y,
      size: titleSize,
      font: fonts.sansBold,
      color: ink,
    });
    if (dates) {
      page.drawText(dates, {
        x: mx + contentW - dw,
        y: box.y + 1,
        size: 8.2,
        font: fonts.sans,
        color: muted,
      });
    }
    box.y -= 12;
    page.drawText(fit(role.company, fonts.sansItalic, 9, contentW), {
      x: mx,
      y: box.y,
      size: 9,
      font: fonts.sansItalic,
      color: muted,
    });
    box.y -= 11;

    if (box.y < floor + 14) {
      box.y -= 4;
      continue;
    }

    const bullets = role.bullets.filter(Boolean);
    bulletLoop: for (const bullet of bullets) {
      const lines = wrap(bullet, fonts.sans, bodySize, contentW - indent);
      for (let i = 0; i < lines.length; i++) {
        if (box.y < floor + 12) break bulletLoop;
        if (i === 0) {
          page.drawCircle({
            x: mx + 2,
            y: box.y + 2.6,
            size: 1.2,
            color: gold,
          });
        }
        page.drawText(lines[i], {
          x: mx + indent,
          y: box.y,
          size: bodySize,
          font: fonts.sans,
          color: ink,
        });
        box.y -= leading;
      }
      box.y -= 1.5;
    }
    box.y -= 5;
  }
}

function drawSkillsBand(
  page: PDFPage,
  fonts: Fonts,
  model: OnePagerModel,
  width: number,
  mx: number,
  contentW: number,
  footerH: number,
  bandH: number,
) {
  const bottom = footerH;
  page.drawRectangle({ x: 0, y: bottom, width, height: bandH, color: sand });
  page.drawRectangle({ x: 0, y: bottom + bandH - 1.2, width, height: 1.2, color: gold });

  const groups = model.skillGroups.filter((g) => g.items.length);
  if (!groups.length && !model.languages.length) return;

  const labelBox: Box = { y: bottom + bandH - 18, minY: bottom + 8 };
  sectionLabel(page, fonts, "Skills & tools", mx, labelBox);

  if (model.languages.length) {
    const lang = `Languages  ·  ${model.languages.join("   ·   ")}`;
    page.drawText(fit(lang, fonts.sans, 8.4, contentW), {
      x: mx,
      y: labelBox.y + 2,
      size: 8.4,
      font: fonts.sans,
      color: ink,
    });
    labelBox.y -= 14;
  }

  if (!groups.length) return;
  const n = Math.min(2, groups.length);
  const gap = 28;
  const colW = (contentW - gap * (n - 1)) / n;
  const colTop = labelBox.y;
  for (let i = 0; i < n; i++) {
    const x = mx + i * (colW + gap);
    const box: Box = { y: colTop, minY: bottom + 8 };
    drawSkillGroup(page, fonts, groups[i], x, colW, box, 6.4, 9, 11.6);
  }
}

function drawSkillGroup(
  page: PDFPage,
  fonts: Fonts,
  group: SkillGroup,
  x: number,
  width: number,
  box: Box,
  labelSize: number,
  bodySize: number,
  bodyLead: number,
) {
  if (box.y < box.minY + 16) return;
  drawTracked(page, group.label.toUpperCase(), x, box.y, labelSize, fonts.sansBold, muted, 0.1);
  box.y -= 13;
  const body = group.items.join("   ·   ");
  const lines = wrap(body, fonts.sans, bodySize, width);
  for (const line of lines) {
    if (box.y < box.minY + 10) break;
    page.drawText(line, { x, y: box.y, size: bodySize, font: fonts.sans, color: ink });
    box.y -= bodyLead;
  }
}

function drawFooter(
  page: PDFPage,
  fonts: Fonts,
  model: OnePagerModel,
  width: number,
  mx: number,
  contentW: number,
) {
  const left = model.preparedFor;
  page.drawText(fit(left, fonts.sans, 7.5, contentW * 0.72), {
    x: mx,
    y: 16,
    size: 7.5,
    font: fonts.sans,
    color: muted,
  });
  const right = model.city;
  const rw = fonts.sans.widthOfTextAtSize(right, 7.5);
  page.drawText(right, {
    x: width - mx - rw,
    y: 16,
    size: 7.5,
    font: fonts.sans,
    color: muted,
  });
}

function sectionLabel(page: PDFPage, fonts: Fonts, label: string, x: number, box: Box) {
  drawTracked(page, label.toUpperCase(), x, box.y, 7, fonts.sansBold, gold, 0.14);
  box.y -= 16;
}

function drawHairline(page: PDFPage, mx: number, contentW: number, box: Box, gap: number) {
  page.drawRectangle({ x: mx, y: box.y + 8, width: contentW, height: 1.15, color: gold });
  box.y -= gap;
}

function drawTracked(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  size: number,
  font: PDFFont,
  color: ReturnType<typeof rgb>,
  trackingEm: number,
) {
  let cx = x;
  const extra = size * trackingEm;
  for (const ch of text) {
    page.drawText(ch, { x: cx, y, size, font, color });
    cx += font.widthOfTextAtSize(ch, size) + extra;
  }
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      cur = next;
      continue;
    }
    if (cur) lines.push(cur);
    if (font.widthOfTextAtSize(word, size) <= maxWidth) {
      cur = word;
    } else {
      let chunk = "";
      for (const ch of word) {
        const trial = chunk + ch;
        if (font.widthOfTextAtSize(trial, size) <= maxWidth) chunk = trial;
        else {
          if (chunk) lines.push(chunk);
          chunk = ch;
        }
      }
      cur = chunk;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function fit(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

function clipCircle(page: PDFPage, cx: number, cy: number, r: number) {
  const k = 0.552284749831 * r;
  page.pushOperators(
    pushGraphicsState(),
    moveTo(cx + r, cy),
    appendBezierCurve(cx + r, cy + k, cx + k, cy + r, cx, cy + r),
    appendBezierCurve(cx - k, cy + r, cx - r, cy + k, cx - r, cy),
    appendBezierCurve(cx - r, cy - k, cx - k, cy - r, cx, cy - r),
    appendBezierCurve(cx + k, cy - r, cx + r, cy - k, cx + r, cy),
    closePath(),
    clip(),
    endPath(),
  );
}

async function embedPortrait(doc: PDFDocument, src?: string) {
  if (!src) return undefined;
  const bytes = await imageBytes(src);
  if (!bytes || bytes.length < 24) return undefined;
  try {
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return await doc.embedJpg(bytes);
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return await doc.embedPng(bytes);
  } catch {
    return undefined;
  }
  return undefined;
}

function resolveFontkit(mod: unknown): Parameters<PDFDocument["registerFontkit"]>[0] | undefined {
  const rec = mod as { create?: unknown; default?: { create?: unknown } };
  if (typeof rec.create === "function") {
    return rec as Parameters<PDFDocument["registerFontkit"]>[0];
  }
  if (typeof rec.default?.create === "function") {
    return rec.default as Parameters<PDFDocument["registerFontkit"]>[0];
  }
  return undefined;
}

async function imageBytes(src: string): Promise<Uint8Array | undefined> {
  if (src.startsWith("data:")) {
    const m = src.match(/^data:image\/(?:jpeg|jpg|png);base64,([\s\S]+)$/i);
    if (!m?.[1]) return undefined;
    return Uint8Array.from(Buffer.from(m[1].replace(/\s+/g, ""), "base64"));
  }
  if (!/^https:\/\//i.test(src)) return undefined;
  try {
    const res = await fetch(src, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return undefined;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength > 2_000_000) return undefined;
    return buf;
  } catch {
    return undefined;
  }
}
