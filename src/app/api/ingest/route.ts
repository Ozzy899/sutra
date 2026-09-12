import { normalizeExperience } from "@/lib/agent/experience";
import { ingestDossier } from "@/lib/agent/ingest";
import { SourceParseError, textFromSource, MAX_SOURCE_BYTES } from "@/lib/parse-source";
import { sanitizePhotoDataUrl } from "@/lib/photo";
import type { Profile } from "@/lib/types";

export const runtime = "nodejs";

function asProfile(raw: unknown): Partial<Profile> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const p = raw as Partial<Profile>;
  const photoDataUrl = sanitizePhotoDataUrl(p.photoDataUrl);
  return {
    ...p,
    skills: Array.isArray(p.skills)
      ? p.skills.map((s) => String(s).trim()).filter(Boolean)
      : undefined,
    languages: Array.isArray(p.languages)
      ? p.languages.map((s) => String(s).trim()).filter(Boolean)
      : undefined,
    tools: Array.isArray(p.tools)
      ? p.tools.map((s) => String(s).trim()).filter(Boolean)
      : undefined,
    years: typeof p.years === "number" ? p.years : Number(p.years) || undefined,
    bio: typeof p.bio === "string" ? p.bio : undefined,
    experience: normalizeExperience(p.experience),
    ...(photoDataUrl ? { photoDataUrl } : {}),
  };
}

async function readFilePart(file: File): Promise<{ text: string } | { error: string; status: number }> {
  if (file.size > MAX_SOURCE_BYTES) {
    return { error: "That file is too large. Try a smaller PDF or a text export.", status: 413 };
  }
  const buf = new Uint8Array(await file.arrayBuffer());
  try {
    const text = await textFromSource(buf, file.name || "cv", file.type || "");
    return { text };
  } catch (error) {
    if (error instanceof SourceParseError) {
      return { error: error.message, status: error.code === "size" ? 413 : 422 };
    }
    return { error: "Could not read that PDF. Try exporting as text, or paste into bio.", status: 422 };
  }
}

export async function POST(req: Request) {
  try {
    const ctype = req.headers.get("content-type") || "";
    let cvText: string | undefined;
    let base: Partial<Profile> | undefined;

    if (ctype.includes("multipart/form-data")) {
      const form = await req.formData();
      const profileRaw = form.get("profile");
      if (typeof profileRaw === "string" && profileRaw.trim()) {
        try {
          base = asProfile(JSON.parse(profileRaw) as unknown);
        } catch {
          base = undefined;
        }
      }
      const file = form.get("file");
      if (file instanceof File && file.size > 0) {
        const parsed = await readFilePart(file);
        if ("error" in parsed) {
          return Response.json({ error: parsed.error }, { status: parsed.status });
        }
        cvText = parsed.text;
      }
    } else {
      const body = (await req.json()) as {
        cvText?: string;
        profile?: unknown;
      };
      cvText = body.cvText;
      base = asProfile(body.profile);
    }

    const result = await ingestDossier({ cvText, base });
    if (!result.ok) {
      return Response.json(
        { error: result.error, warnings: result.warnings },
        { status: 422 },
      );
    }
    return Response.json({
      profile: result.profile,
      warnings: result.warnings,
    });
  } catch {
    return Response.json({ error: "Could not read that file. Try again." }, { status: 400 });
  }
}
