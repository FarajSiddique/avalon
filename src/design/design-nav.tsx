import { Link, useLocation } from "@tanstack/react-router";
import { DIRECTIONS, designPaths, type DirectionSlug } from "./directions";
import { ProtoLink } from "./proto-link";

/**
 * Prototype-only bar above every design screen. It is deliberately plain so
 * it is never mistaken for part of a direction.
 */
export function DesignNav({
  direction,
  extra = [],
}: {
  direction: DirectionSlug;
  /** Extra screens one direction has and the others do not. */
  extra?: { label: string; href: string }[];
}) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const paths = designPaths(direction);
  const current = DIRECTIONS.find((d) => d.slug === direction);

  const screens = [
    {
      label: "Landing",
      href: paths.landing,
      active: pathname === paths.landing || pathname === `${paths.landing}/`,
    },
    { label: "Lobby", href: paths.lobby, active: pathname === paths.lobby },
    {
      label: "Role",
      href: paths.role("merlin"),
      active: pathname.startsWith(`${paths.landing}/role`),
    },
    {
      label: "Table",
      href: paths.table("propose"),
      active: pathname.startsWith(`${paths.landing}/table`),
    },
    ...extra.map((screen) => ({
      ...screen,
      active: pathname.startsWith(screen.href),
    })),
  ];

  return (
    <nav
      aria-label="Prototype navigation"
      className="sticky top-0 z-50 flex h-11 shrink-0 items-center gap-1 overflow-x-auto border-b border-white/15 bg-black px-2 text-[13px] text-white/80"
      style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
    >
      <Link
        to="/design"
        className="flex h-11 shrink-0 items-center px-2 text-white/60 hover:text-white"
        aria-label="All design directions"
      >
        ← All
      </Link>
      <span className="shrink-0 px-1 font-semibold text-white">
        {current?.name}
      </span>
      <span className="mx-1 h-4 w-px shrink-0 bg-white/20" aria-hidden />
      {screens.map((screen) => (
        <ProtoLink
          key={screen.label}
          href={screen.href}
          aria-current={screen.active ? "page" : undefined}
          className={`flex h-11 shrink-0 items-center px-2 hover:text-white ${
            screen.active
              ? "font-semibold text-white underline underline-offset-4"
              : ""
          }`}
        >
          {screen.label}
        </ProtoLink>
      ))}
    </nav>
  );
}
