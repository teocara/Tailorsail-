import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

/**
 * Serve `out/` the way GitHub Pages does.
 *
 * Not a general-purpose static server — it exists so the tests can run against
 * the bytes that will actually be published, including the `/<repo>` path
 * prefix and the extensionless-directory resolution that `trailingSlash: true`
 * relies on. Getting either of those wrong locally would hide exactly the
 * class of bug this is meant to catch.
 *
 * No dependency, because CI should not install a package to check its own
 * output.
 */

const ROOT = resolve("out");
const BASE = process.env.PAGES_BASE_PATH ?? "/Tailorsail-";
const PORT = Number(process.env.PORT ?? 4173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

/** Map a request path to a file, or null. Mirrors Pages' own resolution. */
function locate(pathname) {
  if (!pathname.startsWith(BASE)) return null;
  const rest = pathname.slice(BASE.length) || "/";

  // normalize collapses any ".." before it can escape the output directory.
  const target = join(ROOT, normalize(rest));
  if (!target.startsWith(ROOT)) return null;

  for (const candidate of [
    target,
    join(target, "index.html"),
    `${target}.html`,
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

createServer((req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  const file = locate(decodeURIComponent(pathname));

  if (!file) {
    const notFound = join(ROOT, "404.html");
    res.writeHead(404, { "content-type": TYPES[".html"] });
    if (existsSync(notFound)) createReadStream(notFound).pipe(res);
    else res.end("Not found");
    return;
  }

  res.writeHead(200, {
    "content-type": TYPES[extname(file)] ?? "application/octet-stream",
  });
  createReadStream(file).pipe(res);
}).listen(PORT, () => {
  console.log(`Serving ${ROOT} at http://localhost:${PORT}${BASE}/`);
});
