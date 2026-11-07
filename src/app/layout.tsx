import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AgencyOps",
  description: "AI staff for an independent insurance agency. Nothing sends without you.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
