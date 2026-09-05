import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppHeader } from "@/components/app-header";
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
  title: "NexaERP",
  description: "ERP dashboard, inventory, and business operations workspace",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-100 text-slate-900">
        <div className="min-h-screen">
          <AppHeader />

          <main className="mx-auto w-full">{children}</main>

          <footer className="border-t border-slate-200 bg-white">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-6 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
              <p>2026 NexaERP</p>
              <div className="flex gap-4">
                <a href="#" className="hover:text-slate-900">Privacy</a>
                <a href="#" className="hover:text-slate-900">Terms</a>
                <a href="#" className="hover:text-slate-900">Support</a>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
