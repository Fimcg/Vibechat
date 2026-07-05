import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  messages: defineTable({
    author: v.string(),
    body: v.string(),
    createdAt: v.number(),
    // Optional: marks messages posted by the AI bot participant. Absent for
    // regular user messages.
    bot: v.optional(v.boolean()),
  }).index("by_createdAt", ["createdAt"]),

  // High-churn presence data, kept separate from messages.
  typing: defineTable({
    author: v.string(),
    lastSeen: v.number(),
  })
    .index("by_author", ["author"])
    .index("by_lastSeen", ["lastSeen"]),

  // Reactions live in their own table to avoid unbounded array growth on
  // popular messages (Convex 1MB document limit + full-rewrite cost).
  reactions: defineTable({
    messageId: v.id("messages"),
    author: v.string(),
    emoji: v.string(),
  })
    .index("by_message", ["messageId"])
    .index("by_message_and_author_and_emoji", ["messageId", "author", "emoji"]),

  users: defineTable({
    username: v.string(),
    password: v.string(),
  }).index("by_username", ["username"]),
});
