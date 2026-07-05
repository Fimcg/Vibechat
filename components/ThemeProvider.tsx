"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";

export type ThemeName =
  | "midnight"
  | "ocean"
  | "sunset"
  | "forest"
  | "light";

export const THEMES: {
  name: ThemeName;
  label: string;
  swatch: string;
}[] = [
  { name: "midnight", label: "Midnight", swatch: "#4f46e5" },
  { name: "ocean", label: "Ocean", swatch: "#0891b2" },
  { name: "sunset", label: "Sunset", swatch: "#db2777" },
  { name: "forest", label: "Forest", swatch: "#16a34a" },
  { name: "light", label: "Light", swatch: "#94a3b8" },
];

const STORAGE_KEY = "vibechat:theme";

// Default theme. We avoid reading localStorage during SSR.
const DEFAULT_THEME: ThemeName = "midnight";

type ThemeContextValue = {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
};

import { createContext, useContext } from "react";

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(DEFAULT_THEME);

  // On mount, read the saved theme from localStorage and apply it.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeName | null;
    if (saved && THEMES.some((t) => t.name === saved)) {
      setThemeState(saved);
      document.documentElement.setAttribute("data-theme", saved);
    } else {
      document.documentElement.setAttribute("data-theme", DEFAULT_THEME);
    }
  }, []);

  const setTheme = useCallback((next: ThemeName) => {
    setThemeState(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage failures (e.g. private mode).
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
