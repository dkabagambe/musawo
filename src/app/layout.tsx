import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Musawo Training Center",
    template: "%s | Musawo Training Center",
  },
  description:
    "Hybrid and online healthcare training with 70% hands-on practicals in our skills lab. Courses in nursing care, childcare, mental health and life support. November 2026 intake now open.",
  keywords: [
    "healthcare training Uganda",
    "nursing care certificate Uganda",
    "caregiver course Kampala",
    "Musawo Training Center",
    "health worker certification Uganda",
    "hybrid online training Uganda",
  ],
  authors: [{ name: "Musawo Training Center / ADFA", url: "https://mtc.ac.ug" }],
  openGraph: {
    type: "website",
    locale: "en_UG",
    url: "https://mtc.ac.ug",
    siteName: "Musawo Training Center",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MTC",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png",    type: "image/png", sizes: "512x512" },
    ],
    apple: { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    shortcut: "/favicon.ico",
  },
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
    <html lang="en" className={`${jakarta.variable} ${inter.variable}`}>
      <body className="bg-white text-body-text antialiased font-sans">{children}</body>
    </html>
  );
}
