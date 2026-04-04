import type { Metadata } from "next";
import { geistSans, geistMono } from "./fonts";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";

export const metadata: Metadata = {
  title: "Pathways — Your immigration journey, guided by AI",
  description: "Personalized immigration guidance, official sources, your language.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased bg-white text-[#171717]">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
