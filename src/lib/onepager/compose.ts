import { pageStackGroups, overlapSkills, uniqueSkills, type SkillGroup } from "@/lib/onepager/skills";
import { localTailor, type TailoredCopy } from "@/lib/onepager/tailor";
import type { JobListing, Profile } from "@/lib/types";

export type OnePagerRequest = {
  job: JobListing;
  profile: Profile;
  tailored?: TailoredCopy | null;
};

export type OnePagerHighlight = {
  value: string;
  label: string;
};

export type OnePagerRole = {
  company: string;
  title: string;
  dates: string;
  bullets: string[];
};

export type OnePagerModel = {
  applicant: string;
  targetTitle: string;
  city: string;
  summary: string;
  lastRole: string;
  lastCompany: string;
  years: number;
  yearsLabel: string;
  tenure: string;
  availability: string;
  metaLine: string;
  roles: OnePagerRole[];
  matchedSkills: string[];
  otherSkills: string[];
  skillGroups: SkillGroup[];
  languages: string[];
  highlights: OnePagerHighlight[];
  preparedFor: string;
  listingUrl: string;
  available: string;
  portraitSrc?: string;
};

export function composeOnePager(req: OnePagerRequest): OnePagerModel {
  const { job, profile } = req;
  const tailored = req.tailored ?? localTailor(profile, job);
  const applicant = profile.name.trim() || "Applicant";
  const skills = profile.skills ?? [];
  const tools = profile.tools ?? [];
  const languages = uniqueSkills(profile.languages ?? []);
  const stack = uniqueSkills([...skills, ...tools]);
  const matchedSkills = overlapSkills(stack, job.stack).slice(0, 12);
  const otherSkills = uniqueSkills(stack.filter((s) => !matchedSkills.includes(s))).slice(0, 12);
  const city = profile.city;
  const yearsLabel = profile.years ? `${profile.years} yr${profile.years === 1 ? "" : "s"}` : "";
  const tenure = profile.years
    ? `${profile.years} year${profile.years === 1 ? "" : "s"}`
    : "Recent";
  const availability = availabilityLine(profile);
  const metaLine = [city, yearsLabel ? `${yearsLabel} experience` : "", availability]
    .filter(Boolean)
    .join("  ·  ");

  return {
    applicant,
    targetTitle: tailored.targetTitle,
    city,
    summary: tailored.summary,
    lastRole: profile.lastRole.trim(),
    lastCompany: profile.lastCompany.trim(),
    years: profile.years,
    yearsLabel: yearsLabel || "—",
    tenure,
    availability,
    metaLine,
    roles: tailored.roles,
    matchedSkills,
    otherSkills,
    skillGroups: pageStackGroups(skills, tools, job.stack),
    languages,
    highlights: [
      { value: city || "—", label: "Based" },
      { value: yearsLabel || "—", label: "Experience" },
      { value: clip(profile.lastRole || "—", 28), label: "Last role" },
      { value: clip(profile.lastCompany || "—", 28), label: "Last company" },
    ],
    preparedFor: `Prepared for ${job.company} — ${job.title}`,
    listingUrl: job.url?.startsWith("http") ? job.url : "",
    available: availability,
    portraitSrc: profile.photoDataUrl || undefined,
  };
}

function availabilityLine(profile: Profile): string {
  if (profile.situation === "laid_off") return "Available to start";
  if (profile.situation === "student") return "Open to a first product role";
  if (profile.situation === "pivot") return "Open to this next step";
  const track: Record<Profile["target"], string> = {
    local_startup: "Local / hybrid",
    eu_remote: "EU remote",
    freelance: "Fractional / contract",
    web3: "Grant / product work",
    us_market: "Open to US hours",
  };
  return track[profile.target];
}

export function overlap(skills: string[], stack: string[]): string[] {
  return overlapSkills(skills, stack);
}

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}
