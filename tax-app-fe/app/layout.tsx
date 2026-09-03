import type { Metadata } from "next";
import { DM_Serif_Display, Inter } from "next/font/google";
import "./globals.css";
import { DisclaimerBar, LangProvider } from "./_components/lang";

// Headlines only, 1.5rem and above — below that the serif detailing reads as
// clutter rather than warmth.
const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

// Everything else: body, labels, inputs, buttons, navigation.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "EasyTax — Lapor SPT Tahunan",
  description:
    "Prototipe edukasi pelaporan SPT Tahunan PPh Orang Pribadi. Menggunakan data sintetis, tidak berafiliasi dengan DJP.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${dmSerif.variable} ${inter.variable} h-full`}
    >
      {/* The disclaimer bar is fixed; the page starts below it. */}
      <body className="min-h-full bg-neutral pt-[var(--disclaimer-h)]">
        <LangProvider>
          <DisclaimerBar />
          {children}
        </LangProvider>
      </body>
    </html>
  );
}
