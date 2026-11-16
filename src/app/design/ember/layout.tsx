import type { Metadata } from "next";
import { Cinzel, EB_Garamond } from "next/font/google";
import { DesignNav } from "@/design/design-nav";
import "./theme.css";

/** Display: carved Roman capitals. Variable font, weights 400 to 900. */
const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
});

/** Body: an old-style book face. Variable font, weights 400 to 800. */
const garamond = EB_Garamond({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-garamond",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ember & Rune",
};

export default function EmberLayout({
  children,
}: LayoutProps<"/design/ember">) {
  return (
    <div
      className={`theme-ember ember-room ${cinzel.variable} ${garamond.variable} flex min-h-dvh flex-1 flex-col overflow-x-clip`}
    >
      <DesignNav direction="ember" />
      {children}
    </div>
  );
}
