"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { createRoom } from "@/client/room-client";
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

export function StartForm() {
  const router = useRouter();
  const nameId = useId();
  const codeId = useId();
  const errorId = useId();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanName = normalizeName(name);
  const codeReady = ROOM_CODE_PATTERN.test(code);

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cleanName || busy) return;
    setBusy(true);
    setError(null);
    const result = await createRoom(cleanName);
    if (result.ok) {
      router.push(`/room/${result.data.code}`);
    } else {
      setError(result.error.message);
      setBusy(false);
    }
  }

  function onJoin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (codeReady) router.push(`/room/${code}`);
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={onCreate}
        className="space-y-3"
        aria-describedby={errorId}
      >
        <label htmlFor={nameId} className="block text-sm font-medium">
          Your name
        </label>
        <input
          id={nameId}
          name="name"
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={NAME_MAX_LENGTH}
          autoComplete="nickname"
          autoCapitalize="words"
          enterKeyHint="go"
          required
        />
        <button
          type="submit"
          className={`${primaryButton} w-full`}
          disabled={!cleanName || busy}
        >
          {busy ? "Creating…" : "Create a room"}
        </button>
        <p id={errorId} role="alert" className="text-fail min-h-5 text-sm">
          {error}
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
            value={code}
            onChange={(e) =>
              setCode(
                normalizeRoomCode(e.target.value).slice(0, ROOM_CODE_LENGTH),
              )
            }
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="go"
          />
          <button
            type="submit"
            className={secondaryButton}
            disabled={!codeReady}
          >
            Join
          </button>
        </div>
      </form>
    </div>
  );
}
