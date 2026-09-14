import Link from "next/link";
import { Container, Eyebrow, Section } from "@/components/ui";

/**
 * The 404.
 *
 * Also the file that makes `next build` emit `404.html`, which is what GitHub
 * Pages serves for any path it does not have a file for — so on the published
 * build this page is the catch-all for every mistyped URL, not just an
 * in-app miss.
 */
export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <Section>
      <Container>
        <div className="max-w-xl">
          <Eyebrow>404</Eyebrow>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl">
            There is nothing at this address
          </h1>
          <p className="mt-4 text-[var(--color-ink-muted)]">
            The page may have moved, or the link may have been mistyped. The
            trips and the cruising grounds are the two places worth starting
            from.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/trips"
              className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white"
            >
              Browse trips
            </Link>
            <Link
              href="/destinations"
              className="rounded-full border border-[var(--color-line)] px-5 py-2.5 text-sm font-medium"
            >
              Cruising grounds
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  );
}
