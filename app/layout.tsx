import type { Metadata } from "next";
import { Bricolage_Grotesque, Schibsted_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";

const displayFont = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const interfaceFont = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-interface",
  display: "swap",
});

const dataFont = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-data",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pcxpress-ml-dashboard.vercel.app"),
  title: "PCXpress | Painel Mercado Livre",
  description: "Painel comercial e operacional da PCXpress para o Mercado Livre.",
  icons: { icon: "/pcxpress-logo.webp" },
  openGraph: {
    title: "PCXpress | Painel Mercado Livre",
    description: "Painel comercial e operacional da PCXpress para o Mercado Livre.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${displayFont.variable} ${interfaceFont.variable} ${dataFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
