import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";

import { AuthHashErrorRedirect } from "@/features/auth/components/auth-hash-error-redirect";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "YlTt's 2025",
    template: "%s | YlTt's 2025",
  },
  description: "YlTt's 2025 的摄影、短片与恋爱故事档案。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={cn("h-full", "antialiased", geist.variable, geistMono.variable, "font-sans", inter.variable)}
    >
      <body className="flex min-h-full flex-col overflow-x-clip selection:bg-fuchsia-300 selection:text-fuchsia-900">
        <AuthHashErrorRedirect />
        <Toaster closeButton position="top-right" />
        {children}
      </body>
    </html>
  );
}
