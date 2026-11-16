import type { QuestCard } from "@/shared/views";
import { PixelSprite } from "../pixel/pixel-sprite";
import { GRAIL, SKULL } from "../pixel/sprites";

/** The face of a quest card: a picture (grail or skull) and the word. */
export function QuestCardFace({
  card,
  className,
}: {
  card: QuestCard;
  className?: string;
}) {
  const success = card === "success";
  return (
    <span className={`flex flex-col items-center gap-3 ${className ?? ""}`}>
      <PixelSprite sprite={success ? GRAIL : SKULL} />
      <span className={`lv-label ${success ? "text-success" : "text-fail"}`}>
        {success ? "Success" : "Fail"}
      </span>
    </span>
  );
}
