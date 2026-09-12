export type Situation =
  | "laid_off"
  | "student"
  | "pivot"
  | "stuck";

export type TargetTrack =
  | "local_startup"
  | "eu_remote"
  | "freelance"
  | "web3"
  | "us_market";

export type City = "Beograd" | "Novi Sad" | "Niš" | "Remote";

/** One job from the uploaded CV. Dates and employers must come from that file. */
export type ExperienceRole = {
  company: string;
  title: string;
  start: string;
  end: string;
  bullets: string[];
};

export type Profile = {
  name: string;
  city: City;
  lastRole: string;
  lastCompany: string;
  years: number;
  /** Technical skills from the CV (languages, frameworks, libraries). */
  skills: string[];
  /** Human languages from the CV (English, Serbian, …). Empty if none listed. */
  languages: string[];
  /** Products and platforms from the CV (Figma, Jira, Excel, AWS, …). */
  tools: string[];
  situation: Situation;
  target: TargetTrack;
  bio: string;
  /** Every role parsed from the uploaded CV. Empty until ingest succeeds. */
  experience: ExperienceRole[];
  /** Compressed JPEG data URL. Optional headshot on the tailored CV PDF. */
  photoDataUrl?: string;
};

export type PartnerTool = "grok" | "exa" | "firecrawl" | "daytona";

export type TraceEvent = {
  id: string;
  tool: PartnerTool;
  title: string;
  detail: string;
  status: "running" | "done" | "error";
  live: boolean;
};

export type JobListing = {
  id: string;
  title: string;
  company: string;
  city: string;
  stack: string[];
  salary: string;
  source: string;
  url: string;
  snippet: string;
  crawledMarkdown: string;
  why: string;
  fit: number;
};

export type ProofFile = {
  path: string;
  language: string;
  content: string;
};

export type ProofOfWork = {
  title: string;
  hook: string;
  demoScript: string;
  files: ProofFile[];
  testsPassed: number;
  bootMs: number;
};

export type WeekPlan = {
  headline: string;
  days: { day: string; focus: string; hours: string }[];
};

export type PitchPack = {
  elevator: string;
  star: string;
  questions: string[];
};

export type AgentResult = {
  summary: string;
  jobs: JobListing[];
  proof: ProofOfWork;
  plan: WeekPlan;
  pitch: PitchPack;
};

export type StreamEvent =
  | { type: "trace"; event: TraceEvent }
  | { type: "summary"; summary: string }
  | { type: "jobs"; jobs: JobListing[] }
  | { type: "sandbox"; line: string }
  | { type: "proof"; proof: ProofOfWork }
  | { type: "plan"; plan: WeekPlan }
  | { type: "pitch"; pitch: PitchPack }
  | { type: "error"; message: string }
  | { type: "done"; adapters: Record<PartnerTool, boolean> };

export type PitchFeedback = {
  score: number;
  notes: string[];
  rewrite: string;
};
