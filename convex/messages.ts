import { v } from "convex/values";
import {
  query,
  internalQuery,
  mutation,
  internalAction,
  internalMutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

// Look up a user by username. Returns the document (with password) so the
// client can verify credentials. NOTE: plaintext password comparison is
// insecure — replace with hashing + real auth before production.
export const login = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();
    return user ?? null;
  },
});

// Create a new user. Throws if the username already exists.
export const register = mutation({
  args: { username: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();
    if (existing) {
      throw new Error("USERNAME_TAKEN");
    }
    await ctx.db.insert("users", {
      username: args.username,
      password: args.password,
    });
  },
});

export const listMessages = query({
  args: {},
  handler: async (ctx) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_createdAt")
      .order("asc")
      .collect();
    // Join reactions for each message in a single round-trip.
    const withReactions = await Promise.all(
      messages.map(async (msg) => {
        const reactions = await ctx.db
          .query("reactions")
          .withIndex("by_message", (q) => q.eq("messageId", msg._id))
          .collect();
        return { ...msg, reactions };
      }),
    );
    return withReactions;
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
      bot: false,
    });

    // Auto-trigger the bot when the message contains a question mark. We
    // schedule the action 1.5s in the future so the reply feels natural and
    // the bot has time to read the latest context. The bot never triggers on
    // its own messages (this mutation is only called by real users — bot
    // messages go through `sendBotMessage`), so there's no infinite loop.
    if (args.body.includes("?")) {
      await ctx.scheduler.runAfter(1500, internal.messages.replyAsBot, {
        triggerMessage: args.body,
      });
    }
  },
});

// Internal query used by the bot action to fetch recent chat context. Returns
// the last N messages (oldest first) so the bot can see the conversation
// leading up to the question. Internal so clients can't call it directly.
export const listRecentMessages = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("messages")
      .withIndex("by_createdAt")
      .order("desc")
      .take(args.limit);
    // Reverse to chronological order for the model.
    return rows.reverse().map((m) => ({
      author: m.author,
      body: m.body,
      bot: m.bot ?? false,
    }));
  },
});

// Internal mutation that inserts a message authored by the bot. Only callable
// from other Convex functions (e.g. the `replyAsBot` action), never from the
// client. Marks the document with bot: true so the UI can render a badge.
export const sendBotMessage = internalMutation({
  args: {
    author: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      author: args.author,
      body: args.body,
      createdAt: Date.now(),
      bot: true,
    });
  },
});

// Identity & personality of the bot participant.
const BOT_NAME = "Sparky";
const BOT_SYSTEM_PROMPT =
  "You are Sparky, a hyperactive robot who loves puns and always tries to slip " +
  "a joke into every answer. You keep responses short and punchy — never more " +
  "than 2-3 sentences. You're friendly, enthusiastic, and a little bit goofy.";

// Convex action that calls the OpenRouter chat completions API with the
// deepseek/deepseek-v3.2 model and posts the generated reply back into the
// chat as a bot-authored message. Actions run in a Node.js runtime so they
// can use fetch and read environment variables.
//
// `triggerMessage` is the user message that triggered the bot (contains a "?").
// The action pulls the last several messages for context so the bot can reply
// with awareness of the recent conversation.
const BOT_CONTEXT_LIMIT = 8;

export const replyAsBot = internalAction({
  args: { triggerMessage: v.string() },
  handler: async (ctx, args): Promise<void> => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENROUTER_API_KEY is not set. Add it via `npx convex env set OPENROUTER_API_KEY <key>`.",
      );
    }

    // Fetch recent chat history for context (includes the trigger message,
    // which was just inserted before this action was scheduled).
    const recent = await ctx.runQuery(internal.messages.listRecentMessages, {
      limit: BOT_CONTEXT_LIMIT,
    });

    // Build the conversation for the model: system prompt, then the recent
    // messages mapped to user/assistant turns. Bot messages become assistant
    // turns so the model stays in character and doesn't reply to itself.
    const conversation: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: BOT_SYSTEM_PROMPT },
    ];
    for (const m of recent) {
      conversation.push({
        role: m.bot ? "assistant" : "user",
        content: m.bot ? `${m.author}: ${m.body}` : `${m.author}: ${m.body}`,
      });
    }

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        // OpenRouter recommends these for attribution/rate-limiting.
        "HTTP-Referer": "https://vibechat.app",
        "X-Title": "Vibechat",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-v3.2",
        messages: conversation,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenRouter request failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      throw new Error("OpenRouter returned an empty response.");
    }

    await ctx.runMutation(internal.messages.sendBotMessage, {
      author: BOT_NAME,
      body: reply,
    });
  },
});

// Toggle a reaction on/off for the current author. Idempotent: clicking the
// same emoji again removes it.
export const toggleReaction = mutation({
  args: {
    messageId: v.id("messages"),
    author: v.string(),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_message_and_author_and_emoji", (q) =>
        q
          .eq("messageId", args.messageId)
          .eq("author", args.author)
          .eq("emoji", args.emoji),
      )
      .unique();
    if (existing) {
      await ctx.db.delete("reactions", existing._id);
    } else {
      await ctx.db.insert("reactions", {
        messageId: args.messageId,
        author: args.author,
        emoji: args.emoji,
      });
    }
  },
});

// How long a typing indicator stays "active" after the last heartbeat.
const TYPING_TIMEOUT_MS = 5000;

// Upsert the typing row for `author`, refreshing the heartbeat.
export const setTyping = mutation({
  args: { author: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("typing")
      .withIndex("by_author", (q) => q.eq("author", args.author))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch("typing", existing._id, { lastSeen: now });
    } else {
      await ctx.db.insert("typing", { author: args.author, lastSeen: now });
    }
  },
});

// Clear the typing row when the user stops typing or sends the message.
export const clearTyping = mutation({
  args: { author: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("typing")
      .withIndex("by_author", (q) => q.eq("author", args.author))
      .unique();
    if (existing) {
      await ctx.db.delete("typing", existing._id);
    }
  },
});

// Return authors who have an active typing heartbeat (excluding the caller).
export const listTyping = query({
  args: { excludeAuthor: v.string() },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - TYPING_TIMEOUT_MS;
    const rows = await ctx.db
      .query("typing")
      .withIndex("by_lastSeen", (q) => q.gte("lastSeen", cutoff))
      .collect();
    return rows
      .filter((r) => r.author !== args.excludeAuthor)
      .map((r) => r.author);
  },
});
