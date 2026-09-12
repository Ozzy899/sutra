import { buildProof } from "@/lib/agent/proof";
import { scoreFit } from "@/lib/agent/match";
import { familyLabel, jobFamily, profileFamily } from "@/lib/agent/role";
import { runDaytonaMatch } from "@/lib/partners/daytona";
import type { JobListing, Profile, ProofOfWork } from "@/lib/types";

export type SandboxResult = {
  bootMs: number;
  logs: string[];
  proof: ProofOfWork;
  scored: JobListing[];
};

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function scoreLocal(profile: Profile, jobs: JobListing[]) {
  return jobs
    .map((job) => ({ ...job, fit: scoreFit(profile, job) }))
    .sort((a, b) => b.fit - a.fit);
}

export async function runSandbox(
  profile: Profile,
  jobs: JobListing[],
  onLog: (line: string) => void,
): Promise<SandboxResult> {
  const started = Date.now();
  const localScored = scoreLocal(profile, jobs);
  const proof = buildProof(profile, localScored[0]);

  const live = await runDaytonaMatch(profile, localScored, proof, onLog);
  if (live) {
    return {
      bootMs: live.bootMs,
      logs: [],
      proof: live.proof,
      scored: live.scored,
    };
  }

  const slug = profile.name.split(" ")[0].toLowerCase() || "builder";
  onLog(`[sandbox] boot workspace ${slug}-reset`);
  await delay(80);
  onLog(`[sandbox] $ match --family ${profileFamily(profile)}`);
  for (const job of localScored) {
    onLog(
      `[match] me=${familyLabel(profileFamily(profile)).padEnd(10)} job=${familyLabel(jobFamily(job)).padEnd(10)} fit=${job.fit.toFixed(2)}  ${job.title}`,
    );
  }
  onLog(`[sandbox] $ codegen --target "${localScored[0]?.title ?? "role"}"`);
  for (const file of proof.files) {
    onLog(`[write] ${file.path}`);
  }
  const bootMs = Date.now() - started;
  onLog(`[sandbox] local ${bootMs}ms`);
  return { bootMs, logs: [], proof: { ...proof, bootMs }, scored: localScored };
}
