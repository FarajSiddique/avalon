import { MAX_PLAYERS, MIN_PLAYERS } from "@/shared/constants";
import { StartForm } from "./_components/landing/start-form";
import {
  DuskScene,
  SCENE_COMPACT,
  SCENE_WIDE,
} from "./_components/pixel/dusk-scene";
import { DialogBox } from "./_components/ui/panel";

export default function LandingPage() {
  return (
    <main className="relative flex-1 overflow-hidden lg:min-h-[calc(100dvh-44px)]">
      {/* The hero illustration. Decorative: the heading carries the meaning. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[calc(var(--px)*168)] overflow-hidden lg:inset-0 lg:h-auto"
      >
        <DuskScene
          layout={SCENE_COMPACT}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 md:hidden"
        />
        <DuskScene
          layout={SCENE_WIDE}
          className="absolute bottom-0 left-1/2 hidden -translate-x-1/2 md:block"
        />
      </div>

      <div className="relative mx-auto flex w-full max-w-[520px] flex-col px-4 pb-10 lg:mx-0 lg:ml-[max(64px,calc(50vw-640px))] lg:max-w-[500px] lg:px-0 lg:py-16">
        <header className="flex min-h-[calc(var(--px)*158)] flex-col items-center pt-8 text-center md:items-start md:text-left lg:min-h-0 lg:pt-0">
          <h1 className="lv-wordmark uppercase lg:text-[72px]">Avalon</h1>
          <p className="mt-5 max-w-[340px] lg:mt-8 lg:max-w-[460px] lg:text-[26px]">
            <span className="bg-canvas box-decoration-clone px-2 py-0.5">
              A game of hidden loyalty.
              <br />
              Five quests. Traitors at the fire.
            </span>
          </p>
        </header>

        <DialogBox speaker="Who goes there?" className="lg:mt-12">
          <StartForm />
        </DialogBox>

        <p className="lv-small bg-canvas text-ink-muted mt-6 self-center px-3 py-2 text-center md:self-start md:text-left">
          For {MIN_PLAYERS} to {MAX_PLAYERS} players in one room, each on their
          own phone.
        </p>
      </div>
    </main>
  );
}
