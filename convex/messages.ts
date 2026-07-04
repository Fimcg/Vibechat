import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listMessages = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_createdAt")
      .order("asc")
      .collect();
  },
});

export const sendMessage = mutation({
  args: {
    author: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      author: args.author,
      body: args.body,
      createdAt: Date.now(),
    });
  },
});
