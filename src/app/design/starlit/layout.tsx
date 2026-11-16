import type { Metadata } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import { DesignNav } from "@/design/design-nav";
import { NightSky } from "./_components/art/night-sky";
import { SoundToggle } from "./_components/sound-toggle";
import "./theme.css";
import "./motion.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  variable: "--font-fraunces",
  display: "swap",
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Starlit Vale",
};

export default function StarlitLayout({
  children,
}: LayoutProps<"/design/starlit">) {
  return (
    <div
      className={`theme-starlit ${fraunces.variable} ${nunitoSans.variable} bg-canvas font-body text-ink relative isolate flex min-h-dvh flex-1 flex-col`}
    >
      <DesignNav direction="starlit" />
      <NightSky />
      {children}
      <SoundToggle />
    </div>
  );
}
