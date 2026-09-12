import { bulletBudget, formatRoleDates, hasParseableExperience } from "@/lib/agent/experience";
import { overlapSkills } from "@/lib/onepager/skills";
import { getSecret } from "@/lib/partners/keys";
import type { ExperienceRole, JobListing, Profile } from "@/lib/types";

export type TailoredRole = {
  company: string;
  title: string;
  dates: string;
  bullets: string[];
};

export type TailoredCopy = {
  targetTitle: string;
  summary: string;
  roles: TailoredRole[];
};

const MAX = {
  title: 80,
  summary: 620,
  bullet: 200,
};

function cvStack(profile: Profile): string[] {
  return [...(profile.skills ?? []), ...(profile.tools ?? [])];
}

export async function tailorForJob(profile: Profile, job: JobListing): Promise<TailoredCopy> {
  const local = localTailor(profile, job);
  const grok = await grokTailor(profile, job, local);
  return sanitizeTailored(profile, job, grok ?? local, local);
}

export function localTailor(profile: Profile, job: JobListing): TailoredCopy {
  const source = sourceRoles(profile);
  const matched = overlapSkills(cvStack(profile), job.stack);
  const targetTitle = rewriteTitle(profile, job);
  const bioBits = sentences(profile.bio).filter((s) => !isRedundantBio(s, profile));
  const why = firstSentences(job.why || job.snippet, 1);
  const stackMine = (matched.length ? matched : cvStack(profile)).slice(0, 6).join(", ");
  const company = displayCompany(profile.lastCompany);
  const years = profile.years;
  const role = profile.lastRole.trim();

  const lead =
    years && role
      ? `I am a ${role} in ${profile.city} with ${years} year${years === 1 ? "" : "s"} across ${source.length} role${source.length === 1 ? "" : "s"}${company ? `, most recently ${role} at ${company}` : ""}.`
      : role
        ? `I work as ${role} in ${profile.city}${company ? `, most recently at ${company}` : ""}.`
        : `${profile.name} — ${profile.city}.`;

  const map =
    matched.length
      ? `${job.company} needs ${job.title} around ${job.stack.slice(0, 5).join(", ") || "this stack"}. I already use ${matched.slice(0, 5).join(", ")} in the jobs below.`
      : stackMine
        ? `I am applying for ${targetTitle} at ${job.company} with the tools from my CV: ${stackMine}.`
        : `I am applying for ${targetTitle} at ${job.company} from the roles on my CV.`;

  const whyBit = why ? `Their brief: ${why.replace(/^why this role:\s*/i, "")}` : "";
  const summary = clip(
    [lead, bioBits[0] && !shareStem(lead, bioBits[0]) ? bioBits[0] : "", map, whyBit, situationClose(profile, job)]
      .filter(Boolean)
      .join(" "),
    MAX.summary,
  );

  return {
    targetTitle: clip(targetTitle, MAX.title),
    summary,
    roles: source.map((roleRow, i) => tailorRole(roleRow, job, matched, i, source.length)),
  };
}

function sourceRoles(profile: Profile): ExperienceRole[] {
  if (hasParseableExperience(profile)) return profile.experience.filter((r) => r.company.trim() && r.title.trim());
  if (profile.lastRole.trim() && profile.lastCompany.trim()) {
    return [
      {
        company: profile.lastCompany.trim(),
        title: profile.lastRole.trim(),
        start: "",
        end: "",
        bullets: sentences(profile.bio).slice(0, 3),
      },
    ];
  }
  return [];
}

function tailorRole(
  role: ExperienceRole,
  job: JobListing,
  matched: string[],
  index: number,
  count: number,
): TailoredRole {
  const cap = bulletBudget(count, index);
  const jd = (job.stack.length ? job.stack : matched).map((s) => s.toLowerCase());
  const original = role.bullets.map((b) => b.replace(/\s+/g, " ").trim()).filter(Boolean);
  const ranked = [...original].sort((a, b) => scoreBullet(b, jd) - scoreBullet(a, jd));
  const picked = (ranked.length ? ranked : original).slice(0, cap);
  const bullets =
    picked.length > 0
      ? picked.map((b) => clip(b, MAX.bullet))
      : [
          clip(
            `${role.title} at ${displayCompany(role.company)}. Work from this role that maps to ${job.title} at ${job.company}.`,
            MAX.bullet,
          ),
        ].slice(0, cap);

  return {
    company: role.company,
    title: role.title,
    dates: formatRoleDates(role),
    bullets,
  };
}

function scoreBullet(text: string, jd: string[]): number {
  const hay = text.toLowerCase();
  return jd.reduce((n, s) => n + (s.length > 1 && hay.includes(s) ? 2 : 0), 0) + Math.min(text.length, 80) / 80;
}

function rewriteTitle(profile: Profile, job: JobListing): string {
  const listing = job.title.replace(/\s+/g, " ").trim();
  const last = profile.lastRole.replace(/\s+/g, " ").trim();
  if (!listing) return last || "Candidate";
  const inflated = /\b(senior|staff|principal|lead|head|director|distinguished)\b/i.test(listing);
  const junior =
    /\b(junior|intern|graduate|trainee)\b/i.test(last) ||
    profile.situation === "student" ||
    (profile.years > 0 && profile.years < 3);
  if (inflated && junior && last) return last;
  return listing;
}

function situationClose(profile: Profile, job: JobListing): string {
  if (profile.situation === "laid_off") {
    return profile.lastCompany
      ? `I left ${displayCompany(profile.lastCompany)} in a layoff. ${job.company}'s ${job.title} seat is the next one I can do.`
      : `I am available to start; ${job.company}'s ${job.title} seat is the next one I can do.`;
  }
  if (profile.situation === "student") {
    return `I want ${job.title} at ${job.company} as a first real product role — not another internship that is mostly tickets.`;
  }
  if (profile.situation === "pivot") {
    return `${profile.lastRole} is the seat I am coming from; I want the work in this ${job.company} listing to be the product.`;
  }
  return `Focused next step: ${job.title} at ${job.company}.`;
}

async function grokTailor(
  profile: Profile,
  job: JobListing,
  local: TailoredCopy,
): Promise<TailoredCopy | null> {
  const key = await getSecret("XAI_API_KEY");
  if (!key) return null;
  const facts = {
    name: profile.name,
    city: profile.city,
    lastRole: profile.lastRole,
    lastCompany: profile.lastCompany,
    years: profile.years,
    skills: profile.skills,
    languages: profile.languages ?? [],
    tools: profile.tools ?? [],
    situation: profile.situation,
    target: profile.target,
    bio: profile.bio,
    experience: sourceRoles(profile),
  };
  const listing = {
    title: job.title,
    company: job.company,
    city: job.city,
    stack: job.stack,
    why: (job.why || job.snippet || "").slice(0, 900),
  };
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(28_000),
      body: JSON.stringify({
        model: "grok-4",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: [
              "You rewrite one candidate's full work history into a one-page CV for one job. JSON only, no markdown.",
              "Keys: targetTitle (string), summary (string), roles (array).",
              "roles: one object per job in dossier.experience, SAME ORDER, none dropped. Each: {company, title, start, end, bullets}.",
              "company, title, start, end must match the dossier (you may tidy whitespace). Never invent, merge, or drop employers.",
              "bullets: rewrite the original bullets so they speak to THIS listing. Keep facts. Recent role: 3 bullets. Next: 2. Older: 1–2. Sentence case, no leading dashes.",
              "If a role has no bullets, write one honest line from title+company only — do not invent projects.",
              "summary: 3–5 sentences, first person, aimed at that company/title. Map real stack to the JD. No fake metrics.",
              "targetTitle: listing title if seniority fits; else lastRole. Do not inflate junior/intern/student into Senior/Staff.",
              "Do not mention Sutra, fit scores, sandbox, proof, STAR, or that this is generated. Do not claim they work at the hiring company.",
              "Voice: specific, calm, hiring-manager grade. No 'results-oriented', 'passionate', 'leverage', 'synergy'.",
            ].join(" "),
          },
          {
            role: "user",
            content: `Dossier:\n${JSON.stringify(facts)}\n\nListing:\n${JSON.stringify(listing)}\n\nLocal draft (keep every role; improve wording):\n${JSON.stringify(local)}`,
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;
    const obj = parseJsonObject(raw);
    if (!obj) return null;
    const roles = normalizeGrokRoles(obj.roles);
    const targetTitle = typeof obj.targetTitle === "string" ? obj.targetTitle.trim() : "";
    const summary = typeof obj.summary === "string" ? obj.summary.trim() : "";
    if (!summary && !roles.length) return null;
    return {
      targetTitle: targetTitle || local.targetTitle,
      summary: summary || local.summary,
      roles: roles.length ? roles : local.roles,
    };
  } catch {
    return null;
  }
}

function normalizeGrokRoles(raw: unknown): TailoredRole[] {
  if (!Array.isArray(raw)) return [];
  const out: TailoredRole[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const company = String(row.company ?? "").trim();
    const title = String(row.title ?? "").trim();
    if (!company || !title) continue;
    const bullets = Array.isArray(row.bullets)
      ? row.bullets
          .filter((b): b is string => typeof b === "string")
          .map((b) => clip(b.replace(/^\s*[•\-–—*]\s*/, "").replace(/\s+/g, " ").trim(), MAX.bullet))
          .filter((b) => b.length > 8)
      : [];
    out.push({
      company,
      title,
      dates: formatRoleDates({
        start: String(row.start ?? "").trim(),
        end: String(row.end ?? "").trim(),
      }),
      bullets,
    });
  }
  return out;
}

function sanitizeTailored(
  profile: Profile,
  job: JobListing,
  draft: TailoredCopy,
  fallback: TailoredCopy,
): TailoredCopy {
  const hiring = job.company.trim().toLowerCase();
  const own = new Set(sourceRoles(profile).map((r) => `${r.company.toLowerCase()}|${r.title.toLowerCase()}`));
  const banned =
    /\bsutra\b|fit score|sandbox proof|week one|star story|one-pager|results-oriented|passionate professional/i;
  const factBlob = dossierBlob(profile);

  const byKey = new Map<string, TailoredRole>();
  for (const role of draft.roles) {
    const key = `${role.company.toLowerCase()}|${role.title.toLowerCase()}`;
    if (!own.has(key)) continue;
    const bullets = role.bullets
      .map((b) => clip(b.replace(/^\s*[•\-–—*]\s*/, "").replace(/\s+/g, " ").trim(), MAX.bullet))
      .filter((b) => {
        if (!b || banned.test(b)) return false;
        if (hiring && employedAt(b, job.company) && !ownCompany(b, profile)) return false;
        if (inventedMetric(b, factBlob)) return false;
        return true;
      });
    byKey.set(key, { ...role, bullets });
  }

  const roles = fallback.roles.map((role, i) => {
    const key = `${role.company.toLowerCase()}|${role.title.toLowerCase()}`;
    const grok = byKey.get(key);
    const cap = bulletBudget(fallback.roles.length, i);
    const bullets = (grok?.bullets.length ? grok.bullets : role.bullets).slice(0, cap);
    return {
      company: role.company,
      title: role.title,
      dates: grok?.dates || role.dates,
      bullets: bullets.length ? bullets : role.bullets.slice(0, cap),
    };
  });

  let summary = clip(draft.summary.replace(/\s+/g, " ").trim(), MAX.summary);
  if (
    !summary ||
    banned.test(summary) ||
    inventedMetric(summary, factBlob) ||
    (hiring && employedAt(summary, job.company) && !ownCompany(summary, profile))
  ) {
    summary = fallback.summary;
  }

  let targetTitle = clip(draft.targetTitle.replace(/\s+/g, " ").trim(), MAX.title);
  if (!targetTitle || banned.test(targetTitle)) targetTitle = fallback.targetTitle;

  return { targetTitle, summary, roles };
}

function ownCompany(text: string, profile: Profile): boolean {
  return sourceRoles(profile).some((r) => employedAt(text, r.company) || text.toLowerCase().includes(r.company.toLowerCase()));
}

function dossierBlob(profile: Profile): string {
  return [
    profile.name,
    profile.city,
    profile.lastRole,
    profile.lastCompany,
    String(profile.years),
    profile.skills.join(" "),
    (profile.languages ?? []).join(" "),
    (profile.tools ?? []).join(" "),
    profile.bio,
    profile.situation,
    profile.target,
    ...sourceRoles(profile).flatMap((r) => [r.company, r.title, r.start, r.end, ...r.bullets]),
  ]
    .join(" ")
    .toLowerCase();
}

function inventedMetric(text: string, facts: string): boolean {
  const tokens = text.match(/\$[\d,.]+|\b\d[\d,.]*\s?%|\b\d{2,}\s?(?:k|m)\b/gi) ?? [];
  return tokens.some((tok) => !facts.includes(tok.toLowerCase().replace(/\s+/g, "")));
}

function employedAt(text: string, company: string): boolean {
  const name = company.trim();
  if (name.length < 3) return false;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `\\b(?:worked (?:at|for)|joined|joining|employee (?:at|of)|currently (?:at|with))\\s+${escaped}\\b`,
    "i",
  ).test(text);
}

function displayCompany(raw: string): string {
  const t = raw.replace(/\s+/g, " ").trim();
  const stripped = t.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return stripped || t;
}

function isRedundantBio(sentence: string, profile: Profile): boolean {
  const s = sentence.toLowerCase();
  if (profile.years && new RegExp(`\\b${profile.years}\\s+years?\\b`).test(s) && /backend|engineer|developer/.test(s)) {
    return true;
  }
  return false;
}

function shareStem(a: string, b: string): boolean {
  return a.toLowerCase().includes(b.slice(0, 36).toLowerCase());
}

function sentences(text: string): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  return (cleaned.match(/[^.!?]+[.!?]?/g) ?? [cleaned]).map((s) => s.trim()).filter(Boolean);
}

function firstSentences(text: string, n: number): string {
  return sentences(text).slice(0, n).join(" ").trim();
}

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
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
