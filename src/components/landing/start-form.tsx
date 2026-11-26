import { useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";
import { saveToken } from "@/client/session";
import { useHydrated } from "@/client/use-hydrated";
import { useWebGLGate } from "@/client/use-webgl-gate";
import { useStageStatus } from "@/components/stage/stage-context";
import { NoWebGLNotice } from "@/components/ui/no-webgl-notice";
import { IconArrowRight, IconStar } from "@/components/ui/icons";
import { createRoom } from "@/functions/rooms";
import {
  NAME_MAX_LENGTH,
  ROOM_CODE_LENGTH,
  ROOM_CODE_PATTERN,
  normalizeName,
  normalizeRoomCode,
} from "@/shared/constants";

/** The value of a named text field, read at submit time. */
function field(form: HTMLFormElement, name: string): string {
  const value = new FormData(form).get(name);

  return typeof value === "string" ? value : "";
}

/**
 * Create a room, or go to one by code. The fields are read when the form is
 * submitted, so anything typed before the page finished loading still counts.
 */
export function StartForm() {
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const nameId = useId();
  const codeId = useId();
  const hintId = useId();
  const [busy, setBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const gate = useWebGLGate();
  const stageFailed = useStageStatus() === "failed";

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = normalizeName(field(event.currentTarget, "name"));

    if (!name || busy) {
      return;
    }

    setBusy(true);
    setCreateError(null);

    try {
      const result = await createRoom({ data: { name } });

      if (result.ok) {
        saveToken(result.data.code, result.data.token);
        await navigate({
          to: "/room/$code",
          params: { code: result.data.code },
        });

        return;
      }

      setCreateError(result.error.message);
    } catch {
      setCreateError("Could not reach the server. Try again.");
    }

    setBusy(false);
  }

  function onJoin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = normalizeRoomCode(field(event.currentTarget, "code"));

    if (!ROOM_CODE_PATTERN.test(code)) {
      setJoinError(`A room code is ${ROOM_CODE_LENGTH} letters.`);

      return;
    }

    setJoinError(null);
    void navigate({ to: "/room/$code", params: { code } });
  }

  // The game is played at the 3D table: without it there is nothing to
  // create or join. The server's page keeps the form (its buttons wait for
  // hydration), so the swap happens only once the browser has answered.
  if (gate === "none" || stageFailed) {
    return <NoWebGLNotice bare />;
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(event) => void onCreate(event)}
        className="flex flex-col gap-4"
      >
        <div>
          <label htmlFor={nameId} className="sl-label">
            Your name
          </label>
          <input
            id={nameId}
            name="name"
            type="text"
            className="sl-input"
            placeholder="What the table calls you"
            maxLength={NAME_MAX_LENGTH}
            autoComplete="nickname"
            autoCapitalize="words"
            spellCheck={false}
            enterKeyHint="go"
            required
          />
        </div>
        <button
          type="submit"
          className="sl-btn sl-btn--primary w-full"
          disabled={!hydrated || busy}
        >
          <IconStar size={18} />
          {busy ? "Creating…" : "Create a room"}
        </button>
        <p role="alert" className="text-fail -mt-2 text-sm empty:-mt-4">
          {createError}
        </p>
      </form>

      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="border-line h-px flex-1 border-t border-dashed" />
        <span className="text-ink-muted text-base font-semibold">
          or join friends
        </span>
        <span className="border-line h-px flex-1 border-t border-dashed" />
      </div>

      <form onSubmit={onJoin}>
        <label htmlFor={codeId} className="sl-label">
          Have a room code?
        </label>
        <div className="flex gap-2.5">
          <input
            id={codeId}
            name="code"
            type="text"
            className="sl-input sl-input--code min-w-0 flex-1"
            placeholder="KNGT"
            maxLength={ROOM_CODE_LENGTH + 2}
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="go"
            aria-describedby={hintId}
            required
          />
          <button
            type="submit"
            className="sl-btn sl-btn--ghost flex-none"
            disabled={!hydrated}
          >
            Join
            <IconArrowRight size={18} />
          </button>
        </div>
        <p id={hintId} className="text-ink-muted mt-2 text-base leading-snug">
          Four letters, shown on the host&apos;s screen.
        </p>
        <p role="alert" className="text-fail mt-2 text-sm empty:mt-0">
          {joinError}
        </p>
      </form>
    </div>
  );
}
