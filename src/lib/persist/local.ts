import { STUDIO_STORAGE_KEY } from "@/lib/persist/session";
import {
  buildSnapshot,
  isProfile,
  snapshotForLocal,
  type OnePagerMeta,
  type StudioSnapshot,
} from "@/lib/persist/snapshot";
import { EMPTY_PROFILE } from "@/lib/data/presets";
import type { Profile } from "@/lib/types";

let memory: StudioSnapshot | null = null;

export function readLocalSnapshot(): StudioSnapshot | null {
  if (memory) return memory;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STUDIO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StudioSnapshot>;
    if (!isProfile(parsed.profile)) return null;
    const snap = buildSnapshot({
      sessionId: typeof parsed.sessionId === "string" ? parsed.sessionId : "",
      profile: parsed.profile,
      skillText: typeof parsed.skillText === "string" ? parsed.skillText : "",
      traces: Array.isArray(parsed.traces) ? parsed.traces : [],
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
      proof: parsed.proof ?? null,
      plan: parsed.plan ?? null,
      pitch: parsed.pitch ?? null,
      summary: parsed.summary ?? null,
      onePagers: Array.isArray(parsed.onePagers) ? parsed.onePagers : [],
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    });
    memory = snap;
    return snap;
  } catch {
    return memory;
  }
}

export function writeLocalSnapshot(snap: StudioSnapshot): void {
  const next = snapshotForLocal(snap);
  memory = next;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(next));
  } catch {
    try {
      const slimmer = snapshotForLocal({
        ...next,
        profile: { ...next.profile, photoDataUrl: undefined } as Profile,
        logs: next.logs.slice(-20),
      });
      window.localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(slimmer));
      memory = slimmer;
    } catch {
      /* quota — in-memory still holds this session */
    }
  }
}

export function recordLocalOnePager(sessionId: string, meta: OnePagerMeta): StudioSnapshot | null {
  const current = readLocalSnapshot();
  const base = current ?? buildSnapshot({
    sessionId,
    profile: EMPTY_PROFILE,
    skillText: "",
    traces: [],
    logs: [],
    jobs: [],
    proof: null,
    plan: null,
    pitch: null,
    summary: null,
    onePagers: [],
  });
  const rest = base.onePagers.filter((row) => row.jobId !== meta.jobId);
  const next = { ...base, onePagers: [...rest, meta], updatedAt: meta.generatedAt };
  writeLocalSnapshot(next);
  return next;
}
