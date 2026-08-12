import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VideoPromptQA — Replace prompt intuition with repeatable experiments",
  description: "Discover prompt failures before generation. An experiment in AI evaluation reliability.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
