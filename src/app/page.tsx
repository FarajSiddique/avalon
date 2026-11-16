import Link from "next/link";
import { StartForm } from "./start-form";

/**
 * Placeholder landing page. It is wired to the real server, but it is styled
 * with the neutral shell on purpose: the real look comes from the design
 * direction picked at /design.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-5 py-10">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-semibold tracking-wide">
          Avalon
        </h1>
        <p className="text-ink-muted">
          Hidden loyalty for 5 to 10 players. Everyone plays on their own phone.
        </p>
      </header>
      <StartForm />
      <p className="border-line text-ink-muted border-t pt-5 text-sm">
        This screen is a working placeholder.{" "}
        <Link
          href="/design"
          className="text-accent-strong underline underline-offset-4"
        >
          Compare the three design directions
        </Link>
        .
      </p>
    </main>
  );
}
