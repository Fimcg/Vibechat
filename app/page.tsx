"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useEffect, useRef, useState } from "react";

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
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="w-2 h-2 bg-slate-600 rounded-full animate-bounce" />
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
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-8 flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-slate-100">Welcome to Vibechat</h1>
          <p className="text-sm text-slate-400">
            {isLogin
              ? "Sign in with your account to join the conversation."
              : "Create an account to start chatting."}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 bg-slate-800 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`flex-1 text-sm font-medium px-4 py-2 rounded-md transition-colors ${
              isLogin
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => switchMode("register")}
            className={`flex-1 text-sm font-medium px-4 py-2 rounded-md transition-colors ${
              !isLogin
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Register
          </button>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Username</label>
            <input
              ref={usernameRef}
              type="text"
              placeholder="Your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Password</label>
            <input
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium px-5 py-3 rounded-lg cursor-pointer transition-colors disabled:cursor-not-allowed"
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
  const messages = useQuery(api.messages.listMessages);
  const sendMessage = useMutation(api.messages.sendMessage);
  const toggleReaction = useMutation(api.messages.toggleReaction);
  const setTyping = useMutation(api.messages.setTyping);
  const clearTyping = useMutation(api.messages.clearTyping);
  const typingAuthors = useQuery(api.messages.listTyping, {
    excludeAuthor: author,
  }) ?? [];
  const [body, setBody] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const lastTypingPing = useRef<number>(0);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  // Heartbeat while typing: ping at most once per second.
  const onBodyChange = (value: string) => {
    setBody(value);
    const now = Date.now();
    if (value.trim() && now - lastTypingPing.current > 1000) {
      lastTypingPing.current = now;
      void setTyping({ author });
    } else if (!value.trim()) {
      lastTypingPing.current = 0;
      void clearTyping({ author });
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
            V
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-semibold text-slate-100">Vibechat</h1>
            <p className="text-xs text-slate-400">
              Signed in as{" "}
              <span className="font-medium text-slate-300">{author}</span>
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-500 rounded-lg px-3 py-1.5 transition-colors"
        >
          Logout
        </button>
      </header>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-3"
      >
        {messages === undefined ? (
          <div className="m-auto flex items-center gap-2">
            <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" />
            <div
              className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"
              style={{ animationDelay: "0.1s" }}
            />
            <div
              className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            />
            <span className="ml-2 text-sm text-slate-500">Loading messages…</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="m-auto text-center">
            <p className="text-slate-400 text-sm">
              No messages yet. Say hello 👋
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.author === author;
            const reactions = msg.reactions ?? [];
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
                className={`group flex flex-col gap-1 max-w-[80%] ${
                  isMe ? "self-end items-end" : "self-start items-start"
                }`}
              >
                {!isMe && (
                  <span className="text-xs font-semibold text-slate-400 px-2 flex items-center gap-1.5">
                    {msg.author}
                    {msg.bot && (
                      <span className="text-[9px] font-bold uppercase tracking-wide bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded px-1 py-0.5">
                        Bot
                      </span>
                    )}
                  </span>
                )}
                <div
                  className={`rounded-2xl px-4 py-2 text-sm shadow-sm ${
                    isMe
                      ? "bg-indigo-600 text-white rounded-br-sm"
                      : "bg-slate-800 text-slate-100 rounded-bl-sm border border-slate-700"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      isMe ? "text-indigo-200" : "text-slate-400"
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
                              ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                              : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"
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
                      className="text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full w-7 h-7 flex items-center justify-center transition-colors"
                      aria-label={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="px-4 pt-2 min-h-6">
        {typingAuthors.length > 0 && (
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <span className="inline-flex gap-0.5">
              <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce" />
              <span
                className="w-1 h-1 bg-slate-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.15s" }}
              />
              <span
                className="w-1 h-1 bg-slate-500 rounded-full animate-bounce"
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
        className="px-4 py-4 border-t border-slate-800 bg-slate-900/80 backdrop-blur flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = body.trim();
          if (!trimmed) return;
          void sendMessage({ author, body: trimmed });
          void clearTyping({ author });
          lastTypingPing.current = 0;
          setBody("");
          // The bot is triggered server-side by the sendMessage mutation when
          // the message contains a "?", so no client-side call is needed here.
        }}
      >
        <input
          type="text"
          placeholder="Type a message…"
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-full px-5 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={!body.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium px-5 py-3 rounded-full cursor-pointer transition-colors disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </main>
  );
}
