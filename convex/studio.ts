import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const MAX_LOGS = 80;
const MAX_LOG_CHARS = 500;
const MAX_JOBS = 24;
const MAX_MARKDOWN = 4_000;
const MAX_ONEPAGERS = 24;
const MAX_TRACES = 40;
const MAX_SKILL_TEXT = 4_000;
const MAX_SUMMARY = 8_000;

function clipStr(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.length > max ? value.slice(0, max) : value;
}

function asJobs(raw: unknown): unknown[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_JOBS).map((job) => {
    if (!job || typeof job !== "object") return job;
    const row = job as Record<string, unknown>;
    const crawled =
      typeof row.crawledMarkdown === "string"
        ? clipStr(row.crawledMarkdown, MAX_MARKDOWN)
        : "";
    return { ...row, crawledMarkdown: crawled };
  });
}

function asLogs(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(-MAX_LOGS)
    .map((line) => clipStr(line, MAX_LOG_CHARS))
    .filter(Boolean);
}

function asTraces(raw: unknown): unknown[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row) => {
      if (!row || typeof row !== "object") return true;
      const tool = (row as { tool?: unknown }).tool;
      return tool !== "fal" && tool !== "pass";
    })
    .slice(-MAX_TRACES);
}

function asOnePagers(raw: unknown): unknown[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(-MAX_ONEPAGERS);
}

function stripPhoto(profile: unknown): unknown {
  if (!profile || typeof profile !== "object") return profile;
  const next = { ...(profile as Record<string, unknown>) };
  delete next.photoDataUrl;
  return next;
}

export const getBySession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    if (!sessionId || sessionId.length > 80) return null;
    const row = await ctx.db
      .query("studios")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .unique();
    if (!row) return null;
    const photoUrl = row.photoStorageId
      ? await ctx.storage.getUrl(row.photoStorageId)
      : null;
    return {
      sessionId: row.sessionId,
      profile: row.profile,
      skillText: row.skillText,
      traces: row.traces,
      logs: row.logs,
      jobs: row.jobs,
      proof: row.proof ?? null,
      plan: row.plan ?? null,
      pitch: row.pitch ?? null,
      summary: row.summary ?? null,
      onePagers: row.onePagers,
      photoUrl,
      updatedAt: row.updatedAt,
    };
  },
});

export const saveSnapshot = mutation({
  args: {
    sessionId: v.string(),
    profile: v.any(),
    skillText: v.string(),
    traces: v.array(v.any()),
    logs: v.array(v.string()),
    jobs: v.array(v.any()),
    proof: v.optional(v.any()),
    plan: v.optional(v.any()),
    pitch: v.optional(v.any()),
    summary: v.optional(v.string()),
    onePagers: v.optional(v.array(v.any())),
    photoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const sessionId = clipStr(args.sessionId, 80);
    if (!sessionId) throw new Error("sessionId required");
    const now = Date.now();
    const existing = await ctx.db
      .query("studios")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .unique();

    const patch = {
      sessionId,
      profile: stripPhoto(args.profile),
      skillText: clipStr(args.skillText, MAX_SKILL_TEXT),
      traces: asTraces(args.traces),
      logs: asLogs(args.logs),
      jobs: asJobs(args.jobs),
      proof: args.proof ?? undefined,
      plan: args.plan ?? undefined,
      pitch: args.pitch ?? undefined,
      summary: args.summary ? clipStr(args.summary, MAX_SUMMARY) : undefined,
      onePagers: asOnePagers(args.onePagers ?? existing?.onePagers ?? []),
      photoStorageId: args.photoStorageId ?? existing?.photoStorageId,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }
    return await ctx.db.insert("studios", {
      ...patch,
      onePagers: asOnePagers(args.onePagers ?? []),
    });
  },
});

export const generatePhotoUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const attachPhoto = mutation({
  args: {
    sessionId: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { sessionId, storageId }) => {
    const id = clipStr(sessionId, 80);
    if (!id) throw new Error("sessionId required");
    const existing = await ctx.db
      .query("studios")
      .withIndex("by_session", (q) => q.eq("sessionId", id))
      .unique();
    const now = Date.now();
    if (existing) {
      if (existing.photoStorageId && existing.photoStorageId !== storageId) {
        await ctx.storage.delete(existing.photoStorageId);
      }
      await ctx.db.patch(existing._id, { photoStorageId: storageId, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("studios", {
      sessionId: id,
      profile: {},
      skillText: "",
      traces: [],
      logs: [],
      jobs: [],
      onePagers: [],
      photoStorageId: storageId,
      updatedAt: now,
    });
  },
});

export const recordOnePager = mutation({
  args: {
    sessionId: v.string(),
    jobId: v.string(),
    company: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const sessionId = clipStr(args.sessionId, 80);
    if (!sessionId) throw new Error("sessionId required");
    const meta = {
      jobId: clipStr(args.jobId, 200),
      company: clipStr(args.company, 200),
      title: clipStr(args.title, 200),
      generatedAt: Date.now(),
    };
    const existing = await ctx.db
      .query("studios")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .unique();
    if (!existing) {
      return await ctx.db.insert("studios", {
        sessionId,
        profile: {},
        skillText: "",
        traces: [],
        logs: [],
        jobs: [],
        onePagers: [meta],
        updatedAt: meta.generatedAt,
      });
    }
    const rest = (existing.onePagers ?? []).filter(
      (row) =>
        !row ||
        typeof row !== "object" ||
        (row as { jobId?: string }).jobId !== meta.jobId,
    );
    await ctx.db.patch(existing._id, {
      onePagers: asOnePagers([...rest, meta]),
      updatedAt: meta.generatedAt,
    });
    return existing._id;
  },
});
