import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the Prisma client out of the server bundle so `next build` doesn't
  // try to trace the generated query engine binaries.
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
