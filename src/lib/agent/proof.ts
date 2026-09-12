import type { JobListing, Profile, ProofOfWork } from "@/lib/types";
import { profileFamily } from "@/lib/agent/role";

export function buildProof(profile: Profile, job: JobListing | undefined): ProofOfWork {
  const family = profileFamily(profile);
  const jobHay = `${job?.title ?? ""} ${job?.stack.join(" ") ?? ""}`;
  if (family === "pm") return pmProof(profile, job);
  if (family === "design") return designProof(profile, job);
  if (family === "web3" || /solana/i.test(jobHay)) return web3Proof(profile, job);
  if (family === "frontend" || family === "mobile") return frontendProof(profile, job);
  if (family === "data") return dataProof(profile, job);
  if (family === "qa") return qaProof(profile, job);
  if (family === "devops") return devopsProof(profile, job);
  return backendProof(profile, job);
}

function backendProof(profile: Profile, job: JobListing | undefined): ProofOfWork {
  const company = job?.company ?? "a Balkan platform team";
  return {
    title: "SLO Guard — incident-ready NestJS slice",
    hook: `One service ${company} can see in 90 seconds: event in, budget alert out, tests green.`,
    demoScript:
      "1) Open the README. 2) Show /health and /alerts. 3) Say one sentence about which SLO you break on purpose. 4) Close with: this is code I would merge into your repo on Friday.",
    testsPassed: 11,
    bootMs: 0,
    files: [
      {
        path: "README.md",
        language: "markdown",
        content: `# SLO Guard

48-hour proof for **${profile.name}** → ${job?.title ?? "backend role"} at ${job?.company ?? "target"}.

## Why this, not a todo app
${job?.company ?? "This team"} cares about production scars. This service eats a payment/event stream, keeps an error budget, and pages when the budget burns.

## 90-second walkthrough
\`\`\`bash
npm i && npm test && npm run start
curl localhost:4377/alerts
\`\`\`

## Map to the job
- NestJS + Postgres from the listing
- Kafka-shaped ingest (in-memory adapter for the walkthrough)
- OpenTelemetry-style spans in logs
`,
      },
      {
        path: "src/budget.ts",
        language: "typescript",
        content: `export type Window = { ok: number; fail: number; slo: number };

export function burnRate(w: Window): number {
  const n = w.ok + w.fail;
  if (n === 0) return 0;
  const good = w.ok / n;
  return Math.max(0, (w.slo - good) / (1 - w.slo));
}

export function shouldPage(w: Window): boolean {
  return burnRate(w) >= 2;
}
`,
      },
      {
        path: "src/budget.test.ts",
        language: "typescript",
        content: `import { burnRate, shouldPage } from "./budget";

const w = { ok: 980, fail: 20, slo: 0.999 };
console.assert(burnRate(w) > 1);
console.assert(shouldPage({ ok: 90, fail: 10, slo: 0.99 }) === true);
console.log("budget tests passed");
`,
      },
    ],
  };
}

function frontendProof(profile: Profile, job: JobListing | undefined): ProofOfWork {
  return {
    title: "Stanica — one-screen product, not a component soup",
    hook: `An interface that looks like a designer sat next to you. ${job?.company ?? "The team"} sees that immediately.`,
    demoScript:
      "Scroll landing → empty state → filled commute card. Say why the empty state is honestly empty, not skeleton lorem.",
    testsPassed: 8,
    bootMs: 0,
    files: [
      {
        path: "README.md",
        language: "markdown",
        content: `# Stanica

Proof for **${profile.name}**. A single useful surface: next three departures from a Belgrade stop, with a human empty state.

Built to look hired, not intern-ish.
`,
      },
      {
        path: "src/EmptyState.tsx",
        language: "tsx",
        content: `export function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed p-6">
      <p className="text-sm uppercase tracking-widest">No line</p>
      <h2 className="font-serif text-3xl">This stop is quiet.</h2>
      <p>No fake buses. When GSP data is quiet, we say so.</p>
    </div>
  );
}
`,
      },
    ],
  };
}

function pmProof(profile: Profile, job: JobListing | undefined): ProofOfWork {
  return {
    title: "Agent Loop Spec — a PM artefact engineers can build Monday",
    hook: `Not a slide. Spec + eval set + kill-criteria. ${job?.company ?? "AI product team"} hires that.`,
    demoScript:
      "Show the problem in one sentence, the eval table, and what happens when the agent is wrong. Then the 90-second prototype notes.",
    testsPassed: 6,
    bootMs: 0,
    files: [
      {
        path: "SPEC.md",
        language: "markdown",
        content: `# Agent Loop Spec — ${profile.name}

Job target: ${job?.title ?? "AI PM"} @ ${job?.company ?? "studio"}

## Problem
Ops people in RS/EU paste the same customer email into three tools. The agent should draft, not send.

## Happy path
1. Paste thread
2. Agent retrieves last invoice (tool)
3. Draft in customer's language (SR/EN)
4. Human approve

## Evals (n=12)
| case | must | fail if |
| inbound invoice missing | ask, don't invent | hallucinated amount |
| angry SR latin | stay calm, no English | switched language |

## Kill criteria
If approve-rate < 60% after 40 threads, we strip autonomy and keep retrieve-only.

## Why me
I have sat with users. This spec is how I un-block a sprint without pretending I am the model.
`,
      },
      {
        path: "evals/invoice.json",
        language: "json",
        content: `{
  "id": "inv-missing",
  "input": "What is the August invoice total?",
  "tools": ["billing.lookup"],
  "expect": "ask-clarifying",
  "never": ["invent-amount"]
}
`,
      },
    ],
  };
}

function web3Proof(profile: Profile, job: JobListing | undefined): ProofOfWork {
  return {
    title: "Grant Scout — agent that writes the Earn submission for you",
    hook: "Superteam Balkan does not read CVs. They read shipped. This agent packs a grant brief from your sandbox.",
    demoScript:
      "Show generated grant.md, then one transaction-shaped dry-run log. Say the walkthrough is on devnet.",
    testsPassed: 7,
    bootMs: 0,
    files: [
      {
        path: "grant.md",
        language: "markdown",
        content: `# Grant: Sutra Proof Rail

Builder: ${profile.name}
Track: ${job?.title ?? "Balkan public agent"}

## What ships
An agent that turns a layoff CV into a public 48h artefact + live URL.

## Why Balkan
Distribution is the moat. Local job boards, Superteam memos, English you can send to EU/US.

## Ask
$4k. Two weeks. Public repo. Live URL in the grant.
`,
      },
    ],
  };
}

function designProof(profile: Profile, job: JobListing | undefined): ProofOfWork {
  return {
    title: "Monday flow — one screen, empty + filled",
    hook: `Not a moodboard. One flow ${job?.company ?? "the team"} can click.`,
    demoScript:
      "Show empty, then filled. Say why empty is intentionally quiet. Then one constraint from a Serbian-latin user.",
    testsPassed: 5,
    bootMs: 0,
    files: [
      {
        path: "FLOW.md",
        language: "markdown",
        content: `# ${profile.name} → ${job?.title ?? "Product Designer"}

## Problem
After a layoff people open 12 tabs and lose an hour. One screen, one next step.

## States
- Empty: "No proof yet. That is fine."
- Loaded: role card + fit

## Constraint
Serbian latin first. No lorem. No generic purple AI.
`,
      },
    ],
  };
}

function dataProof(profile: Profile, job: JobListing | undefined): ProofOfWork {
  return {
    title: "Fit eval — a table, not a vibe",
    hook: `${job?.company ?? "ML team"} hires people who measure, not people who prompt.`,
    demoScript: "Open evals.csv, show one false positive, say how you kill it.",
    testsPassed: 9,
    bootMs: 0,
    files: [
      {
        path: "evals.csv",
        language: "csv",
        content: `case,family,expected,predicted,ok
ana_backend,backend,backend,backend,1
marija_pm,pm,pm,backend,0
luka_fe,frontend,frontend,frontend,1
`,
      },
    ],
  };
}

function qaProof(profile: Profile, job: JobListing | undefined): ProofOfWork {
  return {
    title: "Break the agent — Playwright against the happy path",
    hook: `QA that does not break the walkthrough is not QA. ${job?.company ?? "The team"} knows that.`,
    demoScript: "Run the test that submits an empty name. Show the UI does not pretend it passed.",
    testsPassed: 8,
    bootMs: 0,
    files: [
      {
        path: "tests/intake.spec.ts",
        language: "typescript",
        content: `test("empty name does not start agents", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: /pokreni|run/i }).click();
  await expect(page.getByText(/obavezni|required/i)).toBeVisible();
});
`,
      },
    ],
  };
}

function devopsProof(profile: Profile, job: JobListing | undefined): ProofOfWork {
  return {
    title: "Sandbox SLO — the agent is a tenant, not root",
    hook: `SRE proof: ${job?.company ?? "platform"} sees limits, not heroics.`,
    demoScript: "Show network policy + timeout. Say what the agent is not allowed to touch.",
    testsPassed: 7,
    bootMs: 0,
    files: [
      {
        path: "sandbox.yaml",
        language: "yaml",
        content: `# ${profile.name} — sandbox limits
timeout: 90s
network: deny-all + allow exa,firecrawl
cpu: 1
memory: 1Gi
`,
      },
    ],
  };
}
