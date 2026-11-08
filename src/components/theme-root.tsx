"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  applyTheme,
  COORDS_STORAGE_KEY,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemeChoice,
} from "@/lib/theme";

function readChoice(search: string | null): ThemeChoice {
  const query = search as ThemeChoice | null;
  if (query === "sunrise" || query === "day" || query === "sunset" || query === "night" || query === "auto") {
    return query;
  }
  if (typeof window === "undefined") return "auto";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeChoice | null;
  if (stored === "sunrise" || stored === "day" || stored === "sunset" || stored === "night" || stored === "auto") {
    return stored;
  }
  return "auto";
}

function readCoords() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COORDS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { lat?: number; lon?: number };
    if (typeof parsed.lat !== "number" || typeof parsed.lon !== "number") return null;
    return { lat: parsed.lat, lon: parsed.lon };
  } catch {
    return null;
  }
}

export function ThemeRoot({ children }: { children: React.ReactNode }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const choice = readChoice(params.get("tod"));
    const coords = choice === "auto" ? readCoords() : null;
    const theme = resolveTheme({ date: new Date(), choice, coords, reducedMotion: reduced });
    applyTheme(theme.tokens);
    document.documentElement.dataset.theme = theme.name;
    window.dispatchEvent(new Event("agencyops-painted"));
    document.documentElement.style.setProperty(
      "--theme-fade",
      reduced ? "0s" : "1.2s",
    );
  }, [params, pathname, tick]);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 30_000);
    const onStorage = () => setTick((value) => value + 1);
    window.addEventListener("agencyops-theme", onStorage);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("agencyops-theme", onStorage);
    };
  }, []);

  return children;
}
