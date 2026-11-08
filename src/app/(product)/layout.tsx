import { Suspense } from "react";
import "../globals.css";
import { ThemeRoot } from "@/components/theme-root";

export const dynamic = "force-dynamic";

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={children}>
      <ThemeRoot>{children}</ThemeRoot>
    </Suspense>
  );
}
