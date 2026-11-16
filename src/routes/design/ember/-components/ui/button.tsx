import { ProtoLink as Link } from "@/design/proto-link";
import type { ComponentProps, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "ember-btn--primary",
  secondary: "ember-btn--secondary",
};

/** Class list for anything that should look like an Ember & Rune button. */
export function buttonClass(
  variant: ButtonVariant = "primary",
  extra?: string,
): string {
  return `ember-btn ${VARIANT_CLASS[variant]} ${extra ?? ""}`.trim();
}

type ButtonProps = Omit<ComponentProps<"button">, "className"> & {
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  className,
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={buttonClass(variant, className)} {...rest}>
      {children}
    </button>
  );
}

type ButtonLinkProps = Omit<ComponentProps<typeof Link>, "className"> & {
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
};

/** A navigation link that looks like a button. */
export function ButtonLink({
  variant = "primary",
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, className)} {...rest}>
      {children}
    </Link>
  );
}
