import { promises as fs } from "fs";
import path from "path";
import type { PartnerTool } from "@/lib/types";

export type KeyId = "XAI_API_KEY" | "EXA_API_KEY" | "FIRECRAWL_API_KEY" | "DAYTONA_API_KEY";

const FILE = path.join(process.cwd(), ".sutra-keys.json");

function fromEnv(): Partial<Record<KeyId, string>> {
  return {
    XAI_API_KEY: process.env.XAI_API_KEY,
    EXA_API_KEY: process.env.EXA_API_KEY,
    FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
    DAYTONA_API_KEY: process.env.DAYTONA_API_KEY,
  };
}

function compact(input: Partial<Record<KeyId, string>>): Partial<Record<KeyId, string>> {
  const out: Partial<Record<KeyId, string>> = {};
  for (const [key, value] of Object.entries(input) as [KeyId, string | undefined][]) {
    if (value?.trim()) out[key] = value.trim();
  }
  return out;
}

async function fromFile(): Promise<Partial<Record<KeyId, string>>> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return compact(JSON.parse(raw) as Partial<Record<KeyId, string>>);
  } catch {
    return {};
  }
}

export async function getSecret(id: KeyId): Promise<string | undefined> {
  const store =
    process.env.RENDER || process.env.VERCEL
      ? compact(fromEnv())
      : { ...compact(await fromFile()), ...compact(fromEnv()) };
  return store[id];
}

export async function adapterLive(): Promise<Record<PartnerTool, boolean>> {
  return {
    grok: Boolean(await getSecret("XAI_API_KEY")),
    exa: Boolean(await getSecret("EXA_API_KEY")),
    firecrawl: Boolean(await getSecret("FIRECRAWL_API_KEY")),
    daytona: Boolean(await getSecret("DAYTONA_API_KEY")),
  };
}
