"use client";

import { useEffect, useState } from "react";
import { ACCENT_FOLLOW_KEY, accentFollowsTheme } from "@/lib/accent";
import { notifyThemeChange } from "@/lib/theme";

export function AccentFollowToggle({ accent }: { accent: string }) {
  const [on, setOn] = useState(true);

  useEffect(() => {
    setOn(accentFollowsTheme(accent, window.localStorage.getItem(ACCENT_FOLLOW_KEY)));
  }, [accent]);

  return (
    <label className="follow-toggle">
      <input
        type="checkbox"
        checked={on}
        onChange={(event) => {
          const next = event.target.checked;
          setOn(next);
          window.localStorage.setItem(ACCENT_FOLLOW_KEY, next ? "theme" : "brand");
          notifyThemeChange();
        }}
      />
      <span>Accent follows time of day</span>
    </label>
  );
}
