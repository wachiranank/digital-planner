import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SwRegister } from "./sw-register";

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
  themeColor: "#059669",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body className="antialiased bg-stone-50 text-stone-900 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
