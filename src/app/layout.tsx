import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "Musawo Training Center",
    template: "%s | Musawo Training Center",
  },
  description:
    "Certified online health-care training for Ugandan communities. Courses in nursing care, basic care, and child safety — accredited by Uganda Ministry of Health.",
  keywords: [
    "nursing training Uganda",
    "online health course Uganda",
    "CNA Uganda",
    "Musawo Training Center",
    "health worker certification",
  ],
  authors: [{ name: "Musawo / ADFA", url: "https://musawo.ug" }],
  openGraph: {
    type: "website",
    locale: "en_UG",
    url: "https://learn.musawotraining.ug",
    siteName: "Musawo Training Center",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MTC",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111A3F",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/assets/icon-192.png" />
      </head>
      <body className="bg-white text-body-text antialiased">{children}</body>
    </html>
  );
}
