"use client";

import { useEffect, useRef, useState } from "react";
import { THEMES, useTheme } from "./ThemeProvider";

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking outside of it.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const current = THEMES.find((t) => t.name === theme) ?? THEMES[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-xs text-text-muted hover:text-text border border-border hover:border-border-strong rounded-lg px-3 py-1.5 transition-colors"
        aria-label="Change theme"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span
          className="w-3 h-3 rounded-full border border-border-strong"
          style={{ backgroundColor: current.swatch }}
        />
        <span className="hidden sm:inline">{current.label}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          className="opacity-60"
          aria-hidden
        >
          <path d="M2 3l3 3 3-3" stroke="currentColor" strokeWidth="1.2" fill="none" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 mt-2 w-40 bg-surface border border-border rounded-lg shadow-xl py-1 z-50"
        >
          {THEMES.map((t) => {
            const active = t.name === theme;
            return (
              <li key={t.name}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    setTheme(t.name);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                    active
                      ? "text-text"
                      : "text-text-muted hover:text-text hover:bg-elevated"
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-border-strong"
                    style={{ backgroundColor: t.swatch }}
                  />
                  <span className="flex-1 text-left">{t.label}</span>
                  {active && (
                    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                      <path
                        d="M3 7l3 3 5-6"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
