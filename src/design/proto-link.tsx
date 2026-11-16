import { Link, useNavigate } from "@tanstack/react-router";
import type { ComponentProps } from "react";

/**
 * Links for the design prototypes.
 *
 * The real app uses the router's typed `<Link to="/room/$code" params={...}>`.
 * The prototypes build their addresses as plain strings (`designPaths`), so
 * this wrapper takes an `href` and hands it to the router. Prototype-only.
 */
type ProtoLinkProps = Omit<ComponentProps<"a">, "href"> & { href: string };

export function ProtoLink({ href, ...rest }: ProtoLinkProps) {
  // The one cast: a prototype address is a string the route types cannot see.
  return <Link to={href as never} {...rest} />;
}

/** Go to a prototype address from code. */
export function useProtoRouter(): { push: (href: string) => void } {
  const navigate = useNavigate();
  return {
    push: (href) => {
      void navigate({ to: href as never });
    },
  };
}
