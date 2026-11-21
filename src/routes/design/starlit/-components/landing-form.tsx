import { useNavigate } from "@tanstack/react-router";
import { ProtoLink as Link } from "@/design/proto-link";
import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { designPaths } from "@/design/directions";
import {
  NAME_MAX_LENGTH,
  ROOM_CODE_LENGTH,
  normalizeRoomCode,
} from "@/shared/constants";
import { IconArrowRight, IconStar } from "./icons";
import { useStage } from "./stage/stage-context";
import type { FlightPath } from "./three/types";

const paths = designPaths("starlit");

/** How long the landing takes to step aside before the lobby replaces it. */
const LEAVE_MS = 420;

/**
 * Name, create a room, or join one with a code. In the prototype both
 * buttons are links to the lobby; the real form will post to the server.
 * The camera sets off at once and the lobby mounts as it flies.
 */
export function LandingForm() {
  const id = useId();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const navigate = useNavigate();
  const { depart } = useStage();
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const go = (event: MouseEvent<HTMLAnchorElement>, via: FlightPath) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0)
      return;
    event.preventDefault();
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    depart(via);
    window.scrollTo({ top: 0, behavior: still ? "auto" : "smooth" });
    const search: Record<string, string> = { via };
    if (name.trim()) search.name = name.trim();
    if (via === "join" && code.length === ROOM_CODE_LENGTH) search.code = code;
    timer.current = window.setTimeout(
      () => {
        // A prototype address the route types cannot see, as in ProtoLink.
        void navigate({ to: paths.lobby as never, search: search as never });
      },
      still ? 0 : LEAVE_MS,
    );
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => event.preventDefault()}
    >
      <div>
        <label htmlFor={`${id}-name`} className="sl-label">
          Your name
        </label>
        <input
          id={`${id}-name`}
          name="name"
          type="text"
          className="sl-input"
          placeholder="What the table calls you"
          autoComplete="nickname"
          autoCapitalize="words"
          spellCheck={false}
          maxLength={NAME_MAX_LENGTH}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <Link
        href={paths.lobby}
        onClick={(event) => go(event, "create")}
        className="sl-btn sl-btn--primary w-full"
      >
        <IconStar size={18} />
        Create a room
      </Link>

      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="border-line h-px flex-1 border-t border-dashed" />
        <span className="text-ink-muted text-base font-semibold">
          or join friends
        </span>
        <span className="border-line h-px flex-1 border-t border-dashed" />
      </div>

      <div>
        <label htmlFor={`${id}-code`} className="sl-label">
          Room code
        </label>
        <div className="flex gap-2.5">
          <input
            id={`${id}-code`}
            name="code"
            type="text"
            className="sl-input sl-input--code flex-1"
            placeholder="KNGT"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-describedby={`${id}-code-hint`}
            value={code}
            onChange={(event) =>
              setCode(
                normalizeRoomCode(event.target.value).slice(
                  0,
                  ROOM_CODE_LENGTH,
                ),
              )
            }
          />
          <Link
            href={paths.lobby}
            onClick={(event) => go(event, "join")}
            className="sl-btn sl-btn--ghost flex-none"
          >
            Join
            <IconArrowRight size={18} />
          </Link>
        </div>
        <p
          id={`${id}-code-hint`}
          className="text-ink-muted mt-2 text-base leading-snug"
        >
          Four letters, shown on the host&apos;s screen.
        </p>
      </div>
    </form>
  );
}
