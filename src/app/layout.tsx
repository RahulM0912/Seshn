import type { Metadata, Viewport } from "next";
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

// Site-wide SEO defaults. `metadataBase` makes every relative OG/canonical URL
// absolute, and the title `template` appends "· Seshn" to child-page titles
// (which therefore return just their own bare title). The branded share image
// is wired automatically by app/opengraph-image.tsx (the file convention), so
// OpenGraph/Twitter `images` are not listed here.
const description =
  "Track your Pomodoro sessions. Post your daily focus time. See what your friends are grinding. No cheating — just discipline made visible.";

export const metadata: Metadata = {
  metadataBase: new URL("https://seshn.in"),
  title: {
    default: "Seshn — Your focus, made social.",
    template: "%s · Seshn",
  },
  description,
  applicationName: "Seshn",
  keywords: [
    "Pomodoro",
    "focus timer",
    "study tracker",
    "productivity",
    "deep work",
    "focus sessions",
    "study with friends",
    "accountability",
  ],
  authors: [{ name: "Seshn" }],
  creator: "Seshn",
  publisher: "Seshn",
  category: "productivity",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Seshn",
    title: "Seshn — Your focus, made social.",
    description,
    url: "https://seshn.in",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Seshn — Your focus, made social.",
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  colorScheme: "dark",
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
