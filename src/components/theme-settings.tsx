"use client";

import { useEffect, useState } from "react";
import { COORDS_STORAGE_KEY, notifyThemeChange, THEME_STORAGE_KEY, type ThemeChoice } from "@/lib/theme";

const CHOICES: { id: ThemeChoice; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "sunrise", label: "Sunrise" },
  { id: "day", label: "Day" },
  { id: "sunset", label: "Sunset" },
  { id: "night", label: "Night" },
];

export function ThemeSettings() {
  const [choice, setChoice] = useState<ThemeChoice>("auto");
  const [coords, setCoords] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeChoice | null;
    if (stored) setChoice(stored);
    const raw = window.localStorage.getItem(COORDS_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { lat: number; lon: number };
        setCoords(`${parsed.lat}, ${parsed.lon}`);
      } catch {
        setCoords("");
      }
    }
  }, []);

  function saveChoice(next: ThemeChoice) {
    setChoice(next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    notifyThemeChange();
  }

  function saveCoords(value: string) {
    setCoords(value);
    const match = value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
    if (!match) {
      window.localStorage.removeItem(COORDS_STORAGE_KEY);
      setNote("Using the clock. Sunrise is 5 to 8, day is 8 to 5, sunset is 5 to 8, night is 8 to 5.");
      notifyThemeChange();
      return;
    }
    const lat = Number(match[1]);
    const lon = Number(match[2]);
    window.localStorage.setItem(COORDS_STORAGE_KEY, JSON.stringify({ lat, lon }));
    setNote("Sunrise and sunset windows are centered on the sun at this place.");
    notifyThemeChange();
  }

  function useHere() {
    if (!navigator.geolocation) {
      setNote("This browser cannot share a location. The clock schedule stays on.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
        saveCoords(next);
      },
      () => setNote("Location stayed off. The clock schedule is the fallback."),
      { maximumAge: 60_000, timeout: 8000 },
    );
  }

  return (
    <div className="stack">
      <div className="theme-picks" role="radiogroup" aria-label="Light">
        {CHOICES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={choice === item.id}
            className={choice === item.id ? "theme-pick on" : "theme-pick"}
            onClick={() => saveChoice(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <label className="faint">
        Latitude, longitude
        <input className="field" value={coords} placeholder="39.74, -104.99" onChange={(event) => saveCoords(event.target.value)} aria-label="Latitude, longitude" />
      </label>
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={useHere}>Use this place</button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setCoords("");
            window.localStorage.removeItem(COORDS_STORAGE_KEY);
            setNote("Clock schedule restored.");
            notifyThemeChange();
          }}
        >
          Use the clock
        </button>
      </div>
      {note && <p className="faint">{note}</p>}
      <p className="faint">Auto crossfades for 45 minutes around each change. A preview is `?tod=sunset` on any desk URL.</p>
    </div>
  );
}
