import {
  applyExperienceToProfile,
  fallbackExperience,
  hasParseableExperience,
  normalizeExperience,
  parseExperience,
} from "@/lib/agent/experience";
import {
  coerceStringList,
  mergeCvStack,
  parseCvStack,
  uniqueLabels,
  type CvStack,
} from "@/lib/agent/stack";
import { EMPTY_PROFILE } from "@/lib/data/presets";
import { getSecret } from "@/lib/partners/keys";
import { profileWithoutPhoto } from "@/lib/photo";
import type { City, ExperienceRole, Profile, Situation, TargetTrack } from "@/lib/types";

const CITIES: City[] = ["Beograd", "Novi Sad", "Niš", "Remote"];
const SITUATIONS: Situation[] = ["laid_off", "student", "pivot", "stuck"];
const TARGETS: TargetTrack[] = [
  "local_startup",
  "eu_remote",
  "freelance",
  "web3",
  "us_market",
];

export type IngestInput = {
  cvText?: string;
  base?: Partial<Profile>;
};

export type IngestOk = {
  ok: true;
  profile: Profile;
  warnings: string[];
};

export type IngestFail = {
  ok: false;
  error: string;
  warnings: string[];
};

export async function ingestDossier(input: IngestInput): Promise<IngestOk | IngestFail> {
  const warnings: string[] = [];
  const chunks: string[] = [];

  if (input.cvText?.trim()) {
    chunks.push(`# CV\n${input.cvText.trim()}`);
  }

  if (chunks.length === 0) {
    return {
      ok: false,
      error: "Add a CV first.",
      warnings,
    };
  }

  const blob = chunks.join("\n\n").slice(0, 28_000);
  const base = mergeProfile(EMPTY_PROFILE, input.base ?? {});
  const local = parseProfileLocal(blob, base);
  const fromModel = await extractProfileWithGrok(blob, base);
  let profile = mergeProfile(base, fromModel ?? local);
  const localRoles = parseExperience(blob);
  const grokRoles = normalizeExperience(fromModel?.experience);
  const roles = localRoles.length
    ? mergeRoleFacts(localRoles, grokRoles)
    : grokRoles;
  profile = applyExperienceToProfile(profile, fallbackExperience({ ...profile, experience: roles }, blob));
  const stack = mergeCvStack(parseCvStack(blob), grokStack(fromModel ?? profile), blob);
  profile = { ...profile, ...stack };

  if (!profile.name.trim() && !profile.lastRole.trim()) {
    warnings.push("Could not draft name or role. Upload a clearer CV, then Run.");
  }
  if (!hasParseableExperience(profile)) {
    return {
      ok: false,
      error:
        "Could not read work history from that file. Upload a CV that lists every role (company, title, dates, what you did).",
      warnings,
    };
  }

  return { ok: true, profile, warnings };
}

function mergeRoleFacts(local: ExperienceRole[], grok: ExperienceRole[]): ExperienceRole[] {
  if (!local.length) return grok;
  const keyOf = (r: ExperienceRole) => `${r.title.toLowerCase()}|${r.company.toLowerCase()}`;
  const grokByKey = new Map(grok.map((r) => [keyOf(r), r]));
  return local.map((r) => {
    const extra = grokByKey.get(keyOf(r));
    if (!extra) return r;
    return {
      company: r.company,
      title: r.title,
      start: r.start || extra.start,
      end: r.end || extra.end,
      bullets: r.bullets.length >= extra.bullets.length ? r.bullets : extra.bullets,
    };
  });
}

function mergeProfile(base: Profile, patch: Partial<Profile>): Profile {
  const experience = normalizeExperience(patch.experience?.length ? patch.experience : base.experience);
  const next: Profile = {
    ...base,
    name: pickStr(patch.name, base.name),
    city: isCity(patch.city) ? patch.city : base.city,
    lastRole: pickStr(patch.lastRole, base.lastRole),
    lastCompany: pickStr(patch.lastCompany, base.lastCompany),
    years:
      typeof patch.years === "number" && Number.isFinite(patch.years) && patch.years > 0
        ? Math.min(40, Math.round(patch.years))
        : base.years,
    skills: patch.skills?.length ? uniqueLabels(patch.skills, 20) : base.skills,
    languages: patch.languages?.length ? uniqueLabels(patch.languages, 10) : (base.languages ?? []),
    tools: patch.tools?.length ? uniqueLabels(patch.tools, 16) : (base.tools ?? []),
    situation: isSituation(patch.situation) ? patch.situation : base.situation,
    target: isTarget(patch.target) ? patch.target : base.target,
    bio: pickStr(patch.bio, base.bio),
    experience,
  };
  if (base.photoDataUrl) next.photoDataUrl = base.photoDataUrl;
  if (patch.photoDataUrl) next.photoDataUrl = patch.photoDataUrl;
  return next;
}

function pickStr(a: string | undefined, b: string): string {
  const t = a?.trim();
  return t ? t : b;
}

function isCity(v: unknown): v is City {
  return typeof v === "string" && (CITIES as string[]).includes(v);
}
function isSituation(v: unknown): v is Situation {
  return typeof v === "string" && (SITUATIONS as string[]).includes(v);
}
function isTarget(v: unknown): v is TargetTrack {
  return typeof v === "string" && (TARGETS as string[]).includes(v);
}

function grokStack(partial: Partial<Profile> | null | undefined): Partial<CvStack> | undefined {
  if (!partial) return undefined;
  return {
    skills: partial.skills,
    languages: partial.languages,
    tools: partial.tools,
  };
}

async function extractProfileWithGrok(
  text: string,
  base: Profile,
): Promise<Partial<Profile> | null> {
  const key = await getSecret("XAI_API_KEY");
  if (!key) return null;
  const safeBase = profileWithoutPhoto(base);
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-4",
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content:
              "Extract a job-seeker dossier as JSON only. Keys: name, city, lastRole, lastCompany, years, skills, languages, tools, situation, target, bio, experience. city must be one of Beograd, Novi Sad, Niš, Remote. situation: laid_off|student|pivot|stuck. target: local_startup|eu_remote|freelance|web3|us_market. skills: technical skills only (TypeScript, React, NestJS, PostgreSQL, …) as written — never invent. languages: human languages only (English, Serbian, German, …) with CEFR/native if written; empty array if the CV has none. tools: products/platforms (Figma, Jira, Excel, AWS, Docker, Git, …) as written; empty if none. years is a number. bio is 2–4 sentences in first person. experience is an array of EVERY job in the CV (oldest last): {company, title, start, end, bullets}. start/end are strings as written (e.g. Mar 2021, Present). bullets are the CV bullets, not invented. Do not drop older jobs. Do not invent employers, titles, dates, skills, languages, or tools. lastRole/lastCompany must match the most recent experience item. No markdown.",
          },
          {
            role: "user",
            content: `Base (keep a field if the source is silent):\n${JSON.stringify(safeBase)}\n\nSource:\n${text.slice(0, 18_000)}`,
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;
    const obj = parseJsonObject(raw);
    return obj ? coercePartial(obj) : null;
  } catch {
    return null;
  }
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function coercePartial(obj: Record<string, unknown>): Partial<Profile> {
  return {
    name: typeof obj.name === "string" ? obj.name : undefined,
    city: isCity(obj.city) ? obj.city : guessCity(String(obj.city ?? "")),
    lastRole: typeof obj.lastRole === "string" ? obj.lastRole : undefined,
    lastCompany: typeof obj.lastCompany === "string" ? obj.lastCompany : undefined,
    years: typeof obj.years === "number" ? obj.years : Number(obj.years) || undefined,
    skills: coerceStringList(obj.skills),
    languages: coerceStringList(obj.languages),
    tools: coerceStringList(obj.tools),
    situation: isSituation(obj.situation) ? obj.situation : undefined,
    target: isTarget(obj.target) ? obj.target : undefined,
    bio: typeof obj.bio === "string" ? obj.bio : undefined,
    experience: normalizeExperience(obj.experience),
  };
}

export function parseProfileLocal(text: string, base: Profile): Partial<Profile> {
  const name = guessName(text) || undefined;
  const lastRole = guessRole(text);
  const lastCompany = guessCompany(text);
  const years = guessYears(text);
  const stack = parseCvStack(text);
  const bio = guessBio(text);
  return {
    name,
    city: guessCity(text) ?? base.city,
    lastRole,
    lastCompany,
    years,
    skills: stack.skills.length ? stack.skills : undefined,
    languages: stack.languages.length ? stack.languages : undefined,
    tools: stack.tools.length ? stack.tools : undefined,
    situation: guessSituation(text) ?? base.situation,
    target: guessTarget(text) ?? base.target,
    bio,
    experience: parseExperience(text),
  };
}

function guessName(text: string): string {
  const lines = text
    .split(/\n/)
    .map((l) => l.replace(/^#+\s*/, "").trim())
    .filter(Boolean);
  for (const line of lines.slice(0, 12)) {
    const cleaned = line
      .replace(/\s*\|\s*LinkedIn.*$/i, "")
      .replace(/\s+[-–—]\s+.+$/, "")
      .replace(/\s*\((?:he\/him|she\/her|they\/them)\)/i, "")
      .trim();
    if (looksLikePersonName(cleaned)) return cleaned;
  }
  return "";
}

function looksLikePersonName(s: string): boolean {
  if (!s || s.length > 60 || s.length < 3) return false;
  if (/\d|@|http|linkedin|curriculum|resume|cv\b/i.test(s)) return false;
  return /^[\p{L}][\p{L}'’.\-]+(?:\s+[\p{L}][\p{L}'’.\-]+){0,3}$/u.test(s);
}

function section(text: string, ...heads: string[]): string {
  const re = new RegExp(
    `(?:^|\\n)#{0,3}\\s*(?:${heads.join("|")})\\b[:\\s]*\\n([\\s\\S]*?)(?=\\n#{1,3}\\s+\\S|\\n(?:experience|education|skills|about|summary)\\b|$)`,
    "i",
  );
  return text.match(re)?.[1]?.trim() ?? "";
}

function guessRole(text: string): string | undefined {
  const headline = text.match(
    /(?:^|\n)[\p{L} .,'’-]{3,60}\b(?:engineer|developer|designer|manager|director|analyst|intern|scientist|founder|lead|specialist|consultant|product)\b[\p{L} .,'’-]{0,40}/iu,
  );
  if (headline) {
    const line = headline[0].replace(/^[\n#\s]+/, "").replace(/\s*\|\s.*$/, "").trim();
    if (line && !looksLikePersonName(line)) return line.slice(0, 80);
  }
  const exp = section(text, "experience", "work experience", "employment");
  const first = exp
    .split(/\n/)
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .find((l) => l.length > 3 && l.length < 80 && !/^20\d{2}/.test(l));
  return first?.replace(/\s+at\s+.+$/i, "").trim() || undefined;
}

function guessCompany(text: string): string | undefined {
  const at = text.match(/\bat\s+([A-Z][\w.&'’ -]{1,50})/);
  if (at?.[1] && !/LinkedIn|Experience|Present/i.test(at[1])) return at[1].trim();
  const company = text.match(
    /\n([A-Z][\w.&'’ -]{1,40})\s*(?:\||·|-)?\s*(?:Full[- ]time|Part[- ]time|Contract|Remote|20\d{2})/i,
  );
  return company?.[1]?.trim();
}

function guessYears(text: string): number | undefined {
  const stated = text.match(/(\d{1,2})\s*\+?\s*years?(?:\s+of)?(?:\s+experience)?/i);
  if (stated) return Math.min(40, Number(stated[1]));
  const years = [...text.matchAll(/\b(20\d{2})\b/g)].map((m) => Number(m[1]));
  if (years.length >= 2) {
    const min = Math.min(...years);
    const max = Math.max(...years, new Date().getFullYear());
    const span = max - min;
    if (span >= 1 && span <= 40) return span;
  }
  return undefined;
}

function guessBio(text: string): string | undefined {
  const about = section(text, "about", "summary", "profile", "overview", "bio");
  const src = (about || text).replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
  if (src.length < 40) return undefined;
  const sentences = src.split(/(?<=[.!?])\s+/).slice(0, 4).join(" ");
  return sentences.slice(0, 600);
}

function guessSituation(text: string): Situation | undefined {
  const s = text.toLowerCase();
  if (/\b(laid[- ]off|layoff|redundant|rifs?\b|job eliminated)\b/.test(s)) return "laid_off";
  if (/\b(student|intern|internship|faculty|university|bachelor|master'?s)\b/.test(s)) {
    return "student";
  }
  if (/\b(pivot|career change|transitioning|reskill)\b/.test(s)) return "pivot";
  if (/\b(stuck|stalled|plateau)\b/.test(s)) return "stuck";
  return undefined;
}

function guessTarget(text: string): TargetTrack | undefined {
  const s = text.toLowerCase();
  if (/\b(web3|crypto|solidity|grant)\b/.test(s)) return "web3";
  if (/\b(freelance|fractional|contractor)\b/.test(s)) return "freelance";
  if (/\b(united states|u\.s\.|us market|nyc|san francisco|new york|austin|seattle)\b/.test(s)) {
    return "us_market";
  }
  if (/\b(eu remote|europe|berlin|amsterdam|remote eu)\b/.test(s)) return "eu_remote";
  return undefined;
}

function guessCity(text: string): City | undefined {
  const s = text.toLowerCase();
  if (/\b(novi sad)\b/.test(s)) return "Novi Sad";
  if (/\b(niš|nis)\b/.test(s)) return "Niš";
  if (/\b(beograd|belgrade)\b/.test(s)) return "Beograd";
  if (/\bremote\b/.test(s)) return "Remote";
  return undefined;
}
