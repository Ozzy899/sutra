import type { ExperienceRole, Profile } from "@/lib/types";

const TITLE_WORD =
  /\b(engineer|developer|designer|manager|director|analyst|intern|scientist|founder|lead|specialist|consultant|product|architect|officer|coordinator|researcher|writer|editor|teacher|coach|owner|head|principal|staff|senior|junior|associate|fellow|trainee|qa|sre|devops|pm)\b/i;

const MONTH =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";

const DATE_TOKEN = `(?:${MONTH}\\.?\\s+\\d{4}|\\d{1,2}[./]\\d{4}|\\d{4})`;
const END_TOKEN = `(?:${DATE_TOKEN}|Present|Now|Current|Ongoing|Danas)`;

const RANGE_RE = new RegExp(
  `(${DATE_TOKEN})\\s*(?:[-–—]|to|until|–)\\s*(${END_TOKEN})`,
  "i",
);

const SKIP_LINE =
  /^(experience|work experience|employment|professional experience|career|education|skills|summary|profile|about|awards|languages|interests|references|projects|certifications)\b/i;

export function hasParseableExperience(profile: Pick<Profile, "experience"> | undefined): boolean {
  return Boolean(profile?.experience?.some((r) => r.company.trim() && r.title.trim()));
}

export function normalizeExperience(raw: unknown): ExperienceRole[] {
  if (!Array.isArray(raw)) return [];
  const out: ExperienceRole[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const company = clip(String(row.company ?? ""), 80);
    const title = clip(String(row.title ?? ""), 80);
    if (!company || !title) continue;
    const start = clip(String(row.start ?? ""), 24);
    const end = clip(String(row.end ?? ""), 24);
    const bullets = Array.isArray(row.bullets)
      ? unique(
          row.bullets
            .filter((b): b is string => typeof b === "string")
            .map((b) => clip(b.replace(/^\s*[•\-–—*]\s*/, ""), 280))
            .filter((b) => b.length > 8),
        ).slice(0, 8)
      : [];
    const key = `${title.toLowerCase()}|${company.toLowerCase()}|${start.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ company, title, start, end, bullets });
    if (out.length >= 16) break;
  }
  return out;
}

/** Prefer parsed roles from the CV text. Never invent employers or dates. */
export function fallbackExperience(profile: Profile, sourceText: string): ExperienceRole[] {
  if (hasParseableExperience(profile)) return normalizeExperience(profile.experience);
  return parseExperience(sourceText);
}

export function applyExperienceToProfile(profile: Profile, roles: ExperienceRole[]): Profile {
  const experience = normalizeExperience(roles);
  const top = experience[0];
  return {
    ...profile,
    experience,
    lastRole: top?.title || profile.lastRole,
    lastCompany: top?.company || profile.lastCompany,
    years: guessYearsFromRoles(experience) || profile.years,
  };
}

export function guessYearsFromRoles(roles: ExperienceRole[]): number {
  const years: number[] = [];
  for (const r of roles) {
    const a = yearOf(r.start);
    const b = yearOf(r.end) ?? new Date().getFullYear();
    if (a) years.push(a, b);
  }
  if (years.length < 2) return 0;
  const span = Math.max(...years) - Math.min(...years);
  return span >= 1 && span <= 40 ? span : 0;
}

export function parseExperience(text: string): ExperienceRole[] {
  const block = experienceBlock(text) || text;
  const lines = block
    .split(/\n/)
    .map((l) => l.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim())
    .filter((l) => l && !SKIP_LINE.test(l) && l.length < 400);

  const fromRanges = rolesFromDateLines(lines);
  if (fromRanges.length) return normalizeExperience(fromRanges);

  const fromAt = rolesFromAtLines(lines);
  if (fromAt.length) return normalizeExperience(fromAt);

  return [];
}

function experienceBlock(text: string): string {
  const re =
    /(?:^|\n)#{0,3}\s*(?:work experience|professional experience|employment history|employment|experience)\b[:\s]*\n([\s\S]*?)(?=\n#{1,3}\s*(?:education|skills|projects|certifications|awards|languages|interests)\b|$)/i;
  return text.match(re)?.[1]?.trim() ?? "";
}

function rolesFromDateLines(lines: string[]): ExperienceRole[] {
  const roles: ExperienceRole[] = [];
  let i = 0;
  while (i < lines.length) {
    const range = matchRange(lines[i]);
    if (!range) {
      i += 1;
      continue;
    }
    const { start, end, rest } = range;
    const before = lines.slice(Math.max(0, i - 3), i).filter((l) => !matchRange(l));
    const header = parseHeader(before, rest);
    if (!header) {
      i += 1;
      continue;
    }
    const bullets: string[] = [];
    let j = i + 1;
    while (j < lines.length && !matchRange(lines[j]) && bullets.length < 8) {
      const line = lines[j];
      if (looksLikeJobHeader(line) && bullets.length > 0) break;
      if (isBullet(line) || (line.length > 28 && !looksLikeJobHeader(line))) {
        bullets.push(stripBullet(line));
      } else if (looksLikeJobHeader(line)) {
        break;
      }
      j += 1;
    }
    roles.push({ ...header, start, end, bullets });
    i = j;
  }
  return roles;
}

function rolesFromAtLines(lines: string[]): ExperienceRole[] {
  const roles: ExperienceRole[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const at = lines[i].match(/^(.{3,80}?)\s+at\s+(.{2,80}?)(?:\s*[|·•,]\s*(.+))?$/i);
    if (!at) continue;
    const title = at[1].trim();
    const company = at[2].trim();
    if (!TITLE_WORD.test(title) && !TITLE_WORD.test(company)) continue;
    const range = matchRange(at[3] || "") || matchRange(lines[i + 1] || "");
    const bullets: string[] = [];
    for (let j = i + 1; j < lines.length && bullets.length < 6; j += 1) {
      if (/^\s*.{3,80}\s+at\s+/.test(lines[j])) break;
      if (matchRange(lines[j]) && j > i + 1) break;
      if (isBullet(lines[j]) || lines[j].length > 28) bullets.push(stripBullet(lines[j]));
    }
    roles.push({
      title: TITLE_WORD.test(title) ? title : company,
      company: TITLE_WORD.test(title) ? company : title,
      start: range?.start ?? "",
      end: range?.end ?? "",
      bullets,
    });
  }
  return roles;
}

function parseHeader(
  before: string[],
  restOnDateLine: string,
): { company: string; title: string } | null {
  const extras = restOnDateLine
    .split(/[|·•]/)
    .map((s) => s.trim())
    .filter((s) => s && !SKIP_LINE.test(s) && !matchRange(s));
  const parts = [...before, ...extras].filter(
    (s) => s && !isBullet(s) && !/^https?:/i.test(s) && !/@/.test(s) && s.length < 90,
  );
  if (parts.length === 0) return null;

  const pipe = parts.flatMap((p) => p.split(/\s*[|·•]\s*/)).map((s) => s.trim()).filter(Boolean);
  const pool = unique(pipe.length > parts.length ? pipe : parts);

  let title = pool.find((p) => TITLE_WORD.test(p) && !looksLikeCompanyOnly(p)) || "";
  let company = pool.find((p) => p !== title && (looksLikeCompanyOnly(p) || !TITLE_WORD.test(p))) || "";

  if (!title && pool.length) title = pool[pool.length - 1] ?? "";
  if (!company && pool.length > 1) company = pool.find((p) => p !== title) || "";
  if (!title || !company) {
    if (pool.length >= 2) {
      const [a, b] = pool.slice(-2);
      if (TITLE_WORD.test(a) && !TITLE_WORD.test(b)) {
        title = a;
        company = b;
      } else if (TITLE_WORD.test(b) && !TITLE_WORD.test(a)) {
        company = a;
        title = b;
      } else {
        company = a;
        title = b;
      }
    }
  }
  if (!title || !company) return null;
  return { title: clip(title, 80), company: clip(company, 80) };
}

function looksLikeJobHeader(line: string): boolean {
  if (isBullet(line) || matchRange(line)) return false;
  if (line.length > 90) return false;
  return TITLE_WORD.test(line) || looksLikeCompanyOnly(line);
}

function looksLikeCompanyOnly(s: string): boolean {
  if (TITLE_WORD.test(s) && !/\b(inc|llc|ltd|d\.o\.o|doo|gmbh|labs|studio|platform|agency|bank|group)\b/i.test(s)) {
    return false;
  }
  return /^[\p{L}0-9][\p{L}0-9 .,&'’/+-]{1,70}$/u.test(s);
}

function matchRange(line: string): { start: string; end: string; rest: string } | null {
  const m = line.match(RANGE_RE);
  if (!m) return null;
  return {
    start: tidyDate(m[1]),
    end: tidyDate(m[2]),
    rest: `${line.slice(0, m.index).trim()} ${line.slice((m.index ?? 0) + m[0].length).trim()}`.trim(),
  };
}

function tidyDate(raw: string): string {
  const t = raw.replace(/\s+/g, " ").trim();
  if (/^(present|now|current|ongoing|danas)$/i.test(t)) return "Present";
  return t.replace(/\b(\w{3,9})\./, "$1");
}

function isBullet(line: string): boolean {
  return /^\s*[•\-–—*●▪►]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line);
}

function stripBullet(line: string): string {
  return clip(line.replace(/^\s*[•\-–—*●▪►]\s+/, "").replace(/^\s*\d+[.)]\s+/, ""), 280);
}

function yearOf(s: string): number | undefined {
  const m = s.match(/(19|20)\d{2}/);
  return m ? Number(m[0]) : undefined;
}

function unique(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (!item || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function formatRoleDates(role: Pick<ExperienceRole, "start" | "end">): string {
  const start = role.start.trim();
  const end = role.end.trim();
  if (start && end) return `${start} – ${end}`;
  if (start) return start;
  if (end) return end;
  return "";
}

export function bulletBudget(roleCount: number, index: number): number {
  const recent = index === 0;
  const second = index === 1;
  if (roleCount <= 2) return recent ? 4 : 3;
  if (roleCount <= 4) return recent ? 3 : second ? 2 : 2;
  if (roleCount <= 6) return recent ? 3 : second ? 2 : 1;
  return recent ? 2 : 1;
}
