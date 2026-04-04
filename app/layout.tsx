import type { Metadata } from "next";
import { geistSans, geistMono } from "./fonts";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import { I18nProvider } from "@/context/I18nContext";
import { DocumentLang } from "@/components/layout/DocumentLang";

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
        <LanguageProvider>
          <I18nProvider>
            <DocumentLang />
            {children}
          </I18nProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
