import Link from "next/link";
import { db } from "@/lib/db";
import { Container } from "@/components/ui";

export const dynamic = "force-dynamic";

const TABS = [
  { href: "/ops", label: "Queue" },
  { href: "/ops/margin", label: "Margin" },
  { href: "/ops/pricing", label: "Pricing" },
  { href: "/ops/spend", label: "AI spend" },
];

export default async function OpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const open = await db.opsTask.count({ where: { status: "OPEN" } });

  return (
    <div className="bg-[var(--color-surface-sunk)] min-h-full">
      <div className="border-b border-[var(--color-line)] bg-white">
        <Container className="py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
                Internal
              </p>
              <h1 className="font-[family-name:var(--font-display)] text-2xl">
                Operations
              </h1>
            </div>
            <p className="text-sm text-[var(--color-ink-muted)]">
              {open} open {open === 1 ? "item" : "items"}
            </p>
          </div>

          <nav className="mt-4 flex flex-wrap gap-1">
            {TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="rounded-full px-4 py-1.5 text-sm text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-surface-sunk)] hover:text-navy-900"
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </Container>
      </div>

      {children}
    </div>
  );
}
