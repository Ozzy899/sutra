import { sanitizePhotoDataUrl } from "@/lib/photo";
import type {
  JobListing,
  PitchPack,
  Profile,
  ProofOfWork,
  TraceEvent,
  WeekPlan,
} from "@/lib/types";

export type OnePagerMeta = {
  jobId: string;
  company: string;
  title: string;
  generatedAt: number;
};

export type StudioSnapshot = {
  sessionId: string;
  profile: Profile;
  skillText: string;
  traces: TraceEvent[];
  logs: string[];
  jobs: JobListing[];
  proof: ProofOfWork | null;
  plan: WeekPlan | null;
  pitch: PitchPack | null;
  summary: string | null;
  onePagers: OnePagerMeta[];
  updatedAt: number;
};

const MAX_LOGS = 80;
const MAX_LOG_CHARS = 500;
const MAX_JOBS = 24;
const MAX_MARKDOWN = 4_000;
const MAX_ONEPAGERS = 24;
const MAX_TRACES = 40;
const LOCAL_JSON_BUDGET = 4_200_000;

const DROPPED_TOOLS = new Set(["fal", "pass"]);

export function snapshotHasWork(snap: StudioSnapshot | null | undefined): boolean {
  if (!snap) return false;
  const p = snap.profile;
  return Boolean(
    p?.name?.trim() ||
      p?.lastRole?.trim() ||
      p?.experience?.length ||
      p?.photoDataUrl ||
      snap.jobs.length ||
      snap.proof,
  );
}

export function capJobs(jobs: JobListing[]): JobListing[] {
  return jobs.slice(0, MAX_JOBS).map((job) => ({
    ...job,
    crawledMarkdown:
      job.crawledMarkdown.length > MAX_MARKDOWN
        ? job.crawledMarkdown.slice(0, MAX_MARKDOWN)
        : job.crawledMarkdown,
  }));
}

export function capLogs(logs: string[]): string[] {
  return logs.slice(-MAX_LOGS).map((line) =>
    line.length > MAX_LOG_CHARS ? line.slice(0, MAX_LOG_CHARS) : line,
  );
}

function capTraces(traces: TraceEvent[]): TraceEvent[] {
  return traces.filter((tr) => !DROPPED_TOOLS.has(String(tr.tool))).slice(-MAX_TRACES);
}

export function buildSnapshot(input: Omit<StudioSnapshot, "updatedAt"> & { updatedAt?: number }): StudioSnapshot {
  const photo = sanitizePhotoDataUrl(input.profile.photoDataUrl);
  const profile: Profile = {
    ...input.profile,
    skills: Array.isArray(input.profile.skills) ? input.profile.skills : [],
    languages: Array.isArray(input.profile.languages) ? input.profile.languages : [],
    tools: Array.isArray(input.profile.tools) ? input.profile.tools : [],
    experience: Array.isArray(input.profile.experience) ? input.profile.experience : [],
    ...(photo ? { photoDataUrl: photo } : { photoDataUrl: undefined }),
  };
  return {
    sessionId: input.sessionId,
    profile,
    skillText: input.skillText,
    traces: capTraces(input.traces),
    logs: capLogs(input.logs),
    jobs: capJobs(input.jobs),
    proof: input.proof,
    plan: input.plan,
    pitch: input.pitch,
    summary: input.summary,
    onePagers: input.onePagers.slice(-MAX_ONEPAGERS),
    updatedAt: input.updatedAt ?? Date.now(),
  };
}

export function snapshotForLocal(snap: StudioSnapshot): StudioSnapshot {
  const json = JSON.stringify(snap);
  if (json.length <= LOCAL_JSON_BUDGET) return snap;
  const withoutPhoto: StudioSnapshot = {
    ...snap,
    profile: { ...snap.profile, photoDataUrl: undefined },
  };
  return withoutPhoto;
}

export function mergePhotoUrl(profile: Profile, photoUrl: string | null | undefined): Profile {
  if (!photoUrl) return profile;
  if (profile.photoDataUrl) return profile;
  return { ...profile, photoDataUrl: photoUrl };
}

export function isProfile(raw: unknown): raw is Profile {
  if (!raw || typeof raw !== "object") return false;
  const p = raw as Profile;
  return typeof p.name === "string" && typeof p.lastRole === "string";
}
