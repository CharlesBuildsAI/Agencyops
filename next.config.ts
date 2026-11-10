import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs", "@prisma/client"],
  devIndicators: false,
  // Standalone output is only for the desktop bundle. The web deploy keeps `next start`.
  ...(process.env.AGENCYOPS_DESKTOP === "1" ? { output: "standalone" as const } : {}),
};

export default nextConfig;
