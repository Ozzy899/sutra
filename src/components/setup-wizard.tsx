"use client";

import { t } from "@/components/copy";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { hasParseableExperience } from "@/lib/agent/experience";
import { PRESETS } from "@/lib/data/presets";
import type { ExperienceRole, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { wizardStepsFor, type WizardStepId } from "@/lib/wizard";
import { FileUp, ImagePlus, LoaderCircle, Sunrise, X } from "lucide-react";
import { useMemo, useRef, useEffect } from "react";

const SITUATIONS = ["laid_off", "student", "pivot", "stuck"] as const;
const TARGETS = ["local_startup", "eu_remote", "us_market", "freelance", "web3"] as const;
const CITIES: Profile["city"][] = ["Beograd", "Novi Sad", "Niš", "Remote"];
const YEAR_BANDS: { label: string; years: number }[] = [
  { label: t.wizardYears0, years: 1 },
  { label: t.wizardYears2, years: 2 },
  { label: t.wizardYears5, years: 4 },
  { label: t.wizardYears9, years: 8 },
  { label: t.wizardYears10, years: 12 },
];

const SITUATION_HINT: Record<(typeof SITUATIONS)[number], string> = {
  laid_off: t.laid_offHint,
  student: t.studentHint,
  pivot: t.pivotHint,
  stuck: t.stuckHint,
};

const TARGET_HINT: Record<(typeof TARGETS)[number], string> = {
  local_startup: t.local_startupHint,
  eu_remote: t.eu_remoteHint,
  freelance: t.freelanceHint,
  web3: t.web3Hint,
  us_market: t.us_marketHint,
};

function Choice({
  selected,
  title,
  hint,
  onClick,
}: {
  selected: boolean;
  title: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border px-4 py-3 text-left transition-colors hover:bg-muted",
        selected && "border-[var(--dawn)] bg-[var(--dawn)]/10",
      )}
    >
      <span className="block text-sm font-medium">{title}</span>
      {hint ? <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span> : null}
    </button>
  );
}

export function SetupWizard({
  profile,
  skillText,
  cvFile,
  cvAccepted,
  ingestBusy,
  ingestNote,
  photoBusy,
  error,
  running,
  situationNote,
  targetNote,
  stepId,
  onStepId,
  onProfile,
  onSkillText,
  onSituationNote,
  onTargetNote,
  onPickCv,
  onRemoveCv,
  onPickPhoto,
  onRemovePhoto,
  onPreset,
  onFinish,
}: {
  profile: Profile;
  skillText: string;
  cvFile: File | null;
  cvAccepted: boolean;
  ingestBusy: boolean;
  ingestNote: string | null;
  photoBusy: boolean;
  error: string | null;
  running: boolean;
  situationNote: string;
  targetNote: string;
  stepId: WizardStepId;
  onStepId: (id: WizardStepId) => void;
  onProfile: (next: Profile | ((prev: Profile) => Profile)) => void;
  onSkillText: (value: string) => void;
  onSituationNote: (value: string) => void;
  onTargetNote: (value: string) => void;
  onPickCv: (file: File | undefined) => void;
  onRemoveCv: () => void;
  onPickPhoto: (file: File | undefined) => void;
  onRemovePhoto: () => void;
  onPreset: (key: string) => void;
  onFinish: (profile: Profile) => void;
}) {
  const cvRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const steps = useMemo(() => wizardStepsFor(profile), [profile]);
  const index = steps.indexOf(stepId);

  useEffect(() => {
    if (steps.includes(stepId)) return;
    const fallback = steps.includes("photo") ? "photo" : (steps[0] ?? "cv");
    onStepId(fallback);
  }, [onStepId, stepId, steps]);

  const resolvedIndex = index >= 0 ? index : 0;
  const current = steps[resolvedIndex] ?? "cv";
  const last = resolvedIndex === steps.length - 1;
  const readyCv = cvAccepted && hasParseableExperience(profile);
  const canNext =
    current !== "cv" || (readyCv && !ingestBusy);

  const go = (delta: number) => {
    const next = steps[resolvedIndex + delta];
    if (next) onStepId(next);
  };

  const finish = () => {
    const extra = [situationNote.trim(), targetNote.trim()].filter(Boolean).join(" ");
    const bio = profile.bio.trim();
    const mergedBio = extra && bio && !bio.includes(extra) ? `${bio} ${extra}`.trim() : bio || extra;
    const skills = skillChips(profile, skillText);
    const next: Profile = {
      ...profile,
      bio: mergedBio,
      skills,
      languages: (profile.languages ?? []).map((s) => s.trim()).filter(Boolean),
      tools: (profile.tools ?? []).map((s) => s.trim()).filter(Boolean),
    };
    onSkillText(skills.join(", "));
    onProfile(next);
    onFinish(next);
  };

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-background">
      <div className="pointer-events-none absolute inset-0 dawn-grid opacity-30" />
      <header className="relative mx-auto flex max-w-2xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <Sunrise className="size-5 text-[var(--dawn)]" />
          <span className="font-heading text-lg">{t.brand}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {resolvedIndex + 1} / {steps.length}
        </p>
      </header>
      <div className="relative mx-auto w-full max-w-2xl px-5 pb-16">
        <Progress value={((resolvedIndex + 1) / steps.length) * 100} className="mb-6">
          <span className="sr-only">
            {t.wizardTitle} {resolvedIndex + 1} / {steps.length}
          </span>
        </Progress>
        <h1 className="font-heading text-3xl tracking-tight">{t.wizardTitle}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.wizardLead}</p>

        <Card className="mt-6">
          <CardContent className="flex flex-col gap-4 pt-6">
            {current === "cv" ? (
              <StepShell title={t.wizardCvTitle} body={t.wizardCvBody}>
                <input
                  ref={cvRef}
                  type="file"
                  accept=".pdf,.txt,.md,.docx,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => onPickCv(e.target.files?.[0])}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={ingestBusy || running}
                    onClick={() => cvRef.current?.click()}
                  >
                    {ingestBusy ? <LoaderCircle className="animate-spin" /> : <FileUp />}
                    {cvFile ? t.cvReplace : t.cvUpload}
                  </Button>
                  {cvFile ? (
                    <Button type="button" variant="ghost" disabled={running} onClick={onRemoveCv}>
                      {t.cvRemove}
                    </Button>
                  ) : null}
                </div>
                {cvFile ? (
                  <p className="truncate text-xs text-muted-foreground">{cvFile.name}</p>
                ) : null}
                {ingestNote ? <p className="text-sm text-[var(--river)]">{ingestNote}</p> : null}
                {readyCv ? (
                  <p className="text-sm text-muted-foreground">
                    {profile.name || "—"} · {profile.lastRole || "—"} · {profile.experience.length}{" "}
                    {profile.experience.length === 1 ? "role" : "roles"}
                  </p>
                ) : null}
              </StepShell>
            ) : null}


            {current === "stack" ? (
              <StepShell title={t.wizardStackTitle} body={t.wizardStackBody}>
                <ChipField
                  label={t.wizardSkills}
                  values={skillChips(profile, skillText)}
                  onChange={(skills) => {
                    onProfile({ ...profile, skills });
                    onSkillText(skills.join(", "));
                  }}
                />
                <ChipField
                  label={t.wizardLanguages}
                  values={profile.languages ?? []}
                  onChange={(languages) => onProfile({ ...profile, languages })}
                />
                <ChipField
                  label={t.wizardTools}
                  values={profile.tools ?? []}
                  onChange={(tools) => onProfile({ ...profile, tools })}
                />
              </StepShell>
            ) : null}

            {current === "situation" ? (
              <StepShell title={t.wizardSituationTitle} body={t.wizardSituationBody}>
                <div className="grid gap-2 sm:grid-cols-2">
                  {SITUATIONS.map((k) => (
                    <Choice
                      key={k}
                      selected={profile.situation === k}
                      title={t[k]}
                      hint={SITUATION_HINT[k]}
                      onClick={() => onProfile({ ...profile, situation: k })}
                    />
                  ))}
                </div>
                <Textarea
                  rows={2}
                  value={situationNote}
                  placeholder={t.wizardSituationNote}
                  onChange={(e) => onSituationNote(e.target.value)}
                />
              </StepShell>
            ) : null}

            {current === "target" ? (
              <StepShell title={t.wizardTargetTitle} body={t.wizardTargetBody}>
                <div className="grid gap-2 sm:grid-cols-2">
                  {TARGETS.map((k) => (
                    <Choice
                      key={k}
                      selected={profile.target === k}
                      title={t[k]}
                      hint={TARGET_HINT[k]}
                      onClick={() => onProfile({ ...profile, target: k })}
                    />
                  ))}
                </div>
                <Textarea
                  rows={2}
                  value={targetNote}
                  placeholder={t.wizardTargetNote}
                  onChange={(e) => onTargetNote(e.target.value)}
                />
              </StepShell>
            ) : null}

            {current === "city" ? (
              <StepShell title={t.wizardCityTitle}>
                <div className="grid grid-cols-2 gap-2">
                  {CITIES.map((city) => (
                    <Choice
                      key={city}
                      selected={profile.city === city}
                      title={city}
                      onClick={() => onProfile({ ...profile, city })}
                    />
                  ))}
                </div>
              </StepShell>
            ) : null}

            {current === "want" ? (
              <StepShell title={t.wizardWantTitle} body={t.wizardWantBody}>
                <Textarea
                  rows={4}
                  value={profile.bio}
                  placeholder={t.wizardWantPlaceholder}
                  onChange={(e) => onProfile({ ...profile, bio: e.target.value })}
                />
              </StepShell>
            ) : null}

            {current === "years" ? (
              <StepShell title={t.wizardYearsTitle} body={t.wizardYearsBody}>
                <div className="grid gap-2 sm:grid-cols-2">
                  {YEAR_BANDS.map((band) => (
                    <Choice
                      key={band.label}
                      selected={profile.years === band.years}
                      title={band.label}
                      onClick={() => onProfile({ ...profile, years: band.years })}
                    />
                  ))}
                </div>
              </StepShell>
            ) : null}

            {current === "photo" ? (
              <StepShell title={t.wizardPhotoTitle} body={t.wizardPhotoBody}>
                <div className="flex items-center gap-3">
                  {profile.photoDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.photoDataUrl}
                      alt=""
                      className="size-16 rounded-lg object-cover ring-1 ring-border"
                    />
                  ) : (
                    <div className="flex size-16 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                      <ImagePlus className="size-5" />
                    </div>
                  )}
                  <input
                    ref={photoRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/*"
                    className="hidden"
                    onChange={(e) => onPickPhoto(e.target.files?.[0])}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={photoBusy || running}
                      onClick={() => photoRef.current?.click()}
                    >
                      {photoBusy ? <LoaderCircle className="animate-spin" /> : null}
                      {profile.photoDataUrl ? t.photoReplace : t.photoUpload}
                    </Button>
                    {profile.photoDataUrl ? (
                      <Button type="button" variant="ghost" disabled={running} onClick={onRemovePhoto}>
                        {t.photoRemove}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </StepShell>
            ) : null}

            {current === "review" ? (
              <StepShell title={t.wizardReviewTitle} body={t.wizardReviewBody}>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">{t.name}</span>
                  <Input
                    value={profile.name}
                    onChange={(e) => onProfile({ ...profile, name: e.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">{t.role}</span>
                  <Input
                    value={profile.lastRole}
                    onChange={(e) => onProfile({ ...profile, lastRole: e.target.value })}
                  />
                </label>
                <ChipField
                  label={t.wizardSkills}
                  values={skillChips(profile, skillText)}
                  onChange={(skills) => {
                    onProfile({ ...profile, skills });
                    onSkillText(skills.join(", "));
                  }}
                />
                <ChipField
                  label={t.wizardLanguages}
                  values={profile.languages ?? []}
                  onChange={(languages) => onProfile({ ...profile, languages })}
                />
                <ChipField
                  label={t.wizardTools}
                  values={profile.tools ?? []}
                  onChange={(tools) => onProfile({ ...profile, tools })}
                />
                <div>
                  <p className="text-xs text-muted-foreground">{t.wizardExperience}</p>
                  <ul className="mt-2 space-y-3">
                    {profile.experience.map((role, i) => (
                      <li key={`${role.company}-${role.title}-${i}`} className="rounded-lg border p-3">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input
                            value={role.title}
                            onChange={(e) =>
                              patchRole(profile, onProfile, i, { title: e.target.value })
                            }
                          />
                          <Input
                            value={role.company}
                            onChange={(e) =>
                              patchRole(profile, onProfile, i, { company: e.target.value })
                            }
                          />
                          <Input
                            value={role.start}
                            placeholder={t.wizardDates}
                            onChange={(e) =>
                              patchRole(profile, onProfile, i, { start: e.target.value })
                            }
                          />
                          <Input
                            value={role.end}
                            placeholder={t.wizardDates}
                            onChange={(e) =>
                              patchRole(profile, onProfile, i, { end: e.target.value })
                            }
                          />
                        </div>
                        <Textarea
                          className="mt-2"
                          rows={3}
                          value={role.bullets.join("\n")}
                          placeholder={t.wizardBullets}
                          onChange={(e) =>
                            patchRole(profile, onProfile, i, {
                              bullets: e.target.value
                                .split("\n")
                                .map((b) => b.replace(/^\s*[•\-–—*]\s*/, "").trim())
                                .filter(Boolean),
                            })
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              </StepShell>
            ) : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="flex items-center justify-between gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={resolvedIndex === 0 || ingestBusy}
                onClick={() => go(-1)}
              >
                {t.wizardBack}
              </Button>
              {current === "photo" && !last ? (
                <Button type="button" variant="ghost" onClick={() => go(1)}>
                  {t.wizardSkipPhoto}
                </Button>
              ) : (
                <span />
              )}
              <Button
                type="button"
                disabled={!canNext || ingestBusy || (last && (!profile.name.trim() || !profile.lastRole.trim()))}
                onClick={() => {
                  if (last) finish();
                  else go(1);
                }}
              >
                {last ? t.run : t.wizardNext}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{t.wizardSamples}</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            {Object.entries(PRESETS).map(([key, p]) => (
              <button
                key={key}
                type="button"
                onClick={() => onPreset(key)}
                className="flex-1 rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span className="font-medium">{p.name}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {p.lastRole} · {p.city}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


function skillChips(profile: Profile, skillText: string): string[] {
  if (profile.skills?.length) return profile.skills;
  return skillText
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function ChipField({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const add = (raw: string) => {
    const item = raw.trim();
    if (!item) return;
    const key = item.toLowerCase();
    if (values.some((v) => v.toLowerCase() === key)) return;
    onChange([...values, item]);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            className="inline-flex items-center gap-1 rounded-full border bg-[var(--dawn)]/10 px-2.5 py-1 text-xs"
            onClick={() => onChange(values.filter((v) => v !== value))}
            aria-label={`Remove ${value}`}
          >
            {value}
            <X className="size-3 opacity-70" />
          </button>
        ))}
        {!values.length ? (
          <span className="text-xs text-muted-foreground">None on the file — add if they are on your CV.</span>
        ) : null}
      </div>
      <Input
        placeholder={t.wizardChipPlaceholder}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          add(e.currentTarget.value);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}

function StepShell({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="font-heading text-xl">{title}</h2>
        {body ? <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p> : null}
      </div>
      {children}
    </div>
  );
}

function patchRole(
  profile: Profile,
  onProfile: (next: Profile) => void,
  index: number,
  patch: Partial<ExperienceRole>,
) {
  const experience = profile.experience.map((role, i) => (i === index ? { ...role, ...patch } : role));
  onProfile({
    ...profile,
    experience,
    lastRole: index === 0 && patch.title !== undefined ? patch.title : profile.lastRole,
    lastCompany: index === 0 && patch.company !== undefined ? patch.company : profile.lastCompany,
  });
}
