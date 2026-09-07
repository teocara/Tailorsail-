import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Tailorsail — sailing holidays in Italy, Ibiza and Croatia",
    template: "%s · Tailorsail",
  },
  description:
    "Skippered and bareboat sailing weeks in Italy, Ibiza and Croatia. Verified operators, one all-in price, and a preparation programme built for the water you're actually sailing.",
};

const NAV = [
  { href: "/trips", label: "Trips" },
  { href: "/destinations", label: "Destinations" },
  { href: "/courses", label: "Learn" },
  { href: "/crew", label: "Crew" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <header className="border-b border-[var(--color-line)]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
            <Link
              href="/"
              className="font-[family-name:var(--font-display)] text-xl tracking-tight text-navy-900"
            >
              Tailorsail
            </Link>

            <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-[var(--color-ink-muted)] transition-colors hover:text-navy-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-3 text-sm">
              <Link
                href="/host"
                className="rounded-full border border-[var(--color-line)] px-4 py-1.5 transition-colors hover:border-navy-600 hover:text-navy-900"
              >
                List your boat
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="mt-20 border-t border-[var(--color-line)] bg-[var(--color-surface-sunk)]">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="font-[family-name:var(--font-display)] text-lg">
                Tailorsail
              </p>
              <p className="mt-2 max-w-xs text-sm text-[var(--color-ink-muted)]">
                Sailing holidays in Italy, Ibiza and Croatia — prepared for,
                priced in full, and looked after.
              </p>
            </div>

            <div className="text-sm">
              <p className="font-medium">Sail</p>
              <ul className="mt-2 space-y-1 text-[var(--color-ink-muted)]">
                <li>
                  <Link href="/trips">All trips</Link>
                </li>
                <li>
                  <Link href="/destinations">Destinations</Link>
                </li>
                <li>
                  <Link href="/crew">Tailorsail Crew</Link>
                </li>
              </ul>
            </div>

            <div className="text-sm">
              <p className="font-medium">Learn</p>
              <ul className="mt-2 space-y-1 text-[var(--color-ink-muted)]">
                <li>
                  <Link href="/courses">Courses</Link>
                </li>
                <li>
                  <Link href="/destinations">Wind &amp; season guides</Link>
                </li>
              </ul>
            </div>

            <div className="text-sm">
              <p className="font-medium">Partners</p>
              <ul className="mt-2 space-y-1 text-[var(--color-ink-muted)]">
                <li>
                  <Link href="/host">List your boat</Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mx-auto max-w-6xl px-5 pb-10 text-xs text-[var(--color-ink-muted)]">
            <p>
              Tailorsail contracts charter capacity directly and sells it as a
              packaged holiday — we are the merchant of record, not an agent
              acting for the operator. Prices shown are the full amount payable;
              anything collected at the marina is itemised before you book.
            </p>
            <p className="mt-3">
              © {new Date().getFullYear()} Tailorsail. Demo build — no payments
              are processed.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
