"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { BrandAccent } from "./brand-accent";
import { Sidebar } from "./sidebar";
import type { FrameData } from "@/lib/view";

export function AppFrame({ frame, children }: { frame: FrameData; children: React.ReactNode }) {
  const path = usePathname();
  const teamHome = path === "/app";
  return (
    <div className="app-root">
      <Suspense fallback={null}>
        <BrandAccent accent={frame.agency.accentColor}>
          <div className={teamHome ? "app-grid show-team" : "app-grid"}>
            <Sidebar frame={frame} />
            <div className="stage">{children}</div>
          </div>
        </BrandAccent>
      </Suspense>
      <nav className="tabbar" aria-label="Mobile">
        <a className={path === "/app" ? "on" : ""} href="/app">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="8" r="3" /><path d="M5 19c1.5-3 4-4.5 7-4.5S17.5 16 19 19" /></svg>
          Team
        </a>
        <a className={path.startsWith("/app/bots") && path !== frame.needsHref ? "on" : ""} href={frame.bots.find((bot) => bot.live) ? `/app/bots/${frame.bots.find((bot) => bot.live)?.slug}` : `/app/bots/${frame.bots[0]?.slug ?? ""}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M5 6h14M5 12h10M5 18h14" /></svg>
          Chat
        </a>
        <a className={path.startsWith("/app/bots") && path === frame.needsHref ? "on" : ""} href={frame.needsHref}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 4v10M8 10l4 4 4-4" /><path d="M5 20h14" /></svg>
          Needs you{frame.needsCount > 0 ? ` · ${frame.needsCount}` : ""}
        </a>
      </nav>
    </div>
  );
}
