import type { Alignment } from "@/shared/roles";
import { PixelIcon } from "../pixel/pixel-sprite";

/** Good or Evil: a shape, a word and a colour, never the colour alone. */
export function AlignmentBadge({
  alignment,
  className,
}: {
  alignment: Alignment;
  className?: string;
}) {
  const good = alignment === "good";
  return (
    <span
      className={`inline-flex items-center gap-2 ${good ? "text-good" : "text-evil"} ${className ?? ""}`}
    >
      <PixelIcon name={good ? "shield" : "horns"} />
      <span className="lv-label">{good ? "Good" : "Evil"}</span>
    </span>
  );
}
