import type { Sandbox } from "@daytona/sdk";
import type { JobListing, Profile, ProofOfWork } from "@/lib/types";
import { getSecret } from "@/lib/partners/keys";

export type DaytonaRun = {
  bootMs: number;
  logs: string[];
  scored: JobListing[];
  proof: ProofOfWork;
};

const MATCH_JS = `const fs = require("fs");
const payload = JSON.parse(fs.readFileSync("payload.json", "utf8"));
const role = String(payload.profile.lastRole || "").toLowerCase();
const skills = (payload.profile.skills || []).map((s) => String(s).toLowerCase());
const words = role.split(/[^a-z0-9+#]+/).filter((w) => w.length > 3);
const scored = payload.jobs.map((job) => {
  const hay = (job.title + " " + job.company + " " + (job.snippet || "")).toLowerCase();
  const titleHits = words.length ? words.filter((w) => hay.includes(w)).length / words.length : 0;
  const skillHits = skills.length ? skills.filter((s) => hay.includes(s)).length / skills.length : 0;
  const fit = Math.max(0.12, Math.min(0.97, titleHits * 0.65 + skillHits * 0.35));
  return { id: job.id, fit: Number(fit.toFixed(3)), title: job.title };
});
scored.sort((a, b) => b.fit - a.fit);
console.log("SUTRA_JSON " + JSON.stringify({ scored }));
`;

function errText(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function runDaytonaMatch(
  profile: Profile,
  jobs: JobListing[],
  proof: ProofOfWork,
  onLog: (line: string) => void,
): Promise<DaytonaRun | null> {
  const apiKey = await getSecret("DAYTONA_API_KEY");
  if (!apiKey) {
    onLog("[daytona] no DAYTONA_API_KEY — local executor");
    return null;
  }

  onLog("[daytona] creating isolated sandbox");
  const started = Date.now();
  let sandbox: Sandbox | null = null;
  try {
    const { Daytona } = await import("@daytona/sdk");
    const daytona = new Daytona({ apiKey, apiUrl: "https://app.daytona.io/api" });
    const created = await daytona.create(
      {
        language: "javascript",
        ephemeral: true,
        labels: { app: "sutra", purpose: "career-reset-match" },
      },
      { timeout: 90 },
    );
    sandbox = created;
    onLog(`[daytona] sandbox ${created.id ?? "ready"}`);

    const payload = Buffer.from(JSON.stringify({ profile, jobs }));
    await created.fs.uploadFile(payload, "payload.json");
    await created.fs.uploadFile(Buffer.from(MATCH_JS), "match.js");
    for (const file of proof.files) {
      const dest = file.path.split("/").join("_");
      await created.fs.uploadFile(Buffer.from(file.content), dest);
      onLog(`[daytona] wrote ${file.path}`);
    }

    const match = await created.process.executeCommand("node match.js", undefined, undefined, 30);
    onLog(`[daytona] $ node match.js  exit=${match.exitCode}`);
    const stdout = match.result || match.artifacts?.stdout || "";
    for (const line of stdout.trim().split("\n").slice(-8)) {
      if (line) onLog(`[daytona] ${line.slice(0, 240)}`);
    }

    const jsonLine = stdout
      .split("\n")
      .reverse()
      .find((l) => l.includes("SUTRA_JSON"));
    const parsed = jsonLine
      ? (JSON.parse(jsonLine.replace(/^.*SUTRA_JSON\s*/, "")) as {
          scored: { id: string; fit: number }[];
        })
      : null;

    const byId = new Map((parsed?.scored ?? []).map((row) => [row.id, row.fit]));
    const scored = jobs
      .map((job) => ({ ...job, fit: byId.get(job.id) ?? job.fit }))
      .sort((a, b) => b.fit - a.fit);

    const test = await created.process.executeCommand(
      `node -e "console.log('proof files', ${proof.files.length})"`,
      undefined,
      undefined,
      15,
    );
    onLog(`[daytona] $ test  ${test.result?.trim() || "ok"}`);

    await daytona.delete(created, 60, true);
    sandbox = null;
    const bootMs = Date.now() - started;
    onLog(`[daytona] deleted sandbox  ${bootMs}ms`);
    return { bootMs, logs: [], scored, proof: { ...proof, bootMs } };
  } catch (error) {
    const message = errText(error);
    console.error("[daytona] live sandbox failed — keeping local executor:", message);
    onLog(`[daytona] failed (${message}) — local executor`);
    if (sandbox?.delete) {
      try {
        await sandbox.delete(30, false);
        onLog("[daytona] deleted leftover sandbox after failure");
      } catch (cleanup) {
        console.error("[daytona] cleanup failed:", errText(cleanup));
      }
    }
    return null;
  }
}
