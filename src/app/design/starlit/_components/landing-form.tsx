"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { designPaths } from "@/design/directions";
import {
  NAME_MAX_LENGTH,
  ROOM_CODE_LENGTH,
  normalizeRoomCode,
} from "@/shared/constants";
import { IconArrowRight, IconStar } from "./icons";

const paths = designPaths("starlit");

/**
 * Name, create a room, or join one with a code. In the prototype both
 * buttons are links to the lobby; the real form will post to the server.
 */
export function LandingForm() {
  const id = useId();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

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

      <Link href={paths.lobby} className="sl-btn sl-btn--primary w-full">
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
          <Link href={paths.lobby} className="sl-btn sl-btn--ghost flex-none">
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
