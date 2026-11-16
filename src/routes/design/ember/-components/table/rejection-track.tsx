import { MAX_REJECTIONS } from "@/shared/constants";
import { Candle } from "../art/candle";

/**
 * Five candles. Each rejected team snuffs one. When the last goes dark,
 * Evil wins. The count is also written out.
 */
export function RejectionTrack({
  rejections,
  className,
}: {
  rejections: number;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 lg:flex-col-reverse lg:items-start lg:gap-2 ${className ?? ""}`}
    >
      <span className="flex items-end gap-1" aria-hidden="true">
        {Array.from({ length: MAX_REJECTIONS }, (_, i) => (
          <Candle key={i} lit={i >= rejections} height={30} />
        ))}
      </span>
      <p className="leading-tight">
        <span className="ember-label text-ink block">
          Rejected teams: {rejections} of {MAX_REJECTIONS}
        </span>
        <span className="text-ink-muted hidden text-[1.0625rem] lg:block">
          Five in a row and Evil wins.
        </span>
      </p>
    </div>
  );
}
