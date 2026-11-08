"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { accentFollowsTheme, ACCENT_FOLLOW_KEY, applyAccent, shadeAgent, tuneAccent } from "@/lib/accent";
import {
  COORDS_STORAGE_KEY,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemeChoice,
} from "@/lib/theme";

const AgentColorContext = createContext<string | null>(null);

export function useAgentColor() {
  return useContext(AgentColorContext);
}

function readChoice(): ThemeChoice {
  if (typeof window === "undefined") return "auto";
  const query = new URLSearchParams(window.location.search).get("tod") as ThemeChoice | null;
  if (query === "sunrise" || query === "day" || query === "sunset" || query === "night" || query === "auto") {
    return query;
  }
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeChoice | null;
  if (stored === "sunrise" || stored === "day" || stored === "sunset" || stored === "night" || stored === "auto") {
    return stored;
  }
  return "auto";
}

function readCoords() {
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

export function BrandAccent({
  accent,
  children,
}: {
  accent: string;
  children: React.ReactNode;
}) {
  const params = useSearchParams();
  const [agent, setAgent] = useState<string | null>(null);

  useEffect(() => {
    function paint() {
      const queryAccent = params.get("accent");
      const chosen = queryAccent ? (queryAccent.startsWith("#") ? queryAccent : `#${queryAccent}`) : accent;
      const stored = window.localStorage.getItem(ACCENT_FOLLOW_KEY);
      const follow = queryAccent ? false : accentFollowsTheme(chosen, stored);
      if (follow) {
        setAgent(null);
        return;
      }
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const theme = resolveTheme({
        date: new Date(),
        choice: readChoice(),
        coords: readChoice() === "auto" ? readCoords() : null,
        reducedMotion: reduced,
      });
      const tuned = tuneAccent(chosen, theme.tokens);
      applyAccent(tuned);
      setAgent(tuned.agent);
    }
    paint();
    window.addEventListener("agencyops-painted", paint);
    window.addEventListener("agencyops-theme", paint);
    return () => {
      window.removeEventListener("agencyops-painted", paint);
      window.removeEventListener("agencyops-theme", paint);
    };
  }, [accent, params]);

  return <AgentColorContext.Provider value={agent}>{children}</AgentColorContext.Provider>;
}

export function agentFill(base: string, slug?: string) {
  return shadeAgent(base, slug);
}
