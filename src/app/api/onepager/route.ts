import { hasParseableExperience } from "@/lib/agent/experience";
import { composeOnePager, type OnePagerRequest } from "@/lib/onepager/compose";
import { sanitizePhotoDataUrl } from "@/lib/photo";
import { renderOnePagerPdf } from "@/lib/onepager/pdf";
import { tailorForJob } from "@/lib/onepager/tailor";
import type { JobListing, Profile } from "@/lib/types";

export const runtime = "nodejs";

function slug(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function POST(req: Request) {
  let body: OnePagerRequest;
  try {
    body = (await req.json()) as OnePagerRequest;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const job = body.job;
  const profile = body.profile;
  if (!isJob(job) || !isProfile(profile)) {
    return Response.json(
      {
        error:
          "Need a job listing and a CV with your full work history. Upload a CV, run agents, then open a tailored CV from a card.",
      },
      { status: 400 },
    );
  }

  const photoDataUrl = sanitizePhotoDataUrl(profile.photoDataUrl);
  const dossier: Profile = {
    ...profile,
    ...(photoDataUrl ? { photoDataUrl } : { photoDataUrl: undefined }),
  };

  try {
    const tailored = await tailorForJob(dossier, job);
    const payload: OnePagerRequest = { job, profile: dossier, tailored };
    composeOnePager(payload);
    const pdf = await renderOnePagerPdf(payload);
    const name = slug(payload.profile.name) || "applicant";
    const company = slug(payload.job.company) || "role";
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${name}-${company}-cv.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[onepager]", error);
    return Response.json({ error: "Could not build that CV. Try again after a completed run." }, { status: 500 });
  }
}

function isJob(job: JobListing | undefined): job is JobListing {
  return Boolean(job && job.title?.trim() && job.company?.trim());
}

function isProfile(profile: Profile | undefined): profile is Profile {
  return Boolean(
    profile &&
      profile.name?.trim() &&
      profile.lastRole?.trim() &&
      hasParseableExperience(profile),
  );
}
