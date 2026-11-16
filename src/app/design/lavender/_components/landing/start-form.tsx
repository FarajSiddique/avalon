"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { designPaths } from "@/design/directions";
import {
  NAME_MAX_LENGTH,
  ROOM_CODE_LENGTH,
  normalizeRoomCode,
} from "@/shared/constants";
import { PixelIcon } from "../pixel/pixel-sprite";
import { PixelButton, PixelLink } from "../ui/pixel-button";

const paths = designPaths("lavender");

/** Name, create a room, or join one with a 4-letter code. */
export function StartForm() {
  const router = useRouter();
  const nameId = useId();
  const codeId = useId();
  const hintId = useId();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  return (
    <div className="flex flex-col gap-5 p-5 pt-7">
      <div className="flex flex-col gap-2">
        <label htmlFor={nameId} className="lv-label text-ink-muted">
          Your name
        </label>
        <input
          id={nameId}
          className="lv-frame lv-input"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={NAME_MAX_LENGTH}
          autoComplete="nickname"
          autoCapitalize="words"
          spellCheck={false}
          placeholder="Sir or Lady..."
        />
      </div>

      <PixelLink href={paths.lobby} variant="primary" className="w-full">
        <PixelIcon name="arrowRight" className="lv-blink" />
        Create a room
      </PixelLink>

      <div className="flex items-center gap-3" aria-hidden>
        <span className="lv-rule flex-1" />
        <span className="lv-label text-ink-muted">or</span>
        <span className="lv-rule flex-1" />
      </div>

      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          router.push(paths.lobby);
        }}
      >
        <label htmlFor={codeId} className="lv-label text-ink-muted">
          Room code
        </label>
        <div className="flex items-stretch gap-4">
          <input
            id={codeId}
            className="lv-frame lv-input lv-input-code min-w-0 flex-1"
            type="text"
            value={code}
            onChange={(event) =>
              setCode(
                normalizeRoomCode(event.target.value).slice(
                  0,
                  ROOM_CODE_LENGTH,
                ),
              )
            }
            maxLength={ROOM_CODE_LENGTH}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="KNGT"
            aria-describedby={hintId}
          />
          <PixelButton
            className="shrink-0"
            onClick={() => router.push(paths.lobby)}
          >
            Join
          </PixelButton>
        </div>
        <p id={hintId} className="lv-small text-ink-muted">
          4 letters, from whoever made the room.
        </p>
      </form>
    </div>
  );
}
