import { grokComplete } from "@/lib/partners/status";
import type { PitchFeedback, Profile } from "@/lib/types";

export async function coachPitch(
  profile: Profile,
  answer: string,
): Promise<PitchFeedback> {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const notes: string[] = [];
  let score = 6;

  if (words.length < 40) {
    notes.push("Too short. Add one concrete number or incident.");
    score -= 1;
  } else score += 1;
  if (!/\d/.test(answer)) {
    notes.push("No number. Years, SLO, team size, or time-to-demo.");
    score -= 1;
  } else score += 1;
  if (/team player|passionate|synergy|leverage/i.test(answer)) {
    notes.push("That sounds like LinkedIn. Cut the corporate words.");
    score -= 2;
  }
  if (/otkaz|ugašen|laid off|layoff/i.test(answer) && !/dokaz|proof|repo|demo/i.test(answer)) {
    notes.push("You can mention the layoff — tie it to the artefact in the next sentence.");
    score -= 1;
  }
  if (/sandbox|dokaz|proof|90/i.test(answer)) {
    notes.push("Good: you are pointing them at something they can click.");
    score += 1;
  }

  score = Math.max(3, Math.min(10, score));

  const rewriteFallback = `${profile.name.split(" ")[0]} here. ${profile.years} years, ${profile.lastRole} in ${profile.city}. ${profile.situation === "laid_off" ? "The team shut down in August — I did not." : "I am not resetting a career with theory."} This weekend I packed proof in an isolated sandbox that maps to your happy path. Give me 90 seconds and a URL.`;

  const rewrite = await grokComplete(
    `Rewrite this interview intro in English. Be concrete. Max 80 words. Second person is fine in notes; the rewrite should be first person as the candidate.\nProfile: ${profile.name}, ${profile.lastRole}\nAnswer: ${answer}`,
    rewriteFallback,
  );

  if (notes.length === 0) notes.push("Keep this skeleton. Slower. Stop after the sentence with the URL.");

  return { score, notes, rewrite };
}
