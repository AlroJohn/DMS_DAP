"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex items-center gap-2 rounded-md border px-2 py-2 text-sm shadow-sm hover:bg-accent/50 bg-background"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <>
          <Sun className="size-4" />
        </>
      ) : (
        <>
          <Moon className="size-4" />
        </>
      )}
    </button>
  );
}
