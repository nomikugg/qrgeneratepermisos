import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  metadataBase: new URL("http://localhost:3000"),
  title: {
    default: "Sistema de Permisos QR",
    template: "%s | Sistema de Permisos QR",
  },
  description: "Plataforma para generar codigos QR de permisos vehiculares, individual o masivo desde CSV y PDF.",
  applicationName: "Sistema de Permisos QR",
  keywords: [
    "permisos vehiculares",
    "codigos QR",
    "CSV a QR",
    "AcroForm",
    "PDF",
  ],
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml", sizes: "any" },
    ],
    apple: [{ url: "/apple-icon.svg", type: "image/svg+xml" }],
    shortcut: ["/icon.svg"],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Sistema de Permisos QR",
    description: "Generacion de QR para permisos vehiculares con soporte CSV y PDF AcroForm.",
    siteName: "Sistema de Permisos QR",
    type: "website",
    locale: "es_ES",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sistema de Permisos QR",
    description: "Genera y descarga permisos QR en segundos.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
