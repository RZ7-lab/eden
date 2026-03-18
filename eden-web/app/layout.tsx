import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eden — Your Personal AI Identity",
  description:
    "Install once. Every AI tool knows you. Eden builds a local AI identity from your coding environment so Claude Code, Cursor, and Windsurf understand you instantly.",
  openGraph: {
    title: "Eden — Your Personal AI Identity",
    description: "Install once. Every AI tool knows you.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600&family=JetBrains+Mono:wght@300;400;500&family=Instrument+Serif:ital@0;1&family=Inter:opsz,wght@14..32,300;400;500&family=General+Sans:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="antialiased"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {children}
      </body>
    </html>
  );
}
