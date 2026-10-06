import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shift App",
  description: "Shift management app foundation with Neon and Drizzle",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
