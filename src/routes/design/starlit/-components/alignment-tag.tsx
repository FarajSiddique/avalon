import type { Alignment } from "@/shared/roles";
import { IconDagger, IconShield } from "./icons";

/** Good or Evil: a word, a shape (shield or dagger) and a colour. */
export function AlignmentTag({
  alignment,
  size = "sm",
}: {
  alignment: Alignment;
  size?: "sm" | "lg";
}) {
  const good = alignment === "good";
  const Shape = good ? IconShield : IconDagger;

  return (
    <span
      className={`sl-chip ${good ? "text-good" : "text-evil"} ${
        size === "lg" ? "px-4 py-1 text-[1.0625rem]" : ""
      }`}
    >
      <Shape size={size === "lg" ? 20 : 14} />
      {good ? "Good" : "Evil"}
    </span>
  );
}
