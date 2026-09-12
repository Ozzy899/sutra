import type { JobListing } from "@/lib/types";
import { listingMarkdown, MARKET } from "@/lib/data/jobs";
import { filterMarketJobs } from "@/lib/partners/job-result";
import { getSecret } from "@/lib/partners/keys";

export async function crawlSources(jobs: JobListing[]): Promise<Map<string, string>> {
  const key = await getSecret("FIRECRAWL_API_KEY");
  const out = new Map<string, string>();
  jobs = filterMarketJobs(jobs);

  if (key) {
    await Promise.all(
      jobs.slice(0, 4).map(async (job) => {
        if (!job.url.startsWith("http")) return;
        try {
          const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ url: job.url, formats: ["markdown"] }),
          });
          if (!res.ok) return;
          const json = (await res.json()) as {
            data?: { markdown?: string };
            markdown?: string;
          };
          const md = json.data?.markdown || json.markdown;
          if (md) out.set(job.id, md.slice(0, 4000));
        } catch {
          /* keep snippet */
        }
      }),
    );
  }

  for (const job of jobs) {
    if (out.has(job.id)) continue;
    const canned = MARKET.find((j) => j.id === job.id);
    out.set(job.id, canned ? listingMarkdown(canned) : `# ${job.title}\n\n${job.snippet}`);
  }
  return out;
}
