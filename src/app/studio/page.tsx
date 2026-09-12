import { StudioApp } from "@/components/studio-app";
import { StudioPersistProvider } from "@/lib/persist/studio-persist";
import { Suspense } from "react";

export default function StudioPage() {
  return (
    <StudioPersistProvider>
      <Suspense
        fallback={
          <div className="flex min-h-full items-center justify-center text-sm text-muted-foreground">
            Studio…
          </div>
        }
      >
        <StudioApp />
      </Suspense>
    </StudioPersistProvider>
  );
}
