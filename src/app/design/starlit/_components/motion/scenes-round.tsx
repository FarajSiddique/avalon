"use client";

import type { CSSProperties } from "react";
import type { PlayerId, Vote } from "@/shared/views";
import { IconApprove, IconArrowRight, IconReject } from "../icons";
import { LockedNote } from "../table/stages";
import type { SeatStatus } from "../table/seat-ring";
import { Cue, Moment } from "./moment";
import { IDS, PLAYERS, RingScene, SceneLine, YOU } from "./scene-kit";
import { useBeats, type SceneProps } from "./use-beats";

const TEAM = [IDS.wren, IDS.mira, IDS.bram];

function chosen(ids: readonly PlayerId[]): Record<PlayerId, SeatStatus> {
  return Object.fromEntries(ids.map((id) => [id, "chosen" as const]));
}

/* --------------------------------------------------------- team proposal */

function CrownArrives(scene: SceneProps) {
  useBeats(scene, [{ at: 250, cue: "crown" }]);
  return <RingScene crown="arrive" label="Seats. Wren leads." />;
}

export function CrownMoment() {
  return (
    <Moment
      title="The leader's crown arrives"
      length={1000}
      stageClassName="min-h-[19rem]"
      notes={{
        moves: (
          <>
            The crown drops onto the leader&apos;s star from just above,
            overshoots a hair and settles.
          </>
        ),
        timing: <>600ms spring (slight overshoot), after 200ms.</>,
        sound: (
          <>
            <Cue>crown</Cue>: two high chimes with a glint of air.
          </>
        ),
        why: (
          <>
            Each round starts by answering &quot;whose turn is it?&quot;. The
            eye goes to the crown first. Played when the proposal step opens.
          </>
        ),
      }}
    >
      {(scene) => <CrownArrives {...scene} />}
    </Moment>
  );
}

const PICKS = [IDS.wren, IDS.mira];

function PickSeat(scene: SceneProps) {
  const beat = useBeats(scene, [
    { at: 300, cue: "pick", index: 0 },
    { at: 1000, cue: "pick", index: 1 },
  ]);
  const lit = PICKS.slice(0, beat);
  return <RingScene litIds={lit} status={chosen(lit)} label="Seats" />;
}

export function PickMoment() {
  return (
    <Moment
      title="Picking a seat"
      length={1700}
      stageClassName="min-h-[19rem]"
      notes={{
        moves: (
          <>
            The star fills with firelight, four rays turn out from behind it,
            one ring flares, and a line grows to it from the star lit before.
            &quot;Chosen&quot; pops in under the name.
          </>
        ),
        timing: (
          <>
            Fill and rays 250ms, ring 560ms, line 420ms, all ease-out; label
            250ms spring.
          </>
        ),
        sound: (
          <>
            <Cue>pick</Cue>: a harp note that climbs one step for each pick.
          </>
        ),
        why: (
          <>
            Everyone watching the shared screen sees the team take shape, in the
            order the leader built it.
          </>
        ),
      }}
    >
      {(scene) => <PickSeat {...scene} />}
    </Moment>
  );
}

function Unpick(scene: SceneProps) {
  const beat = useBeats(scene, [{ at: 400, cue: "unpick" }]);
  const lit = beat >= 1 ? PICKS : TEAM;
  return <RingScene litIds={lit} status={chosen(lit)} label="Seats" />;
}

export function UnpickMoment() {
  return (
    <Moment
      title="Unpicking"
      length={900}
      stageClassName="min-h-[19rem]"
      notes={{
        moves: (
          <>
            The rays fold back in and turn away, the fill fades to night, and
            the lines to that star go out.
          </>
        ),
        timing: <>250ms ease-out. Lines go at once.</>,
        sound: (
          <>
            <Cue>unpick</Cue>: one low, muted harp note.
          </>
        ),
        why: <>Undoing is quieter and smaller than doing.</>,
      }}
    >
      {(scene) => <Unpick {...scene} />}
    </Moment>
  );
}

function TeamComplete(scene: SceneProps) {
  const beat = useBeats(scene, [
    { at: 300, cue: "pick", index: 2 },
    { at: 500, cue: "team-complete" },
  ]);
  const lit = beat >= 1 ? TEAM : PICKS;
  const complete = lit.length === 3;
  return (
    <div className="grid content-center">
      <RingScene litIds={lit} status={chosen(lit)} label="Seats" />
      <div className="flex flex-col gap-2.5 px-4 pb-4">
        <SceneLine>
          <span key={lit.length} className="sl-pop sl-seq inline-block">
            {lit.length}
          </span>{" "}
          of 3 chosen
        </SceneLine>
        {complete ? (
          <span className="sl-btn sl-btn--primary sl-wake sl-seq w-full">
            Propose team
            <IconArrowRight size={18} />
          </span>
        ) : (
          <span className="sl-btn sl-btn--primary w-full" aria-disabled="true">
            Propose team
          </span>
        )}
      </div>
    </div>
  );
}

export function TeamCompleteMoment() {
  return (
    <Moment
      title="The team complete"
      length={1500}
      stageClassName="min-h-[26rem]"
      notes={{
        moves: (
          <>
            The last star lights and closes the triangle, the count pops to
            &quot;3 of 3&quot;, and Propose wakes with one bloom.
          </>
        ),
        timing: <>Line 420ms; bloom 900ms from 120ms.</>,
        sound: (
          <>
            <Cue>pick</Cue> then <Cue>team-complete</Cue>: three chimes
            together, D, F# and A, a resolved chord.
          </>
        ),
        why: (
          <>The leader knows they can send it now, without reading the count.</>
        ),
      }}
    >
      {(scene) => <TeamComplete {...scene} />}
    </Moment>
  );
}

function Proposing(scene: SceneProps) {
  const beat = useBeats(scene, [{ at: 300, cue: "propose" }, { at: 450 }]);
  const sent = beat >= 2;
  return (
    <div className="grid content-center">
      {/* Remounting the ring replays the team lighting: the team goes out. */}
      <RingScene key={String(sent)} litIds={TEAM} status={chosen(TEAM)} />
      <div className="flex flex-col gap-2.5 px-4 pb-4">
        {sent ? (
          <SceneLine at={0}>Proposed. Everyone votes now.</SceneLine>
        ) : (
          <span
            className="sl-btn sl-btn--primary w-full"
            data-pressed={beat === 1}
          >
            Propose team
            <IconArrowRight size={18} />
          </span>
        )}
      </div>
    </div>
  );
}

export function ProposeMoment() {
  return (
    <Moment
      title="Proposing"
      length={1300}
      stageClassName="min-h-[26rem]"
      notes={{
        moves: (
          <>
            The button blooms; the team&apos;s stars flare again and their lines
            redraw as the vote opens.
          </>
        ),
        timing: <>Press 60ms, release 450ms; stars and lines 420 to 560ms.</>,
        sound: (
          <>
            <Cue>propose</Cue>: a soft upward slide and a bright chime.
          </>
        ),
        why: <>Hands the team from the leader to the table.</>,
      }}
    >
      {(scene) => <Proposing {...scene} />}
    </Moment>
  );
}

/* --------------------------------------------------------------- the vote */

function LockVote(scene: SceneProps) {
  const beat = useBeats(scene, [{ at: 450, cue: "vote-lock" }]);
  const locked = beat >= 1;
  return (
    <div className="grid content-center gap-2.5 px-4 py-4">
      <SceneLine>{locked ? 4 : 3} of 7 have voted</SceneLine>
      {locked ? (
        <LockedNote>
          Your vote is locked:
          <span className="text-success inline-flex items-center gap-1">
            <IconApprove size={18} />
            Approve
          </span>
        </LockedNote>
      ) : (
        <div className="flex gap-3">
          <span className="sl-choice sl-choice--approve">
            <IconApprove size={28} />
            Approve
          </span>
          <span className="sl-choice sl-choice--reject">
            <IconReject size={28} />
            Reject
          </span>
        </div>
      )}
    </div>
  );
}

export function LockMoment() {
  return (
    <Moment
      title="Locking your vote"
      length={1100}
      stageClassName="min-h-[10rem]"
      notes={{
        moves: (
          <>
            The two choices give way to one line that rises into place, and the
            lock&apos;s shackle drops shut. Your own seat changes from Waiting
            to Voted.
          </>
        ),
        timing: <>Rise 250ms; shackle 340ms spring, 120ms later.</>,
        sound: (
          <>
            <Cue>vote-lock</Cue>: a soft low knock and one chime, and a 14ms
            buzz on Android. Exactly the same for Approve and Reject, because
            the people beside you can hear it.
          </>
        ),
        why: <>Your choice is final, and the phone says so.</>,
      }}
    >
      {(scene) => <LockVote {...scene} />}
    </Moment>
  );
}

/** The order votes come in: not seat order, so nothing can be read into it. */
const ARRIVALS: readonly PlayerId[] = [
  IDS.ansel,
  IDS.kay,
  IDS.tobias,
  YOU,
  IDS.bram,
  IDS.isolde,
  IDS.mira,
];

function VotesArriving(scene: SceneProps) {
  const beat = useBeats(
    scene,
    ARRIVALS.map((_, index) => ({
      at: 250 + index * 330,
      cue: "vote-in" as const,
      index,
    })),
  );
  const voted = ARRIVALS.slice(0, beat);
  const status = Object.fromEntries(
    PLAYERS.map((player): [PlayerId, SeatStatus] => [
      player.id,
      voted.includes(player.id) ? "voted" : "waiting",
    ]),
  );
  return (
    <div className="grid content-center">
      <RingScene litIds={TEAM} status={status} />
      <SceneLine className="px-4 pb-4">
        <span key={voted.length} className="sl-pop sl-seq inline-block">
          {voted.length}
        </span>{" "}
        of 7 have voted
      </SceneLine>
    </div>
  );
}

export function VotesArrivingMoment() {
  return (
    <Moment
      title="Votes arriving"
      length={2700}
      stageClassName="min-h-[22rem]"
      notes={{
        moves: (
          <>
            Each seat&apos;s turning dashed ring pops into a tick and
            &quot;Voted&quot;. The count pops up. How anyone voted stays hidden.
          </>
        ),
        timing: <>250ms spring per seat, as each vote arrives.</>,
        sound: (
          <>
            <Cue>vote-in</Cue>: a tiny muted tick, the same for every vote.
          </>
        ),
        why: (
          <>
            Shows who the table is still waiting for, without giving away a
            single vote.
          </>
        ),
      }}
    >
      {(scene) => <VotesArriving {...scene} />}
    </Moment>
  );
}

const VOTED_SO_FAR = new Set<string>([IDS.ansel, IDS.kay, IDS.tobias, YOU]);

function TheWait() {
  const status = Object.fromEntries(
    PLAYERS.map((player): [PlayerId, SeatStatus] => [
      player.id,
      VOTED_SO_FAR.has(player.id) ? "voted" : "waiting",
    ]),
  );
  return (
    <div className="grid content-center">
      <RingScene litIds={TEAM} status={status} />
      <SceneLine className="px-4 pb-4">4 of 7 have voted</SceneLine>
    </div>
  );
}

export function WaitMoment() {
  return (
    <Moment
      title="The wait"
      length={400}
      stageClassName="min-h-[22rem]"
      notes={{
        moves: (
          <>
            Only the seats still to vote move: their dashed ring turns slowly
            and breathes. Everything else is still.
          </>
        ),
        timing: (
          <>
            A loop: one turn in 9s (linear), one breath in 2.4s (ease-in-out).
            It stops for each seat the moment its vote arrives.
          </>
        ),
        sound: <>None. Silence is the wait.</>,
        why: (
          <>
            The only loop on the table, kept for the one thing it is good at:
            showing who the game is waiting on.
          </>
        ),
      }}
    >
      {() => <TheWait />}
    </Moment>
  );
}

/* -------------------------------------------------------- votes revealed */

function votesFor(rejecting: readonly PlayerId[]): Record<PlayerId, Vote> {
  return Object.fromEntries(
    PLAYERS.map((player) => [
      player.id,
      rejecting.includes(player.id) ? "reject" : "approve",
    ]),
  );
}

function Reveal({ scene, approved }: { scene: SceneProps; approved: boolean }) {
  const rejecting = approved
    ? [IDS.ansel, IDS.isolde]
    : [IDS.ansel, IDS.isolde, IDS.kay, IDS.tobias];
  useBeats(scene, [
    { at: 0, cue: "suspense" },
    { at: 700, cue: "votes-turn" },
    { at: 1000, cue: approved ? "approved" : "rejected" },
    ...(approved
      ? []
      : [
          { at: 1450, cue: "track-advance" as const },
          { at: 1750, cue: "crown-pass" as const },
        ]),
  ]);
  const votes = votesFor(rejecting);
  const approvals = Object.values(votes).filter((v) => v === "approve").length;
  const status = Object.fromEntries(
    Object.entries(votes).map(([id, vote]): [PlayerId, SeatStatus] => [
      id,
      vote,
    ]),
  );
  return (
    <div className="grid content-center">
      <RingScene
        litIds={TEAM}
        status={status}
        turnFrom="voted"
        leaderId={approved ? YOU : IDS.ansel}
        crown={approved ? undefined : YOU}
        timing={{ "--turn-at": "700ms", "--crown-at": "1750ms" }}
      />
      <div
        className="sl-rise sl-seq flex flex-col items-center gap-1 px-4 pb-4 text-center"
        style={{ "--at": "1000ms" } as CSSProperties}
      >
        <p
          className={`font-display flex items-center gap-2.5 text-[1.75rem] leading-tight font-medium ${approved ? "text-success" : "text-fail"}`}
        >
          {approved ? <IconApprove size={30} /> : <IconReject size={30} />}
          <span className="text-ink">
            {approved
              ? `Approved ${approvals} to ${7 - approvals}`
              : `Rejected ${7 - approvals} to ${approvals}`}
          </span>
        </p>
        {approved ? (
          <p className="text-ink-muted text-base">
            Wren, Mira and Bram go on the quest.
          </p>
        ) : (
          <p className="flex items-center gap-2.5 text-base font-bold">
            Rejected teams 2 of 5
            <span className="flex items-center gap-1.5" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((pip) => (
                <span
                  key={pip}
                  className={`sl-pip ${pip === 1 ? "sl-pip--advance sl-seq" : ""}`}
                  data-on={pip < 2}
                  style={{ "--at": "1450ms" } as CSSProperties}
                />
              ))}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

const REVEAL_NOTES = {
  timing: (
    <>
      A held breath of 700ms (each &quot;Voted&quot; swells once), then every
      chip turns over at the same instant: 160ms out, 240ms in. The tally rises
      at 1.0s. Done by 1.3s.
    </>
  ),
  why: (
    <>
      The rule is that votes are revealed together; the motion makes that
      visible. No seat turns before another.
    </>
  ),
};

export function ApprovedMoment() {
  return (
    <Moment
      title="Votes revealed: approved"
      length={1600}
      stageClassName="min-h-[24rem]"
      notes={{
        moves: (
          <>
            A beat of suspense, then every seat&apos;s chip flips from Voted to
            Approve or Reject at once; the tally rises.
          </>
        ),
        timing: REVEAL_NOTES.timing,
        sound: (
          <>
            <Cue>suspense</Cue> (a low swell), <Cue>votes-turn</Cue> (seven harp
            notes rolled in 140ms), then <Cue>approved</Cue>: chimes climbing to
            D over a soft major pad.
          </>
        ),
        why: REVEAL_NOTES.why,
      }}
    >
      {(scene) => <Reveal scene={scene} approved />}
    </Moment>
  );
}

export function RejectedMoment() {
  return (
    <Moment
      title="Votes revealed: rejected"
      length={2500}
      stageClassName="min-h-[24rem]"
      notes={{
        moves: (
          <>
            The same turn, then the rejected-team track advances (a pip spins
            into a star) and the crown flies on to the next seat.
          </>
        ),
        timing: (
          <>
            Turn as above; pip 520ms spring at 1.45s; crown 620ms arc from
            1.75s. Done by 2.4s.
          </>
        ),
        sound: (
          <>
            <Cue>rejected</Cue>: harp notes falling to B over a dark pad; then{" "}
            <Cue>track-advance</Cue> (a low knock) and <Cue>crown-pass</Cue>.
          </>
        ),
        why: (
          <>
            A rejection costs something: the track shows how close Evil is to
            winning by refusal, and the crown shows who leads next.
          </>
        ),
      }}
    >
      {(scene) => <Reveal scene={scene} approved={false} />}
    </Moment>
  );
}
