"use client";

import { useRouter } from "next/navigation";
import { Fragment, type ReactNode } from "react";

/**
 * Prototype helper. Next keeps a page mounted (hidden) after you navigate
 * away, so local state such as "I have voted" would still be set when the
 * click-through loops back. Keying on `bfcacheId` gives each fresh visit new
 * state, while the browser's back button still restores the old one. The
 * real game does not need this: its state comes from the server.
 */
export function FreshOnVisit({ children }: { children: ReactNode }) {
  const { bfcacheId } = useRouter();
  return <Fragment key={bfcacheId}>{children}</Fragment>;
}
