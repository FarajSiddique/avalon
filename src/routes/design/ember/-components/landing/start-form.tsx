import { useProtoRouter as useRouter } from "@/design/proto-link";
import { useId, useState, type FormEvent } from "react";
import { designPaths } from "@/design/directions";
import {
  NAME_MAX_LENGTH,
  ROOM_CODE_LENGTH,
  normalizeRoomCode,
} from "@/shared/constants";
import { Button } from "../ui/button";

const paths = designPaths("ember");

/**
 * Name, create a room, or join one with a code. In the prototype both
 * buttons lead to the lobby.
 */
export function StartForm() {
  const router = useRouter();
  const nameId = useId();
  const nameHintId = useId();
  const codeId = useId();
  const codeHintId = useId();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const goToLobby = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(paths.lobby);
  };

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={goToLobby} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={nameId} className="ember-label text-accent-strong">
            Your name
          </label>
          <input
            id={nameId}
            name="name"
            type="text"
            autoComplete="nickname"
            autoCapitalize="words"
            spellCheck={false}
            maxLength={NAME_MAX_LENGTH}
            placeholder="Wren"
            aria-describedby={nameHintId}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="ember-input"
          />
          <p id={nameHintId} className="text-ink-muted text-[1.0625rem]">
            The name the table will know you by.
          </p>
        </div>
        <Button type="submit">Create a room</Button>
      </form>

      <div className="ember-divider" role="presentation">
        <span className="ember-label">or join a table</span>
      </div>

      <form onSubmit={goToLobby} className="flex flex-col gap-1.5">
        <label htmlFor={codeId} className="ember-label text-accent-strong">
          Room code
        </label>
        <div className="flex gap-3">
          <input
            id={codeId}
            name="code"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={ROOM_CODE_LENGTH}
            placeholder="KNGT"
            aria-describedby={codeHintId}
            value={code}
            onChange={(event) =>
              setCode(
                normalizeRoomCode(event.target.value).slice(
                  0,
                  ROOM_CODE_LENGTH,
                ),
              )
            }
            className="ember-input ember-input--code min-w-0 flex-1"
          />
          <Button type="submit" variant="secondary" className="shrink-0 px-7">
            Join
          </Button>
        </div>
        <p id={codeHintId} className="text-ink-muted text-[1.0625rem]">
          Four letters, read out by whoever made the room.
        </p>
      </form>
    </div>
  );
}
