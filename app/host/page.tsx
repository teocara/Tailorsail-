import { isConfigured } from "@/lib/ai/client";
import { submitHostApplication } from "@/app/actions/host";
import {
  AiNotice,
  Button,
  Card,
  Container,
  Eyebrow,
  Section,
} from "@/components/ui";
import { perRequest } from "@/lib/render-mode";
import { IS_STATIC, liveAction } from "@/lib/static-mode";
import { DemoNotice } from "@/components/demo-notice";

export const metadata = {
  title: "List your boat",
  description:
    "Charter companies and private owners: list with Tailorsail. Write about your boat however you like — we do the paperwork.",
};

const EXAMPLE = `I run a Bavaria Cruiser 46 out of ACI Marina Split. She's a 2019 boat, refitted last year — four cabins, two heads, sleeps eight. Bimini, bow thruster, chart plotter, and a paddleboard aboard.

I've been chartering since 2011 and I have three other boats in the fleet. Usually skippered but I'll do bareboat for crews with a licence. Insurance runs to next March through Croatia Osiguranje, licence number HR-CH-4471.

I could offer you six or seven weeks across June to September and I'd be flexible on the shoulder months if you can fill them.`;

export default async function HostPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await perRequest();
  // Reading searchParams would make this page dynamic, which the static build
  // cannot do. Nothing can fail there anyway — the form does not submit.
  const query = IS_STATIC ? {} : await searchParams;
  const error = typeof query.error === "string" ? query.error : null;

  return (
    <>
      <Section className="border-b border-[var(--color-line)]">
        <Container>
          <Eyebrow>For operators and owners</Eyebrow>
          <h1 className="mt-2 max-w-2xl text-4xl">
            Tell us about your boat. We&rsquo;ll do the form-filling.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[var(--color-ink-muted)]">
            No twenty-field listing wizard. Write about the boat the way you
            would describe it to someone in the marina, paste in whatever
            documents you have, and we will pull out the details and tell you
            exactly what else we need.
          </p>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-start">
            <form
              action={liveAction(submitHostApplication)}
              className="space-y-6"
            >
              {error ? (
                <div className="rounded-[var(--radius-card)] border border-[#eec7c7] bg-[#fbeaea] px-4 py-3 text-sm text-[#8a2626]">
                  {error}
                </div>
              ) : null}

              <Card className="p-6">
                <h2 className="font-[family-name:var(--font-display)] text-xl">
                  You
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Your name" htmlFor="contactName">
                    <input
                      id="contactName"
                      name="contactName"
                      required
                      className="input"
                    />
                  </Field>
                  <Field label="Email" htmlFor="contactEmail">
                    <input
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                      required
                      className="input"
                    />
                  </Field>
                  <Field
                    label="Company"
                    htmlFor="companyName"
                    hint="Leave blank if you are a private owner."
                  >
                    <input
                      id="companyName"
                      name="companyName"
                      className="input"
                    />
                  </Field>
                  <Field label="Home port or marina" htmlFor="homePort">
                    <input
                      id="homePort"
                      name="homePort"
                      required
                      placeholder="ACI Marina Split"
                      className="input"
                    />
                  </Field>
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="font-[family-name:var(--font-display)] text-xl">
                  The boat
                </h2>
                <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                  Make, model, year, cabins, berths, what is aboard, how you
                  charter it, and roughly which weeks you could offer. Prose is
                  fine — the messier the better, honestly.
                </p>
                <div className="mt-4">
                  <label htmlFor="submission" className="sr-only">
                    About the boat
                  </label>
                  <textarea
                    id="submission"
                    name="submission"
                    required
                    rows={12}
                    placeholder={EXAMPLE}
                    className="input"
                  />
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="font-[family-name:var(--font-display)] text-xl">
                  Documents
                </h2>
                <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                  Paste the text of anything you have — insurance certificate,
                  charter licence, safety inventory. We will read it and tell
                  you what is still missing rather than sending you a checklist
                  to work through.
                </p>
                <div className="mt-4">
                  <label htmlFor="documents" className="sr-only">
                    Document text
                  </label>
                  <textarea
                    id="documents"
                    name="documents"
                    rows={6}
                    placeholder="Optional. Paste document text here."
                    className="input"
                  />
                </div>
              </Card>

              {!isConfigured() ? (
                <AiNotice>
                  <strong className="font-medium">
                    Automatic extraction is off.
                  </strong>{" "}
                  Without <code>ANTHROPIC_API_KEY</code> your application is
                  still submitted and still reaches a human — it just arrives
                  without the structured listing and the gap analysis.
                </AiNotice>
              ) : null}

              {IS_STATIC ? (
                <DemoNotice detail="Locally this extracts a structured listing from whatever you write and names the exact documents still missing for your boat." />
              ) : null}
              <Button type="submit" disabled={IS_STATIC}>
                Send application
              </Button>
            </form>

            {/* ------------------------------------------------ Explainer */}
            <div className="space-y-5 lg:sticky lg:top-6">
              <Card className="p-6">
                <h2 className="font-[family-name:var(--font-display)] text-lg">
                  What happens next
                </h2>
                <ol className="mt-4 space-y-4 text-sm">
                  {[
                    {
                      n: "1",
                      t: "We read it",
                      d: "Your description is turned into a structured listing — boat spec, suggested trip, commercial terms.",
                    },
                    {
                      n: "2",
                      t: "You get a specific list",
                      d: "Not a generic checklist. The exact documents still missing for your boat, named individually.",
                    },
                    {
                      n: "3",
                      t: "A person checks it",
                      d: "Someone reads the extraction next to what you actually wrote before anything goes live. Nothing is published by a machine.",
                    },
                    {
                      n: "4",
                      t: "We build and price the trips",
                      d: "Itineraries, the preparation programme, and the pricing. You confirm availability; we handle the rest.",
                    },
                  ].map((step) => (
                    <li key={step.n} className="flex gap-3">
                      <span className="font-[family-name:var(--font-display)] text-lg text-[var(--accent-strong)]">
                        {step.n}
                      </span>
                      <span>
                        <span className="block font-medium">{step.t}</span>
                        <span className="mt-0.5 block text-[var(--color-ink-muted)]">
                          {step.d}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </Card>

              <Card className="p-6">
                <h2 className="font-[family-name:var(--font-display)] text-lg">
                  What we need to verify you
                </h2>
                <ul className="mt-3 space-y-2 text-sm text-[var(--color-ink-muted)]">
                  <li>Charter licence reference</li>
                  <li>
                    Insurance certificate with an expiry date, covering
                    commercial charter
                  </li>
                  <li>
                    Safety equipment declaration — liferaft service date,
                    flares, lifejacket count
                  </li>
                </ul>
                <p className="mt-4 text-xs text-[var(--color-ink-muted)]">
                  We re-check these as they approach expiry, and listings pause
                  automatically if cover lapses. It is not bureaucracy for its
                  own sake — it is the thing we promise travellers, so it is the
                  thing we have to actually do.
                </p>
              </Card>

              <Card className="p-6">
                <h2 className="font-[family-name:var(--font-display)] text-lg">
                  How we work commercially
                </h2>
                <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                  We buy capacity at an agreed net rate and sell it as a
                  packaged holiday — we are the merchant, not an agent taking a
                  commission on your price. You get a firm booking and a single
                  invoice; we carry the marketing, the customer support and the
                  risk on anything we pre-commit to.
                </p>
              </Card>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {hint ? (
        <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{hint}</p>
      ) : null}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
