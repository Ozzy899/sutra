export const SESSION_STORAGE_KEY = "sutra.sessionId";
export const STUDIO_STORAGE_KEY = "sutra.studio.v1";

/** Production Convex deployment with `studio:*` functions. */
export const AKITA_CONVEX_URL =
  "https://energized-akita-832.eu-west-1.convex.cloud";

/** Stale preview host. Process env often still has this and it wins over `.env.local`. */
const STALE_CIVET_CONVEX_URL =
  "https://keen-civet-455.eu-west-1.convex.cloud";

/** Always Akita when env is empty or the stale civet preview. */
export function convexPublicUrl(): string {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim().replace(/\/$/, "");
  if (!url || url === STALE_CIVET_CONVEX_URL) return AKITA_CONVEX_URL;
  if (!/^https?:\/\//i.test(url)) return AKITA_CONVEX_URL;
  return url;
}

export function isConvexConfigured(): boolean {
  return Boolean(convexPublicUrl());
}

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY)?.trim();
    if (existing && existing.length <= 80) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(SESSION_STORAGE_KEY, id);
    return id;
  } catch {
    return `mem_${Date.now().toString(36)}`;
  }
}
