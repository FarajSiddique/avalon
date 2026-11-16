import type { ReactNode } from "react";

/**
 * Starlit Vale's icon set: original inline SVG on a 24px grid, 1.9px round
 * strokes, coloured by `currentColor`. Icons are decorative by default (the
 * text next to them carries the meaning); pass `title` for a standalone one.
 */
interface IconProps {
  size?: number;
  className?: string;
  title?: string;
}

function Icon({
  size = 20,
  className,
  title,
  filled = false,
  children,
}: IconProps & { filled?: boolean; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      style={{ flex: "none" }}
    >
      {children}
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12.6l4.4 4.4L19 7.4" strokeWidth={2.4} />
    </Icon>
  );
}

export function IconCross(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" strokeWidth={2.4} />
    </Icon>
  );
}

/** Approve: a tick in a circle. */
export function IconApprove(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx={12} cy={12} r={9.2} />
      <path d="M7.8 12.4l2.9 2.9 5.5-6.1" strokeWidth={2.2} />
    </Icon>
  );
}

/** Reject: a cross in a diamond. A different outline from Approve. */
export function IconReject(props: IconProps) {
  return (
    <Icon {...props}>
      <rect
        x={5.2}
        y={5.2}
        width={13.6}
        height={13.6}
        rx={3}
        transform="rotate(45 12 12)"
      />
      <path d="M9.4 9.4l5.2 5.2M14.6 9.4l-5.2 5.2" strokeWidth={2.2} />
    </Icon>
  );
}

/** Good: a shield. */
export function IconShield(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3l7 2.4v5.7c0 4.4-2.9 7.9-7 9.4-4.1-1.5-7-5-7-9.4V5.4z" />
      <path d="M8.9 11.6l2.3 2.3 4-4.4" />
    </Icon>
  );
}

/** Evil: a dagger, point down. */
export function IconDagger(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 21.5l-2.7-10h5.4z" />
      <path d="M7 11.5h10M12 11.5V5.6" />
      <circle cx={12} cy={4} r={1.5} />
    </Icon>
  );
}

export function IconCrown(props: IconProps) {
  return (
    <Icon {...props} filled>
      <path
        d="M4.6 18l-1.5-9.4 5 3.9L12 5.2l3.9 7.3 5-3.9L19.4 18z"
        stroke="var(--art-outline)"
        strokeWidth={1.4}
      />
    </Icon>
  );
}

/** A four-point star. */
export function IconStar(props: IconProps) {
  return (
    <Icon {...props} filled>
      <path d="M12 2Q13 11 22 12Q13 13 12 22Q11 13 2 12Q11 11 12 2Z" />
    </Icon>
  );
}

export function IconCopy(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x={8.5} y={8.5} width={11.5} height={11.5} rx={3} />
      <path d="M15.5 5.2A2.7 2.7 0 0 0 13 4H6.7A2.7 2.7 0 0 0 4 6.7V13a2.7 2.7 0 0 0 1.2 2.3" />
    </Icon>
  );
}

/** Away: a crescent moon. */
export function IconMoon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 14.6A8.6 8.6 0 0 1 9.4 4a8.6 8.6 0 1 0 10.6 10.6z" />
    </Icon>
  );
}

/** Not ready or still waiting: an open ring. */
export function IconRing(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx={12} cy={12} r={7.6} strokeDasharray="3.2 3.6" />
    </Icon>
  );
}

export function IconEyeOff(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 12s3.3-6.2 9-6.2c1.5 0 2.9.4 4 1M21 12s-3.3 6.2-9 6.2c-1.5 0-2.8-.4-4-1" />
      <path d="M4.5 19.5l15-15" />
      <path d="M9.9 14.1a3 3 0 0 1 4.2-4.2" />
    </Icon>
  );
}

export function IconLock(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x={5} y={10.8} width={14} height={9.4} rx={2.8} />
      <path d="M8.2 10.8V8a3.8 3.8 0 0 1 7.6 0v2.8M12 14.6v2" />
    </Icon>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14M13.2 6.2L19 12l-5.8 5.8" strokeWidth={2.2} />
    </Icon>
  );
}

/** Success card: a risen sun. */
export function IconSun(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx={12} cy={12} r={4.2} />
      <path d="M12 2.6v2.6M12 18.8v2.6M2.6 12h2.6M18.8 12h2.6M5.4 5.4l1.8 1.8M16.8 16.8l1.8 1.8M5.4 18.6l1.8-1.8M16.8 7.2l1.8-1.8" />
    </Icon>
  );
}

/** Fail card: a cracked moon. */
export function IconCrackedMoon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx={12} cy={12} r={8.8} />
      <path d="M13.2 3.6l-3 5.6 4.2 2.6-3.4 8.4" />
    </Icon>
  );
}

/** Lady of the Lake: water. */
export function IconWaves(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 9.5c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 15.5c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
    </Icon>
  );
}

/** Press and hold: a fingertip with a ring around it. */
export function IconHold(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx={12} cy={12} r={3.4} />
      <path d="M12 3.2a8.8 8.8 0 0 1 8.8 8.8M12 20.8A8.8 8.8 0 0 1 3.2 12" />
    </Icon>
  );
}
