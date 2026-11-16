import { Link, createFileRoute } from "@tanstack/react-router";
import {
  DIRECTIONS,
  STARLIT_MOTION_PATH,
  TABLE_STEPS,
  TABLE_STEP_LABELS,
  designPaths,
  type DirectionSlug,
} from "@/design/directions";
import { ProtoLink } from "@/design/proto-link";

export const Route = createFileRoute("/design/")({
  head: () => ({ meta: [{ title: "Design directions · Avalon" }] }),
  component: DesignIndexPage,
});

/** The direction the owner picked on 16 November 2026. */
const CHOSEN: DirectionSlug = "starlit";

/** What each direction is best and worst at, from reviewing all three. */
const VERDICTS: Record<
  DirectionSlug,
  { strengths: string[]; costs: string[]; inspiration: string }
> = {
  ember: {
    inspiration: "Closest to the candlelit table image.",
    strengths: [
      "The phone becomes the table: seats sit around a glowing rune circle, which is the game's own shape.",
      "The most medieval and the most secretive of the three. It looks like nothing else.",
      "Serif text on dark wood stays easy to read at phone size.",
    ],
    costs: [
      "The heaviest to draw: wood grain, glows and several slow animations. Needs a check on older phones.",
      "The most custom CSS to carry forward.",
    ],
  },
  lavender: {
    inspiration: "Closest to the pixel-art knight and campfire image.",
    strengths: [
      "The most charm and the strongest first impression.",
      "Flat colours and hard edges are cheap to render and very consistent.",
    ],
    costs: [
      "Pixel type is slower to read, and this game has a lot to read in private (roles, who knows whom).",
      "Every new screen needs new hand-made sprite art.",
      "Seat layouts are tuned for 7 players and need rules for 8 to 10.",
    ],
  },
  starlit: {
    inspiration: "Closest to the starry night camp image.",
    strengths: [
      "The clearest and calmest to read. The easiest to extend to new screens.",
      "The landing illustration is the prettiest single picture of the three.",
      "The only one with motion and sound so far: clouds part over your role, votes turn together, the moon rises on a quest.",
    ],
    costs: [
      "The least medieval. The motion gives it more character, but at rest it can still read as a well-made modern dark app.",
      "Seats as a constellation look good but feel less like sitting at a table.",
      "The sound was checked by measurement only. It needs a listen on a real phone.",
    ],
  },
};

function ScreenLinks({ slug }: { slug: DirectionSlug }) {
  const paths = designPaths(slug);
  const links = [
    { label: "Landing", href: paths.landing },
    { label: "Lobby", href: paths.lobby },
    { label: "Role: Merlin", href: paths.role("merlin") },
    { label: "Role: Assassin", href: paths.role("assassin") },
    ...TABLE_STEPS.map((step) => ({
      label: TABLE_STEP_LABELS[step],
      href: paths.table(step),
    })),
    ...(slug === "starlit"
      ? [{ label: "Motion and sound", href: STARLIT_MOTION_PATH }]
      : []),
  ];
  return (
    <ul className="flex flex-wrap gap-2">
      {links.map((link) => (
        <li key={link.href}>
          <ProtoLink
            href={link.href}
            className="border-line hover:border-line-strong hover:bg-well flex min-h-11 items-center rounded-md border px-3 text-sm transition-colors"
          >
            {link.label}
          </ProtoLink>
        </li>
      ))}
    </ul>
  );
}

/** A live, scaled-down phone view of the direction's landing page. */
function PhonePreview({ slug, name }: { slug: DirectionSlug; name: string }) {
  return (
    <div
      className="border-line-strong bg-well mx-auto h-[468px] w-[234px] overflow-hidden rounded-[22px] border-2"
      aria-hidden
    >
      <iframe
        src={designPaths(slug).landing}
        title={`${name} landing page preview`}
        loading="lazy"
        tabIndex={-1}
        className="pointer-events-none h-[780px] w-[390px] origin-top-left scale-[0.6] border-0"
      />
    </div>
  );
}

function DesignIndexPage() {
  const chosen = DIRECTIONS.find((d) => d.slug === CHOSEN);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
      <header className="max-w-3xl space-y-3">
        <p className="text-ink-muted text-sm">
          <Link to="/" className="underline underline-offset-4">
            Avalon
          </Link>{" "}
          / Design directions
        </p>
        <h1 className="font-display text-4xl font-semibold">
          Three design directions
        </h1>
        <p className="text-ink-muted text-lg">
          Each one is a working prototype of the same screens with the same mock
          game: landing, lobby, private role reveal and the table through one
          full round. Open them on a phone and on a laptop, click through, and
          pick one.
        </p>
      </header>

      <section
        aria-labelledby="recommendation"
        className="border-accent bg-surface mt-8 max-w-3xl space-y-3 rounded-lg border-l-4 p-5"
      >
        <h2 id="recommendation" className="text-xl font-semibold">
          Chosen: {chosen?.name}
        </h2>
        <p>
          The owner picked this direction. It has motion and sound at every
          stage of a game: see all 35 moments, each replayable, in the{" "}
          <ProtoLink
            href={STARLIT_MOTION_PATH}
            className="text-accent-strong font-semibold underline underline-offset-4"
          >
            motion and sound gallery
          </ProtoLink>
          . Sound is off until you turn it on.
        </p>
        <p className="text-ink-muted">
          The other two stay here for comparison until the real screens are
          built from Starlit Vale. The first review recommended Ember &amp; Rune
          for being the most medieval; the strengths and costs of each are
          listed below.
        </p>
      </section>

      <ul className="mt-10 grid gap-6 lg:grid-cols-3">
        {DIRECTIONS.map((direction) => {
          const verdict = VERDICTS[direction.slug];
          const isPick = direction.slug === CHOSEN;
          return (
            <li
              key={direction.slug}
              className={`bg-surface flex flex-col gap-5 rounded-lg border p-5 ${
                isPick ? "border-accent" : "border-line"
              }`}
            >
              <div className="space-y-1">
                <p className="text-ink-muted text-sm">
                  {direction.style}
                  {isPick && (
                    <span className="text-accent-strong font-semibold">
                      {" "}
                      · Chosen
                    </span>
                  )}
                </p>
                <h2 className="font-display text-2xl font-semibold">
                  {direction.name}
                </h2>
                <p>{direction.summary}</p>
                <p className="text-ink-muted text-sm">{verdict.inspiration}</p>
              </div>

              <PhonePreview slug={direction.slug} name={direction.name} />

              <ProtoLink
                href={designPaths(direction.slug).landing}
                className="bg-accent text-on-accent hover:bg-accent-strong flex min-h-12 items-center justify-center rounded-md px-4 font-semibold transition-colors"
              >
                Open {direction.name}
              </ProtoLink>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Strengths</h3>
                <ul className="text-ink-muted list-disc space-y-1 pl-5 text-sm">
                  {verdict.strengths.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Costs</h3>
                <ul className="text-ink-muted list-disc space-y-1 pl-5 text-sm">
                  {verdict.costs.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto space-y-2">
                <h3 className="text-sm font-semibold">Jump to a screen</h3>
                <ScreenLinks slug={direction.slug} />
              </div>

              <p className="text-ink-muted text-sm">
                Spec: <code>docs/design/{direction.slug}.md</code>
              </p>
            </li>
          );
        })}
      </ul>

      <footer className="text-ink-muted mt-10 max-w-3xl space-y-2 text-sm">
        <p>
          All three use the same token names, the same mock data and the same
          press-and-hold privacy behaviour, so the differences you see are
          design, not features. Screenshots of every screen at 390px and 1440px
          are in <code>docs/design/screenshots</code>.
        </p>
      </footer>
    </main>
  );
}
