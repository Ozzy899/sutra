import { fallbackSummary, pitchPack, weekPlan } from "@/lib/agent/copy";
import { whyMatch } from "@/lib/agent/match";
import { familyLabel, profileFamily } from "@/lib/agent/role";
import { runSandbox } from "@/lib/agent/sandbox";
import { searchMarket } from "@/lib/partners/exa";
import { filterMarketJobs } from "@/lib/partners/job-result";
import { crawlSources } from "@/lib/partners/firecrawl";
import { grokComplete } from "@/lib/partners/status";
import { adapterLive } from "@/lib/partners/status";
import { profileWithoutPhoto } from "@/lib/photo";
import type { JobListing, Profile, StreamEvent, TraceEvent } from "@/lib/types";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function orchestrate(
  profile: Profile,
  emit: (event: StreamEvent) => void,
) {
  const live = await adapterLive();
  const traces: TraceEvent[] = [];

  const trace = async (
    partial: Omit<TraceEvent, "status"> & { status?: TraceEvent["status"] },
  ) => {
    const event: TraceEvent = { ...partial, status: partial.status ?? "running" };
    traces.push(event);
    emit({ type: "trace", event });
    await sleep(40);
  };

  await trace({
    id: "grok-read",
    tool: "grok",
    title: "Grok reads your file",
    detail: `${profile.lastRole} · ${profile.city} · ${profile.skills.slice(0, 3).join(", ")}`,
    live: live.grok,
  });

  const hits = filterMarketJobs(await searchMarket(profile));
  const family = profileFamily(profile);
  emit({
    type: "trace",
    event: {
      id: "grok-read",
      tool: "grok",
      title: "File ready",
      detail: `Lane: ${familyLabel(family)} — from “${profile.lastRole}”, not a generic job board.`,
      status: "done",
      live: live.grok,
    },
  });

  await trace({
    id: "exa",
    tool: "exa",
    title:
      profile.target === "us_market" ? "Exa scans the US market" : "Exa scans Balkan + EU",
    detail: live.exa
      ? "Live search for open roles"
      : profile.target === "us_market"
        ? "Curated catalog with US listings (add EXA_API_KEY to go live)"
        : "Curated Balkan index (add EXA_API_KEY to go live)",
    live: live.exa,
  });
  await sleep(280);
  emit({
    type: "trace",
    event: {
      id: "exa",
      tool: "exa",
      title: `${hits.length} listings from the web`,
      detail: hits.map((h) => `${h.title} · ${h.company}`).join(" · "),
      status: "done",
      live: live.exa,
    },
  });

  await trace({
    id: "firecrawl",
    tool: "firecrawl",
    title: "Firecrawl reads listings as text",
    detail: hits
      .slice(0, 3)
      .map((h) => `${h.title} · ${h.company}`)
      .join(" · "),
    live: live.firecrawl,
  });
  const crawled = await crawlSources(hits);
  await sleep(240);
  emit({
    type: "trace",
    event: {
      id: "firecrawl",
      tool: "firecrawl",
      title: "Listings cleaned",
      detail: `${crawled.size} documents, without HTML noise`,
      status: "done",
      live: live.firecrawl,
    },
  });

  const jobs: JobListing[] = hits.map((job) => ({
    ...job,
    crawledMarkdown: crawled.get(job.id) ?? job.snippet,
  }));

  await trace({
    id: "daytona",
    tool: "daytona",
    title: "Daytona sandbox",
    detail: live.daytona
      ? "Isolated runtime — scoring in a real sandbox"
      : "No DAYTONA_API_KEY — local scoring so you still get fit + proof",
    live: live.daytona,
  });

  const sandbox = await runSandbox(profile, jobs, (line) => {
    emit({ type: "sandbox", line });
  });

  const scored = filterMarketJobs(
    sandbox.scored.map((job) => ({
      ...job,
      why: whyMatch(profile, job),
    })),
  );
  emit({ type: "jobs", jobs: scored });
  emit({ type: "proof", proof: sandbox.proof });

  emit({
    type: "trace",
    event: {
      id: "daytona",
      tool: "daytona",
      title: `Daytona ${sandbox.bootMs}ms`,
      detail: `${sandbox.proof.title} · ${sandbox.proof.testsPassed} tests`,
      status: "done",
      live: live.daytona,
    },
  });

  const top = scored[0];
  const summaryFallback = fallbackSummary(profile, top);
  const summary = await grokComplete(
    `Write a 70-word note in English, second person, to this job seeker. Tell them the closest role and what to send Monday. No contest language.\nProfile: ${JSON.stringify(profileWithoutPhoto(profile))}\nTop job: ${top?.title} at ${top?.company}`,
    summaryFallback,
  );
  emit({ type: "summary", summary });

  const plan = weekPlan(profile, top);
  emit({ type: "plan", plan });
  emit({ type: "pitch", pitch: pitchPack(profile, top) });
  emit({ type: "done", adapters: live });
}
