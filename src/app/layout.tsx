import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SwRegister } from "./sw-register";
import { browserEnv } from "@/lib/env";

// render per request so runtime settings (window.__ENV) are never frozen at build time
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Digital Planner",
  description: "Planner ภาษาไทย ซิงก์ Google Calendar",
  applicationName: "Digital Planner",
  // iPad / iPhone "Add to Home Screen" opens full screen like an app
  appleWebApp: { capable: true, title: "Planner", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FBFAF8",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap"
        />
        <script
          // public values only (URL + publishable key) for the browser Supabase client
          dangerouslySetInnerHTML={{ __html: `window.__ENV=${JSON.stringify(browserEnv()).replace(/</g, "\\u003c")}` }}
        />
      </head>
      <body className="antialiased bg-paper text-stone-900 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
