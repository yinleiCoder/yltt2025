import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AuthHashErrorRedirect } from "@/features/auth/components/auth-hash-error-redirect";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "YlTt2025",
    template: "%s | YlTt2025",
  },
  description: "YlTt2025 的摄影、短片与恋爱故事档案。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthHashErrorRedirect />
        {children}
      </body>
    </html>
  );
}
