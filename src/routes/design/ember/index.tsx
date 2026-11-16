import { createFileRoute } from "@tanstack/react-router";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/shared/constants";
import { HeroTable } from "./-components/art/hero-table";
import { StartForm } from "./-components/landing/start-form";
import { Frame } from "./-components/ui/frame";

function EmberLandingPage() {
  return (
    <main className="mx-auto grid w-full max-w-md flex-1 content-start gap-6 px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] lg:max-w-6xl lg:grid-cols-[1.15fr_minmax(0,26rem)] lg:content-center lg:items-center lg:gap-16 lg:px-10 lg:py-10">
      <div className="flex flex-col items-center gap-4 text-center lg:gap-8">
        <HeroTable className="max-w-sm lg:max-w-2xl" />
        <div className="flex flex-col items-center gap-2 lg:gap-4">
          <h1 className="ember-wordmark text-[3.25rem] leading-none lg:text-[6.5rem]">
            Avalon
          </h1>
          <p className="ember-label text-accent-strong lg:text-base">
            Hidden loyalty by candlelight
          </p>
          <p className="text-ink max-w-[30ch] text-pretty lg:max-w-[38ch] lg:text-2xl">
            Five quests. Good against Evil. Someone at this table is lying. For{" "}
            {MIN_PLAYERS} to {MAX_PLAYERS} players in one room, each on their
            own phone.
          </p>
        </div>
      </div>

      <Frame
        aria-label="Take a seat"
        className="px-5 pt-7 pb-6 lg:px-8 lg:py-9"
      >
        <StartForm />
      </Frame>
    </main>
  );
}

export const Route = createFileRoute("/design/ember/")({
  component: EmberLandingPage,
});
