import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://pcxpress-ml-dashboard.vercel.app"),
  title: "PCXpress | Mercado Livre Analytics",
  description: "Dashboard comercial e operacional da PCXpress para o Mercado Livre.",
  icons: { icon: "/pcxpress-logo.webp" },
  openGraph: {
    title: "PCXpress | Mercado Livre Analytics",
    description: "Dashboard comercial e operacional da PCXpress para o Mercado Livre.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
