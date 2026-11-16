import Link from "next/link";
import { designPaths, type RoleVariant } from "@/design/directions";
import { roleViews } from "@/design/mock";
import { PixelIcon } from "../pixel/pixel-sprite";
import { ActionBar } from "../ui/action-bar";
import { DialogBox } from "../ui/panel";
import { Pips } from "../ui/pips";
import { PixelLink } from "../ui/pixel-button";
import { SceneFooter } from "../ui/scene-footer";
import { RoleCard } from "./role-card";

const paths = designPaths("lavender");

export function RoleScreen({ variant }: { variant: RoleVariant }) {
  const view = roleViews[variant];
  const confirmed =
    view.phase.name === "role_reveal" ? view.phase.confirmedIds.length : 0;
  const other: RoleVariant = variant === "merlin" ? "assassin" : "merlin";

  return (
    <>
      <main className="mx-auto flex w-full max-w-[520px] flex-1 flex-col gap-6 px-4 pt-5 pb-[190px] lg:grid lg:max-w-[1040px] lg:grid-cols-[minmax(0,1fr)_480px] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-16 lg:gap-y-8 lg:px-10 lg:pt-14 lg:pb-12">
        <div className="flex flex-col gap-6 lg:col-start-1 lg:row-start-1 lg:gap-10">
          <div>
            <p className="lv-label text-ink-muted">Night falls on the camp</p>
            <h1 className="lv-title mt-2">Your role</h1>
          </div>
          <DialogBox speaker="For your eyes only" className="p-4 pt-6">
            <p className="flex items-start gap-3">
              <PixelIcon name="eye" className="text-accent-strong mt-1" />
              <span>
                Shield your screen. The card shows only while you hold it.
              </span>
            </p>
          </DialogBox>
        </div>

        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <RoleCard view={view} />
        </div>

        <ActionBar className="lg:col-start-1 lg:row-start-2">
          <p className="flex items-center justify-between gap-3">
            <span>
              {confirmed} of {view.players.length} have confirmed
            </span>
            <Pips
              filled={confirmed}
              total={view.players.length}
              className="text-success"
            />
          </p>
          <PixelLink href={paths.table("propose")} variant="primary">
            I have seen my role
          </PixelLink>
          <Link href={paths.role(other)} className="lv-link self-center">
            Prototype: show the {other === "merlin" ? "Merlin" : "Assassin"}{" "}
            card
          </Link>
        </ActionBar>
      </main>
      <SceneFooter />
    </>
  );
}
