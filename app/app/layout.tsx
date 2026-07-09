import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LocalPulse — Owner Dashboard",
  description: "Create promotions, track redemptions, grow repeat customers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body">{children}</body>
    </html>
  );
}
