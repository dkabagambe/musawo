import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Musawo Training Center",
    template: "%s | Musawo Training Center",
  },
  description:
    "Certified online health-care training for Ugandan communities. Courses in nursing care, basic care, and child safety - accredited by Uganda Ministry of Health.",
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
  themeColor: "#0B6B5D",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={jakarta.variable}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.png" type="image/png" sizes="512x512" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
      </head>
      <body className="bg-white text-body-text antialiased font-sans">{children}</body>
    </html>
  );
}
