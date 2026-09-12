import type { JobListing, PitchPack, Profile, WeekPlan } from "@/lib/types";

export function fallbackSummary(profile: Profile, top: JobListing | undefined): string {
  const first = profile.name.split(" ")[0] || "Hey";
  if (profile.situation === "laid_off") {
    const house =
      profile.target === "us_market" ? "a US / remote-US team" : "an EU / Belgrade team";
    return `${first}: a layoff is not a hole in the CV if Monday you have public proof. Closest fit is ${top?.title ?? "a platform role"} at ${top?.company ?? house} — because your stack already matches that path. Attach the sandbox artefact, not a motivational quote.`;
  }
  if (profile.situation === "student") {
    return `${first}: years will not walk you into ${top?.company ?? "a studio"}. An artefact will. We aim at ${top?.title ?? "a first product role"} and make something that looks employed.`;
  }
  return `${first}: your edge is a loop you can show, not a title you can name. ${top?.company ?? "The team"} is hiring for that. Spec, evals, and a Monday story.`;
}

export function weekPlan(profile: Profile, top: JobListing | undefined): WeekPlan {
  const company = top?.company ?? "target team";
  return {
    headline:
      profile.situation === "laid_off"
        ? `7 days to a conversation that does not start with "so, I'm looking"`
        : `7 days to look more expensive than they call you`,
    days: [
      {
        day: "Day 1",
        focus: `Publish the proof repo + live URL. Send ${company} a short memo, not a CV.`,
        hours: "3h",
      },
      {
        day: "Day 2",
        focus:
          profile.target === "us_market"
            ? "Two short emails with a 90-second Loom. One US hiring manager, one person who already knows you."
            : "Two short emails with a 90-second Loom. One Balkan, one EU.",
        hours: "2h",
      },
      {
        day: "Day 3",
        focus: "Pitch coach: STAR on an incident / ship. Record once. Shame passes.",
        hours: "1.5h",
      },
      {
        day: "Day 4",
        focus: "One public write-up. Startit / LinkedIn, same skeleton.",
        hours: "2h",
      },
      {
        day: "Day 5",
        focus: `Warm intro: former teammate, meetup mentor, ${profile.city} Slack.`,
        hours: "1h",
      },
      {
        day: "Day 6",
        focus: "Empty on purpose. Walk. A brain not in panic negotiates better.",
        hours: "0h",
      },
      {
        day: "Day 7",
        focus: "Monday: one conversation or one grant submit. Close the week with an act, not a plan.",
        hours: "2h",
      },
    ],
  };
}

export function pitchPack(profile: Profile, top: JobListing | undefined): PitchPack {
  const first = profile.name.split(" ")[0] || "I";
  return {
    elevator: `${first}, ${profile.years}y, ${profile.city}. ${profile.situation === "laid_off" ? "The team shut down. I did not." : "I am not hunting a title. I am hunting a loop I can own."} This weekend I packed sandbox proof that maps to ${top?.title ?? "your role"} — I can show it in 90 seconds.`,
    star: `Situation: ${profile.lastCompany}. Task: keep production alive while the story changed. Action: ${profile.skills.slice(0, 2).join(" + ") || "owning the service"}. Result: an artefact that still runs — plus this Sutra proof you can click.`,
    questions: [
      `What killed your last AI feature — the model, the eval, or ownership?`,
      `If I start Monday, which happy path has to work by Friday?`,
      `Who do you call when an agent does something expensive and wrong?`,
    ],
  };
}
