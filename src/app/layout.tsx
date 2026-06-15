import type { Metadata } from "next";
import { Syne, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Seshn — Your focus, made social.",
  description:
    "Track your Pomodoro sessions. Post your daily focus time. See what your friends are building. No cheating — just discipline made visible.",
  metadataBase: new URL("https://seshn.in"),
  openGraph: {
    title: "Seshn — Your focus, made social.",
    description:
      "Track your Pomodoro sessions. Post your daily focus time. See what your friends are building.",
    url: "https://seshn.in",
    siteName: "Seshn",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${dmSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      {/* suppressHydrationWarning: browser extensions (Grammarly, etc.) inject
          data-* attributes onto <body> before React hydrates, which the server
          can't predict. This only ignores attribute/text diffs on <body> itself,
          not its children. */}
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-[#0A0A0A] text-white"
      >
        {children}
      </body>
    </html>
  );
}
