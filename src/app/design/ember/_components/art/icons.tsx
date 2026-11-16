import type { ReactNode } from "react";

/**
 * The icon set for Ember & Rune. Original line drawings on a 24 unit grid,
 * one stroke weight, coloured with currentColor. Icons are decorative by
 * default (hidden from assistive tech); the text label next to them carries
 * the meaning.
 */
export interface IconProps {
  /** Pixel size of the square icon. */
  size?: number;
  className?: string;
}

function Icon({
  size = 20,
  className,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className ?? ""}`}
    >
      {children}
    </svg>
  );
}

/** Leader. */
export function CrownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 17 3 7l5 4 4-6 4 6 5-4-1 10Z" />
      <path d="M4.5 20h15" />
    </Icon>
  );
}

/** Good. */
export function ShieldIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3 4.5 5.5v6c0 4.6 3 7.9 7.5 9.5 4.5-1.6 7.5-4.9 7.5-9.5v-6Z" />
      <path d="M12 7.5v9M8.5 11h7" />
    </Icon>
  );
}

/** Evil. */
export function DaggerIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 21.5 9.5 16V7.5h5V16Z" />
      <path d="M6.5 7.5h11M12 7.5V3M10.5 3h3" />
    </Icon>
  );
}

/** Approve, ready, done. */
export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Icon>
  );
}

/** Reject. */
export function CrossIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Icon>
  );
}

/** Quest success: a grail. */
export function GrailIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 3.5h12c0 5-2.5 8.5-6 8.5s-6-3.5-6-8.5Z" />
      <path d="M12 12v5.5M8 20.5c0-1.7 1.8-3 4-3s4 1.3 4 3Z" />
    </Icon>
  );
}

/** Quest fail: a blade snapped in two. */
export function BrokenBladeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m4 20 3.5-3.5M5.5 15l3.5 3.5M7.5 16.5l4-4-1.5-1 2.5-1.5" />
      <path d="m14.5 8.5 1-2.5L20 4l-2 4.5-2 1" />
    </Icon>
  );
}

/** On the quest team. */
export function SwordIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 4 9.5 14.5M20 4h-4L8 12l4 4 8-8Z" />
      <path d="m6 13 5 5M8.5 15.5 4 20" />
    </Icon>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 8h10v12H9Z" />
      <path d="M15 8V4H5v12h4" />
    </Icon>
  );
}

/** Keep this screen private. */
export function HiddenEyeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 12c2.2-3.7 5.3-5.5 9-5.5s6.8 1.8 9 5.5c-2.2 3.7-5.3 5.5-9 5.5S5.2 15.7 3 12Z" />
      <path d="M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM4.5 4.5l15 15" />
    </Icon>
  );
}

/** Not ready yet. */
export function HourglassIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6.5 3.5h11M6.5 20.5h11M7.5 3.5c0 4 4.5 5.5 4.5 8.5s-4.5 4.5-4.5 8.5M16.5 3.5c0 4-4.5 5.5-4.5 8.5s4.5 4.5 4.5 8.5" />
    </Icon>
  );
}

/** Away: the phone is asleep. */
export function MoonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z" />
    </Icon>
  );
}

/** Press and hold. */
export function HandIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 12V5.5a1.5 1.5 0 0 1 3 0V11M12 10.5V4.5a1.5 1.5 0 0 1 3 0v6.5M15 11V6.5a1.5 1.5 0 0 1 3 0V14c0 4-2.5 7-6.5 7-3 0-4.5-1.5-6-4l-2-3.5a1.5 1.5 0 0 1 2.5-1.5L9 14.5" />
    </Icon>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5.5 10.5h13v10h-13ZM8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3M12 14.5v2.5" />
    </Icon>
  );
}

/** Team size. */
export function PersonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM5 20.5c.5-4 3.3-6 7-6s6.5 2 7 6" />
    </Icon>
  );
}

export function ArrowIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 12h15M13.5 6.5 19 12l-5.5 5.5" />
    </Icon>
  );
}

/** The Lady of the Lake: a hand raising a blade from water. */
export function LakeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3v10M9.5 6h5M3 16.5c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0M5 20.5c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0" />
    </Icon>
  );
}
