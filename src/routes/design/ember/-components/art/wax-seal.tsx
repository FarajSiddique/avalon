import type { ReactNode } from "react";

export type SealTone = "wax" | "gold" | "arcane" | "laurel" | "ember" | "empty";

const TONE_CLASS: Record<SealTone, string> = {
  wax: "",
  gold: "ember-seal--gold",
  arcane: "ember-seal--arcane",
  laurel: "ember-seal--laurel",
  ember: "ember-seal--ember",
  empty: "ember-seal--empty",
};

/**
 * A blob of sealing wax pressed with a mark. Used for status: ready, voted,
 * leader, played. The mark inside is an icon; the seal is decorative, so pair
 * it with a text label (visible or sr-only) wherever it carries meaning.
 */
export function WaxSeal({
  tone = "wax",
  size = 24,
  className,
  children,
}: {
  tone?: SealTone;
  size?: number;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <span
      className={`ember-seal ${TONE_CLASS[tone]} ${className ?? ""}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}
