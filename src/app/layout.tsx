import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import DemoBanner from "@/components/ui/DemoBanner";

// Font variables defined in CSS via @font-face or system fallback
const jakarta = { variable: "--font-jakarta" };
const inter = { variable: "--font-inter" };

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
  authors: [{ name: "Musawo Training Center / ADFA", url: "https://www.musawo.ug" }],
  openGraph: {
    type: "website",
    locale: "en_UG",
    url: "https://www.musawo.ug",
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
    <html lang="en" className={`${jakarta.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="bg-white text-body-text antialiased font-sans dark:bg-[#0f172a] dark:text-slate-100">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <DemoBanner />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
