import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VideoPromptQA — Preflight checks for video prompts",
  description: "Check video-generation prompts for clarity, motion, consistency and feasibility before spending generation credits.",
  openGraph: {
    title: "VideoPromptQA — Preflight checks for video prompts",
    description: "Check video-generation prompts before spending generation credits.",
    type: "website",
    url: "https://videopromptqa.netlify.app/",
  },
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
