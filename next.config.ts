import type { NextConfig } from "next";

const AKITA = "https://energized-akita-832.eu-west-1.convex.cloud";
const STALE_CIVET = "https://keen-civet-455.eu-west-1.convex.cloud";

/** Always bake a Convex URL into the client. Empty or the old civet preview → Akita. */
function nextPublicConvexUrl(): string {
  const raw = process.env.NEXT_PUBLIC_CONVEX_URL?.trim().replace(/\/$/, "");
  if (!raw || raw === STALE_CIVET) return AKITA;
  return raw;
}

const nextConfig: NextConfig = {
  serverExternalPackages: ["@daytona/sdk", "pdf-parse", "pdfjs-dist", "pdf-lib", "@pdf-lib/fontkit"],
  env: {
    NEXT_PUBLIC_CONVEX_URL: nextPublicConvexUrl(),
  },
};

export default nextConfig;
