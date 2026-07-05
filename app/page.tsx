"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useEffect, useRef, useState } from "react";
import { ThemePicker } from "@/components/ThemePicker";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];

const SESSION_KEY = "vibechat:username";

export default function Home() {
  const [author, setAuthor] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Only render interactive UI after mount to avoid SSR hydration mismatch
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) setAuthor(saved);
  }, []);

  if (!mounted) {
    return (
      <main className="min-h-screen bg-base flex items-center justify-center p-6">
        <div className="w-2 h-2 bg-text-faint rounded-full animate-bounce" />
      </main>
    );
  }

  // Show login screen if not logged in
  if (author === null) {
    return (
      <LoginScreen
        onLogin={(username) => {
          localStorage.setItem(SESSION_KEY, username);
          setAuthor(username);
        }}
      />
    );
  }

  return (
    <Chat
      author={author}
      onLogout={() => {
        localStorage.removeItem(SESSION_KEY);
        setAuthor(null);
      }}
    />
  );
}

function LoginScreen({ onLogin }: { onLogin: (username: string) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    usernameRef.current?.focus();
  }, [mode]);

  const switchMode = (next: "login" | "register") => {
    setMode(next);
    setError("");
    setUsername("");
    setPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setError("Please enter a username and password.");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "login") {
        const user = await fetchUser(trimmedUser);
        if (!user || user.password !== password) {
          setError("Invalid username or password.");
          return;
        }
        onLogin(trimmedUser);
      } else {
        // Register: create the user, then log them in.
        await registerUser(trimmedUser, password);
        onLogin(trimmedUser);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      if (message === "USERNAME_TAKEN") {
        setError("That username is already taken — try another one.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch the user via the Convex query. We use a one-shot query through the
  // Convex client rather than the useQuery hook so we can trigger it on submit.
  const fetchUser = async (uname: string) => {
    const { ConvexReactClient } = await import("convex/react");
    const client = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    return await client.query(api.messages.login, { username: uname });
  };

  const registerUser = async (uname: string, pw: string) => {
    const { ConvexReactClient } = await import("convex/react");
    const client = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    await client.mutation(api.messages.register, {
      username: uname,
      password: pw,
    });
  };

  const isLogin = mode === "login";

  return (
    <main className="min-h-screen bg-base flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-xl p-8 flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-text">Welcome to Vibechat</h1>
          <p className="text-sm text-text-muted">
            {isLogin
              ? "Sign in with your account to join the conversation."
              : "Create an account to start chatting."}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 bg-elevated p-1 rounded-lg">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`flex-1 text-sm font-medium px-4 py-2 rounded-md transition-colors ${
              isLogin
                ? "bg-accent text-accent-text"
                : "text-text-muted hover:text-text"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => switchMode("register")}
            className={`flex-1 text-sm font-medium px-4 py-2 rounded-md transition-colors ${
              !isLogin
                ? "bg-accent text-accent-text"
                : "text-text-muted hover:text-text"
            }`}
          >
            Register
          </button>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Username</label>
            <input
              ref={usernameRef}
              type="text"
              placeholder="Your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-input border border-border-strong rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Password</label>
            <input
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-input border border-border-strong rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          {error && (
            <p className="text-sm text-red-400 bg-red-950/50 border border-red-900 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="bg-accent hover:bg-accent-hover disabled:bg-elevated disabled:text-text-faint text-accent-text text-sm font-medium px-5 py-3 rounded-lg cursor-pointer transition-colors disabled:cursor-not-allowed"
          >
            {submitting
              ? isLogin
                ? "Signing in…"
                : "Creating account…"
              : isLogin
                ? "Login"
                : "Register"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Chat({
  author,
  onLogout,
}: {
  author: string;
  onLogout: () => void;
}) {
  // Ensure the default channels exist on first load. Idempotent.
  const ensureChannels = useMutation(api.messages.ensureDefaultChannels);
  useEffect(() => {
    void ensureChannels({});
  }, [ensureChannels]);

  const channels = useQuery(api.messages.listChannels);
  // Persist the selected channel name so it survives reloads.
  const [selectedChannelName, setSelectedChannelName] = useState<string | null>(
    null,
  );
  useEffect(() => {
    const saved = localStorage.getItem("vibechat:channel");
    if (saved) setSelectedChannelName(saved);
  }, []);
  // Once channels load, fall back to the first one (general) if nothing saved
  // or the saved name no longer exists.
  useEffect(() => {
    if (channels === undefined || selectedChannelName !== null) return;
    if (channels.length > 0) {
      setSelectedChannelName(channels[0].name);
    }
  }, [channels, selectedChannelName]);
  // Validate the saved name against loaded channels; reset if missing.
  useEffect(() => {
    if (channels === undefined || selectedChannelName === null) return;
    if (!channels.some((c) => c.name === selectedChannelName)) {
      const fallback = channels[0]?.name ?? null;
      setSelectedChannelName(fallback);
      if (fallback) localStorage.setItem("vibechat:channel", fallback);
    }
  }, [channels, selectedChannelName]);

  const selectedChannel =
    channels?.find((c) => c.name === selectedChannelName) ?? null;

  const messages = useQuery(
    api.messages.listMessages,
    selectedChannel ? { channelId: selectedChannel._id } : "skip",
  );
  const sendMessage = useMutation(api.messages.sendMessage);
  const toggleReaction = useMutation(api.messages.toggleReaction);
  const markRead = useMutation(api.messages.markRead);
  const setTyping = useMutation(api.messages.setTyping);
  const clearTyping = useMutation(api.messages.clearTyping);
  const typingAuthors = useQuery(
    api.messages.listTyping,
    selectedChannel
      ? { excludeAuthor: author, channelId: selectedChannel._id }
      : "skip",
  ) ?? [];
  const [body, setBody] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const lastTypingPing = useRef<number>(0);
  // Track which messages we've already marked as read this session so we
  // don't fire redundant markRead mutations. Reset when switching channels.
  const markedReadRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    markedReadRef.current = new Set();
  }, [selectedChannelName]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark visible messages as read using IntersectionObserver. Only messages
  // authored by others are tracked — you don't need a read receipt for your
  // own messages.
  useEffect(() => {
    const root = listRef.current;
    if (!root || messages === undefined) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const messageId = (entry.target as HTMLElement).dataset.messageId;
          if (!messageId) continue;
          if (markedReadRef.current.has(messageId)) continue;
          markedReadRef.current.add(messageId);
          void markRead({ messageId: messageId as any, author });
        }
      },
      { root, threshold: 0.5 },
    );

    const nodes = root.querySelectorAll<HTMLElement>("[data-message-id]");
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [messages, markRead, author]);

  // Heartbeat while typing: ping at most once per second.
  const onBodyChange = (value: string) => {
    setBody(value);
    if (!selectedChannel) return;
    const now = Date.now();
    if (value.trim() && now - lastTypingPing.current > 1000) {
      lastTypingPing.current = now;
      void setTyping({ author, channelId: selectedChannel._id });
    } else if (!value.trim()) {
      lastTypingPing.current = 0;
      void clearTyping({ author });
    }
  };

  return (
    <main className="h-screen bg-base flex overflow-hidden">
      {/* Channel sidebar */}
      <aside className="w-56 shrink-0 border-r border-border bg-surface flex flex-col">
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-accent-text font-bold text-sm">
              V
            </div>
            <h1 className="text-base font-semibold text-text">Vibechat</h1>
          </div>
          <p className="text-xs text-text-muted mt-1.5">
            Signed in as{" "}
            <span className="font-medium text-text">{author}</span>
          </p>
        </div>

        <div className="px-3 py-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-text-faint px-1 mb-1">
            Channels
          </h2>
          <nav className="flex flex-col gap-0.5">
            {channels === undefined ? (
              <span className="text-xs text-text-faint px-2 py-1">
                Loading…
              </span>
            ) : (
              channels.map((c) => {
                const active = c.name === selectedChannelName;
                return (
                  <button
                    key={c._id}
                    onClick={() => {
                      setSelectedChannelName(c.name);
                      localStorage.setItem("vibechat:channel", c.name);
                    }}
                    className={`text-sm px-2 py-1.5 rounded-md text-left transition-colors ${
                      active
                        ? "bg-accent-soft text-accent-soft-text font-medium"
                        : "text-text-muted hover:text-text hover:bg-elevated"
                    }`}
                  >
                    <span className="opacity-60">#</span>
                    {c.name}
                  </button>
                );
              })
            )}
          </nav>
        </div>

        <div className="mt-auto p-3 border-t border-border">
          <button
            onClick={onLogout}
            className="w-full text-xs text-text-muted hover:text-text border border-border hover:border-border-strong rounded-lg px-3 py-1.5 transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Chat area */}
      <section className="flex-1 flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface/80 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-accent-text font-bold">
            V
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-semibold text-text">
              {selectedChannel ? `#${selectedChannel.name}` : "Vibechat"}
            </h1>
            <p className="text-xs text-text-muted">
              Signed in as{" "}
              <span className="font-medium text-text">{author}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemePicker />
        </div>
      </header>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-3"
      >
        {messages === undefined ? (
          <div className="m-auto flex items-center gap-2">
            <div className="w-2 h-2 bg-text-faint rounded-full animate-bounce" />
            <div
              className="w-2 h-2 bg-text-faint rounded-full animate-bounce"
              style={{ animationDelay: "0.1s" }}
            />
            <div
              className="w-2 h-2 bg-text-faint rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            />
            <span className="ml-2 text-sm text-text-faint">Loading messages…</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="m-auto text-center">
            <p className="text-text-muted text-sm">
              No messages yet. Say hello 👋
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.author === author;
            const reactions = msg.reactions ?? [];
            const readBy = msg.readBy ?? [];
            const otherReaders = readBy.filter((a) => a !== msg.author);
            const reactionCounts = reactions.reduce<Record<string, string[]>>(
              (acc, r) => {
                (acc[r.emoji] ??= []).push(r.author);
                return acc;
              },
              {},
            );
            return (
              <div
                key={msg._id}
                data-message-id={msg._id}
                className={`group flex flex-col gap-1 max-w-[80%] ${
                  isMe ? "self-end items-end" : "self-start items-start"
                }`}
              >
                {!isMe && (
                  <span className="text-xs font-semibold text-text-muted px-2 flex items-center gap-1.5">
                    {msg.author}
                    {msg.bot && (
                      <span className="text-[9px] font-bold uppercase tracking-wide bg-accent-soft text-accent-soft-text border border-accent-soft-border rounded px-1 py-0.5">
                        Bot
                      </span>
                    )}
                  </span>
                )}
                <div
                  className={`rounded-2xl px-4 py-2 text-sm shadow-sm ${
                    isMe
                      ? "bg-bubble-me text-bubble-me-text rounded-br-sm"
                      : "bg-bubble-other text-bubble-other-text rounded-bl-sm border border-bubble-other-border"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      isMe ? "text-bubble-me-text/70" : "text-text-faint"
                    }`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {/* Existing reaction counts */}
                {Object.keys(reactionCounts).length > 0 && (
                  <div className="flex flex-wrap gap-1 px-1">
                    {Object.entries(reactionCounts).map(([emoji, authors]) => {
                      const reacted = authors.includes(author);
                      return (
                        <button
                          key={emoji}
                          onClick={() =>
                            void toggleReaction({
                              messageId: msg._id,
                              author,
                              emoji,
                            })
                          }
                          className={`text-xs rounded-full px-2 py-0.5 border transition-colors ${
                            reacted
                              ? "bg-accent-soft border-accent-soft-border text-accent-soft-text"
                              : "bg-elevated border-border text-text-muted hover:border-border-strong"
                          }`}
                        >
                          {emoji} {authors.length}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Reaction picker, revealed on hover */}
                <div className="flex gap-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() =>
                        void toggleReaction({
                          messageId: msg._id,
                          author,
                          emoji,
                        })
                      }
                      className="text-sm bg-elevated hover:bg-border-strong border border-border rounded-full w-7 h-7 flex items-center justify-center transition-colors"
                      aria-label={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Read receipts: show who has seen this message. For your
                    own messages, list the other users who've read it. For
                    others' messages, show a subtle "You saw this" marker. */}
                {otherReaders.length > 0 && (
                  <div
                    className={`text-[10px] text-text-faint px-2 ${
                      isMe ? "text-right" : "text-left"
                    }`}
                  >
                    Seen by {otherReaders.join(", ")}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="px-4 pt-2 min-h-6">
        {typingAuthors.length > 0 && (
          <p className="text-xs text-text-muted flex items-center gap-1">
            <span className="inline-flex gap-0.5">
              <span className="w-1 h-1 bg-text-faint rounded-full animate-bounce" />
              <span
                className="w-1 h-1 bg-text-faint rounded-full animate-bounce"
                style={{ animationDelay: "0.15s" }}
              />
              <span
                className="w-1 h-1 bg-text-faint rounded-full animate-bounce"
                style={{ animationDelay: "0.3s" }}
              />
            </span>
            {typingAuthors.length === 1
              ? `${typingAuthors[0]} is typing…`
              : `${typingAuthors.slice(0, 3).join(", ")} ${
                  typingAuthors.length > 3
                    ? `and ${typingAuthors.length - 3} others`
                    : "are"
                } typing…`}
          </p>
        )}
      </div>

      <form
        className="px-4 py-4 border-t border-border bg-surface/80 backdrop-blur flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = body.trim();
          if (!trimmed || !selectedChannel) return;
          void sendMessage({
            author,
            body: trimmed,
            channelId: selectedChannel._id,
          });
          void clearTyping({ author });
          lastTypingPing.current = 0;
          setBody("");
          // The bot is triggered server-side by the sendMessage mutation when
          // the message contains a "?", so no client-side call is needed here.
        }}
      >
        <input
          type="text"
          placeholder={
            selectedChannel ? `Message #${selectedChannel.name}` : "Type a message…"
          }
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          className="flex-1 bg-input border border-border-strong rounded-full px-5 py-3 text-sm text-text placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={!body.trim() || !selectedChannel}
          className="bg-accent hover:bg-accent-hover disabled:bg-elevated disabled:text-text-faint text-accent-text text-sm font-medium px-5 py-3 rounded-full cursor-pointer transition-colors disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
      </section>
    </main>
  );
}
