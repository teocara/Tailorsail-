import type { NextConfig } from "next";
import path from "node:path";

/**
 * Two build modes.
 *
 * The default is the real app: server-rendered, server actions, writes to the
 * database. `STATIC_EXPORT=1` produces the GitHub Pages build instead — the
 * same pages prerendered to HTML at build time against the seeded database,
 * with the write paths replaced by demo states.
 *
 * The static build is a second mode, not a replacement. Nothing is deleted for
 * it, and `npm run dev` keeps every server action working.
 */
const isStatic = process.env.STATIC_EXPORT === "1";

/**
 * GitHub Pages serves a project site under /<repo>, so every asset and link
 * needs that prefix — but only in the static build. Overridable for a user or
 * organisation site, which is served from the root.
 */
const basePath = isStatic ? (process.env.PAGES_BASE_PATH ?? "/Tailorsail-") : "";

/**
 * `output: "export"` fails if a single server action exists anywhere in the
 * module graph, and imports are static, so branching inside the pages cannot
 * remove them. Aliasing the five action modules to a plain stub does — the
 * pages keep their normal imports and the `"use server"` files are simply not
 * part of the static build.
 */
const ACTION_MODULES = ["booking", "concierge", "host", "ops", "search"];
const STUB = path.resolve("./app/actions/static-stubs.ts");

const actionAliases = Object.fromEntries(
  ACTION_MODULES.flatMap((name) => [
    [path.resolve(`./app/actions/${name}.ts`), STUB],
    [`@/app/actions/${name}`, STUB],
  ]),
);

const nextConfig: NextConfig = {
  // Keep the Prisma client out of the server bundle so `next build` doesn't
  // try to trace the generated query engine binaries.
  serverExternalPackages: ["@prisma/client", "prisma"],

  ...(isStatic
    ? {
        output: "export" as const,
        // Pages has no rewrite layer, so /trips must resolve to an actual
        // trips/index.html rather than relying on extensionless routing.
        trailingSlash: true,
        basePath,
        assetPrefix: basePath,
        // Inlined at build time so client components can see the mode too.
        env: {
          NEXT_PUBLIC_STATIC_EXPORT: "1",
          NEXT_PUBLIC_BASE_PATH: basePath,
        },
        webpack: (config: { resolve: { alias: Record<string, string> } }) => {
          config.resolve.alias = { ...config.resolve.alias, ...actionAliases };
          return config;
        },
      }
    : {}),
};

export default nextConfig;
