"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [author, setAuthor] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Only render interactive UI after mount to avoid SSR hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="w-2 h-2 bg-slate-600 rounded-full animate-bounce" />
      </main>
    );
  }

  // Prompt for display name on first load
  if (author === null) {
    return <NamePrompt onSubmit={setAuthor} />;
  }

  return <Chat author={author} onLogout={() => setAuthor(null)} />;
}

function NamePrompt({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus after mount (autoFocus can cause hydration warnings)
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-8 flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-slate-100">Welcome to Vibechat</h1>
          <p className="text-sm text-slate-400">
            Enter a display name to start chatting. This is how others will see
            your messages.
          </p>
        </div>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = name.trim();
            if (!trimmed) return;
            onSubmit(trimmed);
          }}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Your display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium px-5 py-3 rounded-lg cursor-pointer transition-colors disabled:cursor-not-allowed"
          >
            Start chatting
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
  const [body, setBody] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

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
          Change name
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
            return (
              <div
                key={msg._id}
                className={`flex flex-col gap-1 max-w-[80%] ${
                  isMe ? "self-end items-end" : "self-start items-start"
                }`}
              >
                {!isMe && (
                  <span className="text-xs font-semibold text-slate-400 px-2">
                    {msg.author}
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
                </div>
              </div>
            );
          })
        )}
      </div>

      <form
        className="px-4 py-4 border-t border-slate-800 bg-slate-900/80 backdrop-blur flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = body.trim();
          if (!trimmed) return;
          void sendMessage({ author, body: trimmed });
          setBody("");
        }}
      >
        <input
          type="text"
          placeholder="Type a message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
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
