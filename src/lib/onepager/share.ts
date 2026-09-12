import type { JobListing, Profile } from "@/lib/types";

function clip(s: string, n: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
}

export function isHttpsUrl(raw: string | undefined): raw is string {
  if (!raw) return false;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && !u.username && !u.password;
  } catch {
    return false;
  }
}

export function listingHttpsUrl(job: JobListing): string | undefined {
  return isHttpsUrl(job.url) ? job.url : undefined;
}

export function onePagerFilename(profile: Profile, job: JobListing): string {
  const name = slug(profile.name) || "applicant";
  const company = slug(job.company) || "role";
  return `${name}-${company}-cv.pdf`;
}

function slug(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

/** Text for the native share sheet. It does not attach the PDF unless the OS file share path succeeds. */
export function onePagerShareText(profile: Profile, job: JobListing): string {
  const listing = listingHttpsUrl(job);
  const lines = [
    `Hi — I'm ${profile.name}. Applying for ${job.title} at ${job.company}.`,
    clip(job.why || job.snippet, 220),
    "I have a one-page CV tailored to this listing. This share cannot attach the PDF — I'll send the file separately.",
  ];
  if (listing) lines.push(`Listing: ${listing}`);
  return lines.join("\n");
}

export function onePagerGmailSubject(profile: Profile, job: JobListing): string {
  return `Application: ${job.title} — ${profile.name}`;
}

export function onePagerGmailBody(profile: Profile, job: JobListing): string {
  const listing = listingHttpsUrl(job);
  const lines = [
    `Hello ${job.company} hiring team,`,
    ``,
    `I'm ${profile.name}. Please find my CV for ${job.title} at ${job.company} attached.`,
    `(This compose link cannot attach files — attach the PDF you just saved from Studio.)`,
  ];
  if (listing) {
    lines.push(``);
    lines.push(`Listing: ${listing}`);
  }
  lines.push(``);
  lines.push(`Thank you,`);
  lines.push(profile.name);
  return lines.join("\n");
}

export function gmailComposeUrl(subject: string, body: string): string {
  return `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function mailtoComposeUrl(subject: string, body: string): string {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function onePagerShareTitle(profile: Profile, job: JobListing): string {
  return `${profile.name} — ${job.title} at ${job.company}`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4_000);
}

export type ShareFileOutcome = "shared" | "copied" | "copied-and-downloaded" | "downloaded";

export async function shareOnePagerPdf(
  blob: Blob,
  profile: Profile,
  job: JobListing,
): Promise<ShareFileOutcome> {
  const filename = onePagerFilename(profile, job);
  const text = onePagerShareText(profile, job);
  const title = onePagerShareTitle(profile, job);
  const file = new File([blob], filename, { type: "application/pdf" });
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };

  if (typeof nav.share === "function") {
    const withFile: ShareData = { files: [file], title, text };
    const canFiles = typeof nav.canShare === "function" ? nav.canShare(withFile) : false;
    try {
      if (canFiles) {
        await nav.share(withFile);
        return "shared";
      }
      await nav.share({ title, text });
      downloadBlob(blob, filename);
      return "copied-and-downloaded";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    downloadBlob(blob, filename);
    return "copied-and-downloaded";
  } catch {
    downloadBlob(blob, filename);
    return "downloaded";
  }
}
