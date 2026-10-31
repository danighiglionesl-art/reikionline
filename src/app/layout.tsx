import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { PwaManager } from "@/components/pwa/PwaManager";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  themeColor: "#836DAD",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.reikionline.com.ar"),
  title: {
    default: "Reiki Online | Conectando bienestar — Terapias alternativas y autoconocimiento",
    template: "%s | Reiki Online — Conectando bienestar",
  },
  description:
    "Un espacio para conectar personas y experiencias. Descubrí sesiones de Reiki, meditación, tarot, constelaciones familiares, terapias holísticas y armonización acompañadas por profesionales desde donde estés.",
  manifest: "/manifest.json",
  applicationName: "Reiki Online",
  icons: {
    icon: [
      { url: "/brand/favicon-64x64.png", sizes: "64x64", type: "image/png" },
      { url: "/brand/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Reiki Online",
  },
  alternates: {
    canonical: "https://www.reikionline.com.ar",
  },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "https://www.reikionline.com.ar",
    siteName: "Reiki Online — Conectando bienestar",
    title: "Reiki Online | Tu bienestar, sin distancias",
    description:
      "Plataforma digital que reúne profesionales de terapias alternativas, prácticas de bienestar y disciplinas de autoconocimiento.",
    images: [
      {
        url: "/brand/Reiki_Online_Lavanda_Unificado.png",
        width: 1774,
        height: 887,
        alt: "Reiki online — CONECTANDO BIENESTAR",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Reiki Online | Conectando bienestar",
    description:
      "Tu bienestar, sin distancias. Reiki, meditación, tarot, constelaciones familiares y terapias holísticas online y presenciales.",
    images: ["/brand/Reiki_Online_Lavanda_Unificado.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Reiki Online",
    alternateName: "Reiki Online — Conectando bienestar",
    url: "https://www.reikionline.com.ar",
    description:
      "Plataforma digital que reúne profesionales de terapias alternativas, prácticas de bienestar y disciplinas de autoconocimiento.",
    inLanguage: "es-AR",
  };

  return (
    <html lang="es-AR" className={montserrat.variable}>
      <head>
        <link rel="apple-touch-icon" href="/brand/apple-touch-icon.png" />
      </head>
      <body className="min-h-dvh bg-white text-[#2B1F42] antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <PwaManager />
        {children}
      </body>
    </html>
  );
}
