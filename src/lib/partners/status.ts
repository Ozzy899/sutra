import { getSecret } from "@/lib/partners/keys";

export { adapterLive } from "@/lib/partners/keys";

export async function grokComplete(prompt: string, fallback: string): Promise<string> {
  const key = await getSecret("XAI_API_KEY");
  if (!key) return fallback;
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-4",
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "You are Sutra, a practical career coach for job searchers. English. Second person. Short sentences. No corporate sludge. Tell them which role to chase and what to send or say on Monday.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) return fallback;
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return json.choices?.[0]?.message?.content?.trim() || fallback;
  } catch {
    return fallback;
  }
}
