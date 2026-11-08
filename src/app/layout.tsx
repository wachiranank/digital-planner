import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Digital Planner",
  description: "Planner ภาษาไทย ซิงก์ Google Calendar",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f5f5f4" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body className="antialiased bg-stone-50 text-stone-900">{children}</body>
    </html>
  );
}
