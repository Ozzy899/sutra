import { familyAffinity, jobFamily, profileFamily } from "@/lib/agent/role";
import { MARKET } from "@/lib/data/jobs";
import { filterMarketJobs } from "@/lib/partners/job-result";
import type { Profile } from "@/lib/types";

function skillOverlap(profile: Profile, hay: string): number {
  const skills = profile.skills.map((s) => s.toLowerCase()).filter((s) => s.length > 1);
  if (!skills.length) return 0;
  return skills.filter((s) => hay.includes(s)).length / skills.length;
}

export function rankMarket(profile: Profile) {
  const family = profileFamily(profile);
  return filterMarketJobs(MARKET).map((job) => {
    const hay = `${job.title} ${job.company} ${job.city} ${job.stack.join(" ")} ${job.snippet}`.toLowerCase();
    const jf = jobFamily(job);
    let score = familyAffinity(family, jf) * 100;
    score += skillOverlap(profile, hay) * 18;
    const roleBlob = profile.lastRole.toLowerCase();
    for (const word of roleBlob.split(/[^a-z0-9+#]+/i).filter((w) => w.length > 3)) {
      if (hay.includes(word)) score += 6;
    }
    if (profile.target === "web3" && jf === "web3") score += 8;
    if (profile.target === "eu_remote" && /remote/i.test(job.city)) score += 4;
    if (profile.target === "freelance" && /fractional|freelance|day/i.test(hay)) score += 8;
    if (profile.target === "local_startup" && /beograd|novi sad|niš/i.test(job.city)) score += 3;
    if (
      profile.target === "us_market" &&
      /united states|remote us|new york|san francisco|austin|seattle|chicago|denver|boston|nyc|bay area/i.test(
        hay,
      )
    ) {
      score += 8;
    }
    if (profile.situation === "student" && /senior|principal/i.test(job.title)) score -= 12;
    if (job.city.toLowerCase().includes(profile.city.toLowerCase())) score += 3;
    return { job, score, family: jf };
  }).sort((a, b) => b.score - a.score);
}
