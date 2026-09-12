import { parseExperience } from "@/lib/agent/experience";
import type { Profile } from "@/lib/types";

/** Demo CVs treated as an uploaded file so sample people can still Run. */
export const SAMPLE_CVS: Record<string, string> = {
  ana: `Ana Kovačević
Belgrade, Serbia
Senior NestJS engineer

Summary
Seven years of backend in Belgrade. I can stand a service up and keep Kafka honest. Looking for EU-remote product work after a layoff, not a three-month course plan.

Experience
iGaming platform
Senior NestJS Engineer
Mar 2021 – Aug 2026
- Owned match and wallet APIs in NestJS on PostgreSQL, with Kafka consumers for settlement.
- Cut incident time on payment retries by adding idempotent consumers and AWS alerts.
- Mentored four engineers on TypeScript service boundaries during a season peak.

Fintech payments
Backend Engineer
Jan 2018 – Feb 2021
- Built transfer and ledger services in TypeScript/NestJS against PostgreSQL.
- Introduced Kafka topics for payout events used by risk and support tools.
- Wrote runbooks for AWS deploys so on-call could ship without a war room.

Retail agency (Balkan shops)
Junior Backend Developer
Sep 2015 – Dec 2017
- Shipped REST APIs for inventory and orders in Node.js.
- Helped migrate reporting off spreadsheets onto PostgreSQL.

Skills
NestJS, PostgreSQL, Kafka, TypeScript, AWS, Docker

Languages
English (C1), Serbian (native)
`,
  luka: `Luka Petrović
Novi Sad, Serbia
Frontend intern

Summary
Two side projects and an internship that was more Jira than code. I want a first real product role in Novi Sad, not another tutorial.

Experience
Novi Sad product studio
Frontend intern
Feb 2026 – Jul 2026
- Implemented React screens in TypeScript against an existing design system.
- Styled flows in Tailwind from Figma, and fixed accessibility labels on forms.
- Most tickets were Jira hygiene — I still shipped the checkout empty state.

FTN student org
Web volunteer
Oct 2024 – Jan 2026
- Maintained the student org site in React and TypeScript.
- Ran a Figma-to-page workshop for first-year students.

Campus freelance
Junior frontend
Jun 2024 – Sep 2024
- Built a landing page in React/Tailwind for a local café chain.

Skills
React, TypeScript, Tailwind, Figma, Jira

Languages
English (B2), Serbian (native)
`,
  marija: `Marija Jovanović
Belgrade, Serbia
Product manager

Summary
I owned the roadmap, but AI features arrived as an afterthought. I want a role where the agent workflow is the product — or 90 days of fractional work with EU teams while I choose next.

Experience
B2B SaaS, 40 people
Product manager
Apr 2021 – Aug 2026
- Owned discovery and specs for B2B workflows, including SQL-backed reporting.
- Ran GTM with sales on two launches; AI features landed as a late add-on, not the product.
- Introduced a lightweight AI workflow so support could draft answers from the knowledge base.

Marketplace ops tool
Associate product manager
Jan 2018 – Mar 2021
- Wrote specs and SQL slices for ops tooling used by a 20-person ops team.
- Partnered with engineering on discovery interviews in Belgrade and Novi Sad.

Regional telco
Business analyst
Aug 2015 – Dec 2017
- Turned stakeholder interviews into GTM notes and spreadsheet models.

Skills
discovery, specs, SQL, GTM, AI workflows

Languages
English (C1), Serbian (native)
`,
};

function dossier(partial: Omit<Profile, "experience">, cv: string): Profile {
  const experience = parseExperience(cv);
  const top = experience[0];
  return {
    ...partial,
    lastRole: top?.title || partial.lastRole,
    lastCompany: top?.company || partial.lastCompany,
    experience,
  };
}

export const PRESETS: Record<string, Profile> = {
  ana: dossier(
    {
      name: "Ana Kovačević",
      city: "Beograd",
      lastRole: "Senior NestJS engineer",
      lastCompany: "iGaming platform",
      years: 7,
      skills: ["NestJS", "PostgreSQL", "Kafka", "TypeScript"],
      languages: ["English (C1)", "Serbian (native)"],
      tools: ["AWS", "Docker"],
      situation: "laid_off",
      target: "eu_remote",
      bio: "Seven years of backend in Belgrade. A team of 11 shut down after the season. I can stand a service up, but I do not know how to look ready on Monday instead of three months of courses.",
    },
    SAMPLE_CVS.ana,
  ),
  luka: dossier(
    {
      name: "Luka Petrović",
      city: "Novi Sad",
      lastRole: "Student, frontend intern",
      lastCompany: "FTN / student org",
      years: 1,
      skills: ["React", "TypeScript", "Tailwind"],
      languages: ["English (B2)", "Serbian (native)"],
      tools: ["Figma", "Jira"],
      situation: "student",
      target: "local_startup",
      bio: "Two side projects and an internship that was more Jira than code. I want a first real product role in Novi Sad, not another tutorial.",
    },
    SAMPLE_CVS.luka,
  ),
  marija: dossier(
    {
      name: "Marija Jovanović",
      city: "Beograd",
      lastRole: "Product manager",
      lastCompany: "B2B SaaS, 40 people",
      years: 8,
      skills: ["discovery", "specs", "SQL", "GTM", "AI workflows"],
      languages: ["English (C1)", "Serbian (native)"],
      tools: [],
      situation: "pivot",
      target: "freelance",
      bio: "I owned the roadmap, but AI features arrived as an afterthought. I want a role where the agent workflow is the product — or 90 days of fractional work with EU teams while I choose next.",
    },
    SAMPLE_CVS.marija,
  ),
};

export const EMPTY_PROFILE: Profile = {
  name: "",
  city: "Beograd",
  lastRole: "",
  lastCompany: "",
  years: 0,
  skills: [],
  languages: [],
  tools: [],
  situation: "laid_off",
  target: "local_startup",
  bio: "",
  experience: [],
};

export function sampleCvFile(key: string): File | null {
  const text = SAMPLE_CVS[key];
  if (!text) return null;
  const name = key === "ana" ? "ana-kovacevic-cv.txt" : key === "luka" ? "luka-petrovic-cv.txt" : "marija-jovanovic-cv.txt";
  return new File([text], name, { type: "text/plain" });
}
