import { ProtoLink as Link } from "@/design/proto-link";
import { designPaths, type RoleVariant } from "@/design/directions";
import { roleViews } from "@/design/mock";
import { ROLES } from "@/shared/roles";
import { IconArrowRight, IconEyeOff } from "../icons";
import { SoundLink } from "../sound-link";
import { RoleFace } from "./role-face";
import { SkyCard } from "./sky-card";

const paths = designPaths("starlit");

export function RoleScreen({ variant }: { variant: RoleVariant }) {
  const view = roleViews[variant];
  const confirmed =
    view.phase.name === "role_reveal" ? view.phase.confirmedIds : [];
  const other: RoleVariant = variant === "merlin" ? "assassin" : "merlin";

  return (
    <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-4 px-4 pt-6 lg:grid lg:flex-none lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:grid-rows-[auto_auto_1fr] lg:items-start lg:gap-x-14 lg:gap-y-6 lg:px-8 lg:pt-14 lg:pb-12">
      <header className="lg:col-start-1 lg:row-start-1 lg:pt-4">
        <p className="sl-eyebrow">For your eyes only</p>
        <h1 className="font-display mt-1 text-[1.875rem] leading-tight font-medium lg:text-5xl">
          Written in the stars
        </h1>
        <p className="sl-panel mt-3 flex items-start gap-3 px-4 py-3 text-base leading-snug lg:mt-5 lg:p-4 lg:text-[1.0625rem]">
          <IconEyeOff size={24} className="text-accent mt-0.5" />
          <span>
            <strong className="font-extrabold">
              Keep this screen to yourself.
            </strong>{" "}
            Look only when no one else can see.
          </span>
        </p>
      </header>

      <div className="sl-arrive sl-seq lg:col-start-2 lg:row-span-3 lg:row-start-1">
        <SkyCard>
          <RoleFace view={view} />
        </SkyCard>
      </div>

      <div className="sl-bar -mx-4 lg:col-start-1 lg:row-start-2 lg:mx-0">
        <div className="flex flex-col gap-3 lg:max-w-[26rem]">
          <p className="flex items-center justify-between gap-3 text-base font-bold">
            <span>
              {confirmed.length} of {view.players.length} have confirmed
            </span>
            <span className="flex items-center gap-1.5" aria-hidden="true">
              {view.players.map((player) => (
                <span
                  key={player.id}
                  className="sl-pip"
                  data-on={confirmed.includes(player.id)}
                />
              ))}
            </span>
          </p>
          <SoundLink
            href={paths.table("propose")}
            cue="confirm"
            className="sl-btn sl-btn--primary w-full"
          >
            I have seen my role
            <IconArrowRight size={18} />
          </SoundLink>
        </div>
      </div>

      <div className="flex justify-center pb-6 lg:col-start-1 lg:row-start-3 lg:justify-start lg:pb-0">
        <Link href={paths.role(other)} className="sl-plain">
          Prototype: show the {ROLES[roleViews[other].you.role].name} card
        </Link>
      </div>
    </main>
  );
}
