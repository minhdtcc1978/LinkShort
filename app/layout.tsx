import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import { AppWrapper } from "@/components/app-wrapper";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://solohost.id.vn"),
  title: "LinkShort - Smart Links",
  description: "Create smart short links with password protection, expiration, QR code, history and analytics.",
  generator: "Pi App Studio",
  alternates: {
    canonical: "https://solohost.id.vn",
  },
  openGraph: {
    title: "LinkShort - Smart Links",
    description: "Create smart short links with password protection, expiration, QR code, history and analytics.",
    url: "https://solohost.id.vn",
    siteName: "LinkShort",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkShort - Smart Links",
    description: "Create smart short links with password protection, expiration, QR code, history and analytics.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark bg-background">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        <AppWrapper>{children}</AppWrapper>
        <Toaster richColors position="top-center" theme="dark" />
      </body>
    </html>
  );
}
