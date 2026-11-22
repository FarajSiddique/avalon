import { createFileRoute } from "@tanstack/react-router";
import { LandingArt } from "./-components/landing-art";
import { LandingForm } from "./-components/landing-form";
import { useStage } from "./-components/stage/stage-context";
import { TitleMark } from "./-components/title-mark";

function StarlitLandingPage() {
  const { leaving } = useStage();
  return (
    <main
      className="sl-landing relative flex flex-1 flex-col lg:justify-center"
      data-leaving={leaving}
    >
      <header className="relative z-10 px-4 pt-7 pb-1 lg:px-[max(4rem,7vw)] lg:pt-0">
        <TitleMark />
        <p className="text-ink sl-rise sl-seq sl-title__lead mt-3 max-w-[30rem] text-[1.0625rem] leading-relaxed lg:text-xl">
          Knights and traitors share one fire, and five quests decide the realm.
          For 5 to 10 players, each on their own phone.
        </p>
      </header>

      {/* The stage's place: a band between the title and the form on a phone, the whole backdrop on a wide screen. */}
      <LandingArt className="-mt-6 block h-[19rem] w-full flex-none lg:absolute lg:inset-0 lg:mt-0 lg:h-full" />

      <div className="relative z-10 flex-1 bg-[var(--art-ground-dark)] px-4 pb-8 lg:flex-none lg:bg-transparent lg:px-[max(4rem,7vw)] lg:pb-0">
        <div className="sl-panel sl-rise sl-seq sl-title__panel -mt-8 w-full p-5 lg:mt-8 lg:max-w-[27rem] lg:p-6">
          <LandingForm />
        </div>
      </div>
    </main>
  );
}

export const Route = createFileRoute("/design/starlit/")({
  component: StarlitLandingPage,
});
