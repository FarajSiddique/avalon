import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import { DesignNav } from "@/design/design-nav";
import "./theme.css";

const display = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lavender-display",
});

const body = VT323({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lavender-body",
});

export const metadata: Metadata = {
  title: "Lavender Vigil",
};

export default function LavenderLayout({
  children,
}: LayoutProps<"/design/lavender">) {
  return (
    <div
      className={`theme-lavender ${display.variable} ${body.variable} bg-canvas font-body text-ink flex min-h-dvh flex-col`}
    >
      <DesignNav direction="lavender" />
      {children}
    </div>
  );
}
