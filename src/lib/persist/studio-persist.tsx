"use client";

import { t } from "@/components/copy";
import { api } from "../../../convex/_generated/api";
import { readLocalSnapshot, recordLocalOnePager, writeLocalSnapshot } from "@/lib/persist/local";
import { getOrCreateSessionId, isConvexConfigured } from "@/lib/persist/session";
import {
  buildSnapshot,
  isProfile,
  mergePhotoUrl,
  snapshotHasWork,
  type OnePagerMeta,
  type StudioSnapshot,
} from "@/lib/persist/snapshot";
import type { Id } from "../../../convex/_generated/dataModel";
import { useMutation, useQuery_experimental } from "convex/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type PersistMode = "cloud" | "device";

type PersistApi = {
  mode: PersistMode;
  sessionId: string;
  ready: boolean;
  restored: StudioSnapshot | null;
  /** Job-seeker line when cloud load/save failed. Null when the last cloud op worked. */
  cloudError: string | null;
  save: (snap: Omit<StudioSnapshot, "sessionId" | "updatedAt">) => void;
  recordOnePager: (meta: Omit<OnePagerMeta, "generatedAt">) => void;
};

function humanizeCloudError(err: unknown, kind: "load" | "save"): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const lower = raw.toLowerCase();
  if (lower.includes("could not find public function")) {
    return t.savedCloudMissingFn;
  }
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("load failed") ||
    lower.includes("err_connection")
  ) {
    return t.savedCloudOffline;
  }
  return kind === "load" ? t.savedCloudLoadFail : t.savedCloudFail;
}

const PersistContext = createContext<PersistApi | null>(null);

export function useStudioPersist(): PersistApi {
  const ctx = useContext(PersistContext);
  if (!ctx) {
    throw new Error("useStudioPersist must be used under StudioPersistProvider");
  }
  return ctx;
}

function noopSubscribe() {
  return () => {
    /* sessionId is created once in getSnapshot */
  };
}

function useBrowserSessionId(): string {
  return useSyncExternalStore(noopSubscribe, getOrCreateSessionId, () => "");
}

function useLocalRestored(): StudioSnapshot | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => {
      const local = readLocalSnapshot();
      return local && snapshotHasWork(local) ? local : null;
    },
    () => null,
  );
}

export function StudioPersistProvider({ children }: { children: ReactNode }) {
  if (isConvexConfigured()) {
    return <CloudPersistProvider>{children}</CloudPersistProvider>;
  }
  return <DevicePersistProvider>{children}</DevicePersistProvider>;
}

function DevicePersistProvider({ children }: { children: ReactNode }) {
  const sessionId = useBrowserSessionId();
  const restored = useLocalRestored();
  const ready = sessionId !== "";

  const save = useCallback(
    (partial: Omit<StudioSnapshot, "sessionId" | "updatedAt">) => {
      const id = sessionId || getOrCreateSessionId();
      const snap = buildSnapshot({ ...partial, sessionId: id });
      if (!snapshotHasWork(snap) && snap.traces.length === 0 && snap.logs.length === 0) {
        return;
      }
      writeLocalSnapshot(snap);
    },
    [sessionId],
  );

  const recordOnePager = useCallback(
    (meta: Omit<OnePagerMeta, "generatedAt">) => {
      const id = sessionId || getOrCreateSessionId();
      recordLocalOnePager(id, { ...meta, generatedAt: Date.now() });
    },
    [sessionId],
  );

  const value = useMemo<PersistApi>(
    () => ({ mode: "device", sessionId, ready, restored, cloudError: null, save, recordOnePager }),
    [sessionId, ready, restored, save, recordOnePager],
  );

  return <PersistContext.Provider value={value}>{children}</PersistContext.Provider>;
}

function CloudPersistProvider({ children }: { children: ReactNode }) {
  const sessionId = useBrowserSessionId();
  const local = useLocalRestored();
  const remoteState = useQuery_experimental({
    query: api.studio.getBySession,
    args: sessionId ? { sessionId } : "skip",
  });
  const saveMutation = useMutation(api.studio.saveSnapshot);
  const uploadUrl = useMutation(api.studio.generatePhotoUploadUrl);
  const attachPhoto = useMutation(api.studio.attachPhoto);
  const recordMutation = useMutation(api.studio.recordOnePager);
  const [waited, setWaited] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setWaited(true), 2500);
    return () => window.clearTimeout(timer);
  }, []);

  const remote = remoteState.status === "success" ? remoteState.data : undefined;
  const loadError =
    remoteState.status === "error" ? humanizeCloudError(remoteState.error, "load") : null;

  const restored = useMemo(() => {
    if (!sessionId) return local;
    if (loadError) return local;
    if (remote === undefined && !waited) return local;
    if (remote === undefined || remote === null) return local;
    if (!isProfile(remote.profile)) return local;
    const fromCloud = buildSnapshot({
      sessionId,
      profile: mergePhotoUrl(remote.profile, remote.photoUrl),
      skillText: remote.skillText,
      traces: Array.isArray(remote.traces) ? remote.traces : [],
      logs: Array.isArray(remote.logs) ? remote.logs : [],
      jobs: Array.isArray(remote.jobs) ? remote.jobs : [],
      proof: remote.proof ?? null,
      plan: remote.plan ?? null,
      pitch: remote.pitch ?? null,
      summary: remote.summary ?? null,
      onePagers: Array.isArray(remote.onePagers) ? remote.onePagers : [],
      updatedAt: remote.updatedAt,
    });
    if (local && local.updatedAt > fromCloud.updatedAt) return local;
    return snapshotHasWork(fromCloud) ? fromCloud : local;
  }, [loadError, local, remote, sessionId, waited]);

  const ready =
    Boolean(sessionId) && (remoteState.status !== "pending" || waited || local !== null);

  const cloudError = loadError ?? saveError;

  const save = useCallback(
    (partial: Omit<StudioSnapshot, "sessionId" | "updatedAt">) => {
      const id = sessionId || getOrCreateSessionId();
      const snap = buildSnapshot({ ...partial, sessionId: id });
      if (!snapshotHasWork(snap) && snap.traces.length === 0 && snap.logs.length === 0) {
        return;
      }
      writeLocalSnapshot(snap);
      const photo = snap.profile.photoDataUrl;
      void (async () => {
        try {
          let photoStorageId: Id<"_storage"> | undefined;
          if (photo?.startsWith("data:")) {
            try {
              const postUrl = await uploadUrl();
              const blob = await (await fetch(photo)).blob();
              const res = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": blob.type || "image/jpeg" },
                body: blob,
              });
              if (res.ok) {
                const json = (await res.json()) as { storageId?: Id<"_storage"> };
                photoStorageId = json.storageId;
                if (photoStorageId) {
                  await attachPhoto({ sessionId: id, storageId: photoStorageId });
                }
              }
            } catch {
              /* keep data URL in local fallback */
            }
          }
          await saveMutation({
            sessionId: id,
            profile: snap.profile,
            skillText: snap.skillText,
            traces: snap.traces,
            logs: snap.logs,
            jobs: snap.jobs,
            proof: snap.proof ?? undefined,
            plan: snap.plan ?? undefined,
            pitch: snap.pitch ?? undefined,
            summary: snap.summary ?? undefined,
            onePagers: snap.onePagers,
            photoStorageId,
          });
          setSaveError(null);
        } catch (err) {
          setSaveError(humanizeCloudError(err, "save"));
        }
      })();
    },
    [attachPhoto, saveMutation, sessionId, uploadUrl],
  );

  const recordOnePager = useCallback(
    (meta: Omit<OnePagerMeta, "generatedAt">) => {
      const id = sessionId || getOrCreateSessionId();
      const generatedAt = Date.now();
      recordLocalOnePager(id, { ...meta, generatedAt });
      void recordMutation({
        sessionId: id,
        jobId: meta.jobId,
        company: meta.company,
        title: meta.title,
      }).catch((err) => {
        setSaveError(humanizeCloudError(err, "save"));
      });
    },
    [recordMutation, sessionId],
  );

  const value = useMemo<PersistApi>(
    () => ({
      mode: "cloud",
      sessionId,
      ready,
      restored,
      cloudError,
      save,
      recordOnePager,
    }),
    [sessionId, ready, restored, cloudError, save, recordOnePager],
  );

  return <PersistContext.Provider value={value}>{children}</PersistContext.Provider>;
}
