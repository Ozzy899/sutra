import type { JobListing } from "@/lib/types";

const SKIP =
  /noreply|no-reply|donotreply|notifications?@|sentry\.io|example\.com|github\.com|users\.noreply/i;

const HIRING = /^(jobs?|careers?|hr|talent|recruiting|people|hello|apply|work)@/i;

export function listingEmails(job: JobListing): string[] {
  const mailto = job.url.match(/^mailto:([^?]+)/i)?.[1];
  const blob = [mailto, job.url, job.snippet, job.crawledMarkdown, job.why]
    .filter(Boolean)
    .join("\n");
  const found = blob.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  const cleaned: string[] = [];
  const seen = new Set<string>();
  for (const raw of found) {
    const email = raw.toLowerCase();
    if (SKIP.test(email) || seen.has(email)) continue;
    seen.add(email);
    cleaned.push(email);
  }
  cleaned.sort((a, b) => Number(HIRING.test(b)) - Number(HIRING.test(a)));
  return cleaned;
}

export function emailDraft(job: JobListing, name: string): { to: string; subject: string; body: string } {
  const to = listingEmails(job)[0] ?? "";
  const subject = `Application: ${job.title} — ${name}`;
  const listing = job.url.startsWith("http") ? `Listing: ${job.url}\n` : "";
  const attach =
    "I am attaching a one-page CV tailored to this role. If it did not attach automatically, please use the PDF from the other browser tab — Save / Print.";
  const body = to
    ? `Hello ${job.company} hiring team,\n\n${attach}\n${listing}\nThank you,\n${name}\n`
    : `Hello,\n\nI could not find a public hiring email on this listing — paste the recipient above.\n\n${attach}\n${listing}\nThank you,\n${name}\n`;
  return { to, subject, body };
}

export function mailtoHref(job: JobListing, name: string): string {
  const { to, subject, body } = emailDraft(job, name);
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
