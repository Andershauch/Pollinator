import type { Metadata, Viewport } from "next";
import { Oswald } from "next/font/google";
import "./globals.css";
import type { ReactNode } from "react";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--oswald",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pollinator",
  description: "Workshop dilemma tool",
};

export const viewport: Viewport = {
  themeColor: "#111319",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="da" className={oswald.variable}>
      <body>{children}</body>
    </html>
  );
}
