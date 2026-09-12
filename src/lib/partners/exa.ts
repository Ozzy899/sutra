import { rankMarket } from "@/lib/partners/market-rank";
import { getSecret } from "@/lib/partners/keys";
import { profileFamily } from "@/lib/agent/role";
import { isMarketJobResult } from "@/lib/partners/job-result";
import type { JobListing, Profile } from "@/lib/types";

export type ExaHit = JobListing;

type ExaResult = {
  title?: string;
  url?: string;
  text?: string;
  author?: string;
  publishedDate?: string;
};

function jobIdFromUrl(url: string): string {
  const safe = url.replace(/[^a-z0-9]+/gi, "-").slice(0, 48);
  return `exa-${safe || "hit"}`;
}

function extractCity(text: string): string {
  const m = text.match(
    /San Francisco|New York|NYC|Austin|Seattle|Chicago|Denver|Boston|Los Angeles|Remote US|United States|Novi Sad|Beograd|Belgrade|Niš|Nis|Remote(?: EU)?|Serbia|Srbija/i,
  );
  if (!m) return "—";
  const v = m[0].toLowerCase();
  if (v.includes("novi")) return "Novi Sad";
  if (v.includes("belgrade") || v.includes("beograd")) return "Beograd";
  if (v === "nis" || v === "niš") return "Niš";
  if (v.includes("remote us") || v.includes("united states")) return "Remote US";
  if (v === "nyc" || v.includes("new york")) return "New York";
  if (v.includes("san francisco")) return "San Francisco";
  if (v.includes("los angeles")) return "Los Angeles";
  if (v.includes("remote")) return "Remote";
  return m[0];
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ");
}

function prettyHost(stem: string): string {
  return stem.charAt(0).toUpperCase() + stem.slice(1);
}

function extractCompany(title: string, url: string, author?: string): string {
  const at = title.match(/\bat\s+([^|·,]+)/i);
  if (at?.[1]) return at[1].replace(/\s*[|\-–].*$/, "").trim();
  if (author?.trim()) return author.trim();
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const parts = host.split(".");
    if (parts[0] && /^(careers|jobs|job|hiring|boards)$/i.test(parts[0]) && parts[1]) {
      return prettyHost(parts[1]);
    }
    return prettyHost(parts[0] ?? host);
  } catch {
    return "—";
  }
}

function extractTitle(raw: string): string {
  const first = (raw.split(/\s*[|·]\s*/)[0] ?? raw).trim();
  return first
    .replace(/\s+at\s+.+$/i, "")
    .replace(
      /\s+in\s+(Belgrade|Beograd|Serbia|Novi Sad|New York|San Francisco|Austin|Seattle|United States).*$/i,
      "",
    )
    .trim() || raw;
}

function extractSalary(text: string): string {
  const m = text.match(/(?:€|EUR|\$|USD)\s?[\d.,]+\s*(?:[–\-]\s*(?:€|EUR|\$)?\s?[\d.,]+)?\s*(?:k|K)?/);
  return m ? m[0].replace(/\s+/g, " ") : "—";
}

function extractStack(text: string): string[] {
  const known = [
    "TypeScript",
    "JavaScript",
    "React",
    "Node.js",
    "NestJS",
    "Python",
    "Java",
    "AWS",
    "Kubernetes",
    "Figma",
    "SQL",
    "Go",
    "Swift",
  ];
  return known.filter((k) => new RegExp(k.replace(".", "\\."), "i").test(text)).slice(0, 4);
}

function looksLikeJob(title: string, url: string, text: string): boolean {
  if (!isMarketJobResult({ title, url, snippet: text })) return false;
  const blob = `${title} ${url} ${text}`;
  if (/\/(blog|news|about|privacy)\b/i.test(url) && !/job|career|posao|hiring/i.test(blob)) {
    return false;
  }
  return /engineer|manager|lead|designer|developer|analyst|sre|intern|hiring|job|career|posao|recruit|opening/i.test(
    blob,
  );
}

function toListing(r: ExaResult): JobListing | null {
  const url = (r.url || "").trim();
  const rawTitle = decodeEntities((r.title || "").trim());
  if (!url || !rawTitle) return null;
  const text = r.text || "";
  if (!isMarketJobResult({ title: rawTitle, url, snippet: text, company: r.author })) return null;
  if (!looksLikeJob(rawTitle, url, text)) return null;
  const title = extractTitle(rawTitle);
  const highlight = (text || rawTitle).replace(/\s+/g, " ").slice(0, 280);
  return {
    id: jobIdFromUrl(url),
    title,
    company: extractCompany(rawTitle, url, r.author),
    city: extractCity(`${rawTitle} ${text}`),
    stack: extractStack(`${rawTitle} ${text}`),
    salary: extractSalary(text),
    source: "Exa",
    url,
    snippet: highlight,
    crawledMarkdown: "",
    why: "",
    fit: 0,
  };
}

function searchQuery(profile: Profile): string {
  const family = profileFamily(profile);
  const lane = family === "general" ? "" : family;
  if (profile.target === "us_market") {
    return [
      profile.lastRole,
      profile.skills.slice(0, 3).join(" "),
      lane,
      "jobs hiring careers openings",
      "United States USA Remote US",
      "New York San Francisco Austin Seattle Chicago Denver",
      "LinkedIn Greenhouse Lever Ashby Indeed",
    ]
      .filter(Boolean)
      .join(" ");
  }
  return [
    profile.lastRole,
    profile.skills.slice(0, 3).join(" "),
    lane,
    "jobs hiring posao careers",
    profile.city,
    "Belgrade Beograd Serbia Remote",
  ]
    .filter(Boolean)
    .join(" ");
}

export async function searchMarket(profile: Profile): Promise<JobListing[]> {
  const key = await getSecret("EXA_API_KEY");
  if (key) {
    try {
      const res = await fetch("https://api.exa.ai/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
        },
        body: JSON.stringify({
          query: searchQuery(profile),
          numResults: 12,
          type: "auto",
          contents: { text: { maxCharacters: 1200 } },
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as { results?: ExaResult[] };
        const seen = new Set<string>();
        const listings: JobListing[] = [];
        for (const r of json.results ?? []) {
          const job = toListing(r);
          if (!job || !isMarketJobResult(job) || seen.has(job.url)) continue;
          seen.add(job.url);
          listings.push(job);
          if (listings.length >= 6) break;
        }
        if (listings.length) return listings;
      }
    } catch {
      // curated fallback
    }
  }

  return rankMarket(profile)
    .slice(0, 4)
    .map(({ job }) => ({
      ...job,
      crawledMarkdown: "",
      why: "",
      fit: 0,
    }))
    .filter(isMarketJobResult);
}
