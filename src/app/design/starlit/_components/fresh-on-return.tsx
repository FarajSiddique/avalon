"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";

/**
 * Next keeps the previous page mounted but hidden after a client-side
 * navigation, so local state (a locked vote, a picked team) would still be
 * there when the click-through loops back. Hiding runs effect clean-ups, so
 * this bumps a key at that moment and the children start fresh next time.
 * Prototype only: the real game gets its state from the server.
 */
export function FreshOnReturn({ children }: { children: ReactNode }) {
  const [visit, setVisit] = useState(0);
  useEffect(() => () => setVisit((count) => count + 1), []);
  return <Fragment key={visit}>{children}</Fragment>;
}
