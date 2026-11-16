import { PixelIcon } from "../pixel/pixel-sprite";

/** A counter drawn as filled and empty pips. Decorative: pair it with text. */
export function Pips({
  filled,
  total,
  className,
}: {
  filled: number;
  total: number;
  className?: string;
}) {
  return (
    <span aria-hidden className={`flex gap-[var(--px)] ${className ?? ""}`}>
      {Array.from({ length: total }, (_, index) => (
        <PixelIcon key={index} name={index < filled ? "pip" : "pipEmpty"} />
      ))}
    </span>
  );
}
