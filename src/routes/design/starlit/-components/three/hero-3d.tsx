import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ConceptName } from "./engine";

/**
 * A live 3D concept. Three.js and the scene load only when this mounts, in
 * the browser. Without WebGL it shows `fallback` (the drawn scene) instead.
 */
export function Hero3D({
  concept,
  className,
  interactive = true,
  backdrop = true,
  snapshot = false,
  fallback,
}: {
  concept: ConceptName;
  className?: string;
  interactive?: boolean;
  /** A wide canvas with the title on its left: frame the subject right. */
  backdrop?: boolean;
  /** One still frame as an image, with no live WebGL context (thumbnails). */
  snapshot?: boolean;
  fallback: ReactNode;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let stop: (() => void) | null = null;
    let cancelled = false;
    // The server never draws this, so keep three.js out of the Worker bundle.
    if (import.meta.env.SSR) return;
    void import("./engine")
      .then(({ mountConcept }) =>
        mountConcept(el, concept, { interactive, backdrop, snapshot }),
      )
      .then((teardown) => {
        if (cancelled) teardown?.();
        else if (teardown) stop = teardown;
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [concept, interactive, backdrop, snapshot]);

  if (failed) return <>{fallback}</>;
  return (
    <div
      ref={host}
      data-concept={concept}
      className={`sl-hero-3d ${className ?? ""}`}
      aria-hidden="true"
    />
  );
}
