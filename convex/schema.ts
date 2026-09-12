import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Anonymous job-searcher studio. sessionId lives in the browser.
 * Partner API keys never belong here.
 */
export default defineSchema({
  studios: defineTable({
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
    onePagers: v.array(v.any()),
    photoStorageId: v.optional(v.id("_storage")),
    updatedAt: v.number(),
  }).index("by_session", ["sessionId"]),
});
