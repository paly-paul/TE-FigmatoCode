import type { Metadata, Viewport } from "next";
import "./globals.css";
import SessionInactivityGuard from "@/components/auth/SessionInactivityGuard";
import PageTransition from "@/components/ui/PageTransition";

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
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
