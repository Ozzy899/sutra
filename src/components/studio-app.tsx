"use client";

import { t } from "@/components/copy";
import { JobApplyActions } from "@/components/job-apply-actions";
import { ProductTour } from "@/components/product-tour";
import { SetupWizard } from "@/components/setup-wizard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { hasParseableExperience } from "@/lib/agent/experience";
import { EMPTY_PROFILE, PRESETS, sampleCvFile } from "@/lib/data/presets";
import { useStudioPersist } from "@/lib/persist/studio-persist";
import type { OnePagerMeta } from "@/lib/persist/snapshot";
import { compressPortrait, profileWithoutPhoto } from "@/lib/photo";
import { STUDIO_TOUR, type TourStep } from "@/lib/tour";
import {
  shouldOpenWizard,
  writeWizardStatus,
  type WizardStepId,
} from "@/lib/wizard";
import type {
  JobListing,
  PitchFeedback,
  PitchPack,
  Profile,
  ProofOfWork,
  StreamEvent,
  TraceEvent,
  WeekPlan,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { FileUp, ImagePlus, LoaderCircle, Mic, Square, Sunrise, Terminal } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type SpeechCtor = new () => {
  lang: string;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
};

async function consumeRun(profile: Profile, onEvent: (e: StreamEvent) => void) {
  const res = await fetch("/api/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile }),
  });
  if (!res.ok || !res.body) {
    throw new Error("run failed");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.replace(/^data:\s*/, "").trim();
      if (!line) continue;
      onEvent(JSON.parse(line) as StreamEvent);
    }
  }
}

export function StudioApp() {
  const params = useSearchParams();
  const auto = params.get("run");
  const persist = useStudioPersist();
  if (!persist.ready) {
    return (
      <div className="flex min-h-full items-center justify-center text-sm text-muted-foreground">
        Studio…
      </div>
    );
  }
  return <StudioLoaded auto={auto} persist={persist} />;
}

function StudioLoaded({
  auto,
  persist,
}: {
  auto: string | null;
  persist: ReturnType<typeof useStudioPersist>;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const setup = params.get("setup");
  const skipRestore = Boolean(auto && PRESETS[auto]);
  const initial = skipRestore ? null : persist.restored;

  const [profile, setProfile] = useState<Profile>(() =>
    skipRestore && auto && PRESETS[auto] ? PRESETS[auto] : (initial?.profile ?? EMPTY_PROFILE),
  );
  const [skillText, setSkillText] = useState(
    skipRestore && auto && PRESETS[auto]
      ? PRESETS[auto].skills.join(", ")
      : (initial?.skillText ?? ""),
  );
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [traces, setTraces] = useState<TraceEvent[]>(() => initial?.traces ?? []);
  const [logs, setLogs] = useState<string[]>(() => initial?.logs ?? []);
  const [jobs, setJobs] = useState<JobListing[]>(() => initial?.jobs ?? []);
  const [proof, setProof] = useState<ProofOfWork | null>(() => initial?.proof ?? null);
  const [plan, setPlan] = useState<WeekPlan | null>(() => initial?.plan ?? null);
  const [pitch, setPitch] = useState<PitchPack | null>(() => initial?.pitch ?? null);
  const [summary, setSummary] = useState<string | null>(() => initial?.summary ?? null);
  const [onePagers, setOnePagers] = useState<OnePagerMeta[]>(() => initial?.onePagers ?? []);
  const [fileIx, setFileIx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<PitchFeedback | null>(null);
  const [coaching, setCoaching] = useState(false);
  const [listening, setListening] = useState(false);
  const [panel, setPanel] = useState<"market" | "proof" | "monday">("market");
  const recRef = useRef<{ stop: () => void } | null>(null);
  const started = useRef(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const cvRef = useRef<HTMLInputElement>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvAccepted, setCvAccepted] = useState(() =>
    hasParseableExperience(skipRestore && auto && PRESETS[auto] ? PRESETS[auto] : (initial?.profile ?? EMPTY_PROFILE)),
  );
  const [ingestBusy, setIngestBusy] = useState(false);
  const [ingestNote, setIngestNote] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(() =>
    shouldOpenWizard({
      sampleRun: skipRestore,
      forceSetup: setup === "1",
      restored: initial?.profile,
    }),
  );
  const [wizardStep, setWizardStep] = useState<WizardStepId>("cv");
  const [situationNote, setSituationNote] = useState("");
  const [targetNote, setTargetNote] = useState("");

  useEffect(() => {
    const delay = running ? 900 : 650;
    const timer = window.setTimeout(() => {
      persist.save({
        profile,
        skillText,
        traces,
        logs,
        jobs,
        proof,
        plan,
        pitch,
        summary,
        onePagers,
      });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [
    persist,
    persist.save,
    running,
    profile,
    skillText,
    traces,
    logs,
    jobs,
    proof,
    plan,
    pitch,
    summary,
    onePagers,
  ]);

  const run = async (next?: Profile) => {
    const p = next ?? {
      ...profile,
      skills: skillText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      languages: profile.languages ?? [],
      tools: profile.tools ?? [],
    };
    if (!cvAccepted && !hasParseableExperience(p)) {
      setError(t.cvRequired);
      return;
    }
    if (!hasParseableExperience(p)) {
      setError(t.cvNeedHistory);
      return;
    }
    if (!p.name.trim() || !p.lastRole.trim()) {
      setError(t.required);
      return;
    }
    setProfile(p);
    setError(null);
    setRunning(true);
    setTraces([]);
    setLogs([]);
    setJobs([]);
    setProof(null);
    setPlan(null);
    setPitch(null);
    setSummary(null);
    setFeedback(null);
    try {
      await consumeRun(
        p,
        (event) => {
        if (event.type === "trace") {
          setTraces((prev) => {
            const ix = prev.findIndex((x) => x.id === event.event.id);
            if (ix === -1) return [...prev, event.event];
            const copy = prev.slice();
            copy[ix] = event.event;
            return copy;
          });
        } else if (event.type === "sandbox") {
          setLogs((prev) => [...prev, event.line]);
        } else if (event.type === "jobs") setJobs(event.jobs);
        else if (event.type === "proof") {
          setProof(event.proof);
          setFileIx(0);
        } else if (event.type === "plan") setPlan(event.plan);
        else if (event.type === "pitch") setPitch(event.pitch);
        else if (event.type === "summary") setSummary(event.summary);
        else if (event.type === "error") setError(event.message);
      });
    } catch {
      setError(t.error);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    if (!auto || !PRESETS[auto] || started.current) return;
    started.current = true;
    writeWizardStatus("complete");
    setWizardOpen(false);
    const p = PRESETS[auto];
    setProfile(p);
    setSkillText(p.skills.join(", "));
    setCvFile(sampleCvFile(auto));
    setCvAccepted(true);
    void run(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  const applyPreset = (key: string) => {
    const p = PRESETS[key];
    if (!p) return;
    const next = { ...p, photoDataUrl: profile.photoDataUrl };
    writeWizardStatus("complete");
    setWizardOpen(false);
    setProfile(next);
    setSkillText(p.skills.join(", "));
    setCvFile(sampleCvFile(key));
    setCvAccepted(true);
    setIngestNote(t.ingestOk);
    if (cvRef.current) cvRef.current.value = "";
    router.replace(`/studio?run=${key}`);
    void run(next);
  };

  const replayWizard = () => {
    writeWizardStatus("in_progress");
    setWizardStep("cv");
    setWizardOpen(true);
    router.replace("/studio?setup=1");
  };

  const completeWizard = (next: Profile) => {
    writeWizardStatus("complete");
    setProfile(next);
    setSkillText((next.skills ?? []).join(", "));
    setWizardOpen(false);
    router.replace("/studio");
    void run(next);
  };

  const applyIngested = (next: Profile) => {
    setProfile((prev) => ({
      ...next,
      photoDataUrl: prev.photoDataUrl ?? next.photoDataUrl,
    }));
    setSkillText((next.skills ?? []).join(", "));
  };

  const ingest = async (file = cvFile) => {
    if (!file) {
      setIngestNote(null);
      setError(t.ingestNeed);
      return;
    }
    setIngestBusy(true);
    setError(null);
    setIngestNote(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append(
        "profile",
        JSON.stringify(
          profileWithoutPhoto({
            ...profile,
            skills: skillText
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          }),
        ),
      );
      const res = await fetch("/api/ingest", { method: "POST", body: fd });
      const json = (await res.json()) as {
        profile?: Profile;
        error?: string;
        warnings?: string[];
      };
      if (!res.ok) {
        setError(json.error || t.error);
        return;
      }
      if (json.profile) {
        applyIngested(json.profile);
        setCvAccepted(true);
        if (wizardOpen) writeWizardStatus("in_progress");
      }
      const warn = json.warnings?.filter(Boolean) ?? [];
      if (warn.length) setError(warn[0] ?? t.error);
      else setIngestNote(t.ingestOk);
    } catch {
      setError(t.error);
    } finally {
      setIngestBusy(false);
    }
  };

  const onCvFile = (file: File | undefined) => {
    if (!file) return;
    setCvFile(file);
    setError(null);
    void ingest(file);
  };

  const onPhotoFile = async (file: File | undefined) => {
    if (!file) return;
    setPhotoBusy(true);
    setError(null);
    try {
      const photoDataUrl = await compressPortrait(file);
      setProfile((prev) => ({ ...prev, photoDataUrl }));
    } catch {
      setError(t.photoBad);
    } finally {
      setPhotoBusy(false);
      if (photoRef.current) photoRef.current.value = "";
    }
  };

  const toggleMic = () => {
    const w = window as unknown as {
      SpeechRecognition?: SpeechCtor;
      webkitSpeechRecognition?: SpeechCtor;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.onresult = (ev) => {
      const chunks: string[] = [];
      for (let i = 0; i < ev.results.length; i += 1) {
        const alt = ev.results[i]?.[0]?.transcript;
        if (alt) chunks.push(alt);
      }
      const text = chunks.join(" ");
      setAnswer((a) => (a ? `${a} ${text}` : text));
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const coach = async () => {
    if (!answer.trim()) return;
    setCoaching(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, answer }),
      });
      const json = (await res.json()) as PitchFeedback & { error?: string };
      if (!res.ok) setError(json.error || t.error);
      else setFeedback(json);
    } catch {
      setError(t.error);
    } finally {
      setCoaching(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      {wizardOpen ? (
        <SetupWizard
          profile={profile}
          skillText={skillText}
          cvFile={cvFile}
          cvAccepted={cvAccepted}
          ingestBusy={ingestBusy}
          ingestNote={ingestNote}
          photoBusy={photoBusy}
          error={error}
          running={running}
          situationNote={situationNote}
          targetNote={targetNote}
          stepId={wizardStep}
          onStepId={setWizardStep}
          onProfile={setProfile}
          onSkillText={setSkillText}
          onSituationNote={setSituationNote}
          onTargetNote={setTargetNote}
          onPickCv={onCvFile}
          onRemoveCv={() => {
            setCvFile(null);
            setCvAccepted(false);
            if (cvRef.current) cvRef.current.value = "";
          }}
          onPickPhoto={(file) => void onPhotoFile(file)}
          onRemovePhoto={() =>
            setProfile((prev) => {
              const next = { ...prev };
              delete next.photoDataUrl;
              return next;
            })
          }
          onPreset={applyPreset}
          onFinish={completeWizard}
        />
      ) : null}
      <div className={wizardOpen ? "hidden" : "contents"}>
      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur">
        <Link href="/" className="flex items-center gap-2">
          <Sunrise className="size-5 text-[var(--dawn)]" />
          <span className="font-heading text-lg">{t.brand}</span>
        </Link>
        <div className="flex items-center gap-2">
          <p
            className={
              persist.cloudError
                ? "max-w-[16rem] text-right text-[11px] leading-tight text-destructive sm:max-w-[22rem]"
                : "max-w-[11rem] text-right text-[11px] leading-tight text-muted-foreground sm:max-w-[14rem]"
            }
            data-tour="studio-save"
          >
            {persist.cloudError ??
              (persist.mode === "cloud" ? t.savedCloud : t.savedDevice)}
          </p>
          <ProductTour
            id="studio"
            steps={STUDIO_TOUR}
            autoStart={!wizardOpen}
            onStep={(step: TourStep) => {
              if (step.tab) setPanel(step.tab);
            }}
          />
          <Button
            size="sm"
            onClick={() => run()}
            disabled={running || (!cvAccepted && !hasParseableExperience(profile))}
            data-tour="studio-run"
          >
            {running ? <LoaderCircle className="animate-spin" /> : null}
            {running ? t.running : t.run}
          </Button>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1400px] flex-1 gap-4 p-4 lg:grid-cols-[320px_1fr] xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <aside className="space-y-4">
          <Card data-tour="studio-presets">
            <CardHeader className="border-b">
              <CardTitle className="font-heading text-lg">{t.presets}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button type="button" size="sm" variant="outline" onClick={replayWizard}>
                {t.wizardReplay}
              </Button>
              {Object.entries(PRESETS).map(([key, p]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  disabled={running}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                    profile.name === p.name && "border-[var(--dawn)] bg-[var(--dawn)]/10",
                  )}
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {p.lastRole} · {p.city}
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card data-tour="studio-dossier">
            <CardContent className="flex flex-col gap-3">
              <div>
                <span className="text-xs text-muted-foreground">{t.cv}</span>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{t.cvHint}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    ref={cvRef}
                    type="file"
                    accept=".pdf,.txt,.md,.docx,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={(e) => void onCvFile(e.target.files?.[0])}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={ingestBusy || running}
                    onClick={() => cvRef.current?.click()}
                  >
                    {ingestBusy ? <LoaderCircle className="animate-spin" /> : <FileUp />}
                    {cvFile ? t.cvReplace : t.cvUpload}
                  </Button>
                  {cvFile ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={running}
                      onClick={() => {
                        setCvFile(null);
                        setCvAccepted(false);
                        if (cvRef.current) cvRef.current.value = "";
                      }}
                    >
                      {t.cvRemove}
                    </Button>
                  ) : null}
                </div>
                {cvFile ? (
                  <p className="mt-1 truncate text-xs text-muted-foreground">{cvFile.name}</p>
                ) : null}
              </div>
              <Button
                type="button"
                size="sm"
                disabled={ingestBusy || running}
                onClick={() => void ingest()}
              >
                {ingestBusy ? <LoaderCircle className="animate-spin" /> : null}
                {t.cvUse}
              </Button>
              {ingestNote ? (
                <p className="text-sm text-[var(--river)]">{ingestNote}</p>
              ) : null}
              <Field label={t.name}>
                <Input
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
              </Field>
              <Field label={t.city}>
                <select
                  className="h-8 w-full rounded-lg border bg-background px-2 text-sm"
                  value={profile.city}
                  onChange={(e) =>
                    setProfile({ ...profile, city: e.target.value as Profile["city"] })
                  }
                >
                  {["Beograd", "Novi Sad", "Niš", "Remote"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label={t.role}>
                <Input
                  value={profile.lastRole}
                  onChange={(e) => setProfile({ ...profile, lastRole: e.target.value })}
                />
              </Field>
              <Field label={t.company}>
                <Input
                  value={profile.lastCompany}
                  onChange={(e) => setProfile({ ...profile, lastCompany: e.target.value })}
                />
              </Field>
              <Field label={t.years}>
                <Input
                  type="number"
                  min={0}
                  value={profile.years}
                  onChange={(e) => setProfile({ ...profile, years: Number(e.target.value) })}
                />
              </Field>
              <Field label={t.skills}>
                <Input value={skillText} onChange={(e) => setSkillText(e.target.value)} />
              </Field>
              <Field label={t.languages}>
                <Input
                  value={(profile.languages ?? []).join(", ")}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      languages: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </Field>
              <Field label={t.tools}>
                <Input
                  value={(profile.tools ?? []).join(", ")}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      tools: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label={t.situation}>
                  <select
                    className="h-8 w-full rounded-lg border bg-background px-2 text-sm"
                    value={profile.situation}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        situation: e.target.value as Profile["situation"],
                      })
                    }
                  >
                    {(["laid_off", "student", "pivot", "stuck"] as const).map((k) => (
                      <option key={k} value={k}>
                        {t[k]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t.target}>
                  <select
                    className="h-8 w-full rounded-lg border bg-background px-2 text-sm"
                    value={profile.target}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        target: e.target.value as Profile["target"],
                      })
                    }
                  >
                    {(["local_startup", "eu_remote", "freelance", "web3", "us_market"] as const).map((k) => (
                      <option key={k} value={k}>
                        {t[k]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label={t.bio}>
                <Textarea
                  rows={4}
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                />
              </Field>
              {profile.experience.length ? (
                <div>
                  <span className="text-xs text-muted-foreground">{t.wizardExperience}</span>
                  <ul className="mt-2 space-y-2">
                    {profile.experience.map((role, i) => (
                      <li key={`${role.company}-${i}`} className="rounded-lg border px-2 py-1.5">
                        <p className="text-sm font-medium">
                          {role.title} · {role.company}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {[role.start, role.end].filter(Boolean).join(" – ")}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div data-tour="studio-photo">
                <span className="text-xs text-muted-foreground">{t.photo}</span>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.photoHint}</p>
                <div className="mt-2 flex items-center gap-3">
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
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={photoRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/*"
                      className="hidden"
                      onChange={(e) => void onPhotoFile(e.target.files?.[0])}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={photoBusy || running}
                      onClick={() => photoRef.current?.click()}
                    >
                      {photoBusy ? <LoaderCircle className="animate-spin" /> : null}
                      {profile.photoDataUrl ? t.photoReplace : t.photoUpload}
                    </Button>
                    {profile.photoDataUrl ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={running}
                        onClick={() =>
                          setProfile((prev) => {
                            const next = { ...prev };
                            delete next.photoDataUrl;
                            return next;
                          })
                        }
                      >
                        {t.photoRemove}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </CardContent>
          </Card>
        </aside>

        <main className="min-w-0 space-y-4">
          {summary ? (
            <Card className="border-[var(--dawn)]/40 bg-[var(--dawn)]/8">
              <CardContent>
                <p className="text-sm leading-relaxed">{summary}</p>
              </CardContent>
            </Card>
          ) : null}

          <Card data-tour="studio-trace">
            <CardHeader className="border-b">
              <CardTitle className="font-heading">{t.trace}</CardTitle>
            </CardHeader>
            <CardContent>
              {traces.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.emptyTrace}</p>
              ) : (
                <ol className="space-y-3">
                  {traces.map((tr) => (
                    <li key={tr.id} className="flex gap-3">
                      <span
                        className={cn(
                          "mt-1 size-2 shrink-0 rounded-full",
                          tr.status === "running" && "animate-pulse bg-[var(--dawn)]",
                          tr.status === "done" && "bg-[var(--river)]",
                          tr.status === "error" && "bg-destructive",
                        )}
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{tr.title}</p>
                          <Badge variant="outline">{tr.tool}</Badge>
                          <Badge variant={tr.live ? "default" : "secondary"}>
                            {tr.live ? t.live : t.demoAdapter}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{tr.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card data-tour="studio-daytona">
            <CardHeader className="flex flex-row items-center gap-2 border-b">
              <Terminal className="size-4 text-[var(--dawn)]" />
              <CardTitle className="font-heading">{t.sandbox}</CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="font-mono text-xs text-muted-foreground">{t.emptyProof}</p>
              ) : (
                <ScrollArea className="h-48 rounded-lg bg-black/50 p-3 font-mono text-[11px] leading-5 text-[#d7c4a3]">
                  {logs.map((line, i) => (
                    <div key={`${i}-${line}`}>{line}</div>
                  ))}
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Tabs
            value={panel}
            onValueChange={(v) => {
              if (v === "market" || v === "proof" || v === "monday") setPanel(v);
            }}
          >
            <TabsList data-tour="studio-tabs">
              <TabsTrigger value="market">{t.market}</TabsTrigger>
              <TabsTrigger value="proof">{t.proof}</TabsTrigger>
              <TabsTrigger value="monday">{t.monday}</TabsTrigger>
            </TabsList>
            <TabsContent value="market" className="space-y-3 pt-3">
              {jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.emptyMarket}</p>
              ) : (
                jobs.map((job, i) => (
                  <Card key={job.id}>
                    <CardContent className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-heading text-lg">{job.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {job.company} · {job.city} · {job.salary}
                          </p>
                        </div>
                        <Badge>{Math.round(job.fit * 100)}% fit</Badge>
                      </div>
                      <p className="text-sm leading-relaxed">{job.why}</p>
                      {job.url.startsWith("http") ? (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[var(--dawn)] underline-offset-2 hover:underline"
                        >
                          {job.source} → {t.openListing}
                        </a>
                      ) : (
                        <p className="text-xs text-muted-foreground">{job.source}</p>
                      )}
                      <JobApplyActions
                        job={job}
                        profile={{
                          ...profile,
                          skills: skillText
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                          languages: profile.languages ?? [],
                          tools: profile.tools ?? [],
                        }}
                        proof={proof}
                        pitch={pitch}
                        plan={plan}
                        ready={Boolean(!running)}
                        tour={i === 0}
                        onGenerated={(listing) => {
                          persist.recordOnePager({
                            jobId: listing.id,
                            company: listing.company,
                            title: listing.title,
                          });
                          setOnePagers((prev) => {
                            const rest = prev.filter((row) => row.jobId !== listing.id);
                            return [
                              ...rest,
                              {
                                jobId: listing.id,
                                company: listing.company,
                                title: listing.title,
                                generatedAt: Date.now(),
                              },
                            ];
                          });
                        }}
                      />
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
            <TabsContent value="proof" className="pt-3">
              {!proof ? (
                <p className="text-sm text-muted-foreground">{t.emptyProof}</p>
              ) : (
                <div className="space-y-3">
                  <div>
                    <h3 className="font-heading text-2xl">{proof.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{proof.hook}</p>
                    <p className="mt-2 text-sm">{proof.demoScript}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {proof.files.map((f, i) => (
                      <Button
                        key={f.path}
                        size="sm"
                        variant={fileIx === i ? "default" : "outline"}
                        onClick={() => setFileIx(i)}
                      >
                        {f.path}
                      </Button>
                    ))}
                  </div>
                  <pre className="overflow-x-auto rounded-xl bg-black/60 p-4 text-xs leading-6 text-[#e8d9c0]">
                    {proof.files[fileIx]?.content}
                  </pre>
                </div>
              )}
            </TabsContent>
            <TabsContent value="monday" className="space-y-4 pt-3">
              {plan ? (
                <div>
                  <h3 className="font-heading text-xl">{plan.headline}</h3>
                  <ul className="mt-3 space-y-2">
                    {plan.days.map((d) => (
                      <li key={d.day} className="flex gap-3 text-sm">
                        <span className="w-16 shrink-0 text-[var(--dawn)]">{d.day}</span>
                        <span className="flex-1">{d.focus}</span>
                        <span className="text-muted-foreground">{d.hours}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t.emptyMonday}</p>
              )}
              {pitch ? (
                <div className="space-y-2 rounded-xl border p-4">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    {t.elevator}
                  </p>
                  <p className="text-sm leading-relaxed">{pitch.elevator}</p>
                  <p className="pt-2 text-xs uppercase tracking-widest text-muted-foreground">
                    {t.star}
                  </p>
                  <p className="text-sm leading-relaxed">{pitch.star}</p>
                </div>
              ) : null}
            </TabsContent>
          </Tabs>
        </main>

        <aside className="space-y-4 xl:sticky xl:top-16 xl:self-start">


          <Card data-tour="studio-pitch">
            <CardHeader className="border-b">
              <CardTitle className="font-heading">{t.pitchTitle}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">{t.pitchHint}</p>
              <Textarea rows={5} value={answer} onChange={(e) => setAnswer(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={coach} disabled={coaching || !answer.trim()}>
                  {coaching ? <LoaderCircle className="animate-spin" /> : null}
                  {t.pitchGo}
                </Button>
                <Button size="sm" variant="outline" onClick={toggleMic}>
                  {listening ? <Square /> : <Mic />}
                  {listening ? t.stop : t.pitchListen}
                </Button>
              </div>
              {feedback ? (
                <div className="space-y-2 rounded-lg border p-3">
                  <p className="font-heading text-2xl">{feedback.score}/10</p>
                  <ul className="list-disc space-y-1 pl-4 text-sm">
                    {feedback.notes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    {t.rewrite}
                  </p>
                  <p className="text-sm leading-relaxed">{feedback.rewrite}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

