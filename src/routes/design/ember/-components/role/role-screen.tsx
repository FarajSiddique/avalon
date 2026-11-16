import { ProtoLink as Link } from "@/design/proto-link";
import { designPaths, type RoleVariant } from "@/design/directions";
import { roleViews } from "@/design/mock";
import { ROLES } from "@/shared/roles";
import { Candle } from "../art/candle";
import { HiddenEyeIcon } from "../art/icons";
import { WaxSeal } from "../art/wax-seal";
import { ButtonLink } from "../ui/button";
import { RoleCard } from "./role-card";
import { roleKnowledge } from "./role-knowledge";

const paths = designPaths("ember");

/** One seal per player; a pressed one has confirmed. Says nothing of whom. */
function ConfirmedPips({
  confirmed,
  total,
}: {
  confirmed: number;
  total: number;
}) {
  return (
    <span className="flex items-center gap-1.5" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <WaxSeal key={i} tone={i < confirmed ? "wax" : "empty"} size={16} />
      ))}
    </span>
  );
}

export function RoleScreen({ variant }: { variant: RoleVariant }) {
  const view = roleViews[variant];
  const info = ROLES[view.you.role];
  const confirmed =
    view.phase.name === "role_reveal" ? view.phase.confirmedIds.length : 0;
  const other: RoleVariant = variant === "merlin" ? "assassin" : "merlin";

  return (
    <main className="flex flex-1 flex-col lg:mx-auto lg:grid lg:w-full lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-[auto_auto] lg:content-center lg:gap-x-16 lg:gap-y-6 lg:px-10 lg:py-10">
      <header className="mx-auto flex w-full max-w-md flex-col items-center gap-3 px-4 pt-5 text-center lg:col-start-2 lg:row-start-1 lg:items-start lg:self-end lg:px-0 lg:pt-0 lg:text-left">
        <h1 className="ember-carved text-accent-strong text-xl lg:text-3xl">
          The first night
        </h1>
        <p className="ember-well text-ink flex items-start gap-3 px-4 py-2.5 text-left">
          <HiddenEyeIcon size={24} className="text-accent mt-0.5" />
          <span>
            <strong className="ember-label text-accent-strong block text-[0.875rem]">
              Shield your screen
            </strong>
            For your eyes alone. The card turns back the moment you let go.
          </span>
        </p>
        <p className="text-ink-muted hidden text-[1.0625rem] lg:block">
          Press and hold the card, or focus it and hold Space. It also turns
          face down if you leave this page.
        </p>
      </header>

      <div className="flex items-end justify-center gap-8 px-4 pt-5 pb-6 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-center lg:p-0">
        <div className="hidden lg:block">
          <Candle height={104} className="mb-3" />
        </div>
        <RoleCard
          content={{
            name: info.name,
            alignment: info.alignment,
            summary: info.summary,
            knowledge: roleKnowledge(view),
          }}
        />
        <div className="hidden lg:block">
          <Candle height={84} className="mb-3" />
        </div>
      </div>

      <section
        aria-label="Confirm your role"
        className="ember-dock sticky bottom-0 z-10 mt-auto px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:static lg:col-start-2 lg:row-start-2 lg:mt-0 lg:self-start lg:px-6 lg:py-5"
      >
        <div className="mx-auto flex max-w-md flex-col gap-3">
          <p className="flex items-center justify-between gap-3">
            <span>
              {confirmed} of {view.players.length} have confirmed
            </span>
            <ConfirmedPips confirmed={confirmed} total={view.players.length} />
          </p>
          <ButtonLink href={paths.table("propose")}>
            I have seen my role
          </ButtonLink>
          <Link
            href={paths.role(other)}
            className="text-ink-muted flex min-h-11 items-center self-center px-3 font-sans text-sm underline underline-offset-4"
          >
            Prototype: see the {ROLES[roleViews[other].you.role].name} card
          </Link>
        </div>
      </section>
    </main>
  );
}
