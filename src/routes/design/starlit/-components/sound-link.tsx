import { ProtoLink as Link } from "@/design/proto-link";
import type { ComponentProps } from "react";
import { play, type CueName } from "@/client/sound";

/** A link that plays a cue as it is followed (start, confirm, propose). */
export function SoundLink({
  cue,
  onClick,
  ...props
}: ComponentProps<typeof Link> & { cue: CueName }) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        play(cue);
        onClick?.(event);
      }}
    />
  );
}
