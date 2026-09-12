import { ingestDossier } from "@/lib/agent/ingest";
import { hasParseableExperience } from "@/lib/agent/experience";
import { orchestrate } from "@/lib/agent/orchestrate";
import { sanitizePhotoDataUrl } from "@/lib/photo";
import type { Profile } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let profile: Profile;
  try {
    const body = (await req.json()) as {
      profile?: Profile;
      cvText?: string;
    };
    if (!body.profile?.name || !body.profile.lastRole) {
      return Response.json({ error: "Name and last role are required." }, { status: 400 });
    }
    const photoDataUrl = sanitizePhotoDataUrl(body.profile.photoDataUrl);
    profile = {
      ...body.profile,
      skills: (body.profile.skills ?? []).map((s) => s.trim()).filter(Boolean),
      languages: (body.profile.languages ?? []).map((s) => s.trim()).filter(Boolean),
      tools: (body.profile.tools ?? []).map((s) => s.trim()).filter(Boolean),
      years: Number(body.profile.years) || 1,
      bio: body.profile.bio?.trim() || body.profile.lastRole,
      experience: Array.isArray(body.profile.experience) ? body.profile.experience : [],
      ...(photoDataUrl ? { photoDataUrl } : { photoDataUrl: undefined }),
    };
    // Optional extra source: fill empty bio/skills if the form already has name+role.
    if (body.cvText?.trim()) {
      try {
        const extra = await ingestDossier({
          cvText: body.cvText,
          base: profile,
        });
        if (extra.ok) {
          profile = {
            ...profile,
            ...extra.profile,
            skills: profile.skills.length ? profile.skills : extra.profile.skills,
            languages: profile.languages.length ? profile.languages : extra.profile.languages,
            tools: profile.tools.length ? profile.tools : extra.profile.tools,
            bio:
              (body.profile.bio?.trim() ? profile.bio : extra.profile.bio) || profile.lastRole,
            lastCompany: profile.lastCompany.trim()
              ? profile.lastCompany
              : extra.profile.lastCompany,
            experience: extra.profile.experience.length
              ? extra.profile.experience
              : profile.experience,
          };
        }
      } catch {
        /* typed name+role still need a parsed CV */
      }
    }
    if (!hasParseableExperience(profile)) {
      return Response.json(
        { error: "Upload a CV with your work history first. We rewrite every role onto one page for each job." },
        { status: 400 },
      );
    }
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        await orchestrate(profile, send);
      } catch (error) {
        send({
          type: "error",
          message: error instanceof Error ? error.message : "Something broke. Try Run again.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
