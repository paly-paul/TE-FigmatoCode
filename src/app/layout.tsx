import type { Metadata, Viewport } from "next";
import "./globals.css";
import SessionInactivityGuard from "@/components/auth/SessionInactivityGuard";

export const metadata: Metadata = {
  title: "SixFE",
  description: "Your intelligent job platform for candidates",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionInactivityGuard />
        {children}
      </body>
    </html>
  );
}
