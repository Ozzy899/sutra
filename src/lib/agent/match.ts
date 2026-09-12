import { familyAffinity, familyLabel, jobFamily, profileFamily } from "@/lib/agent/role";
import type { JobListing, Profile } from "@/lib/types";

export function scoreFit(profile: Profile, job: JobListing): number {
  const family = profileFamily(profile);
  const jf = jobFamily(job);
  const familyScore = familyAffinity(family, jf);

  const hay = `${job.title} ${job.company} ${job.stack.join(" ")} ${job.snippet}`.toLowerCase();
  const roleWords = profile.lastRole
    .toLowerCase()
    .split(/[^a-z0-9+#]+/i)
    .filter((w) => w.length > 3);
  const titleScore = roleWords.length
    ? roleWords.filter((w) => hay.includes(w)).length / roleWords.length
    : 0;

  const skills = [...(profile.skills ?? []), ...(profile.tools ?? [])]
    .map((s) => s.toLowerCase())
    .filter((s) => s.length > 1);
  const skillHits = skills.filter((s) => hay.includes(s)).length;
  const skillScore = skills.length ? skillHits / skills.length : 0.2;

  let geo = 0.5;
  if (job.city.toLowerCase().includes(profile.city.toLowerCase())) geo = 1;
  if (profile.target === "eu_remote" && /remote/i.test(job.city)) geo = 0.9;
  if (
    profile.target === "us_market" &&
    /united states|remote us|new york|san francisco|austin|seattle|chicago|denver|boston|nyc|bay area/i.test(
      `${job.city} ${hay}`,
    )
  ) {
    geo = 0.95;
  }
  if (profile.city === "Remote" && /remote/i.test(job.city)) geo = 1;

  let intent = 0.4;
  if (profile.target === "web3" && jf === "web3") intent = 1;
  if (profile.target === "freelance" && /fractional|day/i.test(hay)) intent = 0.9;
  if (profile.target === "us_market") intent = 0.85;
  if (profile.situation === "student" && /senior|principal/i.test(job.title)) intent *= 0.4;

  const yearsBoost = Math.min(profile.years / 8, 1) * 0.06;
  const raw =
    titleScore * 0.38 + familyScore * 0.28 + skillScore * 0.16 + geo * 0.12 + intent * 0.06 + yearsBoost;
  return Math.max(0.12, Math.min(0.97, raw));
}

export function whyMatch(profile: Profile, job: JobListing): string {
  if (job.source === "Exa" || job.id.startsWith("exa-")) {
    return `Exa found this listing for “${profile.lastRole}” — ${job.company}, ${job.city}.`;
  }
  const family = profileFamily(profile);
  const jf = jobFamily(job);
  const overlap = [...(profile.skills ?? []), ...(profile.tools ?? [])].filter((s) =>
    job.stack.some(
      (st) => st.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(st.toLowerCase()),
    ),
  );
  const lane = `Your lane is ${familyLabel(family)}; the listing is ${familyLabel(jf)}.`;
  const skillBit =
    overlap.length > 0
      ? ` Stack overlap: ${overlap.slice(0, 3).join(", ")}.`
      : family === jf
        ? " Skills are not 1:1, but same lane — proof of work closes the gap."
        : " Different lane; the sandbox keeps it as a neighbor fit, not the primary.";
  return `${lane}${skillBit}`;
}
