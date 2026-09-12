import { hasParseableExperience, guessYearsFromRoles } from "@/lib/agent/experience";
import type { Profile } from "@/lib/types";

export const WIZARD_STORAGE_KEY = "sutra.wizard.v1";

export type WizardStepId =
  | "cv"
  | "stack"
  | "situation"
  | "target"
  | "city"
  | "want"
  | "years"
  | "photo"
  | "review";

export type WizardStatus = "in_progress" | "complete";

type WizardRecord = { status: WizardStatus };

export function dossierLooksComplete(profile: Profile | undefined): boolean {
  if (!profile) return false;
  return (
    hasParseableExperience(profile) &&
    Boolean(profile.name.trim()) &&
    Boolean(profile.lastRole.trim())
  );
}

export function yearsClearFromCv(profile: Profile): boolean {
  return guessYearsFromRoles(profile.experience) >= 1;
}

export function wizardStepsFor(profile: Profile): WizardStepId[] {
  const steps: WizardStepId[] = ["cv", "stack", "situation", "target", "city", "want"];
  if (!yearsClearFromCv(profile)) steps.push("years");
  steps.push("photo", "review");
  return steps;
}

function parseRecord(raw: string | null): WizardRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<WizardRecord>;
    if (parsed.status === "complete" || parsed.status === "in_progress") {
      return { status: parsed.status };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function readWizardStatus(): WizardStatus | null {
  if (typeof window === "undefined") return null;
  try {
    return parseRecord(window.localStorage.getItem(WIZARD_STORAGE_KEY))?.status ?? null;
  } catch {
    return null;
  }
}

export function writeWizardStatus(status: WizardStatus): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify({ status } satisfies WizardRecord));
  } catch {
    /* quota */
  }
}

/** First-time Studio, in-progress setup, or an explicit replay. Samples skip. */
export function shouldOpenWizard(opts: {
  sampleRun: boolean;
  forceSetup: boolean;
  restored: Profile | undefined;
}): boolean {
  if (opts.sampleRun) return false;
  if (opts.forceSetup) return true;
  const status = readWizardStatus();
  if (status === "in_progress") return true;
  if (status === "complete") return false;
  return !dossierLooksComplete(opts.restored);
}
