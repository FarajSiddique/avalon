/**
 * Cel-shaded clouds in three flat tones. A billow is a set of round lobes
 * drawn in three passes: lighter copies nudged up (tops catching starlight),
 * pink copies nudged down (the lit underside), then the body over both, so
 * the other two tones only show as a thin rim around the whole shape.
 */
export type Lobe = readonly [cx: number, cy: number, r: number];

interface BillowProps {
  lobes: ReadonlyArray<Lobe>;
  body?: string;
  /** The lighter rim along the top. */
  rim?: string;
  /** The lit rim along the underside. */
  edge?: string;
  /** Which way the two rims lean, in drawing units. */
  rimShift?: readonly [dx: number, dy: number];
  edgeShift?: readonly [dx: number, dy: number];
  /** Also fill everything left of this x, for a bank that runs off the edge. */
  fillTo?: number;
  /** Brush marks inside the larger lobes. */
  marks?: boolean;
}

export function Billow({
  lobes,
  body = "var(--art-cloud)",
  rim = "var(--art-cloud-light)",
  edge = "var(--art-cloud-edge)",
  rimShift = [-1.5, -3.5],
  edgeShift = [1, 4],
  fillTo,
  marks = true,
}: BillowProps) {
  return (
    <>
      {lobes.map(([cx, cy, r], index) => (
        <circle
          key={`rim${index}`}
          cx={cx + rimShift[0]}
          cy={cy + rimShift[1]}
          r={r}
          fill={rim}
        />
      ))}
      {lobes.map(([cx, cy, r], index) => (
        <circle
          key={`edge${index}`}
          cx={cx + edgeShift[0]}
          cy={cy + edgeShift[1]}
          r={r}
          fill={edge}
        />
      ))}
      {fillTo !== undefined && (
        <rect x={-40} y={-40} width={fillTo + 40} height={2000} fill={body} />
      )}
      {lobes.map(([cx, cy, r], index) => (
        <circle key={`body${index}`} cx={cx} cy={cy} r={r} fill={body} />
      ))}
      {/* A few brush marks inside, so the body is not one flat blob. */}
      {(marks ? lobes : [])
        .filter(([, , r]) => r >= 30)
        .map(([cx, cy, r], index) => (
          <path
            key={`mark${index}`}
            d={`M${cx - r * 0.5} ${cy - r * 0.34}A${r * 0.66} ${r * 0.66} 0 0 1 ${cx + r * 0.16} ${cy - r * 0.62}`}
            fill="none"
            stroke={rim}
            strokeWidth={3}
            strokeLinecap="round"
          />
        ))}
    </>
  );
}

/** A flat lens: the shape of a streak of cloud seen side on. */
function lens(x: number, y: number, width: number, height: number): string {
  return `M${x} ${y}Q${x + width / 2} ${y - height} ${x + width} ${y}Q${x + width / 2} ${y + height * 0.55} ${x} ${y}Z`;
}

const PUFFY: ReadonlyArray<Lobe> = [
  [52, 70, 26],
  [228, 72, 24],
  [96, 54, 38],
  [190, 56, 36],
  [142, 42, 44],
  [120, 76, 26],
  [166, 78, 24],
];

/**
 * A cloud about 280 wide. "puffy" is a cumulus with a pink underside;
 * "wispy" is a long streak with pink light along its base. Position and
 * scale it with `transform`; `className` goes on the inner group so a drift
 * animation does not fight the placement.
 */
export function Cloud({
  variant,
  transform,
  className,
}: {
  variant: "puffy" | "wispy";
  transform?: string;
  className?: string;
}) {
  return (
    <g transform={transform}>
      {variant === "puffy" ? (
        <g className={className}>
          <path d={lens(36, 100, 208, 9)} fill="var(--art-cloud-edge-dim)" />
          <Billow lobes={PUFFY} />
        </g>
      ) : (
        <g className={className}>
          <path d={lens(18, 35, 236, 13)} fill="var(--art-cloud-edge)" />
          <path d={lens(0, 28, 270, 22)} fill="var(--art-cloud)" />
          <path d={lens(52, 16, 150, 20)} fill="var(--art-cloud)" />
          <path d={lens(74, 12, 96, 12)} fill="var(--art-cloud-light)" />
          <path d={lens(150, 40, 110, 7)} fill="var(--art-cloud-edge-dim)" />
        </g>
      )}
    </g>
  );
}
