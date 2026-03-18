import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const heebo = Heebo({ subsets: ["hebrew", "latin"] });

export const metadata: Metadata = {
  title: "ONE™ CRM",
  description: "מערכת ניהול לקוחות ודשבורד עסקי",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ONE™ CRM",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0079c7",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body className={`${heebo.className} bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 antialiased`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
