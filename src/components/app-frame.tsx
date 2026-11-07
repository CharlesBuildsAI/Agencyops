"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import type { FrameData } from "@/lib/view";

export function AppFrame({ frame, children }: { frame: FrameData; children: React.ReactNode }) {
  const path = usePathname();
  const teamHome = path === "/app";
  return (
    <div className="app-root" style={{ ["--accent" as string]: frame.agency.accentColor }}>
      <div className={teamHome ? "app-grid show-team" : "app-grid"}>
        <Sidebar frame={frame} />
        <div className="stage">{children}</div>
      </div>
      <nav className="tabbar" aria-label="Mobile">
        <a className={path === "/app" || path.startsWith("/app/bots") ? "on" : ""} href="/app">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M5 6h14M5 12h14M5 18h10" /></svg>
          Chats
        </a>
        <a className={path.startsWith("/app/calls") ? "on" : ""} href="/app/calls">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M7 3h4l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2Z" /></svg>
          Calls
        </a>
        <a className={path.startsWith("/app/settings") || path.startsWith("/app/brand") || path.startsWith("/app/usage") ? "on" : ""} href="/app/settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="3" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" /></svg>
          Settings
        </a>
      </nav>
    </div>
  );
}
