import { writeFile } from "fs/promises";
import { MARKET } from "../src/lib/data/jobs";
import { PRESETS } from "../src/lib/data/presets";
import { composeOnePager } from "../src/lib/onepager/compose";
import { renderOnePagerPdf } from "../src/lib/onepager/pdf";
import { localTailor, tailorForJob } from "../src/lib/onepager/tailor";
import type { JobListing } from "../src/lib/types";

const listing = MARKET.find((j) => j.id === "htec-platform") ?? MARKET[0];
const job: JobListing = {
  ...listing,
  why: listing.snippet,
  fit: 0,
  crawledMarkdown: "",
};
const profile = PRESETS.ana;

async function main() {
  const local = localTailor(profile, job);
  const tailored = await tailorForJob(profile, job);
  const usedGrok = JSON.stringify(local) !== JSON.stringify(tailored);
  const model = composeOnePager({ job, profile, tailored });
  const pdf = await renderOnePagerPdf({ job, profile, tailored });
  const out = "/tmp/ana-htec-cv.pdf";
  await writeFile(out, pdf);
  console.log(JSON.stringify({ usedGrok, out, bytes: pdf.length, model, tailored }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
