import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Talent Engine",
  description: "Your intelligent job platform for candidates",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
