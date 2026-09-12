/** Drop LinkedIn people pages and other personal-profile hits from Market. */

type Jobish = { title?: string; url?: string; snippet?: string; company?: string };

const JOB_TITLE_HINT =
  /\b(engineer|developer|designer|manager|director|analyst|intern|scientist|recruiter|hiring|opening|position|jobs?|career|posao|sre|staff|principal|founding|product|backend|frontend|full[- ]stack)\b/i;

function parseUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function linkedInHost(hostname: string): boolean {
  const host = hostname.replace(/^www\./i, "").toLowerCase();
  return host === "linkedin.com" || host.endsWith(".linkedin.com") || host === "lnkd.in";
}

function pathAndQuery(u: URL): string {
  return `${u.pathname}${u.search}`.toLowerCase();
}

/** Real job posts on LinkedIn: /jobs/view, /jobs/search, /jobs/collections, company /jobs. */
export function isLinkedInJobListingUrl(url: string): boolean {
  const u = parseUrl(url);
  if (!u || !linkedInHost(u.hostname)) return false;
  return /\/jobs(?:\/|$|\?)/.test(pathAndQuery(u));
}

/** People / profile URLs — never job listings. */
export function isLinkedInProfileUrl(url: string): boolean {
  const u = parseUrl(url);
  if (!u) {
    return /linkedin\.com\/(?:in|pub|mwlite\/in)\b/i.test(url) || /lnkd\.in\//i.test(url);
  }
  const host = u.hostname.replace(/^www\./i, "").toLowerCase();
  if (host === "lnkd.in") return true;
  if (!linkedInHost(u.hostname)) return false;
  if (isLinkedInJobListingUrl(url)) return false;

  const path = u.pathname.toLowerCase();
  const pq = pathAndQuery(u);
  return (
    /(?:^|\/)in(?:\/|$)/.test(path) ||
    /(?:^|\/)pub(?:\/|$)/.test(path) ||
    /\/mwlite\/in(?:\/|$)/.test(path) ||
    /\/mwlite\/profile\b/.test(path) ||
    /\/profile\/view\b/.test(pq) ||
    /\/talent\/profile\b/.test(path) ||
    /\/sales\/people\b/.test(path) ||
    /\/people\/[a-z0-9]/.test(path) ||
    /[?&]trk=public_profile/.test(pq)
  );
}

function firstSegment(title: string): string {
  return (
    title
      .split(/\s*[|·•]\s*/)[0]
      ?.replace(/\s+[-–—]\s+.+$/, "")
      .trim() ?? ""
  );
}

function looksLikePersonName(title: string): boolean {
  const head = firstSegment(title);
  if (!head || JOB_TITLE_HINT.test(head)) return false;
  return /^[A-ZÀ-Ÿ][\p{L}'’.-]+(?:\s+[A-ZÀ-Ÿ][\p{L}'’.-]+){1,3}$/u.test(head);
}

function titleLooksLikeLinkedInProfile(title: string): boolean {
  const t = title.trim();
  if (/\blinkedin\s+profile\b/i.test(t)) return true;
  if (/\bview .{0,40}profile\b/i.test(t)) return true;
  if (/\bpeople also viewed\b/i.test(t)) return true;
  if (/\| LinkedIn\s*$/i.test(t) && looksLikePersonName(t)) return true;
  if (looksLikePersonName(t) && /\blinkedin\b/i.test(t)) return true;
  // “Ada Lovelace - Software Engineer - Acme | LinkedIn”
  if (
    /\| LinkedIn\s*$/i.test(t) &&
    /^[A-ZÀ-Ÿ][\p{L}'’.-]+(?:\s+[A-ZÀ-Ÿ][\p{L}'’.-]+){1,3}\s+[-–—]/u.test(t)
  ) {
    return true;
  }
  return false;
}

/** True when the hit is a person page, not a job posting. */
export function isPersonalProfileResult(hit: Jobish): boolean {
  const url = (hit.url || "").trim();
  const title = (hit.title || "").trim();

  if (isLinkedInJobListingUrl(url)) return false;
  if (isLinkedInProfileUrl(url)) return true;
  if (/linkedin\.com\/(?:in|pub|mwlite\/in)\b/i.test(`${title} ${url}`)) return true;

  const parsed = parseUrl(url);
  if (parsed && linkedInHost(parsed.hostname) && !isLinkedInJobListingUrl(url)) {
    if (titleLooksLikeLinkedInProfile(title) || looksLikePersonName(title)) return true;
  }
  if (titleLooksLikeLinkedInProfile(title) && /linkedin/i.test(`${title} ${url}`)) return true;
  return false;
}

export function isMarketJobResult(hit: Jobish): boolean {
  return !isPersonalProfileResult(hit);
}

export function filterMarketJobs<T extends Jobish>(jobs: T[]): T[] {
  return jobs.filter(isMarketJobResult);
}
