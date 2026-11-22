import { useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";
import { saveToken } from "@/client/session";
import { useHydrated } from "@/client/use-hydrated";
import { createRoom } from "@/functions/rooms";
import {
  NAME_MAX_LENGTH,
  ROOM_CODE_LENGTH,
  ROOM_CODE_PATTERN,
  normalizeName,
  normalizeRoomCode,
} from "@/shared/constants";

const inputClass =
  "border-line bg-well text-ink placeholder:text-ink-muted/70 h-12 w-full rounded-md border px-3 text-base";
const primaryButton =
  "bg-accent text-on-accent hover:bg-accent-strong h-12 cursor-pointer rounded-md px-4 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton =
  "border-line-strong text-ink hover:bg-surface h-12 cursor-pointer rounded-md border px-4 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

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
  const [busy, setBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      <form onSubmit={(event) => void onCreate(event)} className="space-y-3">
        <label htmlFor={nameId} className="block text-sm font-medium">
          Your name
        </label>
        <input
          id={nameId}
          name="name"
          className={inputClass}
          maxLength={NAME_MAX_LENGTH}
          autoComplete="nickname"
          autoCapitalize="words"
          enterKeyHint="go"
          required
        />
        <button
          type="submit"
          className={`${primaryButton} w-full`}
          disabled={!hydrated || busy}
        >
          {busy ? "Creating…" : "Create a room"}
        </button>
        <p role="alert" className="text-fail min-h-5 text-sm">
          {createError}
        </p>
      </form>

      <form onSubmit={onJoin} className="space-y-3">
        <label htmlFor={codeId} className="block text-sm font-medium">
          Have a room code?
        </label>
        <div className="flex gap-3">
          <input
            id={codeId}
            name="code"
            className={`${inputClass} tracking-[0.3em] uppercase`}
            maxLength={ROOM_CODE_LENGTH + 2}
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="go"
            required
          />
          <button
            type="submit"
            className={secondaryButton}
            disabled={!hydrated}
          >
            Join
          </button>
        </div>
        <p role="alert" className="text-fail min-h-5 text-sm">
          {joinError}
        </p>
      </form>
    </div>
  );
}
