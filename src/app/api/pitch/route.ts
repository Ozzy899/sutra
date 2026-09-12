import { coachPitch } from "@/lib/agent/pitch";
import type { Profile } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { profile?: Profile; answer?: string };
    if (!body.profile || !body.answer?.trim()) {
      return Response.json({ error: "Need your file and an intro to score." }, { status: 400 });
    }
    const feedback = await coachPitch(body.profile, body.answer.trim());
    return Response.json(feedback);
  } catch {
    return Response.json({ error: "Could not score that. Try again." }, { status: 500 });
  }
}
