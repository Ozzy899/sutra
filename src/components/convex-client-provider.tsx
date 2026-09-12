"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { convexPublicUrl } from "@/lib/persist/session";
import { type ReactNode, useMemo } from "react";

/**
 * Official App Router pattern: ConvexReactClient + ConvexProvider.
 * URL comes from next.config + convexPublicUrl (Akita if env is empty/civet).
 */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const url = convexPublicUrl();
  const client = useMemo(() => (url ? new ConvexReactClient(url) : null), [url]);
  if (!client) return children;
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
