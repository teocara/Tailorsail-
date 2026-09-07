import { db } from "@/lib/db";
import { filtersFromSearchParams, findTrips } from "@/lib/trips";
import { SearchBox } from "@/components/search-box";
import { TripBrowser } from "@/components/trip-browser";
import { Container, Eyebrow, Section } from "@/components/ui";
import { perRequest } from "@/lib/render-mode";
import { BASE_PATH, IS_STATIC } from "@/lib/static-mode";

export const metadata = { title: "Trips" };

type SearchParams = Record<string, string | string[] | undefined>;

/** Collapse the repeated-key form into the flat shape the browser works with. */
function flatten(params: SearchParams): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    flat[key] = Array.isArray(value) ? value[0] : value;
  }
  return flat;
}

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await perRequest();
  // The static build ships the unfiltered catalogue and applies facets in the
  // browser, because reading searchParams here would make the page dynamic.
  const params = flatten(IS_STATIC ? {} : await searchParams);
  const filters = filtersFromSearchParams(params);

  const query = params.q ?? "";

  const [trips, destinations] = await Promise.all([
    findTrips({ ...filters, sort: filters.sort ?? "recommended" }),
    db.destination.findMany({
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <>
      <Section className="!py-10">
        <Container>
          <Eyebrow>Trips</Eyebrow>
          <div className="mt-2">
            <TripBrowser
              initialTrips={trips}
              initialParams={params}
              destinations={destinations}
              indexUrl={IS_STATIC ? `${BASE_PATH}/trip-index.json` : undefined}
              searchBox={<SearchBox defaultValue={query} compact />}
            />
          </div>
        </Container>
      </Section>
    </>
  );
}
