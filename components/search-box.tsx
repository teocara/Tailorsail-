"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { searchTrips } from "@/app/actions/search";
import { parseQueryWithoutAi } from "@/lib/search-fallback";
import { searchParamsFromFilters } from "@/lib/trip-filters";
import { IS_STATIC, liveAction } from "@/lib/static-mode";

const EXAMPLES = [
  "Croatia in August, six friends, none of us have sailed",
  "Somewhere with volcanoes and a night sail",
  "Ibiza, solo, late twenties, want to meet people",
];

/**
 * The natural-language search box.
 *
 * A plain form posting to a server action, so it works without JavaScript and
 * the result is a real URL rather than client state.
 *
 * The static build has no action to post to, so it runs the same keyword
 * parser in the browser and navigates to the URL that parser produces. That is
 * not a reduced version of the feature: `parseQueryWithoutAi` is already what
 * runs whenever `ANTHROPIC_API_KEY` is unset, which is how the published demo
 * runs anyway — and the parser is pure, so it is the identical code path, just
 * executed a few hundred milliseconds earlier.
 */
export function SearchBox({
  defaultValue = "",
  compact = false,
}: {
  defaultValue?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  /** Static build only — the server build lets the form action do the work. */
  function searchHere(query: string) {
    const trimmed = query.trim();
    if (!trimmed) {
      router.push("/trips");
      return;
    }
    const { filters, rationale } = parseQueryWithoutAi(trimmed);
    const params = searchParamsFromFilters(filters);
    params.set("q", trimmed);
    params.set("why", rationale);
    params.set("parser", "keyword");
    router.push(`/trips?${params.toString()}`);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>, query: string) {
    if (!IS_STATIC) return; // let the server action handle it
    event.preventDefault();
    searchHere(query);
  }

  return (
    <div>
      <form
        action={liveAction(searchTrips)}
        onSubmit={(e) => onSubmit(e, value)}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <label htmlFor="q" className="sr-only">
          Describe the sailing holiday you want
        </label>
        <input
          id="q"
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Describe the trip you want — where, when, who with"
          className="w-full flex-1 rounded-full border border-[var(--color-line)] bg-white px-5 py-3 text-sm outline-none placeholder:text-[var(--color-ink-muted)] focus:border-[var(--accent-strong)]"
        />
        <button
          type="submit"
          className="rounded-full bg-[var(--accent-strong)] px-6 py-3 text-sm font-medium text-[var(--accent-contrast)] transition-opacity hover:opacity-90"
        >
          Find trips
        </button>
      </form>

      {!compact ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <form
              key={example}
              action={liveAction(searchTrips)}
              onSubmit={(e) => onSubmit(e, example)}
            >
              <input type="hidden" name="q" value={example} />
              <button
                type="submit"
                className="rounded-full border border-[var(--color-line)] bg-white/70 px-3 py-1 text-xs text-[var(--color-ink-muted)] transition-colors hover:border-[var(--accent-strong)] hover:text-navy-900"
              >
                {example}
              </button>
            </form>
          ))}
        </div>
      ) : null}
    </div>
  );
}
