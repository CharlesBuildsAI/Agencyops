import { Suspense } from "react";
import { ThemeRoot } from "@/components/theme-root";
import "./site.css";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={children}>
      <ThemeRoot>{children}</ThemeRoot>
    </Suspense>
  );
}
