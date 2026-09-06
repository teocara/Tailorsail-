/**
 * Which build is this?
 *
 * The GitHub Pages build has no server, so the five write paths — booking,
 * concierge, host application, and the ops mutations — have nowhere to post.
 * They stay on the page and explain themselves rather than being removed,
 * because a demo that hides its own booking form is not demonstrating much.
 *
 * Everything that only *reads* is unaffected: the pages are the same
 * components rendering the same seeded data, just at build time.
 *
 * Set from `next.config.ts`. Readable from server and client alike, because
 * `NEXT_PUBLIC_` values are inlined into the bundle at build time.
 */
export const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

/**
 * The prefix GitHub Pages serves a project site under, or "" everywhere else.
 *
 * Next rewrites `<Link>` hrefs and asset URLs itself; this is for the handful
 * of places that build a URL by hand — a `fetch` of something in `public/`,
 * which Next has no way to know about.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * The route segment config every page exports.
 *
 * `force-dynamic` is load-bearing for the server build: these pages read Prisma
 * directly rather than through `fetch`, so without it Next would prerender them
 * once at build and then serve that snapshot forever — a yield run would change
 * nothing anyone could see. The static build wants exactly the opposite, and
 * the two are a hard contradiction, so it is one constant rather than eighteen
 * decisions.
 */
export const RENDER_MODE = IS_STATIC ? "force-static" : "force-dynamic";

/**
 * What the static build says when someone reaches a control that would write.
 * One sentence, and it names the reason rather than apologising.
 */
export const STATIC_NOTICE =
  "This is the published demo build, which has no server behind it — nothing can be saved. Run it locally and this works for real.";

/**
 * Bind a form to its server action, or to nothing in the static build.
 *
 * React refuses to serialise a plain function into a client boundary, so a
 * form cannot simply keep pointing at the aliased stub. Paired with
 * `disabled={IS_STATIC}` on the submit control, the form renders exactly as it
 * does in the real app and just does not go anywhere.
 */
export function liveAction<T>(action: T): T | undefined {
  return IS_STATIC ? undefined : action;
}
