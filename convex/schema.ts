import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Chat channels (#general, #random, #help, ...). Seeded on first deploy
  // via the `ensureDefaultChannels` mutation. `name` is the raw channel name
  // without the leading "#"; `name` is unique.
  channels: defineTable({
    name: v.string(),
  }).index("by_name", ["name"]),

  messages: defineTable({
    author: v.string(),
    body: v.string(),
    createdAt: v.number(),
    // Which channel the message belongs to. Optional only for legacy rows
    // created before channels existed; new messages always set it.
    channelId: v.optional(v.id("channels")),
    // Optional: marks messages posted by the AI bot participant. Absent for
    // regular user messages.
    bot: v.optional(v.boolean()),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_channel_and_createdAt", ["channelId", "createdAt"]),

  // High-churn presence data, kept separate from messages. Scoped per channel
  // so typing indicators only show for the channel you're viewing.
  typing: defineTable({
    author: v.string(),
    // Optional only for legacy rows; new typing rows always set it.
    channelId: v.optional(v.id("channels")),
    lastSeen: v.number(),
  })
    .index("by_author", ["author"])
    .index("by_lastSeen", ["lastSeen"])
    .index("by_channel_and_lastSeen", ["channelId", "lastSeen"]),

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

  // Read receipts: one row per (message, reader). Kept in a separate table
  // to avoid unbounded array growth on a message document.
  reads: defineTable({
    messageId: v.id("messages"),
    author: v.string(),
    readAt: v.number(),
  })
    .index("by_message", ["messageId"])
    .index("by_message_and_author", ["messageId", "author"]),
});
