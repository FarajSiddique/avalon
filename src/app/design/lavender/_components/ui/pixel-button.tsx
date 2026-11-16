import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export type ButtonVariant = "plain" | "primary" | "approve" | "reject";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  plain: "",
  primary: "lv-button-primary",
  approve: "lv-button-approve",
  reject: "lv-button-reject",
};

function buttonClass(variant: ButtonVariant, className?: string): string {
  return `lv-frame lv-button ${VARIANT_CLASS[variant]} ${className ?? ""}`;
}

type PixelButtonProps = Omit<ComponentProps<"button">, "type"> & {
  variant?: ButtonVariant;
};

/** A chunky button that drops one art pixel when pressed. */
export function PixelButton({
  variant = "plain",
  className,
  children,
  ...rest
}: PixelButtonProps) {
  return (
    <button type="button" className={buttonClass(variant, className)} {...rest}>
      {children}
    </button>
  );
}

/** The same button, as a link to another prototype screen. */
export function PixelLink({
  href,
  variant = "plain",
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, className)}>
      {children}
    </Link>
  );
}

/**
 * A link that only works once a condition holds. Until then it is a real
 * disabled button, so it is skipped by the keyboard and announced as
 * unavailable.
 */
export function GatedLink({
  href,
  enabled,
  variant = "primary",
  className,
  children,
}: {
  href: string;
  enabled: boolean;
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
}) {
  if (!enabled) {
    return (
      <button
        type="button"
        disabled
        className={buttonClass(variant, className)}
      >
        <span className="lv-button-plate">{children}</span>
      </button>
    );
  }
  return (
    <PixelLink href={href} variant={variant} className={className}>
      {children}
    </PixelLink>
  );
}
