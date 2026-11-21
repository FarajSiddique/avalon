import { useEffect, useMemo, useState } from "react";
import { buildCatalog, readDeclarations, type Catalog } from "./catalog";
import {
  DEFAULT_SKY,
  DEFAULT_STATE,
  buildCss,
  decodeState,
  type SkyOptions,
} from "./state";
import { getTweaks, saveDial, setTweaks, useBypass, useTweaks } from "./store";

/** The query parameter a share link carries the dial in. */
export const SHARE_PARAM = "tweaks";

const EMPTY: Catalog = new Map();

/**
 * Read the theme's tokens from this document's stylesheets. Styles can land
 * a frame or two after hydration in dev, so try again briefly if none yet.
 */
export function useCatalog(doc: Document | null): Catalog {
  const [catalog, setCatalog] = useState<Catalog>(EMPTY);
  useEffect(() => {
    if (!doc) return;
    let frame = 0;
    let tries = 0;
    const read = () => {
      const found = buildCatalog(readDeclarations(doc));
      if (found.size > 0 || tries > 60) setCatalog(found);
      else {
        tries += 1;
        frame = requestAnimationFrame(read);
      }
    };
    read();
    return () => cancelAnimationFrame(frame);
  }, [doc]);
  return catalog;
}

/**
 * Applies the studio's live dial to a Starlit prototype page: a generated
 * stylesheet for the tokens and the options NightSky draws from. Renders the
 * defaults on the server and until hydration. Prototype-only.
 */
export function useStarlitTweaks(): { css: string; sky: SkyOptions } {
  const state = useTweaks();
  const bypass = useBypass();
  const catalog = useCatalog(typeof document === "undefined" ? null : document);

  useEffect(() => {
    // A share link applies its dial once. The dial it replaces is saved first
    // (Share > Saved in this browser), and the parameter is removed so a
    // reload does not apply it again over later changes.
    const url = new URL(window.location.href);
    const code = url.searchParams.get(SHARE_PARAM);
    if (!code) return;
    const shared = decodeState(code);
    if (shared) {
      const current = getTweaks();
      if (
        current !== DEFAULT_STATE &&
        JSON.stringify(current) !== JSON.stringify(shared)
      ) {
        const stamp = new Date().toLocaleString();
        saveDial({
          ...current,
          name: `${current.name} (before a shared link, ${stamp})`,
        });
      }
      setTweaks(shared);
    }
    url.searchParams.delete(SHARE_PARAM);
    window.history.replaceState(window.history.state, "", url);
  }, []);

  const css = useMemo(
    () => (bypass || catalog.size === 0 ? "" : buildCss(catalog, state)),
    [bypass, catalog, state],
  );
  return { css, sky: bypass ? DEFAULT_SKY : state.sky };
}
